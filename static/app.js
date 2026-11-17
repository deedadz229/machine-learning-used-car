/**
 * Used Car Price Estimator — Application JavaScript
 * Kelompok 2 • Praktikum Pembelajaran Mesin • Universitas Bengkulu
 */

document.addEventListener("DOMContentLoaded", () => {
  // Exchange Rate Reference Constant: 1 USD ≈ Rp 16.000
  const USD_TO_IDR_RATE = 16000;

  // Theme Management (Dark / Light Mode)
  const themeToggleBtn = document.getElementById("theme-toggle");
  const sunIcon = themeToggleBtn ? themeToggleBtn.querySelector(".sun-icon") : null;
  const moonIcon = themeToggleBtn ? themeToggleBtn.querySelector(".moon-icon") : null;

  function initTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem("app_theme");
    } catch (e) {}

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

  // Form Elements
  const form = document.getElementById("prediction-form");
  const btnSubmit = document.getElementById("btn-submit");
  const btnReset = document.getElementById("btn-reset");
  const btnLabel = document.getElementById("btn-label");
  const loadingSpinner = document.getElementById("loading-spinner");

  // Valuation Panel References (Dual Currency: IDR + USD)
  const valuationIdle = document.getElementById("valuation-idle");
  const valuationResult = document.getElementById("valuation-result");
  const priceHeadlineIdr = document.getElementById("price-headline-idr");
  const priceHeadlineUsd = document.getElementById("price-headline-usd");
  const inferenceTimeBadge = document.getElementById("inference-time-badge");
  const specsChipsRow = document.getElementById("specs-chips-row");
  const priceRangeWrapper = document.getElementById("price-range-wrapper");
  const rangeIdrLow = document.getElementById("range-idr-low");
  const rangeIdrHigh = document.getElementById("range-idr-high");
  const rangeValLow = document.getElementById("range-val-low");
  const rangeValHigh = document.getElementById("range-val-high");
  const btnCopyResult = document.getElementById("btn-copy-result");
  const copyBtnText = document.getElementById("copy-btn-text");

  // Error Alert References
  const errorPanel = document.getElementById("error-panel");
  const errorTitle = document.getElementById("error-title");
  const errorMessage = document.getElementById("error-message");
  const errorDetailsList = document.getElementById("error-details-list");
  const btnRetry = document.getElementById("btn-retry");

  // Server Status References
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  // Preset Buttons
  const presetPalisade = document.getElementById("preset-palisade");
  const presetAudi = document.getElementById("preset-audi");
  const presetFord = document.getElementById("preset-ford");

  // Progress Indicators
  const progressFill = document.getElementById("progress-fill");
  const progressTextEl = document.getElementById("progress-text");
  const stepBadge1 = document.getElementById("step-badge-1");
  const stepBadge2 = document.getElementById("step-badge-2");

  // Form Field References
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

  // Application State
  let brandModelsMap = {};
  let categoriesData = {};
  let currentBrand = "";
  let currentModel = "";
  let lastPredictionResult = null;
  let activePresetId = null;

  let brandHighlightIndex = -1;
  let modelHighlightIndex = -1;

  // Form progress tracking
  const section1Fields = ["brand", "model", "model_year", "milage"];
  const section2Fields = ["fuel_type", "engine", "transmission", "ext_col", "int_col", "accident"];
  const allFieldKeys = [...section1Fields, ...section2Fields];

  function getFieldValue(key) {
    const el = fields[key];
    if (!el) return "";
    return (el.value || "").trim();
  }

  function updateFormProgress() {
    let filledCount = 0;
    allFieldKeys.forEach(key => {
      if (getFieldValue(key)) filledCount++;
    });

    const pct = Math.round((filledCount / allFieldKeys.length) * 100);
    if (progressFill) progressFill.style.width = pct + "%";
    if (progressTextEl) progressTextEl.textContent = `${filledCount} / ${allFieldKeys.length} Bidang Terisi`;

    const s1Done = section1Fields.every(k => !!getFieldValue(k));
    const s2Done = section2Fields.every(k => !!getFieldValue(k));

    if (stepBadge1) {
      if (s1Done) {
        stepBadge1.classList.add("is-complete");
        stepBadge1.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      } else {
        stepBadge1.classList.remove("is-complete");
        stepBadge1.textContent = "1";
      }
    }

    if (stepBadge2) {
      if (s2Done) {
        stepBadge2.classList.add("is-complete");
        stepBadge2.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      } else {
        stepBadge2.classList.remove("is-complete");
        stepBadge2.textContent = "2";
      }
    }
  }

  function attachProgressListeners() {
    ["model_year", "milage", "engine", "transmission", "ext_col", "int_col"].forEach(key => {
      const el = fields[key];
      if (el) {
        el.addEventListener("input", updateFormProgress);
        el.addEventListener("change", updateFormProgress);
      }
    });

    ["fuel_type", "accident"].forEach(key => {
      const el = fields[key];
      if (el) el.addEventListener("change", updateFormProgress);
    });
  }

  // Toast Notification
  function showToast(message, duration = 2500) {
    const existing = document.querySelector(".toast-notification");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast-notification";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-out");
      toast.addEventListener("animationend", () => toast.remove());
    }, duration);
  }

  // Bespoke Success Particle Burst (British Racing Green, Sage, Cognac, Gold)
  function spawnSuccessParticles(originEl) {
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const container = document.createElement("div");
    container.className = "success-particle-container";
    document.body.appendChild(container);

    const colors = ["#10b981", "#34d399", "#b45309", "#d97706", "#0b3821", "#fbbf24"];
    const count = 22;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "success-particle";
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const dist = 45 + Math.random() * 65;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist - 18;
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      p.style.backgroundColor = colors[i % colors.length];
      p.style.setProperty("--tx", tx + "px");
      p.style.setProperty("--ty", ty + "px");
      p.style.animationDelay = (Math.random() * 0.08) + "s";
      container.appendChild(p);
    }

    setTimeout(() => container.remove(), 1200);
  }

  // Currency Helpers
  function formatUSD(val) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val) + " USD";
  }

  function formatIDRRaw(val) {
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0
    }).format(Math.round(val));
  }

  function formatCompactIDR(val) {
    const rounded = Math.round(val);
    if (rounded >= 1000000000) {
      return "Rp " + (rounded / 1000000000).toFixed(2).replace(".", ",") + " M";
    }
    if (rounded >= 1000000) {
      return "Rp " + (rounded / 1000000).toFixed(1).replace(".", ",") + " Jt";
    }
    return "Rp " + formatIDRRaw(rounded);
  }

  // Data Initialization
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

  function populateDynamicCategories(cat) {
    if (!cat) return;

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

    if (cat.engine) populateDatalist("engine-presets", cat.engine);
    if (cat.transmission) populateDatalist("trans-presets", cat.transmission);
    if (cat.ext_col) populateDatalist("ext-color-presets", cat.ext_col);
    if (cat.int_col) populateDatalist("int-color-presets", cat.int_col);
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

  function selectBrand(brandName) {
    currentBrand = brandName;
    fields.brand.value = brandName;
    brandSelectedText.textContent = brandName;
    brandSelectedText.classList.remove("placeholder");
    clearFieldError("brand");
    closeBrandPanel();

    currentModel = "";
    fields.model.value = "";
    modelSelectedText.textContent = `Pilih model ${brandName}...`;
    modelSelectedText.classList.add("placeholder");
    clearFieldError("model");

    modelTrigger.disabled = false;
    modelTrigger.classList.remove("is-disabled");

    const modelsForBrand = brandModelsMap[brandName] || [];
    populateModelList(modelsForBrand);
    modelFieldHint.textContent = `Tersedia ${modelsForBrand.length} model resmi untuk merek ${brandName}.`;

    hideError();
    updateFormProgress();
  }

  function selectModel(modelName) {
    currentModel = modelName;
    fields.model.value = modelName;
    modelSelectedText.textContent = modelName;
    modelSelectedText.classList.remove("placeholder");
    clearFieldError("model");
    closeModelPanel();
    hideError();
    updateFormProgress();
  }

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

  brandSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const allBrands = Object.keys(brandModelsMap).sort();
    const filtered = allBrands.filter((b) => b.toLowerCase().includes(query));
    populateBrandList(filtered);
  });

  modelSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    const allModels = brandModelsMap[currentBrand] || [];
    const filtered = allModels.filter((m) => m.toLowerCase().includes(query));
    populateModelList(filtered);
  });

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

  brandPanel.addEventListener("click", (e) => e.stopPropagation());
  modelPanel.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => {
    closeBrandPanel();
    closeModelPanel();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeBrandPanel();
      closeModelPanel();
    }
  });

  // Preset Specifications
  const samplePresets = {
    palisade: {
      brand: "Hyundai",
      model: "Palisade SEL",
      model_year: 2021,
      milage: 34742,
      fuel_type: "Gasoline",
      engine: "3.8L V6 24V GDI DOHC",
      transmission: "8-Speed Automatic with SHIFTRONIC",
      ext_col: "Hyper White",
      int_col: "Black",
      accident: "None reported"
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

  function applyPreset(data, presetId) {
    document.querySelectorAll(".preset-btn").forEach(btn => btn.classList.remove("is-active"));
    const activeBtn = document.getElementById(`preset-${presetId}`);
    if (activeBtn) activeBtn.classList.add("is-active");
    activePresetId = presetId;

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
    updateFormProgress();

    showToast(`Data contoh ${data.brand} ${data.model.split(" ")[0]} dimuat`);
  }

  if (presetPalisade) presetPalisade.addEventListener("click", () => applyPreset(samplePresets.palisade, "palisade"));
  if (presetAudi) presetAudi.addEventListener("click", () => applyPreset(samplePresets.audi, "audi"));
  if (presetFord) presetFord.addEventListener("click", () => applyPreset(samplePresets.ford, "ford"));

  // Reset Form
  btnReset.addEventListener("click", () => {
    form.reset();
    currentBrand = "";
    currentModel = "";
    activePresetId = null;
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
    
    valuationResult.classList.add("hidden");
    valuationIdle.classList.remove("hidden");
    hideError();
    updateFormProgress();

    document.querySelectorAll(".preset-btn").forEach(btn => btn.classList.remove("is-active"));

    showToast("Formulir berhasil direset");
  });

  // Server Health Check
  async function checkServerHealth() {
    try {
      const res = await fetch("/health?format=json");
      if (res.ok) {
        const data = await res.json();
        if (data.model_loaded) {
          if (statusDot) statusDot.className = "status-indicator-dot online";
          const modelName = data.model_type || "RandomForest";
          if (statusText) statusText.textContent = `Backend Siap (${data.total_brands_available || 57} merek \u2022 ${modelName})`;
        } else {
          if (statusDot) statusDot.className = "status-indicator-dot offline";
          if (statusText) statusText.textContent = "Model Machine Learning belum siap";
        }
      } else {
        if (statusDot) statusDot.className = "status-indicator-dot offline";
        if (statusText) statusText.textContent = "Status Backend Degradasi (503)";
      }
    } catch (err) {
      if (statusDot) statusDot.className = "status-indicator-dot offline";
      if (statusText) statusText.textContent = "Backend tidak terhubung (port 8000)";
    }
  }

  checkServerHealth();
  initializeData();
  attachProgressListeners();
  setInterval(checkServerHealth, 30000);

  // Field Validation
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

    if (!fields.brand.value.trim()) {
      markInvalid("brand", "Merek mobil (Brand) wajib dipilih.");
    }

    if (!fields.model.value.trim()) {
      markInvalid("model", "Model kendaraan wajib dipilih sesuai merek.");
    }

    const yearVal = parseInt(fields.model_year.value, 10);
    if (isNaN(yearVal) || yearVal < 1974 || yearVal > 2024) {
      markInvalid("model_year", "Tahun pembuatan harus berada dalam rentang 1974 s.d. 2024.");
    }

    const milageVal = parseFloat(fields.milage.value);
    if (isNaN(milageVal) || milageVal < 0) {
      markInvalid("milage", "Jarak tempuh tidak boleh bernilai negatif.");
    } else if (milageVal > 405000) {
      markInvalid("milage", "Jarak tempuh melebihi batas wajar dataset (maksimal 405.000 mil).");
    }

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

  // Dual Currency Count-Up Animation (IDR + USD Simultaneous)
  function animateDualCountUp(targetUSD, targetIDR, duration = 700) {
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    
    const finalFormattedIDR = formatIDRRaw(targetIDR);
    const finalFormattedUSD = formatUSD(targetUSD);

    if (prefersReducedMotion) {
      priceHeadlineIdr.textContent = finalFormattedIDR;
      priceHeadlineUsd.textContent = finalFormattedUSD;
      return;
    }

    const startTime = performance.now();
    const startUSD = 0;
    const startIDR = 0;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentUSD = startUSD + (targetUSD - startUSD) * easeOut;
      const currentIDR = startIDR + (targetIDR - startIDR) * easeOut;

      priceHeadlineIdr.textContent = formatIDRRaw(currentIDR);
      priceHeadlineUsd.textContent = formatUSD(currentUSD);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        priceHeadlineIdr.textContent = finalFormattedIDR;
        priceHeadlineUsd.textContent = finalFormattedUSD;
      }
    }

    requestAnimationFrame(step);
  }

  function displayPredictionResult(resData, payload) {
    const predictedUSD = resData.predicted_price;
    const predictedIDR = Math.round(predictedUSD * USD_TO_IDR_RATE);

    lastPredictionResult = {
      priceUSD: predictedUSD,
      priceIDR: predictedIDR,
      payload: payload,
      price_low: resData.price_low,
      price_high: resData.price_high,
      inference_ms: resData.inference_ms
    };

    // 1. Dual Count-up: IDR & USD
    animateDualCountUp(predictedUSD, predictedIDR);

    // 2. Latency Pill
    if (resData.inference_ms !== undefined && resData.inference_ms !== null) {
      inferenceTimeBadge.textContent = `${resData.inference_ms} ms`;
      inferenceTimeBadge.classList.remove("hidden");
    } else {
      inferenceTimeBadge.classList.add("hidden");
    }

    // 3. Spec Summary Chips
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

    // 4. Dual-Currency Range Bounds
    if (resData.price_low !== null && resData.price_high !== null && resData.price_low !== undefined && resData.price_high !== undefined) {
      const lowUSD = resData.price_low;
      const highUSD = resData.price_high;
      const lowIDR = lowUSD * USD_TO_IDR_RATE;
      const highIDR = highUSD * USD_TO_IDR_RATE;

      rangeIdrLow.textContent = formatCompactIDR(lowIDR);
      rangeValLow.textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(lowUSD);

      rangeIdrHigh.textContent = formatCompactIDR(highIDR);
      rangeValHigh.textContent = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(highUSD);

      priceRangeWrapper.classList.remove("hidden");
    } else {
      priceRangeWrapper.classList.add("hidden");
    }

    valuationIdle.classList.add("hidden");
    valuationResult.classList.remove("hidden");
    errorPanel.classList.add("hidden");

    // Celebrate with custom automotive particles
    spawnSuccessParticles(priceHeadlineIdr);

    if (window.innerWidth <= 980) {
      document.getElementById("valuation-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // Copy Result (Includes both IDR and USD breakdown)
  if (btnCopyResult) {
    btnCopyResult.addEventListener("click", async () => {
      if (!lastPredictionResult) return;
      const fmtUSD = formatUSD(lastPredictionResult.priceUSD);
      const fmtIDR = "Rp " + formatIDRRaw(lastPredictionResult.priceIDR);
      const p = lastPredictionResult.payload;
      const fmtMil = new Intl.NumberFormat("en-US").format(p.milage);

      const textToCopy = [
        "ESTIMASI HARGA PASAR MOBIL BEKAS",
        `• Rupiah (IDR): ${fmtIDR}`,
        `• Dolar (USD): ${fmtUSD}`,
        `• Acuan Kurs: 1 USD ≈ Rp 16.000`,
        "",
        `Kendaraan: ${p.model_year} ${p.brand} ${p.model}`,
        `Jarak Tempuh: ${fmtMil} mil`,
        `Transmisi: ${p.transmission}`,
        `Bahan Bakar: ${p.fuel_type}`,
        `Kondisi: ${p.accident}`,
        "",
        "Sumber: Used Car Price Estimator (Kelompok 2 • Praktikum Pembelajaran Mesin • Universitas Bengkulu)"
      ].join("\n");

      try {
        await navigator.clipboard.writeText(textToCopy);
        btnCopyResult.classList.add("copied");
        copyBtnText.textContent = "Tersalin \u2713";
        showToast("Hasil estimasi (IDR & USD) disalin ke papan klip");
        setTimeout(() => {
          btnCopyResult.classList.remove("copied");
          copyBtnText.textContent = "Salin Hasil (IDR & USD)";
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

    if (window.innerWidth <= 980) {
      errorPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function hideError() {
    errorPanel.classList.add("hidden");
    errorDetailsList.innerHTML = "";
  }

  if (btnRetry) {
    btnRetry.addEventListener("click", () => {
      hideError();
      const firstInvalid = document.querySelector(".is-invalid");
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof firstInvalid.focus === "function") firstInvalid.focus();
      } else {
        btnSubmit.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  // Form Submit Handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError();

    const clientErrors = validateClientInputs();
    if (clientErrors.length > 0) {
      showError("Periksa Data Masukan", "Terdapat data yang belum sesuai ketentuan:", clientErrors);
      return;
    }

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
      showError("Koneksi Terputus", "Gagal menghubungi server backend. Pastikan server lokal aktif di http://127.0.0.1:8000.");
    }
  });
});
