import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pathlib import Path
import shutil

DOC_PATH = r"d:\tubes ml new.docx"
BACKUP_PATH = r"d:\tubes ml new_backup.docx"
DIAGRAM_PATH = r"e:\Tugas Besar Machine Learning\architecture_diagram.png"
FIGURES_DIR = Path(r"e:\Tugas Besar Machine Learning\code_figures")

# Gunakan backup sebagai basis yang bersih jika ada
source_doc_path = BACKUP_PATH if Path(BACKUP_PATH).exists() else DOC_PATH
doc = docx.Document(source_doc_path)

# Temukan index heading 3.1, 3.2, dan BAB IV
p31_idx = None
p32_idx = None
p4_idx = None

for i, p in enumerate(doc.paragraphs):
    if p.text.startswith("3.1"):
        p31_idx = i
    elif p.text.startswith("3.2"):
        p32_idx = i
    elif p.text.startswith("BAB IV"):
        p4_idx = i

print(f"Index: 3.1={p31_idx}, 3.2={p32_idx}, BAB IV={p4_idx}")

def format_run(run, bold=False, italic=False, font_size=12, color=None):
    run.font.name = "Times New Roman"
    run.font.size = Pt(font_size)
    run.bold = bold
    run.italic = italic
    if color:
        run.font.color.rgb = color

def set_para_format(p, alignment=WD_ALIGN_PARAGRAPH.JUSTIFY, line_spacing=1.5):
    p.alignment = alignment
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)

# ==========================================
# 1. Konten untuk Bagian 3.1
# Disisipkan SEBELUM heading 3.2 (antara 3.1 dan 3.2)
# ==========================================
target_p_32 = doc.paragraphs[p32_idx]

p_intro = target_p_32.insert_paragraph_before()
set_para_format(p_intro)
r = p_intro.add_run(
    "\tArsitektur sistem Used Car Price Estimator dirancang dengan pola client-server modern yang memisahkan antarmuka pengguna (front-end) dengan mesin inferensi Machine Learning (back-end). Pendekatan ini memungkinkan interaksi formulir yang responsif, validasi data yang ketat sebelum inferensi, mekanisme cascading dropdown antara merek (Brand) dan model kendaraan, serta pemanfaatan pipeline pemodelan Scikit-learn yang telah disimpan dalam format biner .joblib tanpa memerlukan pelatihan ulang (re-training). Hubungan aliran data dan integrasi antar komponen disajikan pada Gambar 3.1 berikut."
)
format_run(r)

# Gambar 3.1 Diagram Arsitektur
p_img_31 = target_p_32.insert_paragraph_before()
set_para_format(p_img_31, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_img_31 = p_img_31.add_run()
r_img_31.add_picture(DIAGRAM_PATH, width=Inches(5.9))

p_cap_31 = target_p_32.insert_paragraph_before()
set_para_format(p_cap_31, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_cap_31 = p_cap_31.add_run("Gambar 3.1 Diagram Arsitektur Sistem Prediksi Harga Mobil Bekas")
format_run(r_cap_31)

p_lbl_31 = target_p_32.insert_paragraph_before()
set_para_format(p_lbl_31, alignment=WD_ALIGN_PARAGRAPH.LEFT)
r_lbl_31 = p_lbl_31.add_run("Penjelasan:")
format_run(r_lbl_31, bold=True)

p_desc_31a = target_p_32.insert_paragraph_before()
set_para_format(p_desc_31a)
r_desc_31a = p_desc_31a.add_run(
    "\tPada Gambar 3.1 ditunjukkan alur arsitektur sistem secara menyeluruh dari interaksi awal pengguna pada antarmuka web hingga kalkulasi hasil estimasi harga oleh model Machine Learning. Sistem beroperasi secara asinkronus dan terbagi ke dalam 8 tahapan berurutan sebagai berikut:\n"
    "1. Interaksi Pengguna & Form HTML5: Pengguna membuka aplikasi melalui peramban web dan menginputkan 10 atribut spesifikasi kendaraan yang mencakup fitur numerik (model_year dan milage) serta fitur kategorikal (brand, model, fuel_type, engine, transmission, ext_col, int_col, dan accident). Pemilihan brand dan model menggunakan searchable cascading dropdown yang menyajikan 57 merek dan 1.899 model resmi dari dataset pelatihan.\n"
    "2. Validasi Klien & JavaScript Fetch API: Ketika tombol 'Hitung Estimasi Harga' ditekan, event submit dicegah dari reload halaman (event.preventDefault). JavaScript melakukan validasi awal terhadap kelengkapan dan rentang angka, menyusun objek data ke dalam struktur JSON, lalu mengirimkannya via HTTP POST asinkron ke endpoint /predict.\n"
    "3. Penerimaan Request oleh FastAPI Backend: Framework FastAPI menerima HTTP POST request pada router /predict dengan performa tinggi berbasis asynchronous worker (ASGI/Uvicorn).\n"
    "4. Validasi Skema Pydantic: Payload JSON diparsing ke dalam skema Pydantic BaseModel (CarFeatures). Sistem memverifikasi bahwa model_year berada pada rentang data latih 1974–2024, milage pada rentang 0–405.000 mil, seluruh atribut teks tidak berupa string kosong atau spasi murni, serta memvalidasi kesesuaian relasi antara merek dan model. Apabila terdapat anomali atau ketidakcocokan relasi, sistem otomatis mengembalikan status HTTP 422 Unprocessable Content tanpa mengeksekusi inferensi model.\n"
    "5. Rekonstruksi DataFrame Pandas: Data yang telah lolos validasi dikonversikan menjadi satu baris Pandas DataFrame dengan susunan 10 kolom fitur yang urutannya identik dengan susunan matriks X saat pelatihan model.\n"
    "6. Inferensi Pipeline Machine Learning (.joblib): Pipeline model yang telah dimuat ke memori saat startup (terdiri dari ColumnTransformer untuk imputasi median/modus, StandardScaler, OneHotEncoder dengan handle_unknown='ignore', serta algoritma Random Forest Regressor 200 trees) mengeksekusi fungsi model.predict().\n"
    "7. Pembentukan Respons JSON: Hasil estimasi harga numerik dibulatkan menjadi 2 angka desimal dan dibungkus ke dalam format JSON respons dengan status HTTP 200 OK yang memuat predicted_price, currency ('USD'), dan status pesan keberhasilan.\n"
    "8. Pembaruan DOM Tanpa Reload (Display Result): Fungsi callback fetch pada JavaScript menerima respons JSON, memformat angka ke dalam mata uang dolar ($ USD) dalam satu baris, dan menampilkan kartu hasil (Valuation Card) secara dinamis kepada pengguna."
)
format_run(r_desc_31a)

# ==========================================
# 2. Konten untuk Bagian 3.2
# ==========================================
for i, p in enumerate(doc.paragraphs):
    if p.text.startswith("BAB IV"):
        target_p_b4 = p
        break

# 3.2.1 Pemuatan Model
p_img_32 = target_p_b4.insert_paragraph_before()
set_para_format(p_img_32, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_img_32 = p_img_32.add_run()
r_img_32.add_picture(str(FIGURES_DIR / "gambar_3_2_model_loading.png"), width=Inches(5.8))

p_cap_32 = target_p_b4.insert_paragraph_before()
set_para_format(p_cap_32, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_cap_32 = p_cap_32.add_run("Gambar 3.2 Proses Pemuatan Model Machine Learning .joblib dan Metadata Menggunakan Lifespan FastAPI")
format_run(r_cap_32)

p_lbl_32 = target_p_b4.insert_paragraph_before()
set_para_format(p_lbl_32, alignment=WD_ALIGN_PARAGRAPH.LEFT)
r_lbl_32 = p_lbl_32.add_run("Penjelasan:")
format_run(r_lbl_32, bold=True)

p_desc_32 = target_p_b4.insert_paragraph_before()
set_para_format(p_desc_32)
r_desc_32 = p_desc_32.add_run(
    "\tPada Gambar 3.2 ditunjukkan potongan kode inisialisasi dan pemuatan file model biner used_car_price_model.joblib beserta metadata pemetaan brand_models.json. Model dan metadata dimuat tepat satu kali pada saat siklus hidup aplikasi dimulai (startup) menggunakan mekanisme lifespan FastAPI berbasis contextmanager asynchronous. Pendekatan ini sangat krusial untuk mencegah pemanggilan joblib.load() berulang pada setiap request yang dapat menyebabkan overhead pembacaan disk I/O dan memory leakage. Path file model didefinisikan secara relatif terhadap direktori kerja aplikasi dan dilengkapi penanganan galat (exception handling) apabila file tidak ditemukan."
)
format_run(r_desc_32)

# 3.2.2 Skema Pydantic
p_img_33 = target_p_b4.insert_paragraph_before()
set_para_format(p_img_33, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_img_33 = p_img_33.add_run()
r_img_33.add_picture(str(FIGURES_DIR / "gambar_3_3_pydantic_schema.png"), width=Inches(5.8))

p_cap_33 = target_p_b4.insert_paragraph_before()
set_para_format(p_cap_33, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_cap_33 = p_cap_33.add_run("Gambar 3.3 Skema Validasi Pydantic BaseModel (CarFeatures) dengan Pengecekan Relasi Brand-Model")
format_run(r_cap_33)

p_lbl_33 = target_p_b4.insert_paragraph_before()
set_para_format(p_lbl_33, alignment=WD_ALIGN_PARAGRAPH.LEFT)
r_lbl_33 = p_lbl_33.add_run("Penjelasan:")
format_run(r_lbl_33, bold=True)

p_desc_33 = target_p_b4.insert_paragraph_before()
set_para_format(p_desc_33)
r_desc_33 = p_desc_33.add_run(
    "\tPada Gambar 3.3 ditunjukkan deklarasi kelas skema CarFeatures yang mewarisi Pydantic BaseModel. Setiap atribut fitur diberi batasan ketat berdasarkan statistik deskriptif dataset pelatihan, yaitu model_year dengan batasan ge=1974 dan le=2024, serta milage dengan ge=0.0 dan le=405000.0. Selain itu, validator khusus (@field_validator) diterapkan pada seluruh atribut string guna membersihkan spasi awal/akhir (stripping) dan menolak nilai yang hanya berisi spasi kosong. Ditambahkan pula validator model (@model_validator) yang memverifikasi integritas relasi bahwa model yang dikirimkan pengguna benar-benar terdaftar sebagai model resmi dari merek (Brand) tersebut dalam dataset, mencegah input kombinasi fiktif."
)
format_run(r_desc_33)

# 3.2.3 Endpoint Health
p_img_34 = target_p_b4.insert_paragraph_before()
set_para_format(p_img_34, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_img_34 = p_img_34.add_run()
r_img_34.add_picture(str(FIGURES_DIR / "gambar_3_4_health_endpoint.png"), width=Inches(5.8))

p_cap_34 = target_p_b4.insert_paragraph_before()
set_para_format(p_cap_34, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_cap_34 = p_cap_34.add_run("Gambar 3.4 Implementasi Endpoint GET /health")
format_run(r_cap_34)

p_lbl_34 = target_p_b4.insert_paragraph_before()
set_para_format(p_lbl_34, alignment=WD_ALIGN_PARAGRAPH.LEFT)
r_lbl_34 = p_lbl_34.add_run("Penjelasan:")
format_run(r_lbl_34, bold=True)

p_desc_34 = target_p_b4.insert_paragraph_before()
set_para_format(p_desc_34)
r_desc_34 = p_desc_34.add_run(
    "\tPada Gambar 3.4 ditunjukkan implementasi endpoint GET /health yang berfungsi untuk memantau status kesiapan sistem (health check). Endpoint ini mengembalikan data JSON berstruktur HealthResponse yang merefleksikan apakah server FastAPI berjalan dengan normal, jumlah merek yang aktif di memori (57 merek), dan apakah objek model Machine Learning telah terinisialisasi di memori RAM server. Indikator ini juga dikonsumsi secara real-time oleh antarmuka front-end untuk memperbarui status koneksi."
)
format_run(r_desc_34)

# 3.2.4 Endpoint Predict
p_img_35 = target_p_b4.insert_paragraph_before()
set_para_format(p_img_35, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_img_35 = p_img_35.add_run()
r_img_35.add_picture(str(FIGURES_DIR / "gambar_3_5_predict_endpoint.png"), width=Inches(5.8))

p_cap_35 = target_p_b4.insert_paragraph_before()
set_para_format(p_cap_35, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_cap_35 = p_cap_35.add_run("Gambar 3.5 Implementasi Endpoint POST /predict")
format_run(r_cap_35)

p_lbl_35 = target_p_b4.insert_paragraph_before()
set_para_format(p_lbl_35, alignment=WD_ALIGN_PARAGRAPH.LEFT)
r_lbl_35 = p_lbl_35.add_run("Penjelasan:")
format_run(r_lbl_35, bold=True)

p_desc_35 = target_p_b4.insert_paragraph_before()
set_para_format(p_desc_35)
r_desc_35 = p_desc_35.add_run(
    "\tPada Gambar 3.5 ditunjukkan implementasi endpoint utama POST /predict. Endpoint ini menerima data input yang telah divalidasi oleh skema CarFeatures, kemudian memetakannya menjadi struktur dictionary dan mengonversikannya menjadi Pandas DataFrame dengan 10 kolom fitur standar. Selanjutnya, metode ml_model.predict() dipanggil untuk menjalankan transformasi OneHotEncoder dan StandardScaler serta inferensi Random Forest. Hasil prediksi desimal dibulatkan dan diformat ke dalam objek PredictionResponse berstatus HTTP 200 OK. Apabila terjadi kendala sistem, galat ditangani secara aman dengan kode HTTP 500 tanpa mengekspos stack trace internal."
)
format_run(r_desc_35)

# 3.2.5 Fetch API Frontend
p_img_36 = target_p_b4.insert_paragraph_before()
set_para_format(p_img_36, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_img_36 = p_img_36.add_run()
r_img_36.add_picture(str(FIGURES_DIR / "gambar_3_6_fetch_api.png"), width=Inches(5.8))

p_cap_36 = target_p_b4.insert_paragraph_before()
set_para_format(p_cap_36, alignment=WD_ALIGN_PARAGRAPH.CENTER)
r_cap_36 = p_cap_36.add_run("Gambar 3.6 Implementasi Logika Cascading Dropdown dan Fetch API pada app.js")
format_run(r_cap_36)

p_lbl_36 = target_p_b4.insert_paragraph_before()
set_para_format(p_lbl_36, alignment=WD_ALIGN_PARAGRAPH.LEFT)
r_lbl_36 = p_lbl_36.add_run("Penjelasan:")
format_run(r_lbl_36, bold=True)

p_desc_36 = target_p_b4.insert_paragraph_before()
set_para_format(p_desc_36)
r_desc_36 = p_desc_36.add_run(
    "\tPada Gambar 3.6 ditunjukkan skrip JavaScript (app.js) yang mengelola logika cascading dropdown dan komunikasi asinkron antara antarmuka web dan backend API. Pemilihan merek mobil secara dinamis memperbarui daftar model kendaraan yang sesuai, menonaktifkan pemilihan model acak, dan menyaring daftar model secara real-time via input pencarian. Event submit form ditangkap dengan memanggil event.preventDefault() guna mengeliminasi page reload. Ketika respons diterima, nilai estimasi harga diformat ke dalam satu baris mata uang dolar ($ USD) dan ditampilkan pada kartu hasil, sedangkan jika validasi backend menolak data (kode HTTP 422), detail kesalahan ditampilkan pada panel notifikasi secara elegan."
)
format_run(r_desc_36)

# Bersihkan paragraf kosong sisa sebelum BAB IV
p4_current_idx = None
for i, p in enumerate(doc.paragraphs):
    if p.text.startswith("BAB IV"):
        p4_current_idx = i
        break

to_remove = []
for i in range(p4_current_idx - 1, -1, -1):
    p = doc.paragraphs[i]
    if p.text.strip() == "" and len(p.runs) == 0:
        to_remove.append(p)
    else:
        break

for p in to_remove:
    p._element.getparent().remove(p._element)

# Simpan dokumen
save_path_ws = r"e:\Tugas Besar Machine Learning\tubes ml new.docx"
doc.save(save_path_ws)
print("Tersimpan di workspace:", save_path_ws)

save_path_d = r"d:\tubes ml new_updated_bab3.docx"
doc.save(save_path_d)
print("Tersimpan di D drive:", save_path_d)

try:
    doc.save(DOC_PATH)
    print("Tersimpan langsung di dokumen asli:", DOC_PATH)
except Exception as e:
    print("Catatan: d:\\tubes ml new.docx masih dibuka di Microsoft Word, perubahan aman tersimpan di tubes ml new_updated_bab3.docx.")
