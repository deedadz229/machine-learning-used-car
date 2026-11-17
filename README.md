# Used Car Price Estimator: Tugas Besar Machine Learning

**Kelompok:** 2  
**Mata Kuliah:** Praktikum Pembelajaran Mesin  
**Program Studi:** Sistem Informasi, Fakultas Teknik, Universitas Bengkulu  
**Tahun Akademik:** 2026/2027  
**Fokus Implementasi:** Antarmuka Web Otomotif Interaktif, Estimasi Ganda Rupiah (IDR) & Dolar (USD), Cascading Combobox 57 Merek, Dasbor Telemetri `/health`, & Dokumentasi API Swagger `/docs`.

---

## 1. Ringkasan Sistem & Fitur Utama

Aplikasi **Used Car Price Estimator** adalah sistem estimasi nilai pasar mobil bekas berbasis model regresi Machine Learning (**Random Forest Regressor**) yang dilatih menggunakan data historis 4.009 transaksi kendaraan.

### Fitur Utama Antarmuka (UI/UX)
- **Estimasi Ganda Rupiah (IDR) & Dolar (USD):**
  - **Angka Utama Rupiah:** Menghitung konversi langsung hasil prediksi model ke mata uang Rupiah dengan pemisah ribuan standar Indonesia (kurs acuan: 1 USD ≈ Rp 16.000).
  - **Sub-headline Dolar (USD):** Menampilkan nilai prediksi murni dari model regresi Machine Learning beserta lencana latensi inferensi dalam milidetik (ms).
  - **Rentang Harga Wajar Dua Mata Uang:** Menampilkan batas bawah dan atas estimasi regresi dalam format ringkas IDR dan USD (contoh: `Rp 510 Jt ($31.8K)` s.d. `Rp 602 Jt ($37.6K)`).
  - **Salin Hasil Terpadu:** Tombol *Salin Hasil (IDR & USD)* untuk menyalin ringkasan estimasi lengkap beserta spesifikasi kendaraan ke papan klip (*clipboard*).
- **Palet Warna Otomotif Klasik (Bespoke Non-AI Cliché):**
  - Mengusung tema *British Racing Emerald* (`#0b3821`), kanvas *Warm Sandstone Alabaster* (`#f6f5f0`), dan aksen *Burnished Cognac Leather* (`#b45309`) yang elegan dan khas dunia otomotif prestisius.
  - Bebas dari gradien ungu/sian generik yang sering dihasilkan oleh generator AI standar.
- **Dukungan Dark Mode Penuh:**
  - Mode gelap bertema *Deep Obsidian Spruce* (`#0a110d`) dengan kontras rasio tinggi (WCAG AAA 16:1) dan aksen *Luminous Sage Mint* (`#10b981`).
  - Dilengkapi tombol toggle Matahari/Bulan di header yang tersimpan otomatis pada `localStorage`.
- **Cascading Combobox Cerdas:**
  - Pemilihan merek mobil (*Brand*) secara dinamis memfilter dan membuka daftar model resmi yang valid (*Model*).
  - Dilengkapi fitur pencarian cepat (*fuzzy-search*) dan navigasi keyboard penuh (*Panah Atas/Bawah, Enter, Escape*).
- **Muat Data Contoh Sekali Klik (Presets):**
  - Tersedia tombol cepat untuk memuat spesifikasi nyata: *Hyundai Palisade 2021 (SUV)*, *Audi Q3 2021 (Premium)*, dan *Ford Interceptor 2013 (V6)*.
- **Indikator Progres Pengisian:**
  - Bilah progres interaktif yang melacak kelengkapan 10 bidang input secara langsung (*real-time*).
- **Animasi & Umpan Balik Halus:**
  - Animasi *count-up* ganda pada angka Rupiah dan Dolar dengan kurva perlambatan natural (*cubic ease-out*).
  - Partikel selebrasi halus saat kalkulasi berhasil diselesaikan.

---

## 2. Persyaratan Sistem

Sebelum menjalankan aplikasi, pastikan perangkat Anda telah terpasang:
- **Python:** Versi 3.10 atau yang lebih baru (disarankan Python 3.11 atau 3.12).
- **pip:** Package installer bawaan Python.
- **Peramban Web:** Google Chrome, Mozilla Firefox, Microsoft Edge, atau Safari versi modern.

---

## 3. Panduan Lengkap Menjalankan Antarmuka Web (UI)

Ikuti langkah-langkah di bawah ini untuk menginstal dependensi dan meluncurkan antarmuka web:

### Langkah 1: Buka Terminal / PowerShell
Masuk ke direktori proyek:
```bash
cd "D:\Tubes ML\machine-learning-used-car"
```

### Langkah 2: (Opsional) Buat dan Aktifkan Virtual Environment
Membuat virtual environment sangat disarankan agar dependensi terisolasi:

- **Pada Windows (PowerShell):**
  ```powershell
  python -m venv .venv
  .venv\Scripts\Activate.ps1
  ```
- **Pada Windows (Command Prompt):**
  ```cmd
  python -m venv .venv
  .venv\Scripts\activate.bat
  ```
- **Pada macOS / Linux:**
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### Langkah 3: Pasang Dependensi Proyek
Pasang paket yang tercantum pada berkas `requirements.txt`:
```bash
pip install -r requirements.txt
```

> **Catatan Dependensi Utama:** Paket mencakup `fastapi`, `uvicorn[standard]`, `scikit-learn==1.6.1`, `pandas`, `numpy`, `joblib`, dan `pydantic`.

### Langkah 4: Jalankan Server Aplikasi
Anda dapat menjalankan server menggunakan perintah langsung Python:
```bash
python app.py
```

Atau menggunakan CLI Uvicorn secara eksplisit dengan fitur *hot-reload*:
```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Ketika server berhasil berjalan, terminal akan menampilkan pesan:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

### Langkah 5: Buka Antarmuka Web di Browser
Buka peramban web pilihan Anda dan ketikkan alamat berikut pada *address bar*:

👉 **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)** atau **[http://localhost:8000/](http://localhost:8000/)**

---

## 4. Cara Menggunakan Antarmuka Web (Panduan Interaksi)

Setelah halaman web terbuka, ikuti alur berikut untuk menguji estimasi harga mobil:

1. **Uji Cepat Menggunakan Data Contoh (Preset):**
   - Di bagian atas formulir, klik salah satu tombol preset, misalnya **Hyundai Palisade 2021**.
   - Seluruh 10 bidang input formulir akan terisi secara otomatis dengan data valid.
   - Bilah progres kelengkapan akan terisi penuh (10 / 10 Bidang Terisi).
2. **Pengisian Manual:**
   - **Merek Mobil (Brand):** Klik dropdown merek dan ketik untuk mencari (tersedia 57 merek resmi).
   - **Model Kendaraan:** Setelah merek dipilih, dropdown model akan aktif dan menampilkan varian model yang sah untuk merek tersebut.
   - **Tahun Pembuatan:** Masukkan tahun perakitan mobil (rentang valid: 1974 s.d. 2024).
   - **Jarak Tempuh (Mileage):** Masukkan jarak tempuh dalam satuan mil (rentang valid: 0 s.d. 405.000 mil).
   - **Powertrain & Kondisi:** Pilih jenis bahan bakar, ketik/pilih spesifikasi mesin, transmisi, warna eksterior, warna interior, dan catatan riwayat kecelakaan.
3. **Menghitung Estimasi:**
   - Klik tombol utama berwarna hijau tua: **"Hitung Estimasi Harga"**.
   - Sistem akan mengirimkan data ke endpoint `/predict` via backend FastAPI.
   - Panel di sebelah kanan akan bertransisi ke tampilan hasil dan menampilkan:
     - **Nominal Rupiah (IDR):** Contoh `Rp 566.188.480`.
     - **Nominal Dolar (USD):** Contoh `$35,386.78 USD`.
     - **Waktu Inferensi:** Contoh `46.16 ms`.
     - **Bilah Rentang Harga Wajar:** Menampilkan batas minimum dan maksimum estimasi pasar.
     - **Chips Spesifikasi:** Ringkasan atribut kendaraan yang diprediksi.
4. **Menyalin Hasil:**
   - Klik tombol **"Salin Hasil (IDR & USD)"** untuk menyalin rangkuman estimasi ke clipboard Anda.
5. **Mengganti Tema (Mode Terang / Gelap):**
   - Klik ikon Matahari / Bulan pada pojok kanan atas bilah navigasi untuk berpindah antara tema *Warm Sandstone* dan *Deep Obsidian Spruce*.
6. **Mereset Formulir:**
   - Klik tombol **"Reset Formulir"** untuk mengembalikan semua isian ke kondisi awal.

---

## 5. Alamat Endpoint & Dokumentasi Tambahan

Selain antarmuka pengguna utama, server menyediakan endpoint interaktif lainnya:

| Halaman / Fitur | Alamat URL | Keterangan |
| :--- | :--- | :--- |
| **Antarmuka Pengguna Utama (UI)** | `http://127.0.0.1:8000/` | Halaman interaktif estimasi harga mobil bekas |
| **Dokumentasi API Swagger UI** | `http://127.0.0.1:8000/docs` | Dokumentasi interaktif OpenAPI dengan alur "Try it out" |
| **Dokumentasi Alternatif ReDoc** | `http://127.0.0.1:8000/redoc` | Dokumentasi skema API terstruktur ReDoc |
| **Dasbor Kesehatan Server (HTML)** | `http://127.0.0.1:8000/health` | Tampilan visual metrik runtime dan status model ML |
| **Telemetri Kesehatan (JSON)** | `http://127.0.0.1:8000/health?format=json` | Output JSON status server untuk pengujian otomatis |
| **Katalog Brand & Model** | `http://127.0.0.1:8000/api/brand-models` | Pemetaan JSON daftar 57 merek dan ribuan model resmi |

---

## 6. Pengujian Otomatis Sistem

Suite pengujian otomatis disediakan untuk memvalidasi seluruh fungsi backend, integritas model, aturan Pydantic, dan skema respons:

Jalankan perintah berikut di terminal:
```bash
python test_system.py
```

Hasil Pengujian: **20/20 Test Cases Lulus (Tingkat Keberhasilan 100%)**.

---

## 7. Struktur Direktori Proyek

```text
machine-learning-used-car/
│
├── app.py                      # Backend API utama (FastAPI, Lifespan, Swagger Kustom, Negosiasi Konten /health)
├── requirements.txt            # Dependensi sistem resmi (scikit-learn==1.6.1)
├── test_system.py              # Suite pengujian otomatis (20 test cases terverifikasi)
├── used_cars.csv               # Dataset pelatihan historis (4.009 baris data transaksi)
├── README.md                   # Petunjuk instalasi, panduan UI, & dokumentasi teknis
│
├── model/
│   └── used_car_price_model.joblib   # Pipeline model Machine Learning hasil pelatihan (Random Forest)
│
├── static/
│   ├── index.html              # Antarmuka web utama otomotif (form 10 fitur & panel hasil IDR/USD)
│   ├── style.css               # Desain British Racing Emerald, Warm Sandstone & Dark Mode
│   ├── app.js                  # Logika Cascading Combobox, kalkulasi Rupiah, Fetch API & animasi
│   ├── health.html             # Dasbor HTML visual pemeriksaan status kesehatan server
│   ├── brand_models.json       # Basis data resmi pemetaan 57 Merek ke ribuan Model
│   ├── categories.json         # Metadata kategori resmi fitur pelatihan (transmisi, warna, mesin)
│   ├── swagger-custom.css      # Kustomisasi tema Swagger UI
│   ├── redoc-custom.css        # Kustomisasi tema ReDoc
│   ├── redoc.standalone.js     # Skrip pustaka lokal ReDoc
│   ├── swagger-ui-bundle.js    # Skrip pustaka lokal Swagger UI
│   └── swagger-ui.css          # Stylesheet pustaka lokal Swagger UI
```

---

## 8. Disclaimer Akademik

> **Disclaimer Akademik:** Aplikasi ini merupakan prototipe edukatif yang dikembangkan untuk keperluan Tugas Besar Praktikum Pembelajaran Mesin, Program Studi Sistem Informasi, Fakultas Teknik, Universitas Bengkulu. Estimasi yang dihasilkan merupakan pendekatan statistik berbasis regresi Random Forest dari dataset historis dan bukan merupakan penentu transaksi resmi, penjamin harga pasar riil, maupun rekomendasi finansial profesional.
