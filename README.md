# Used Car Price Estimator — Tugas Besar Machine Learning

**Kelompok:** 2  
**Mata Kuliah:** Praktikum Pembelajaran Mesin  
**Program Studi:** Sistem Informasi, Fakultas Teknik, Universitas Bengkulu  
**Tahun Akademik:** 2026/2027  
**Fokus Implementasi:** UI/UX Redesign, Cascading Searchable Combobox & BAB III  

---

## 1. Ringkasan Sistem & Pembaruan UI/UX

Aplikasi **Used Car Price Estimator** telah disempurnakan menjadi antarmuka web otomotif profesional yang minimalis dan terbebas dari stereotip *template AI-generated*:
- **Pembersihan Visual (Anti-Slop):** Menghilangkan gradien gelap berlebihan, border glowing, dan pill badges yang berjejal. Menggunakan palet enterprise *precision slate* (`#0F172A`), latar netral bersih (`#F8FAFC`), dan tipografi *Plus Jakarta Sans*.
- **Cascading Searchable Combobox (Merek & Model):**
  - Menyajikan seluruh **57 merek** mobil asli dari dataset pelatihan.
  - Dropdown **Model** bergantung sepenuhnya pada Brand yang dipilih (**1.899 model unik** terpetakan secara autentik).
  - Dilengkapi fitur pencarian instan (*real-time filter*) untuk kemudahan eksplorasi.
  - Mengubah Brand secara otomatis mereset dan memperbarui daftar Model.
- **Validasi Integritas Relasi (Backend & Frontend):** Backend FastAPI menolak kombinasi Brand dan Model yang tidak sesuai dengan mengembalikan status **HTTP 422**.
- **Hasil Estimasi Proporsional:** Nilai estimasi dan satuan ditampilkan dalam **satu baris** (misal: `$51,907.71 USD`) secara elegan.
- **Desain Responsif:** Layout 2 kolom pada desktop dengan *sticky valuation card*, dan 1 kolom adaptif pada tablet/smartphone tanpa *horizontal scroll*.

---

## 2. Struktur Direktori Proyek

```text
e:\Tugas Besar Machine Learning\
│
├── app.py                      # Backend API utama (FastAPI, Pydantic, Relasi Brand-Model)
├── requirements.txt            # Daftar pustaka & dependensi sistem
├── test_system.py              # Suite pengujian otomatis (15 Test Cases Lulus 100%)
├── architecture_diagram.png    # Diagram arsitektur sistem resolusi tinggi (300 DPI)
├── used_cars.csv               # Dataset pelatihan resmi (4.009 baris data)
├── README.md                   # Petunjuk instalasi & dokumentasi sistem
│
├── model/
│   └── used_car_price_model.joblib   # Pipeline model Scikit-Learn hasil training (Random Forest)
│
├── static/
│   ├── index.html              # Antarmuka web otomotif modern & form 10 fitur
│   ├── style.css               # Desain antarmuka minimalis, elegan & responsif
│   ├── app.js                  # Logika Cascading Combobox, Fetch API & DOM update
│   ├── brand_models.json       # Pemetaan resmi 57 Brand -> 1.899 Models
│   └── categories.json         # Metadata kategori fitur lainnya
│
├── code_figures/               # Cuplikan kode untuk laporan Word BAB III
│   ├── gambar_3_2_model_loading.png
│   ├── gambar_3_3_pydantic_schema.png
│   ├── gambar_3_4_health_endpoint.png
│   ├── gambar_3_5_predict_endpoint.png
│   └── gambar_3_6_fetch_api.png
│
└── tubes ml new.docx           # Laporan Word dengan BAB III yang telah terisi lengkap
```

---

## 3. Petunjuk Menjalankan Aplikasi

### Langkah 1: Navigasi ke Direktori Kerja
```powershell
cd "e:\Tugas Besar Machine Learning"
```

### Langkah 2: Menjalankan Server Backend
Jalankan server aplikasi menggunakan Uvicorn:
```powershell
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
Atau jalankan langsung:
```powershell
python app.py
```

### Langkah 3: Mengakses Aplikasi di Browser
Buka peramban web dan akses URL:
- **Aplikasi Web Utama:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Dokumentasi Interaktif Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Endpoint Pemeriksaan Server (Health Check):** [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Endpoint Metadata Brand-Model:** [http://127.0.0.1:8000/api/brand-models](http://127.0.0.1:8000/api/brand-models)

---

## 4. Pengujian Otomatis (15 Test Cases)

Jalankan suite pengujian otomatis untuk memverifikasi seluruh fungsi backend, validasi Pydantic, cascading combobox, dan penolakan relasi brand-model yang tidak cocok:

```powershell
python test_system.py
```

Tingkat kelulusan: **15/15 Lulus (100.0%)**.

---

## 5. Disclaimer Akademik

> **Disclaimer Akademik:** Aplikasi ini merupakan prototipe edukatif yang dikembangkan untuk keperluan pembelajaran Machine Learning. Hasil prediksi merupakan estimasi berdasarkan pola data historis dan bukan merupakan penentu keputusan profesional maupun jaminan harga transaksi kendaraan yang sebenarnya.
