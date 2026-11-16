import json
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import pandas as pd
import sklearn
from fastapi import Body, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ValidationInfo, field_validator, model_validator

# Konfigurasi Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("UsedCarPriceEstimator")

# Path File Relatif
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "used_car_price_model.joblib"
STATIC_DIR = BASE_DIR / "static"
BRAND_MODELS_PATH = STATIC_DIR / "brand_models.json"
HEALTH_HTML_PATH = STATIC_DIR / "health.html"

# Variabel Global untuk Model ML dan Metadata
ml_model = None
BRAND_MODELS_MAP: Dict[str, List[str]] = {}
APP_START_TIME: Optional[float] = None

# Metrik Evaluasi Model dari Pelatihan (Notebook)
# Jika belum diisi (None), sistem tidak menampilkan rentang harga probabilitas di frontend.
# Jangan mengarang angka; isi nilai riil hasil evaluasi notebook jika tersedia.
MODEL_MAE_USD: Optional[float] = None
MODEL_RMSE_USD: Optional[float] = None

# 10 Fitur Wajib yang Digunakan saat Training
FEATURE_COLUMNS = [
    "model_year",
    "milage",
    "brand",
    "model",
    "fuel_type",
    "engine",
    "transmission",
    "ext_col",
    "int_col",
    "accident"
]


def load_brand_models_data():
    """Memuat file mapping Brand -> List of Models dari dataset pelatihan."""
    global BRAND_MODELS_MAP
    if BRAND_MODELS_PATH.exists():
        try:
            with open(BRAND_MODELS_PATH, "r", encoding="utf-8") as f:
                BRAND_MODELS_MAP = json.load(f)
            logger.info(f"Mapping Brand-Model berhasil dimuat: {len(BRAND_MODELS_MAP)} merek terdaftar.")
        except Exception as e:
            logger.error(f"Gagal memuat brand_models.json: {e}", exc_info=True)
            BRAND_MODELS_MAP = {}
    else:
        logger.warning(f"File mapping Brand-Model tidak ditemukan di {BRAND_MODELS_PATH}")


def get_model_type_name() -> Optional[str]:
    """Mendeteksi nama estimator akhir dari objek model secara aman."""
    if ml_model is None:
        return None
    try:
        if hasattr(ml_model, "steps") and ml_model.steps:
            return type(ml_model.steps[-1][1]).__name__
        if hasattr(ml_model, "named_steps") and "regressor" in ml_model.named_steps:
            return type(ml_model.named_steps["regressor"]).__name__
        return type(ml_model).__name__
    except Exception:
        return "Regressor"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager untuk memuat model ML dan metadata sekali
    saat fase inisialisasi aplikasi.
    """
    global ml_model, APP_START_TIME
    APP_START_TIME = time.time()
    logger.info("Memulai inisialisasi aplikasi dan pemuatan model...")

    # 1. Muat mapping Brand - Model
    load_brand_models_data()

    # 2. Muat model .joblib dengan backward compatibility layer
    if not MODEL_PATH.exists():
        logger.error(f"File model tidak ditemukan di path: {MODEL_PATH}")
        ml_model = None
    else:
        try:
            # Kompatibilitas jika scikit-learn unpickling mencari _RemainderColsList (1.6.1 -> 1.7+)
            import sklearn.compose._column_transformer as _sct
            if not hasattr(_sct, "_RemainderColsList"):
                _sct._RemainderColsList = type("_RemainderColsList", (list,), {})

            loaded_model = joblib.load(MODEL_PATH)

            # Kompatibilitas SimpleImputer jika skenario runtime memerlukan _fill_dtype
            for name, step in getattr(loaded_model, "named_steps", {}).items():
                if hasattr(step, "transformers_"):
                    for tname, trans, cols in step.transformers_:
                        if hasattr(trans, "named_steps"):
                            for sname, sstep in trans.named_steps.items():
                                if hasattr(sstep, "_fit_dtype") and not hasattr(sstep, "_fill_dtype"):
                                    sstep._fill_dtype = sstep._fit_dtype

            ml_model = loaded_model
            logger.info(f"Model .joblib berhasil dimuat dari: {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Gagal memuat model: {e}", exc_info=True)
            ml_model = None

    yield
    logger.info("Aplikasi dimatikan, membersihkan resource.")


# ==========================================
# Dokumentasi OpenAPI & Metadata API
# ==========================================
API_DESCRIPTION_MARKDOWN = """
## Ringkasan Sistem
API **Used Car Price Estimator** adalah antarmuka pemrograman aplikasi berbasis **FastAPI** dan **Machine Learning (Random Forest Regressor)** yang dikembangkan untuk mengestimasi nilai wajar pasar kendaraan mobil bekas di Amerika Serikat dalam denominasi mata uang **USD**.

Sistem ini dilatih menggunakan dataset historis berisi **4.009 data transaksi kendaraan** dengan pipeline pra-pemrosesan data terpadu (*ColumnTransformer*, *SimpleImputer*, *StandardScaler*, dan *OneHotEncoder*).

---

### Tabel 10 Fitur Wajib

| No | Nama Fitur | Tipe Data | Rentang / Format | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `model_year` | Integer | `1974` - `2024` | Tahun pembuatan kendaraan resmi |
| 2 | `milage` | Float | `0.0` - `405,000.0` | Jarak tempuh total dalam satuan mil (miles) |
| 3 | `brand` | String | 57 Merek Terdaftar | Merek resmi produsen kendaraan |
| 4 | `model` | String | 1.899 Model Terdaftar | Varian model yang wajib sesuai dengan merek terpilih |
| 5 | `fuel_type` | String | Kategori dataset | Tipe bahan bakar (Gasoline, Diesel, Hybrid, E85 Flex Fuel, Plug-In Hybrid) |
| 6 | `engine` | String | Teks spesifikasi | Konfigurasi silinder dan kapasitas mesin kendaraan |
| 7 | `transmission`| String | Teks transmisi | Tipe sistem transmisi dan jumlah rasio gigi |
| 8 | `ext_col` | String | Teks warna | Warna cat eksterior bodi kendaraan |
| 9 | `int_col` | String | Teks warna | Warna kabin dan jok interior kendaraan |
| 10| `accident` | String | 2 Opsi Resmi | Riwayat insiden (`None reported` atau `At least 1 accident or damage reported`) |

---

### Alur Pemakaian ("Try it out")
1. Buka endpoint `POST /predict`.
2. Klik tombol **"Try it out"** di pojok kanan atas blok endpoint.
3. Pilih salah satu contoh payload dari dropdown **Examples** (tersedia contoh valid seperti *Hyundai Palisade 2021*, *Audi Q3 2021*, dan *Ford Police Interceptor 2013*, serta contoh penolakan validasi 422).
4. Klik tombol **"Execute"** untuk menjalankan inferensi model ML secara langsung.
5. Periksa respons status code: **200 OK** untuk estimasi berhasil, atau **422 Unprocessable Entity** jika aturan validasi integritas dilanggar.

---

> **Disclaimer Akademik:**  
> Aplikasi ini merupakan prototipe edukatif yang dikembangkan untuk keperluan Tugas Besar Praktikum Pembelajaran Mesin, Program Studi Sistem Informasi, Universitas Bengkulu. Estimasi yang dihasilkan merupakan pendekatan statistik berbasis regresi dan bukan merupakan penentu transaksi resmi, penjamin harga pasar riil, maupun rekomendasi finansial profesional.
"""

OPENAPI_TAGS = [
    {
        "name": "Prediction",
        "description": "Endpoint utama inferensi model Machine Learning untuk estimasi harga mobil bekas (USD)."
    },
    {
        "name": "Monitoring",
        "description": "Pemeriksaan kesiapan operasional server, ketersediaan objek model di memori, dan metrik sistem."
    },
    {
        "name": "Metadata",
        "description": "Informasi relasi autentik antara 57 Merek (Brand) dan daftar model resmi dari dataset pelatihan."
    },
    {
        "name": "Frontend",
        "description": "Rute penyajian antarmuka pengguna web otomotif profesional."
    }
]

# Inisialisasi Aplikasi FastAPI
app = FastAPI(
    title="Used Car Price Estimator API",
    summary="Sistem Estimasi Harga Mobil Bekas berbasis Machine Learning (Random Forest Regressor)",
    description=API_DESCRIPTION_MARKDOWN,
    version="1.2.0",
    contact={
        "name": "Kelompok 2 — Praktikum Pembelajaran Mesin",
        "url": "https://unib.ac.id",
        "email": "kelompok2.pembelajaranmesin@unib.ac.id"
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT"
    },
    openapi_tags=OPENAPI_TAGS,
    docs_url=None,   # Menggunakan Swagger UI kustom di rute /docs
    redoc_url="/redoc",
    lifespan=lifespan
)

# Middleware CORS (allow_credentials=False bila allow_origins=["*"] demi kesesuaian standar)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Skema Pydantic & Validasi Integritas
# ==========================================
class CarFeatures(BaseModel):
    """
    Skema validasi 10 fitur spesifikasi mobil bekas.
    Memvalidasi batas numerik data historis dan kecocokan relasi Brand & Model.
    """
    model_year: int = Field(
        ...,
        title="Tahun Pembuatan",
        ge=1974,
        le=2024,
        description="Tahun produksi mobil (rentang 1974 - 2024)",
        examples=[2021, 2018, 2013]
    )
    milage: float = Field(
        ...,
        title="Jarak Tempuh (Mil)",
        ge=0.0,
        le=405000.0,
        description="Jarak tempuh mobil dalam satuan mil (rentang 0 - 405.000)",
        examples=[34742.0, 9835.0, 51000.0]
    )
    brand: str = Field(
        ...,
        title="Merek Kendaraan",
        min_length=1,
        description="Merek mobil terdaftar dalam dataset pelatihan (misal: Hyundai, Toyota, Audi, Ford)",
        examples=["Hyundai", "Audi", "Ford"]
    )
    model: str = Field(
        ...,
        title="Model Kendaraan",
        min_length=1,
        description="Model mobil yang sesuai dengan merek terpilih",
        examples=["Palisade SEL", "Q3 45 S line Premium Plus", "Utility Police Interceptor Base"]
    )
    fuel_type: str = Field(
        ...,
        title="Tipe Bahan Bakar",
        min_length=1,
        description="Jenis bahan bakar kendaraan (Gasoline, Diesel, Hybrid, E85 Flex Fuel, Plug-In Hybrid)",
        examples=["Gasoline", "E85 Flex Fuel", "Hybrid"]
    )
    engine: str = Field(
        ...,
        title="Spesifikasi Mesin",
        min_length=1,
        description="Konfigurasi dan kapasitas silinder mesin",
        examples=["3.8L V6 24V GDI DOHC", "2.0L I4 16V GDI DOHC Turbo"]
    )
    transmission: str = Field(
        ...,
        title="Transmisi Kendaraan",
        min_length=1,
        description="Tipe transmisi dan gearbox kendaraan",
        examples=["8-Speed Automatic", "6-Speed A/T"]
    )
    ext_col: str = Field(
        ...,
        title="Warna Eksterior",
        min_length=1,
        description="Warna cat eksterior bodi mobil",
        examples=["Moonlight Cloud", "Glacier White Metallic", "Black"]
    )
    int_col: str = Field(
        ...,
        title="Warna Interior",
        min_length=1,
        description="Warna kabin dan jok interior mobil",
        examples=["Gray", "Black"]
    )
    accident: str = Field(
        ...,
        title="Riwayat Kerusakan/Kecelakaan",
        min_length=1,
        description="Catatan riwayat kecelakaan kendaraan ('None reported' atau 'At least 1 accident or damage reported')",
        examples=["At least 1 accident or damage reported", "None reported"]
    )

    @field_validator(
        "brand", "model", "fuel_type", "engine", "transmission", "ext_col", "int_col", "accident",
        mode="before"
    )
    @classmethod
    def validate_and_strip_string(cls, value: Any, info: ValidationInfo) -> str:
        if not isinstance(value, str):
            raise ValueError(f"Nilai untuk kolom '{info.field_name}' harus berupa teks (string).")
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"Kolom '{info.field_name}' wajib diisi dan tidak boleh hanya berisi spasi kosong.")
        return cleaned

    @model_validator(mode="after")
    def validate_brand_and_model_compatibility(self) -> "CarFeatures":
        """
        Validasi integritas relasi: Memastikan Model yang dikirimkan
        benar-benar merupakan varian resmi dari Brand terpilih dalam dataset.
        """
        if BRAND_MODELS_MAP:
            # Periksa apakah merek ada dalam dataset
            if self.brand not in BRAND_MODELS_MAP:
                raise ValueError(
                    f"Merek '{self.brand}' tidak terdaftar dalam dataset pelatihan."
                )

            # Periksa apakah model terdaftar pada merek tersebut
            allowed_models = set(BRAND_MODELS_MAP[self.brand])
            if self.model not in allowed_models:
                raise ValueError(
                    f"Model '{self.model}' tidak valid untuk merek '{self.brand}'. "
                    f"Silakan pilih model resmi yang terdaftar untuk {self.brand}."
                )

        return self

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "model_year": 2021,
                    "milage": 34742.0,
                    "brand": "Hyundai",
                    "model": "Palisade SEL",
                    "fuel_type": "Gasoline",
                    "engine": "3.8L V6 24V GDI DOHC",
                    "transmission": "8-Speed Automatic",
                    "ext_col": "Moonlight Cloud",
                    "int_col": "Gray",
                    "accident": "At least 1 accident or damage reported"
                },
                {
                    "model_year": 2021,
                    "milage": 9835.0,
                    "brand": "Audi",
                    "model": "Q3 45 S line Premium Plus",
                    "fuel_type": "Gasoline",
                    "engine": "2.0L I4 16V GDI DOHC Turbo",
                    "transmission": "8-Speed Automatic",
                    "ext_col": "Glacier White Metallic",
                    "int_col": "Black",
                    "accident": "None reported"
                },
                {
                    "model_year": 2013,
                    "milage": 51000.0,
                    "brand": "Ford",
                    "model": "Utility Police Interceptor Base",
                    "fuel_type": "E85 Flex Fuel",
                    "engine": "300.0HP 3.7L V6 Cylinder Engine Flex Fuel Capability",
                    "transmission": "6-Speed A/T",
                    "ext_col": "Black",
                    "int_col": "Black",
                    "accident": "At least 1 accident or damage reported"
                }
            ]
        }
    }


class HealthResponse(BaseModel):
    """Skema data respons status kesehatan backend dan model ML."""
    status: str = Field(..., description="Status kesiapan layanan ('ok' atau 'degraded')")
    model_loaded: bool = Field(..., description="Status pemuatan objek model scikit-learn di memori")
    total_brands_available: int = Field(..., description="Jumlah total merek mobil yang tersedia dalam dataset")
    message: str = Field(..., description="Pesan deskriptif status sistem")
    model_file: Optional[str] = Field(None, description="Nama berkas bobot model")
    model_type: Optional[str] = Field(None, description="Tipe arsitektur algoritma estimator machine learning")
    n_features: int = Field(10, description="Jumlah atribut fitur wajib yang diproses pipeline")
    sklearn_version: Optional[str] = Field(None, description="Versi scikit-learn pada lingkungan eksekusi")
    python_version: Optional[str] = Field(None, description="Versi Python runtime")
    uptime_seconds: Optional[float] = Field(None, description="Durasi aktif server sejak startup (detik)")
    timestamp: Optional[str] = Field(None, description="Waktu pemeriksaan server dalam format ISO-8601 UTC")


class PredictionResponse(BaseModel):
    """Skema data keluaran hasil estimasi harga kendaraan."""
    success: bool = Field(..., description="Indikator keberhasilan inferensi")
    predicted_price: float = Field(..., description="Nilai estimasi harga pasar kendaraan (USD)")
    currency: str = Field(..., description="Satuan mata uang hasil prediksi (USD)")
    message: str = Field(..., description="Pesan status proses inferensi")
    price_low: Optional[float] = Field(None, description="Batas bawah rentang harga estimasi (jika metrik MAE tersedia)")
    price_high: Optional[float] = Field(None, description="Batas atas rentang harga estimasi (jika metrik MAE tersedia)")
    inference_ms: Optional[float] = Field(None, description="Durasi waktu eksekusi inferensi model (milidetik)")


class ValidationErrorResponse(BaseModel):
    """Skema dokumentasi untuk galat validasi masukan HTTP 422."""
    success: bool = Field(False, description="Status keberhasilan operasi")
    error_type: str = Field("ValidationError", description="Kategori galat validasi")
    message: str = Field("Validasi input gagal. Silakan periksa kembali data yang dimasukkan.", description="Ringkasan galat")
    details: List[str] = Field(..., description="Daftar rincian field dan aturan validasi yang dilanggar")


# Handler Kustom untuk RequestValidationError (HTTP 422)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"] if loc != "body")
        errors.append(f"{field}: {err['msg']}")
    logger.warning(f"Validasi input gagal: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error_type": "ValidationError",
            "message": "Validasi input gagal. Silakan periksa kembali data yang dimasukkan.",
            "details": errors
        }
    )


# ==========================================
# Rute Swagger UI Kustom (/docs)
# ==========================================
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """
    Menyajikan halaman dokumentasi interaktif Swagger UI dengan tema Slate
    dan tautan navigasi langsung ke antarmuka aplikasi utama.
    """
    res = get_swagger_ui_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=f"{app.title} — Swagger UI",
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-custom.css",
        swagger_favicon_url="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230F172A'><path d='M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2'/><circle cx='7' cy='17' r='2'/><circle cx='17' cy='17' r='2'/></svg>",
        swagger_ui_parameters={
            "docExpansion": "list",
            "defaultModelsExpandDepth": -1,
            "displayRequestDuration": True,
            "filter": True,
            "tryItOutEnabled": True,
            "persistAuthorization": True,
        }
    )

    custom_topbar = """
    <header class="swagger-custom-navbar">
      <div class="swagger-nav-inner">
        <a href="/" class="swagger-nav-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          <span class="swagger-nav-title">Used Car Price Estimator</span>
          <span class="swagger-nav-badge">Dokumentasi API</span>
        </a>
        <div class="swagger-nav-actions">
          <a href="/" class="swagger-nav-link">&larr; Kembali ke Aplikasi</a>
          <a href="/health" class="swagger-nav-link" target="_blank" rel="noopener">Status Server &rarr;</a>
        </div>
      </div>
    </header>
    """
    body_text = res.body.decode("utf-8").replace("<body>", f"<body>{custom_topbar}")
    return HTMLResponse(content=body_text, status_code=res.status_code)


# ==========================================
# Endpoints Monitoring & Metadata
# ==========================================
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Monitoring"],
    summary="Pemeriksaan Kesiapan Server & Model",
    description=(
        "Mengembalikan telemetri kesiapan server dan status objek model Machine Learning di memori. "
        "Mendukung negosiasi konten: menampilkan dasbor HTML jika diakses dari peramban web (Accept: text/html), "
        "atau respons JSON jika diakses dari API client/cURL. Gunakan parameter `?format=json` untuk memaksa JSON."
    ),
    responses={
        200: {
            "description": "Server dan model ML siap beroperasi",
            "model": HealthResponse,
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "model_loaded": True,
                        "total_brands_available": 57,
                        "message": "Used Car Price Estimator API is running",
                        "model_file": "used_car_price_model.joblib",
                        "model_type": "RandomForestRegressor",
                        "n_features": 10,
                        "sklearn_version": "1.6.1",
                        "python_version": "3.13.12",
                        "uptime_seconds": 128.45,
                        "timestamp": "2026-11-16T09:30:00Z"
                    }
                }
            }
        },
        503: {
            "description": "Model ML belum dimuat atau server mengalami penurunan performa",
            "model": HealthResponse,
            "content": {
                "application/json": {
                    "example": {
                        "status": "degraded",
                        "model_loaded": False,
                        "total_brands_available": 57,
                        "message": "Model gagal dimuat atau belum siap.",
                        "model_file": "used_car_price_model.joblib",
                        "model_type": None,
                        "n_features": 10,
                        "sklearn_version": "1.6.1",
                        "python_version": "3.13.12",
                        "uptime_seconds": 14.2,
                        "timestamp": "2026-11-16T09:30:00Z"
                    }
                }
            }
        }
    }
)
async def health_check(request: Request, format: Optional[str] = None):
    """
    Pemeriksaan status kesehatan sistem dengan negosiasi konten browser / API.
    """
    is_loaded = ml_model is not None
    uptime = round(time.time() - APP_START_TIME, 2) if APP_START_TIME else 0.0
    now_iso = datetime.now(timezone.utc).isoformat()
    m_type = get_model_type_name()

    health_data = HealthResponse(
        status="ok" if is_loaded else "degraded",
        model_loaded=is_loaded,
        total_brands_available=len(BRAND_MODELS_MAP),
        message="Used Car Price Estimator API is running" if is_loaded else "Model gagal dimuat atau belum siap.",
        model_file="used_car_price_model.joblib",
        model_type=m_type,
        n_features=len(FEATURE_COLUMNS),
        sklearn_version=sklearn.__version__,
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        uptime_seconds=uptime,
        timestamp=now_iso
    )

    # Content Negotiation: Jika browser meminta HTML dan tidak memaksa json
    accept_header = request.headers.get("accept", "")
    if format != "json" and "text/html" in accept_header:
        if HEALTH_HTML_PATH.exists():
            return FileResponse(HEALTH_HTML_PATH, media_type="text/html")

    # Kembalikan JSON sesuai kesiapan model
    if not is_loaded:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_data.model_dump()
        )

    return health_data


@app.get(
    "/api/brand-models",
    tags=["Metadata"],
    summary="Pemetaan Seluruh Merek & Model Resmi",
    description="Mengembalikan dictionary pemetaan 57 Merek (Brand) ke daftar model yang sah berdasarkan dataset pelatihan.",
    responses={
        200: {
            "description": "Pemetaan merek dan model berhasil diambil",
            "content": {
                "application/json": {
                    "example": {
                        "Hyundai": ["Palisade SEL", "Elantra SEL", "Santa Fe Limited"],
                        "Ford": ["Utility Police Interceptor Base", "Mustang GT", "F-150 XLT"],
                        "Audi": ["Q3 45 S line Premium Plus", "A4 Premium Plus"]
                    }
                }
            }
        }
    }
)
async def get_brand_models():
    """
    Mengembalikan mapping seluruh merek (Brand) dan daftar model kendaraan
    yang tersedia secara autentik dari dataset training.
    """
    return BRAND_MODELS_MAP


# ==========================================
# Endpoint Prediksi
# ==========================================
PREDICT_EXAMPLES = {
    "palisade_2021": {
        "summary": "Hyundai Palisade 2021 (Valid)",
        "description": "SUV Hyundai Palisade SEL tahun 2021 dengan riwayat kecelakaan ringan.",
        "value": {
            "model_year": 2021,
            "milage": 34742.0,
            "brand": "Hyundai",
            "model": "Palisade SEL",
            "fuel_type": "Gasoline",
            "engine": "3.8L V6 24V GDI DOHC",
            "transmission": "8-Speed Automatic",
            "ext_col": "Moonlight Cloud",
            "int_col": "Gray",
            "accident": "At least 1 accident or damage reported"
        }
    },
    "audi_q3_2021": {
        "summary": "Audi Q3 2021 (Valid)",
        "description": "Compact Luxury SUV Audi Q3 tahun 2021 tanpa catatan riwayat kerusakan.",
        "value": {
            "model_year": 2021,
            "milage": 9835.0,
            "brand": "Audi",
            "model": "Q3 45 S line Premium Plus",
            "fuel_type": "Gasoline",
            "engine": "2.0L I4 16V GDI DOHC Turbo",
            "transmission": "8-Speed Automatic",
            "ext_col": "Glacier White Metallic",
            "int_col": "Black",
            "accident": "None reported"
        }
    },
    "ford_interceptor_2013": {
        "summary": "Ford Interceptor 2013 (Valid)",
        "description": "Ford Utility Police Interceptor tahun 2013 dengan bahan bakar alternatif E85 Flex Fuel.",
        "value": {
            "model_year": 2013,
            "milage": 51000.0,
            "brand": "Ford",
            "model": "Utility Police Interceptor Base",
            "fuel_type": "E85 Flex Fuel",
            "engine": "300.0HP 3.7L V6 Cylinder Engine Flex Fuel Capability",
            "transmission": "6-Speed A/T",
            "ext_col": "Black",
            "int_col": "Black",
            "accident": "At least 1 accident or damage reported"
        }
    },
    "invalid_year": {
        "summary": "Tahun Di Bawah Batas (Invalid 422)",
        "description": "Demonstrasi penolakan validasi: model_year bernilai 1965 (di bawah batas minimum 1974).",
        "value": {
            "model_year": 1965,
            "milage": 50000.0,
            "brand": "Ford",
            "model": "Utility Police Interceptor Base",
            "fuel_type": "Gasoline",
            "engine": "300.0HP 3.7L V6 Cylinder Engine Flex Fuel Capability",
            "transmission": "6-Speed A/T",
            "ext_col": "Black",
            "int_col": "Black",
            "accident": "None reported"
        }
    },
    "invalid_brand_model": {
        "summary": "Kombinasi Brand-Model Salah (Invalid 422)",
        "description": "Demonstrasi penolakan integritas: Brand 'Toyota' dipasangkan dengan Model 'Palisade SEL' milik Hyundai.",
        "value": {
            "model_year": 2021,
            "milage": 34742.0,
            "brand": "Toyota",
            "model": "Palisade SEL",
            "fuel_type": "Gasoline",
            "engine": "3.8L V6 24V GDI DOHC",
            "transmission": "8-Speed Automatic",
            "ext_col": "Moonlight Cloud",
            "int_col": "Gray",
            "accident": "None reported"
        }
    }
}


@app.post(
    "/predict",
    response_model=PredictionResponse,
    tags=["Prediction"],
    summary="Estimasi Harga Mobil Bekas",
    description=(
        "Menghitung estimasi nilai wajar pasar mobil bekas berdasarkan 10 atribut spesifikasi. "
        "Memvalidasi batas numerik data historis dan memastikan kesesuaian resmi varian model terhadap merek terpilih."
    ),
    responses={
        200: {
            "description": "Prediksi harga berhasil dihitung",
            "model": PredictionResponse,
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "predicted_price": 51907.71,
                        "currency": "USD",
                        "message": "Prediction completed successfully",
                        "price_low": None,
                        "price_high": None,
                        "inference_ms": 14.85
                    }
                }
            }
        },
        422: {
            "description": "Data masukan tidak valid atau melanggar aturan integritas relasi Brand-Model",
            "model": ValidationErrorResponse,
            "content": {
                "application/json": {
                    "example": {
                        "success": False,
                        "error_type": "ValidationError",
                        "message": "Validasi input gagal. Silakan periksa kembali data yang dimasukkan.",
                        "details": [
                            "model: Model 'Palisade SEL' tidak valid untuk merek 'Toyota'. Silakan pilih model resmi yang terdaftar untuk Toyota."
                        ]
                    }
                }
            }
        },
        500: {
            "description": "Terjadi kesalahan internal saat memproses estimasi",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Terjadi kesalahan teknis pada sistem saat memproses kalkulasi harga."
                    }
                }
            }
        },
        503: {
            "description": "Layanan prediksi tidak tersedia karena model belum siap",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Model estimasi harga mobil saat ini tidak tersedia di server."
                    }
                }
            }
        }
    }
)
async def predict_car_price(
    features: CarFeatures = Body(
        ...,
        openapi_examples=PREDICT_EXAMPLES
    )
):
    """
    Endpoint inferensi harga mobil bekas berbasis pipeline Machine Learning.
    """
    if ml_model is None:
        logger.error("Permintaan prediksi ditolak: Model belum dimuat.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model estimasi harga mobil saat ini tidak tersedia di server."
        )

    t_start = time.perf_counter()

    try:
        # Susun data sesuai dengan urutan 10 kolom saat training
        row_dict = {
            "model_year": features.model_year,
            "milage": float(features.milage),
            "brand": features.brand,
            "model": features.model,
            "fuel_type": features.fuel_type,
            "engine": features.engine,
            "transmission": features.transmission,
            "ext_col": features.ext_col,
            "int_col": features.int_col,
            "accident": features.accident
        }

        input_df = pd.DataFrame([row_dict], columns=FEATURE_COLUMNS)

        # Eksekusi pipeline model Machine Learning
        raw_prediction = ml_model.predict(input_df)
        predicted_val = float(raw_prediction[0])

        # Pastikan harga tidak negatif secara matematis (fallback batas logis >= 0)
        final_price = max(0.0, round(predicted_val, 2))
        t_elapsed_ms = round((time.perf_counter() - t_start) * 1000, 2)

        # Hitung rentang harga probabilitas regresi bila metrik MAE tersedia
        price_low = None
        price_high = None
        if MODEL_MAE_USD is not None:
            price_low = max(0.0, round(final_price - MODEL_MAE_USD, 2))
            price_high = round(final_price + MODEL_MAE_USD, 2)

        logger.info(f"Prediksi sukses untuk {features.brand} {features.model} ({features.model_year}): ${final_price:,.2f} ({t_elapsed_ms} ms)")

        return PredictionResponse(
            success=True,
            predicted_price=final_price,
            currency="USD",
            message="Prediction completed successfully",
            price_low=price_low,
            price_high=price_high,
            inference_ms=t_elapsed_ms
        )

    except Exception as e:
        logger.error(f"Kesalahan internal saat melakukan prediksi: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Terjadi kesalahan teknis pada sistem saat memproses kalkulasi harga."
        )


# ==========================================
# Static Files & Frontend Serving
# ==========================================
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", tags=["Frontend"], summary="Halaman Utama Web Interaktif")
async def serve_index():
    """
    Menyajikan halaman antarmuka web interaktif langsung di root URL.
    """
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse(
        content={
            "message": "Used Car Price Estimator Backend API Aktif. Buka /docs untuk dokumentasi Swagger."
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
