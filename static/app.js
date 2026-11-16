/**
 * Used Car Price Estimator — Application JavaScript
 * Kelompok 2 • Praktikum Pembelajaran Mesin • Universitas Bengkulu
 */

document.addEventListener("DOMContentLoaded", () => {
  // Theme Management (Dark / Light Mode)
  const themeToggleBtn = document.getElementById("theme-toggle");
  const sunIcon = themeToggleBtn ? themeToggleBtn.querySelector(".sun-icon") : null;
  const moonIcon = themeToggleBtn ? themeToggleBtn.querySelector(".moon-icon") : null;

  function initTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem("app_theme");
    } catch (e) {
      // localStorage might be disabled
    }

    const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);

    applyTheme(isDark);
  }

  function applyTheme(isDark) {
    if (isDark) {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
      document.documentElement.setAttribute("data-theme", "dark");
      if (sunIcon) sunIcon.classList.add("hidden");
      if (moonIcon) moonIcon.classList.remove("hidden");
    } else {
      document.body.classList.remove("dark-mode");
      document.body.classList.add("light-mode");
      document.documentElement.setAttribute("data-theme", "light");
      if (sunIcon) sunIcon.classList.remove("hidden");
      if (moonIcon) moonIcon.classList.add("hidden");
    }

    try {
      localStorage.setItem("app_theme", isDark ? "dark" : "light");
    } catch (e) {}
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isCurrentlyDark = document.body.classList.contains("dark-mode");
      applyTheme(!isCurrentlyDark);
    });
  }

  initTheme();

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
  const inferenceTimeBadge = document.getElementById("inference-time-badge");
  const specsChipsRow = document.getElementById("specs-chips-row");
  const priceRangeWrapper = document.getElementById("price-range-wrapper");
  const rangeValLow = document.getElementById("range-val-low");
  const rangeValHigh = document.getElementById("range-val-high");
  const btnCopyResult = document.getElementById("btn-copy-result");
  const copyBtnText = document.getElementById("copy-btn-text");

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

  // Field Error Spans
  const fieldErrorSpans = {
    brand: document.getElementById("err-brand"),
    model: document.getElementById("err-model"),
    model_year: document.getElementById("err-model_year"),
    milage: document.getElementById("err-milage"),
    fuel_type: document.getElementById("err-fuel_type"),
    engine: document.getElementById("err-engine"),
    transmission: document.getElementById("err-transmission"),
    ext_col: document.getElementById("err-ext_col"),
    int_col: document.getElementById("err-int_col"),
    accident: document.getElementById("err-accident")
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

  // State: Mapping Brand -> Models & Categories Metadata
  let brandModelsMap = {};
  let categoriesData = {};
  let currentBrand = "";
  let currentModel = "";
  let lastPredictionResult = null;

  // Active keyboard highlight indices for accessible comboboxes
  let brandHighlightIndex = -1;
  let modelHighlightIndex = -1;

  // ==========================================
  // 1. Inisialisasi Data & Cascading Combobox
  // ==========================================
  async function initializeData() {
    try {
      const [brandRes, catRes] = await Promise.all([
        fetch("/static/brand_models.json"),
        fetch("/static/categories.json")
      ]);

      if (brandRes.ok) {
        brandModelsMap = await brandRes.json();
      } else {
        const fallbackRes = await fetch("/api/brand-models");
        if (fallbackRes.ok) brandModelsMap = await fallbackRes.json();
      }

      if (catRes.ok) {
        categoriesData = await catRes.json();
      }

      populateBrandList(Object.keys(brandModelsMap).sort());
      populateDynamicCategories(categoriesData);

    } catch (err) {
      console.error("Kesalahan inisialisasi metadata:", err);
    }
  }

  // Isi seluruh datalist dan select dari categories.json
  function populateDynamicCategories(cat) {
    if (!cat) return;

    // 1. Fuel Type Select
    if (cat.fuel_type && fields.fuel_type) {
      const select = fields.fuel_type;
      const currentVal = select.value;
      select.innerHTML = '<option value="" disabled selected>Pilih bahan bakar...</option>';
      
      const fuelLabels = {
        "Gasoline": "Gasoline (Bensin)",
        "Diesel": "Diesel",
        "Hybrid": "Hybrid (HEV)",
        "Plug-In Hybrid": "Plug-In Hybrid (PHEV)",
        "E85 Flex Fuel": "E85 Flex Fuel",
        "not supported": "not supported (Tidak Didukung)",
        "–": "– (Tidak Ditentukan / Lainnya)"
      };

      cat.fuel_type.forEach(ft => {
        const opt = document.createElement("option");
        opt.value = ft;
        opt.textContent = fuelLabels[ft] || ft;
        select.appendChild(opt);
      });

      if (currentVal) select.value = currentVal;
    }

    // 2. Accident Select
    if (cat.accident && fields.accident) {
      const select = fields.accident;
      const currentVal = select.value;
      select.innerHTML = '<option value="" disabled selected>Pilih status riwayat...</option>';
      
      const accidentLabels = {
        "None reported": "None reported (Tidak ada catatan kecelakaan)",
        "At least 1 accident or damage reported": "At least 1 accident or damage reported (Ada catatan kecelakaan/kerusakan)"
      };

      cat.accident.forEach(acc => {
        const opt = document.createElement("option");
        opt.value = acc;
        opt.textContent = accidentLabels[acc] || acc;
        select.appendChild(opt);
      });

      if (currentVal) select.value = currentVal;
    }

    // 3. Engine Datalist
    if (cat.engine) {
      populateDatalist("engine-presets", cat.engine);
    }

    // 4. Transmission Datalist
    if (cat.transmission) {
      populateDatalist("trans-presets", cat.transmission);
    }

    // 5. Exterior Color Datalist
    if (cat.ext_col) {
      populateDatalist("ext-color-presets", cat.ext_col);
    }

    // 6. Interior Color Datalist
    if (cat.int_col) {
      populateDatalist("int-color-presets", cat.int_col);
    }
  }

  function populateDatalist(datalistId, items) {
    const dl = document.getElementById(datalistId);
    if (!dl) return;
    dl.innerHTML = "";
    items.forEach(val => {
      const opt = document.createElement("option");
      opt.value = val;
      dl.appendChild(opt);
    });
  }

  // Isi opsi daftar merek
  function populateBrandList(brands) {
    brandOptionsList.innerHTML = "";
    brandHighlightIndex = -1;

    if (brands.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "combobox-empty";
      emptyLi.textContent = "Merek tidak ditemukan";
      brandOptionsList.appendChild(emptyLi);
      return;
    }

    brands.forEach((brandName, idx) => {
      const li = document.createElement("li");
      li.className = "combobox-item";
      li.setAttribute("role", "option");
      li.id = `brand-opt-${idx}`;
      li.dataset.value = brandName;
      li.textContent = brandName;
      if (brandName === currentBrand) {
        li.classList.add("is-selected");
        li.setAttribute("aria-selected", "true");
      } else {
        li.setAttribute("aria-selected", "false");
      }
      li.addEventListener("click", () => selectBrand(brandName));
      brandOptionsList.appendChild(li);
    });
  }

  // Isi opsi daftar model berdasarkan merek terpilih
  function populateModelList(models) {
    modelOptionsList.innerHTML = "";
    modelHighlightIndex = -1;

    if (!models || models.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "combobox-empty";
      emptyLi.textContent = "Tidak ada model yang sesuai";
      modelOptionsList.appendChild(emptyLi);
      return;
    }

    models.forEach((modelName, idx) => {
      const li = document.createElement("li");
      li.className = "combobox-item";
      li.setAttribute("role", "option");
      li.id = `model-opt-${idx}`;
      li.dataset.value = modelName;
      li.textContent = modelName;
      if (modelName === currentModel) {
        li.classList.add("is-selected");
        li.setAttribute("aria-selected", "true");
      } else {
        li.setAttribute("aria-selected", "false");
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
    clearFieldError("brand");
    closeBrandPanel();

    // Reset pilihan model sebelumnya ketika brand berubah
    currentModel = "";
    fields.model.value = "";
    modelSelectedText.textContent = `Pilih model ${brandName}...`;
    modelSelectedText.classList.add("placeholder");
    clearFieldError("model");

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
    clearFieldError("model");
    closeModelPanel();
    hideError();
  }

  // Panel Open/Close Handlers dengan ARIA
  function openBrandPanel() {
    closeModelPanel();
    brandPanel.classList.remove("hidden");
    brandCombobox.setAttribute("aria-expanded", "true");
    brandTrigger.setAttribute("aria-expanded", "true");
    brandSearch.value = "";
    populateBrandList(Object.keys(brandModelsMap).sort());
    setTimeout(() => brandSearch.focus(), 50);
  }

  function closeBrandPanel() {
    brandPanel.classList.add("hidden");
    brandCombobox.setAttribute("aria-expanded", "false");
    brandTrigger.setAttribute("aria-expanded", "false");
    brandTrigger.removeAttribute("aria-activedescendant");
    brandHighlightIndex = -1;
  }

  function openModelPanel() {
    if (!currentBrand) return;
    closeBrandPanel();
    modelPanel.classList.remove("hidden");
    modelCombobox.setAttribute("aria-expanded", "true");
    modelTrigger.setAttribute("aria-expanded", "true");
    modelSearch.value = "";
    const models = brandModelsMap[currentBrand] || [];
    populateModelList(models);
    setTimeout(() => modelSearch.focus(), 50);
  }

  function closeModelPanel() {
    modelPanel.classList.add("hidden");
    modelCombobox.setAttribute("aria-expanded", "false");
    modelTrigger.setAttribute("aria-expanded", "false");
    modelTrigger.removeAttribute("aria-activedescendant");
    modelHighlightIndex = -1;
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

  // Navigasi Keyboard Aksesibel pada Combobox Brand
  brandSearch.addEventListener("keydown", (e) => {
    const items = brandOptionsList.querySelectorAll(".combobox-item");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      brandHighlightIndex = (brandHighlightIndex + 1) % items.length;
      updateHighlight(items, brandHighlightIndex, brandTrigger);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      brandHighlightIndex = (brandHighlightIndex - 1 + items.length) % items.length;
      updateHighlight(items, brandHighlightIndex, brandTrigger);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (brandHighlightIndex >= 0 && brandHighlightIndex < items.length) {
        selectBrand(items[brandHighlightIndex].dataset.value);
        brandTrigger.focus();
      }
    } else if (e.key === "Escape") {
      closeBrandPanel();
      brandTrigger.focus();
    }
  });

  // Navigasi Keyboard Aksesibel pada Combobox Model
  modelSearch.addEventListener("keydown", (e) => {
    const items = modelOptionsList.querySelectorAll(".combobox-item");
    if (items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      modelHighlightIndex = (modelHighlightIndex + 1) % items.length;
      updateHighlight(items, modelHighlightIndex, modelTrigger);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      modelHighlightIndex = (modelHighlightIndex - 1 + items.length) % items.length;
      updateHighlight(items, modelHighlightIndex, modelTrigger);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (modelHighlightIndex >= 0 && modelHighlightIndex < items.length) {
        selectModel(items[modelHighlightIndex].dataset.value);
        modelTrigger.focus();
      }
    } else if (e.key === "Escape") {
      closeModelPanel();
      modelTrigger.focus();
    }
  });

  function updateHighlight(items, index, triggerEl) {
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add("is-highlighted");
        item.scrollIntoView({ block: "nearest" });
        if (triggerEl) triggerEl.setAttribute("aria-activedescendant", item.id);
      } else {
        item.classList.remove("is-highlighted");
      }
    });
  }

  // Cegah klik search panel dari menutup panel
  brandPanel.addEventListener("click", (e) => e.stopPropagation());
  modelPanel.addEventListener("click", (e) => e.stopPropagation());

  // Klik di luar menutup dropdown
  document.addEventListener("click", () => {
    closeBrandPanel();
    closeModelPanel();
  });

  // Escape key global
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
    selectBrand(data.brand);
    selectModel(data.model);

    fields.model_year.value = data.model_year;
    fields.milage.value = data.milage;
    fields.fuel_type.value = data.fuel_type;
    fields.engine.value = data.engine;
    fields.transmission.value = data.transmission;
    fields.ext_col.value = data.ext_col;
    fields.int_col.value = data.int_col;
    fields.accident.value = data.accident;

    clearAllErrors();
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

    clearAllErrors();
    
    // Kembalikan ke state idle
    valuationResult.classList.add("hidden");
    valuationIdle.classList.remove("hidden");
    hideError();
  });

  // ==========================================
  // 4. Server Health Check & Polling (30s)
  // ==========================================
  async function checkServerHealth() {
    try {
      const res = await fetch("/health?format=json");
      if (res.ok) {
        const data = await res.json();
        if (data.model_loaded) {
          statusDot.className = "status-indicator-dot online";
          const modelName = data.model_type || "RandomForest";
          statusText.textContent = `Backend Siap (${data.total_brands_available || 57} merek • ${modelName})`;
        } else {
          statusDot.className = "status-indicator-dot offline";
          statusText.textContent = "Model Machine Learning belum siap";
        }
      } else {
        statusDot.className = "status-indicator-dot offline";
        statusText.textContent = "Status Backend Degradasi (503)";
      }
    } catch (err) {
      statusDot.className = "status-indicator-dot offline";
      statusText.textContent = "Backend tidak terhubung (port 8000)";
    }
  }

  checkServerHealth();
  initializeData();
  setInterval(checkServerHealth, 30000);

  // ==========================================
  // 5. Validasi Masukan & Penanganan Galat Field-Level
  // ==========================================
  function clearFieldError(fieldKey) {
    const inputEl = fields[fieldKey];
    if (!inputEl) return;

    if (fieldKey === "brand") {
      brandTrigger.classList.remove("is-invalid");
    } else if (fieldKey === "model") {
      modelTrigger.classList.remove("is-invalid");
    } else {
      inputEl.classList.remove("is-invalid");
    }

    const span = fieldErrorSpans[fieldKey];
    if (span) {
      span.textContent = "";
      span.classList.add("hidden");
    }
  }

  function setFieldError(fieldKey, message) {
    const inputEl = fields[fieldKey];
    if (!inputEl) return;

    if (fieldKey === "brand") {
      brandTrigger.classList.add("is-invalid");
    } else if (fieldKey === "model") {
      modelTrigger.classList.add("is-invalid");
    } else {
      inputEl.classList.add("is-invalid");
    }

    const span = fieldErrorSpans[fieldKey];
    if (span) {
      span.textContent = message;
      span.classList.remove("hidden");
    }
  }

  function clearAllErrors() {
    Object.keys(fields).forEach(key => clearFieldError(key));
  }

  function validateClientInputs() {
    clearAllErrors();
    const errors = [];
    let firstInvalidField = null;

    function markInvalid(key, msg) {
      setFieldError(key, msg);
      errors.push(msg);
      if (!firstInvalidField) {
        firstInvalidField = key === "brand" ? brandTrigger : (key === "model" ? modelTrigger : fields[key]);
      }
    }

    // 1. Validasi Brand
    if (!fields.brand.value.trim()) {
      markInvalid("brand", "Merek mobil (Brand) wajib dipilih.");
    }

    // 2. Validasi Model
    if (!fields.model.value.trim()) {
      markInvalid("model", "Model kendaraan wajib dipilih sesuai merek.");
    }

    // 3. Validasi Tahun (1974 - 2024)
    const yearVal = parseInt(fields.model_year.value, 10);
    if (isNaN(yearVal) || yearVal < 1974 || yearVal > 2024) {
      markInvalid("model_year", "Tahun pembuatan harus berada dalam rentang 1974 s.d. 2024.");
    }

    // 4. Validasi Jarak Tempuh (0 - 405.000 mil)
    const milageVal = parseFloat(fields.milage.value);
    if (isNaN(milageVal) || milageVal < 0) {
      markInvalid("milage", "Jarak tempuh tidak boleh bernilai negatif.");
    } else if (milageVal > 405000) {
      markInvalid("milage", "Jarak tempuh melebihi batas wajar dataset (maksimal 405.000 mil).");
    }

    // 5. Validasi Teks Lainnya
    const textFields = ["fuel_type", "engine", "transmission", "ext_col", "int_col", "accident"];
    textFields.forEach((key) => {
      const el = fields[key];
      if (!el.value || !el.value.trim()) {
        const labelText = el.closest(".form-field").querySelector(".field-label").textContent.replace("*", "").trim();
        markInvalid(key, `Kolom '${labelText}' wajib diisi.`);
      }
    });

    if (firstInvalidField) {
      firstInvalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof firstInvalidField.focus === "function") firstInvalidField.focus();
    }

    return errors;
  }

  // ==========================================
  // 6. Animasi Count-Up & Tampilan Hasil
  // ==========================================
  function animateCountUp(targetVal, duration = 650) {
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    const formattedTarget = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(targetVal);

    if (prefersReducedMotion) {
      priceHeadline.textContent = `${formattedTarget} USD`;
      return;
    }

    const startTime = performance.now();
    const startVal = 0;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (targetVal - startVal) * easeOut;

      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(current);

      priceHeadline.textContent = `${formatted} USD`;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        priceHeadline.textContent = `${formattedTarget} USD`;
      }
    }

    requestAnimationFrame(step);
  }

  function displayPredictionResult(resData, payload) {
    lastPredictionResult = {
      price: resData.predicted_price,
      payload: payload,
      price_low: resData.price_low,
      price_high: resData.price_high,
      inference_ms: resData.inference_ms
    };

    // 1. Animasi count-up harga USD
    animateCountUp(resData.predicted_price);

    // 2. Durasi inferensi
    if (resData.inference_ms !== undefined && resData.inference_ms !== null) {
      inferenceTimeBadge.textContent = `${resData.inference_ms} ms`;
      inferenceTimeBadge.classList.remove("hidden");
    } else {
      inferenceTimeBadge.classList.add("hidden");
    }

    // 3. Ringkasan Chips Spesifikasi
    specsChipsRow.innerHTML = "";
    const formattedMileage = new Intl.NumberFormat("en-US").format(payload.milage);
    const chips = [
      `${payload.model_year}`,
      `${payload.brand} ${payload.model}`,
      `${formattedMileage} mil`,
      `${payload.fuel_type}`,
      `${payload.transmission}`,
      `${payload.ext_col} / ${payload.int_col}`
    ];

    chips.forEach(text => {
      const chip = document.createElement("span");
      chip.className = "spec-chip";
      chip.textContent = text;
      specsChipsRow.appendChild(chip);
    });

    // 4. Rentang Harga Probabilitas Regresi (Tampil jika price_low dan price_high tersedia)
    if (resData.price_low !== null && resData.price_high !== null && resData.price_low !== undefined && resData.price_high !== undefined) {
      const fmtLow = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(resData.price_low);
      const fmtHigh = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(resData.price_high);
      rangeValLow.textContent = fmtLow;
      rangeValHigh.textContent = fmtHigh;
      priceRangeWrapper.classList.remove("hidden");
    } else {
      priceRangeWrapper.classList.add("hidden");
    }

    valuationIdle.classList.add("hidden");
    valuationResult.classList.remove("hidden");
    errorPanel.classList.add("hidden");

    // Scroll ke panel hasil jika di layar kecil
    if (window.innerWidth <= 980) {
      document.getElementById("valuation-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // Tombol Salin Hasil
  if (btnCopyResult) {
    btnCopyResult.addEventListener("click", async () => {
      if (!lastPredictionResult) return;
      const fmtPrice = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(lastPredictionResult.price);
      const p = lastPredictionResult.payload;
      const fmtMil = new Intl.NumberFormat("en-US").format(p.milage);
      const textToCopy = `Estimasi Harga Mobil: ${fmtPrice} USD\nKendaraan: ${p.model_year} ${p.brand} ${p.model}\nJarak Tempuh: ${fmtMil} mil | Transmisi: ${p.transmission}\nBahan Bakar: ${p.fuel_type} | Kondisi: ${p.accident}\nSumber: Used Car Price Estimator (Kelompok 2 - Universitas Bengkulu)`;

      try {
        await navigator.clipboard.writeText(textToCopy);
        btnCopyResult.classList.add("copied");
        copyBtnText.textContent = "Tersalin ✓";
        setTimeout(() => {
          btnCopyResult.classList.remove("copied");
          copyBtnText.textContent = "Salin Hasil";
        }, 2000);
      } catch (err) {
        console.error("Gagal menyalin:", err);
      }
    });
  }

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

    // 1. Validasi Sisi Klien
    const clientErrors = validateClientInputs();
    if (clientErrors.length > 0) {
      showError("Periksa Data Masukan", "Terdapat data yang belum sesuai ketentuan:", clientErrors);
      return;
    }

    // 2. Susun Payload JSON
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
        displayPredictionResult(data, payload);
      } else if (response.status === 422) {
        const details = data.details || [data.message || "Data masukan tidak memenuhi validasi backend."];
        
        // Petakan galat ke field terkait
        let firstScrolled = false;
        details.forEach(errStr => {
          const colonIdx = errStr.indexOf(":");
          if (colonIdx > 0) {
            const fieldName = errStr.substring(0, colonIdx).trim();
            const errMsg = errStr.substring(colonIdx + 1).trim();
            if (fields[fieldName]) {
              setFieldError(fieldName, errMsg);
              if (!firstScrolled) {
                const target = fieldName === "brand" ? brandTrigger : (fieldName === "model" ? modelTrigger : fields[fieldName]);
                target.scrollIntoView({ behavior: "smooth", block: "center" });
                firstScrolled = true;
              }
            }
          }
        });

        showError("Validasi Ditolak (HTTP 422)", "Kombinasi data tidak valid:", details);
      } else {
        showError("Gagal Menghitung Prediksi", data.detail || data.message || "Terjadi kesalahan pada server saat kalkulasi harga.");
      }
    } catch (networkError) {
      hideLoading();
      showError("Koneksi Terputus", "Gagal menghubungi server FastAPI. Pastikan server lokal aktif di http://127.0.0.1:8000.");
    }
  });
});
