/**
 * Used Car Price Estimator — Application JavaScript
 * Kelompok 2 • Praktikum Pembelajaran Mesin • Universitas Bengkulu
 */

document.addEventListener("DOMContentLoaded", () => {
  // Element References
  const form = document.getElementById("prediction-form");
  const btnSubmit = document.getElementById("btn-submit");
  const btnReset = document.getElementById("btn-reset");
  const btnLabel = document.getElementById("btn-label");
  const loadingSpinner = document.getElementById("loading-spinner");

  // Valuation Panel References
  const valuationIdle = document.getElementById("valuation-idle");
  const valuationResult = document.getElementById("valuation-result");
  const priceHeadline = document.getElementById("price-headline");
  const specsSummaryBox = document.getElementById("specs-summary-box");

  // Error Alert References
  const errorPanel = document.getElementById("error-panel");
  const errorTitle = document.getElementById("error-title");
  const errorMessage = document.getElementById("error-message");
  const errorDetailsList = document.getElementById("error-details-list");

  // Server Status References
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  // Preset Buttons
  const presetPalisade = document.getElementById("preset-palisade");
  const presetAudi = document.getElementById("preset-audi");
  const presetFord = document.getElementById("preset-ford");

  // Form Fields
  const fields = {
    brand: document.getElementById("brand"),
    model: document.getElementById("model"),
    model_year: document.getElementById("model_year"),
    milage: document.getElementById("milage"),
    fuel_type: document.getElementById("fuel_type"),
    engine: document.getElementById("engine"),
    transmission: document.getElementById("transmission"),
    ext_col: document.getElementById("ext_col"),
    int_col: document.getElementById("int_col"),
    accident: document.getElementById("accident")
  };

  // Combobox Brand Elements
  const brandCombobox = document.getElementById("brand-combobox");
  const brandTrigger = document.getElementById("brand-trigger");
  const brandSelectedText = document.getElementById("brand-selected-text");
  const brandPanel = document.getElementById("brand-panel");
  const brandSearch = document.getElementById("brand-search");
  const brandOptionsList = document.getElementById("brand-options-list");

  // Combobox Model Elements
  const modelCombobox = document.getElementById("model-combobox");
  const modelTrigger = document.getElementById("model-trigger");
  const modelSelectedText = document.getElementById("model-selected-text");
  const modelPanel = document.getElementById("model-panel");
  const modelSearch = document.getElementById("model-search");
  const modelOptionsList = document.getElementById("model-options-list");
  const modelFieldHint = document.getElementById("model-field-hint");

  // State: Mapping Brand -> Models from dataset
  let brandModelsMap = {};
  let currentBrand = "";
  let currentModel = "";

  // ==========================================
  // 1. Inisialisasi Data & Cascading Combobox
  // ==========================================
  async function initializeData() {
    try {
      const response = await fetch("/static/brand_models.json");
      if (!response.ok) {
        throw new Error("Gagal mengambil data pemetaan brand_models.json");
      }
      brandModelsMap = await response.json();
      populateBrandList(Object.keys(brandModelsMap).sort());
    } catch (err) {
      console.error("Kesalahan inisialisasi brand_models:", err);
      // Fallback coba ke endpoint API backend
      try {
        const apiRes = await fetch("/api/brand-models");
        if (apiRes.ok) {
          brandModelsMap = await apiRes.json();
          populateBrandList(Object.keys(brandModelsMap).sort());
        }
      } catch (apiErr) {
        console.error("Gagal memuat fallback:", apiErr);
      }
    }
  }

  // Isi opsi daftar merek
  function populateBrandList(brands) {
    brandOptionsList.innerHTML = "";
    if (brands.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "combobox-empty";
      emptyLi.textContent = "Merek tidak ditemukan";
      brandOptionsList.appendChild(emptyLi);
      return;
    }

    brands.forEach((brandName) => {
      const li = document.createElement("li");
      li.className = "combobox-item";
      li.setAttribute("role", "option");
      li.dataset.value = brandName;
      li.textContent = brandName;
      if (brandName === currentBrand) {
        li.classList.add("is-selected");
      }
      li.addEventListener("click", () => selectBrand(brandName));
      brandOptionsList.appendChild(li);
    });
  }

  // Isi opsi daftar model berdasarkan merek terpilih
  function populateModelList(models) {
    modelOptionsList.innerHTML = "";
    if (!models || models.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "combobox-empty";
      emptyLi.textContent = "Tidak ada model yang sesuai";
      modelOptionsList.appendChild(emptyLi);
      return;
    }

    models.forEach((modelName) => {
      const li = document.createElement("li");
      li.className = "combobox-item";
      li.setAttribute("role", "option");
      li.dataset.value = modelName;
      li.textContent = modelName;
      if (modelName === currentModel) {
        li.classList.add("is-selected");
      }
      li.addEventListener("click", () => selectModel(modelName));
      modelOptionsList.appendChild(li);
    });
  }

  // Fungsi Pilih Merek (Brand)
  function selectBrand(brandName) {
    currentBrand = brandName;
    fields.brand.value = brandName;
    brandSelectedText.textContent = brandName;
    brandSelectedText.classList.remove("placeholder");
    brandTrigger.classList.remove("is-invalid");
    closeBrandPanel();

    // Reset pilihan model sebelumnya ketika brand berubah
    currentModel = "";
    fields.model.value = "";
    modelSelectedText.textContent = `Pilih model ${brandName}...`;
    modelSelectedText.classList.add("placeholder");
    modelTrigger.classList.remove("is-invalid");

    // Aktifkan dropdown model
    modelTrigger.disabled = false;
    modelTrigger.classList.remove("is-disabled");

    // Muat seluruh model yang sah untuk brand ini
    const modelsForBrand = brandModelsMap[brandName] || [];
    populateModelList(modelsForBrand);
    modelFieldHint.textContent = `Tersedia ${modelsForBrand.length} model resmi untuk merek ${brandName}.`;

    hideError();
  }

  // Fungsi Pilih Model
  function selectModel(modelName) {
    currentModel = modelName;
    fields.model.value = modelName;
    modelSelectedText.textContent = modelName;
    modelSelectedText.classList.remove("placeholder");
    modelTrigger.classList.remove("is-invalid");
    closeModelPanel();
    hideError();
  }

  // Panel Open/Close Handlers
  function openBrandPanel() {
    closeModelPanel();
    brandPanel.classList.remove("hidden");
    brandTrigger.setAttribute("aria-expanded", "true");
    brandSearch.value = "";
    populateBrandList(Object.keys(brandModelsMap).sort());
    setTimeout(() => brandSearch.focus(), 50);
  }

  function closeBrandPanel() {
    brandPanel.classList.add("hidden");
    brandTrigger.setAttribute("aria-expanded", "false");
  }

  function openModelPanel() {
    if (!currentBrand) return;
    closeBrandPanel();
    modelPanel.classList.remove("hidden");
    modelTrigger.setAttribute("aria-expanded", "true");
    modelSearch.value = "";
    const models = brandModelsMap[currentBrand] || [];
    populateModelList(models);
    setTimeout(() => modelSearch.focus(), 50);
  }

  function closeModelPanel() {
    modelPanel.classList.add("hidden");
    modelTrigger.setAttribute("aria-expanded", "false");
  }

  // Event Listeners Dropdown Triggers
  brandTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (brandPanel.classList.contains("hidden")) {
      openBrandPanel();
    } else {
      closeBrandPanel();
    }
  });

  modelTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!currentBrand) return;
    if (modelPanel.classList.contains("hidden")) {
      openModelPanel();
    } else {
      closeModelPanel();
    }
  });

  // Search Filter Brand
  brandSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const allBrands = Object.keys(brandModelsMap).sort();
    const filtered = allBrands.filter((b) => b.toLowerCase().includes(query));
    populateBrandList(filtered);
  });

  // Search Filter Model
  modelSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const allModels = brandModelsMap[currentBrand] || [];
    const filtered = allModels.filter((m) => m.toLowerCase().includes(query));
    populateModelList(filtered);
  });

  // Cegah klik search panel dari menutup panel
  brandPanel.addEventListener("click", (e) => e.stopPropagation());
  modelPanel.addEventListener("click", (e) => e.stopPropagation());

  // Klik di luar menutup dropdown
  document.addEventListener("click", () => {
    closeBrandPanel();
    closeModelPanel();
  });

  // Escape key menutup dropdown
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeBrandPanel();
      closeModelPanel();
    }
  });

  // ==========================================
  // 2. Preset Data Otomatis
  // ==========================================
  const samplePresets = {
    palisade: {
      brand: "Hyundai",
      model: "Palisade SEL",
      model_year: 2021,
      milage: 34742,
      fuel_type: "Gasoline",
      engine: "3.8L V6 24V GDI DOHC",
      transmission: "8-Speed Automatic",
      ext_col: "Moonlight Cloud",
      int_col: "Gray",
      accident: "At least 1 accident or damage reported"
    },
    audi: {
      brand: "Audi",
      model: "Q3 45 S line Premium Plus",
      model_year: 2021,
      milage: 9835,
      fuel_type: "Gasoline",
      engine: "2.0L I4 16V GDI DOHC Turbo",
      transmission: "8-Speed Automatic",
      ext_col: "Glacier White Metallic",
      int_col: "Black",
      accident: "None reported"
    },
    ford: {
      brand: "Ford",
      model: "Utility Police Interceptor Base",
      model_year: 2013,
      milage: 51000,
      fuel_type: "E85 Flex Fuel",
      engine: "300.0HP 3.7L V6 Cylinder Engine Flex Fuel Capability",
      transmission: "6-Speed A/T",
      ext_col: "Black",
      int_col: "Black",
      accident: "At least 1 accident or damage reported"
    }
  };

  function applyPreset(data) {
    // 1. Set Brand dan trigger cascading populate model
    selectBrand(data.brand);
    // 2. Set Model
    selectModel(data.model);

    // 3. Set atribut lainnya
    fields.model_year.value = data.model_year;
    fields.milage.value = data.milage;
    fields.fuel_type.value = data.fuel_type;
    fields.engine.value = data.engine;
    fields.transmission.value = data.transmission;
    fields.ext_col.value = data.ext_col;
    fields.int_col.value = data.int_col;
    fields.accident.value = data.accident;

    // Bersihkan highlight galat
    document.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    hideError();
  }

  if (presetPalisade) presetPalisade.addEventListener("click", () => applyPreset(samplePresets.palisade));
  if (presetAudi) presetAudi.addEventListener("click", () => applyPreset(samplePresets.audi));
  if (presetFord) presetFord.addEventListener("click", () => applyPreset(samplePresets.ford));

  // ==========================================
  // 3. Reset Formulir
  // ==========================================
  btnReset.addEventListener("click", () => {
    form.reset();
    currentBrand = "";
    currentModel = "";
    fields.brand.value = "";
    fields.model.value = "";

    brandSelectedText.textContent = "Pilih merek mobil...";
    brandSelectedText.classList.add("placeholder");

    modelSelectedText.textContent = "Pilih merek terlebih dahulu";
    modelSelectedText.classList.add("placeholder");
    modelTrigger.disabled = true;
    modelTrigger.classList.add("is-disabled");
    modelFieldHint.textContent = "Otomatis menyesuaikan dengan merek yang dipilih.";

    document.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    
    // Kembalikan ke state idle
    valuationResult.classList.add("hidden");
    valuationIdle.classList.remove("hidden");
    hideError();
  });

  // ==========================================
  // 4. Server Health Check
  // ==========================================
  async function checkServerHealth() {
    try {
      const res = await fetch("/health");
      if (res.ok) {
        const data = await res.json();
        if (data.model_loaded) {
          statusDot.className = "status-indicator-dot online";
          statusText.textContent = `Backend Siap (${data.total_brands_available || 57} merek aktif)`;
        } else {
          statusDot.className = "status-indicator-dot offline";
          statusText.textContent = "Model Machine Learning belum siap";
        }
      } else {
        statusDot.className = "status-indicator-dot offline";
        statusText.textContent = "Status Backend Degradasi";
      }
    } catch (err) {
      statusDot.className = "status-indicator-dot offline";
      statusText.textContent = "Backend tidak terhubung (port 8000)";
    }
  }

  checkServerHealth();
  initializeData();

  // ==========================================
  // 5. Validasi Sisi Klien
  // ==========================================
  function validateClientInputs() {
    const errors = [];
    document.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));

    // Validasi Brand
    if (!fields.brand.value.trim()) {
      brandTrigger.classList.add("is-invalid");
      errors.push("Merek mobil (Brand) wajib dipilih.");
    }

    // Validasi Model
    if (!fields.model.value.trim()) {
      modelTrigger.classList.add("is-invalid");
      errors.push("Model kendaraan wajib dipilih sesuai merek.");
    }

    // Validasi Tahun (1974 - 2024)
    const yearVal = parseInt(fields.model_year.value, 10);
    if (isNaN(yearVal) || yearVal < 1974 || yearVal > 2024) {
      fields.model_year.classList.add("is-invalid");
      errors.push("Tahun pembuatan (model_year) harus berada dalam rentang 1974 s.d. 2024.");
    }

    // Validasi Jarak Tempuh (0 - 405.000 mil)
    const milageVal = parseFloat(fields.milage.value);
    if (isNaN(milageVal) || milageVal < 0) {
      fields.milage.classList.add("is-invalid");
      errors.push("Jarak tempuh (milage) tidak boleh bernilai negatif.");
    } else if (milageVal > 405000) {
      fields.milage.classList.add("is-invalid");
      errors.push("Jarak tempuh (milage) melebihi batas wajar dataset pelatihan (maksimal 405.000 mil).");
    }

    // Validasi String Lainnya
    const textFields = ["fuel_type", "engine", "transmission", "ext_col", "int_col", "accident"];
    textFields.forEach((key) => {
      const el = fields[key];
      if (!el.value || !el.value.trim()) {
        el.classList.add("is-invalid");
        const labelText = el.closest(".form-field").querySelector(".field-label").textContent.replace("*", "").trim();
        errors.push(`Atribut '${labelText}' wajib diisi.`);
      }
    });

    return errors;
  }

  // ==========================================
  // 6. Tampilan Hasil & Galat
  // ==========================================
  function showLoading() {
    loadingSpinner.classList.remove("hidden");
    btnLabel.textContent = "Menghitung Estimasi...";
    btnSubmit.disabled = true;
    errorPanel.classList.add("hidden");
  }

  function hideLoading() {
    loadingSpinner.classList.add("hidden");
    btnLabel.textContent = "Hitung Estimasi Harga";
    btnSubmit.disabled = false;
  }

  function displayPredictionResult(price, payload) {
    // Format mata uang satu baris konsisten
    const formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);

    // Pastikan nominal dan USD pada satu baris
    priceHeadline.textContent = `${formattedPrice} USD`;

    // Ringkasan spesifikasi kendaraan
    const formattedMileage = new Intl.NumberFormat("en-US").format(payload.milage);
    specsSummaryBox.textContent = `${payload.model_year} ${payload.brand} ${payload.model} • ${formattedMileage} mil • ${payload.transmission}`;

    valuationIdle.classList.add("hidden");
    valuationResult.classList.remove("hidden");
    errorPanel.classList.add("hidden");

    // Scroll ke kartu jika pada layar mobile
    if (window.innerWidth <= 980) {
      document.getElementById("valuation-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function showError(title, message, details = []) {
    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorDetailsList.innerHTML = "";
    if (details && details.length > 0) {
      details.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        errorDetailsList.appendChild(li);
      });
      errorDetailsList.classList.remove("hidden");
    } else {
      errorDetailsList.classList.add("hidden");
    }
    errorPanel.classList.remove("hidden");
  }

  function hideError() {
    errorPanel.classList.add("hidden");
    errorDetailsList.innerHTML = "";
  }

  // ==========================================
  // 7. Event Submit Form & Fetch API
  // ==========================================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    // Validasi klien
    const validationErrors = validateClientInputs();
    if (validationErrors.length > 0) {
      showError("Periksa Data Masukan", "Terdapat data yang belum sesuai ketentuan:", validationErrors);
      return;
    }

    // Susun Payload JSON sesuai skema Pydantic
    const payload = {
      model_year: parseInt(fields.model_year.value, 10),
      milage: parseFloat(fields.milage.value),
      brand: fields.brand.value.trim(),
      model: fields.model.value.trim(),
      fuel_type: fields.fuel_type.value.trim(),
      engine: fields.engine.value.trim(),
      transmission: fields.transmission.value.trim(),
      ext_col: fields.ext_col.value.trim(),
      int_col: fields.int_col.value.trim(),
      accident: fields.accident.value.trim()
    };

    showLoading();

    try {
      const response = await fetch("/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      hideLoading();

      if (response.ok && data.success) {
        displayPredictionResult(data.predicted_price, payload);
      } else if (response.status === 422) {
        const details = data.details || [data.message || "Data masukan tidak memenuhi validasi backend."];
        showError("Validasi Backend Ditolak (HTTP 422)", "Kombinasi atau rentang data tidak valid:", details);
      } else {
        showError("Gagal Menghitung Prediksi", data.detail || data.message || "Terjadi kesalahan pada server saat kalkulasi harga.");
      }
    } catch (networkError) {
      hideLoading();
      showError("Koneksi Terputus", "Gagal menghubungi server FastAPI. Pastikan server lokal aktif di http://127.0.0.1:8000.");
    }
  });
});
