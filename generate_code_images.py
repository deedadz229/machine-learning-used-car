from pygments import highlight
from pygments.lexers import PythonLexer, JavascriptLexer
from pygments.formatters import ImageFormatter
from pathlib import Path

output_dir = Path(r"e:\Tugas Besar Machine Learning\code_figures")
output_dir.mkdir(parents=True, exist_ok=True)

snippets = {
    "gambar_3_2_model_loading.png": (
        '''# ==========================================
# 1. Pemuatan Model .joblib & Metadata Brand
# ==========================================
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model" / "used_car_price_model.joblib"
BRAND_MODELS_PATH = BASE_DIR / "static" / "brand_models.json"

ml_model = None
BRAND_MODELS_MAP = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_model, BRAND_MODELS_MAP
    # 1. Muat pemetaan Brand -> Models
    if BRAND_MODELS_PATH.exists():
        with open(BRAND_MODELS_PATH, "r", encoding="utf-8") as f:
            BRAND_MODELS_MAP = json.load(f)
    
    # 2. Muat model ML sekali saat startup
    if MODEL_PATH.exists():
        ml_model = joblib.load(MODEL_PATH)
        logger.info("Model .joblib & metadata berhasil dimuat.")
    yield
    logger.info("Aplikasi dimatikan, membersihkan resource.")''',
        PythonLexer()
    ),

    "gambar_3_3_pydantic_schema.png": (
        '''# ==========================================
# 2. Skema Validasi Pydantic & Relasi Brand-Model
# ==========================================
class CarFeatures(BaseModel):
    model_year: int = Field(..., ge=1974, le=2024)
    milage: float = Field(..., ge=0.0, le=405000.0)
    brand: str = Field(..., min_length=1)
    model: str = Field(..., min_length=1)
    fuel_type: str = Field(..., min_length=1)
    engine: str = Field(..., min_length=1)
    transmission: str = Field(..., min_length=1)
    ext_col: str = Field(..., min_length=1)
    int_col: str = Field(..., min_length=1)
    accident: str = Field(..., min_length=1)

    @field_validator("brand", "model", "fuel_type", "engine", 
                     "transmission", "ext_col", "int_col", "accident", mode="before")
    @classmethod
    def validate_and_strip_string(cls, value: Any, info: ValidationInfo) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"Kolom '{info.field_name}' tidak boleh kosong.")
        return value.strip()

    @model_validator(mode="after")
    def validate_brand_and_model_compatibility(self) -> "CarFeatures":
        if BRAND_MODELS_MAP:
            if self.brand not in BRAND_MODELS_MAP:
                raise ValueError(f"Merek '{self.brand}' tidak terdaftar dalam dataset.")
            if self.model not in set(BRAND_MODELS_MAP[self.brand]):
                raise ValueError(f"Model '{self.model}' tidak valid untuk merek '{self.brand}'.")
        return self''',
        PythonLexer()
    ),

    "gambar_3_4_health_endpoint.png": (
        '''# ==========================================
# 3. Endpoint Monitoring GET /health
# ==========================================
class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    total_brands_available: int
    message: str

@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
async def health_check():
    """Pemeriksaan status backend, model ML, dan metadata."""
    is_loaded = ml_model is not None
    return HealthResponse(
        status="ok" if is_loaded else "degraded",
        model_loaded=is_loaded,
        total_brands_available=len(BRAND_MODELS_MAP),
        message="Used Car Price Estimator API is running"
    )''',
        PythonLexer()
    ),

    "gambar_3_5_predict_endpoint.png": (
        '''# ==========================================
# 4. Endpoint Inferensi POST /predict
# ==========================================
@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_car_price(features: CarFeatures):
    if ml_model is None:
        raise HTTPException(status_code=503, detail="Model belum siap.")

    # Susun data sesuai urutan 10 kolom pelatihan
    row_dict = {col: getattr(features, col) for col in FEATURE_COLUMNS}
    input_df = pd.DataFrame([row_dict], columns=FEATURE_COLUMNS)

    # Eksekusi Pipeline (ColumnTransformer + Random Forest)
    raw_pred = ml_model.predict(input_df)
    final_price = max(0.0, round(float(raw_pred[0]), 2))

    return PredictionResponse(
        success=True,
        predicted_price=final_price,
        currency="USD",
        message="Prediction completed successfully"
    )''',
        PythonLexer()
    ),

    "gambar_3_6_fetch_api.png": (
        '''// ==========================================
// 5. JavaScript Cascading & Fetch API (app.js)
// ==========================================
// Cascading: Pilih Brand memicu pembaruan daftar Model
function selectBrand(brandName) {
  currentBrand = brandName;
  fields.brand.value = brandName;
  brandSelectedText.textContent = brandName;

  // Reset pilihan model sebelumnya
  currentModel = "";
  fields.model.value = "";
  modelSelectedText.textContent = `Pilih model ${brandName}...`;
  modelTrigger.disabled = false;

  // Muat model resmi untuk merek ini
  const modelsForBrand = brandModelsMap[brandName] || [];
  populateModelList(modelsForBrand);
}

// Form Submit: Fetch API asinkron tanpa reload
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const errors = validateClientInputs();
  if (errors.length > 0) return showError("Periksa Data Masukan", errors);

  showLoading();
  const res = await fetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  hideLoading();

  if (res.ok && data.success) {
    displayPredictionResult(data.predicted_price, payload);
  } else {
    showError("Validasi Gagal", data.details || [data.detail]);
  }
});''',
        JavascriptLexer()
    )
}

for filename, (code, lexer) in snippets.items():
    formatter = ImageFormatter(
        font_name="Consolas",
        font_size=15,
        line_numbers=True,
        style="friendly",
        line_pad=3
    )
    img_bytes = highlight(code, lexer, formatter)
    file_path = output_dir / filename
    with open(file_path, "wb") as f:
        f.write(img_bytes)
    print(f"Generated {filename} ({len(img_bytes)} bytes)")
