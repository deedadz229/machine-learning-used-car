# Used Car Price Estimator — Tugas Besar Machine Learning

**Kelompok:** 2  
**Mata Kuliah:** Praktikum Pembelajaran Mesin  
**Program Studi:** Sistem Informasi, Fakultas Teknik, Universitas Bengkulu  
**Tahun Akademik:** 2026/2027  
**Fokus Implementasi:** Penyempurnaan Tampilan UI/UX Otomotif, Dokumentasi Interaktif Swagger UI /docs, Dasbor Telemetri /health, & Cascading Combobox

---

## 1. Ringkasan Sistem & Pembaruan

Aplikasi **Used Car Price Estimator** menyajikan sistem estimasi harga mobil bekas berbasis model **Machine Learning (Random Forest Regressor)** dengan antarmuka web otomotif profesional yang minimalis (*precision slate enterprise theme*):

- **Dokumentasi API Swagger UI (/docs):**
  - Menggunakan tema *Precision Slate* selaras dengan antarmuka utama (`/static/swagger-custom.css`).
  - Dilengkapi navigasi cepat di topbar menuju **Aplikasi Web** (`/`) dan **Dasbor Telemetri** (`/health`).
  - Metadata lengkap: tabel 10 fitur wajib, tipe data, rentang nilai, alur "Try it out", serta disclaimer akademik.
  - Dropdown **Examples** interaktif: 3 contoh data valid (*Hyundai Palisade 2021*, *Audi Q3 2021*, *Ford Utility Police Interceptor 2013*) dan demonstrasi galat validasi 422 (*Tahun < 1974*, *Kombinasi Brand-Model tidak cocok*).
  - Dokumentasi seluruh status HTTP: 200 (Sukses), 422 (Unprocessable Content), 500 (Internal Error), dan 503 (Service Unavailable).
- **Dasbor Telemetri & Pemeriksaan Sistem (/health):**
  - **Negosiasi Konten (Content Negotiation):** Menampilkan antarmuka visual dasbor status (*health.html*) beranimasi denyut saat diakses melalui peramban web (*Accept: text/html*), dan mengembalikan format JSON terstruktur saat diakses oleh API client (*cURL, fetch, Swagger*). Parameter `?format=json` tersedia untuk memaksa JSON.
  - Menampilkan metrik lengkap: status model, tipe estimator (*RandomForestRegressor*), berkas bobot, jumlah fitur (10 fitur), versi scikit-learn, versi Python, *uptime* server, dan stempel waktu ISO UTC.
  - Penanganan status degradasi (HTTP 503) bila model belum dimuat.
- **Penyempurnaan Antarmuka Web (Frontend):**
  - **Dukungan Dark Mode:** Token warna `:root` adaptif dengan deteksi preferensi sistem (`prefers-color-scheme: dark`) serta tombol toggle tema manual (Matahari/Bulan) yang tersimpan di `localStorage`. Memenuhi standar kontras minimal WCAG AA.
  - **Datalist Dinamis & Valid:** Atribut *engine* (1.044 opsi), *transmission* (55 opsi), *ext_col* (271 opsi), dan *int_col* (139 opsi) dimuat secara dinamis dari `static/categories.json` via JavaScript.
  - **Aksesibilitas Combobox:** Dilengkapi atribut ARIA (`role="combobox"`, `role="listbox"`, `aria-activedescendant`, `aria-expanded`), navigasi keyboard penuh (*Panah Atas/Bawah, Enter, Escape, Tab*), dan deteksi klik di luar panel.
  - **Penanganan Galat Field-Level (HTTP 422):** Menyorot batas input dengan warna merah, memunculkan pesan galat spesifik di bawah field terkait, dan melakukan *smooth scroll* otomatis ke field pertama yang salah.
  - **Hasil Estimasi Informatif:**
    - Animasi *count-up* halus (menghormati `prefers-reduced-motion`).
    - Format mata uang USD rapi dalam satu baris (`$51,907.71 USD`).
    - Badge waktu respons inferensi dalam milidetik (ms).
    - Ringkasan spesifikasi dalam bentuk *chips* visual.
    - Tombol **"Salin Hasil"** ke papan klip (*clipboard*) dengan umpan balik visual instan.
    - Bilah visual rentang harga (*price range bar*) untuk regresi (aktif saat konstanta evaluasi `MODEL_MAE_USD` diisi).
- **Stabilitas & Kompatibilitas Runtime:**
  - Dilengkapi *compatibility layer* cerdas pada modul pemuatan model untuk memastikan model hasil serialisasi scikit-learn 1.6.1 dapat dimuat dan dijalankan secara andal pada berbagai versi lingkungan Python.

---

## 2. Struktur Direktori Proyek

```text
machine-learning-used-car/
│
├── app.py                      # Backend API utama (FastAPI, Lifespan, Swagger Kustom, Negosiasi Konten /health)
├── requirements.txt            # Dependensi sistem resmi (scikit-learn==1.6.1)
├── test_system.py              # Suite pengujian otomatis (20/20 Test Cases Lulus 100%)
├── architecture_diagram.png    # Diagram arsitektur sistem resolusi tinggi
├── used_cars.csv               # Dataset pelatihan resmi (4.009 baris data)
├── README.md                   # Petunjuk instalasi & dokumentasi sistem
│
├── model/
│   └── used_car_price_model.joblib   # Pipeline model Scikit-Learn hasil training (Random Forest)
│
├── static/
│   ├── index.html              # Antarmuka web utama otomotif modern & form 10 fitur
│   ├── health.html             # Dasbor HTML visual pemeriksaan status kesehatan server
│   ├── swagger-custom.css      # Stylesheet Swagger UI tema Precision Slate & Dark Mode
│   ├── style.css               # Desain antarmuka utama minimalis, dark mode & responsif
│   ├── app.js                  # Logika Cascading Combobox, Fetch API, keyboard nav & DOM update
│   ├── brand_models.json       # Pemetaan resmi 57 Brand -> 1.899 Models
│   └── categories.json         # Metadata kategori resmi fitur pelatihan
│
└── code_figures/               # Cuplikan visual pendukung laporan
```

---

## 3. Petunjuk Menjalankan Aplikasi

### Langkah 1: Instalasi Dependensi
Pastikan dependensi sistem telah terpasang:
```bash
pip install -r requirements.txt
```

### Langkah 2: Menjalankan Server Backend
Jalankan server aplikasi menggunakan Uvicorn:
```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
Atau jalankan langsung:
```bash
python app.py
```

### Langkah 3: Mengakses Aplikasi di Browser
Buka peramban web dan akses URL:
- **Aplikasi Web Utama:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Dokumentasi Interaktif Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Dokumentasi ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Dasbor Status Server (HTML):** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Status Server Versi JSON:** [http://127.0.0.1:8000/health?format=json](http://127.0.0.1:8000/health?format=json)
- **Endpoint Metadata Brand-Model:** [http://127.0.0.1:8000/api/brand-models](http://127.0.0.1:8000/api/brand-models)

---

## 4. Pengujian Otomatis (20 Test Cases)

Jalankan suite pengujian komprehensif untuk memverifikasi seluruh fungsi backend, validasi Pydantic, negosiasi konten `/health`, rute Swagger kustom `/docs`, skema OpenAPI, dan format respons:

```bash
python test_system.py
```

Hasil Pengujian: **20/20 Test Cases Lulus (100.0%)**.

---

## 5. Disclaimer Akademik

> **Disclaimer Akademik:** Aplikasi ini merupakan prototipe edukatif yang dikembangkan untuk keperluan Tugas Besar Praktikum Pembelajaran Mesin, Program Studi Sistem Informasi, Universitas Bengkulu. Estimasi yang dihasilkan merupakan pendekatan statistik berbasis regresi Random Forest dan bukan merupakan penentu transaksi resmi, penjamin harga pasar riil, maupun rekomendasi finansial profesional.
