import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
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

# Variabel Global untuk Menyimpan Model dan Mapping Brand-Model
ml_model = None
BRAND_MODELS_MAP: Dict[str, List[str]] = {}

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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager untuk memuat model ML dan data metadata
    sekali saat fase startup aplikasi.
    """
    global ml_model
    logger.info("Memulai inisialisasi aplikasi dan pemuatan model...")
    
    # 1. Muat mapping Brand - Model
    load_brand_models_data()

    # 2. Muat model .joblib
    if not MODEL_PATH.exists():
        logger.error(f"File model tidak ditemukan di path: {MODEL_PATH}")
    else:
        try:
            ml_model = joblib.load(MODEL_PATH)
            logger.info(f"Model .joblib berhasil dimuat dari: {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Gagal memuat model: {e}", exc_info=True)
            ml_model = None

    yield
    logger.info("Aplikasi dimatikan, membersihkan resource.")


# Inisialisasi FastAPI
app = FastAPI(
    title="Used Car Price Estimator API",
    description="API Prediksi Harga Mobil Bekas berbasis Machine Learning (Random Forest Regressor)",
    version="1.1.0",
    lifespan=lifespan
)

# Middleware CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Pydantic Schema dengan Validasi Brand-Model
# ==========================================
class CarFeatures(BaseModel):
    """
    Skema validasi input fitur mobil bekas.
    Memvalidasi batas numerik data historis dan kesesuaian relasi Brand & Model.
    """
    model_year: int = Field(
        ...,
        ge=1974,
        le=2024,
        description="Tahun produksi mobil (rentang 1974 - 2024)"
    )
    milage: float = Field(
        ...,
        ge=0.0,
        le=405000.0,
        description="Jarak tempuh mobil dalam mil (rentang 0 - 405.000)"
    )
    brand: str = Field(..., min_length=1, description="Merek mobil (misal: Toyota, BMW, Mercedes-Benz)")
    model: str = Field(..., min_length=1, description="Model mobil sesuai merek terpilih")
    fuel_type: str = Field(..., min_length=1, description="Jenis bahan bakar (misal: Gasoline, Hybrid)")
    engine: str = Field(..., min_length=1, description="Spesifikasi mesin (misal: 3.5 Liter DOHC)")
    transmission: str = Field(..., min_length=1, description="Tipe transmisi (misal: Automatic, 6-Speed A/T)")
    ext_col: str = Field(..., min_length=1, description="Warna eksterior mobil")
    int_col: str = Field(..., min_length=1, description="Warna interior mobil")
    accident: str = Field(..., min_length=1, description="Riwayat kecelakaan")

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
            "example": {
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
        }
    }


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    total_brands_available: int
    message: str


class PredictionResponse(BaseModel):
    success: bool
    predicted_price: float
    currency: str
    message: str


# Handler untuk RequestValidationError (HTTP 422)
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
# Endpoints Monitoring & Metadata
# ==========================================
@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check():
    """
    Endpoint untuk memeriksa status kesiapan backend dan pemuatan model.
    """
    is_loaded = ml_model is not None
    return HealthResponse(
        status="ok" if is_loaded else "degraded",
        model_loaded=is_loaded,
        total_brands_available=len(BRAND_MODELS_MAP),
        message="Used Car Price Estimator API is running" if is_loaded else "Model gagal dimuat atau belum siap."
    )


@app.get("/api/brand-models", tags=["Metadata"])
async def get_brand_models():
    """
    Mengembalikan mapping seluruh merek (Brand) dan daftar model kendaraan
    yang tersedia secara autentik dari dataset training.
    """
    return BRAND_MODELS_MAP


# ==========================================
# Endpoint Prediksi
# ==========================================
@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_car_price(features: CarFeatures):
    """
    Endpoint untuk melakukan prediksi harga mobil bekas berdasarkan 10 fitur spesifikasi.
    """
    if ml_model is None:
        logger.error("Permintaan prediksi ditolak: Model belum dimuat.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model estimasi harga mobil saat ini tidak tersedia di server."
        )

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

        logger.info(f"Prediksi sukses untuk {features.brand} {features.model} ({features.model_year}): ${final_price:,.2f}")

        return PredictionResponse(
            success=True,
            predicted_price=final_price,
            currency="USD",
            message="Prediction completed successfully"
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


@app.get("/", tags=["Frontend"])
async def serve_index():
    """
    Menyajikan halaman frontend interaktif langsung di root URL.
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
