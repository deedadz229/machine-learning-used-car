"""
Test Suite End-to-End & Validasi 15 Test Cases
Used Car Price Estimator - Tugas Besar Machine Learning
Kelompok 2
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
import app as app_module
from app import app

def run_tests():
    print("=" * 90)
    print("PENGUJIAN SISTEM END-TO-END (TESTING SUITE) — USED CAR PRICE ESTIMATOR")
    print("=" * 90)

    test_results = []

    with TestClient(app) as client:
        # Case 1: Health Check Backend
        r1 = client.get("/health")
        passed1 = (r1.status_code == 200 and r1.json().get("status") == "ok")
        test_results.append({
            "id": "TC-01",
            "scenario": "Pemeriksaan Kesiapan Server & Model (GET /health)",
            "input": "GET /health",
            "expected_status": 200,
            "actual_status": r1.status_code,
            "result": "LULUS" if passed1 else "GAGAL",
            "notes": f"Status: {r1.json().get('status')}, Merek Aktif: {r1.json().get('total_brands_available')}"
        })

        # Case 2: Model Berhasil Dimuat di RAM
        passed2 = (app_module.ml_model is not None)
        test_results.append({
            "id": "TC-02",
            "scenario": "Verifikasi Objek Model Scikit-Learn di Memori",
            "input": "Joblib Pipeline Object In-Memory",
            "expected_status": 200,
            "actual_status": 200 if passed2 else 500,
            "result": "LULUS" if passed2 else "GAGAL",
            "notes": f"Pipeline Type: {type(app_module.ml_model).__name__}"
        })

        # Base Valid Payload (Hyundai Palisade SEL)
        valid_payload = {
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

        # Case 3: Input Valid 1 (Hyundai Palisade 2021)
        r3 = client.post("/predict", json=valid_payload)
        passed3 = (r3.status_code == 200 and r3.json().get("success") is True and r3.json().get("predicted_price", 0) > 0)
        test_results.append({
            "id": "TC-03",
            "scenario": "Prediksi Input Valid (Hyundai Palisade 2021)",
            "input": "10 Atribut Lengkap & Sesuai Relasi",
            "expected_status": 200,
            "actual_status": r3.status_code,
            "result": "LULUS" if passed3 else "GAGAL",
            "notes": f"Prediksi: ${r3.json().get('predicted_price', 0):,.2f} USD"
        })

        # Case 4: Input Valid 2 (Ford Police Interceptor 2013)
        valid_payload_2 = {
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
        r4 = client.post("/predict", json=valid_payload_2)
        passed4 = (r4.status_code == 200 and r4.json().get("predicted_price", 0) > 0)
        test_results.append({
            "id": "TC-04",
            "scenario": "Prediksi Input Valid (Ford Interceptor 2013)",
            "input": "10 Atribut Lengkap (E85 Flex Fuel)",
            "expected_status": 200,
            "actual_status": r4.status_code,
            "result": "LULUS" if passed4 else "GAGAL",
            "notes": f"Prediksi: ${r4.json().get('predicted_price', 0):,.2f} USD"
        })

        # Case 5: Input model_year di bawah batas (< 1974)
        p5 = valid_payload.copy()
        p5["model_year"] = 1965
        r5 = client.post("/predict", json=p5)
        passed5 = (r5.status_code == 422)
        test_results.append({
            "id": "TC-05",
            "scenario": "Validasi Batas Bawah model_year (< 1974)",
            "input": "model_year = 1965 (Di bawah min 1974)",
            "expected_status": 422,
            "actual_status": r5.status_code,
            "result": "LULUS" if passed5 else "GAGAL",
            "notes": "Ditolak otomatis oleh Pydantic Field(ge=1974)"
        })

        # Case 6: Input model_year di atas batas (> 2024)
        p6 = valid_payload.copy()
        p6["model_year"] = 2029
        r6 = client.post("/predict", json=p6)
        passed6 = (r6.status_code == 422)
        test_results.append({
            "id": "TC-06",
            "scenario": "Validasi Batas Atas model_year (> 2024)",
            "input": "model_year = 2029 (Di atas max 2024)",
            "expected_status": 422,
            "actual_status": r6.status_code,
            "result": "LULUS" if passed6 else "GAGAL",
            "notes": "Ditolak otomatis oleh Pydantic Field(le=2024)"
        })

        # Case 7: Input milage negatif (< 0)
        p7 = valid_payload.copy()
        p7["milage"] = -1500.0
        r7 = client.post("/predict", json=p7)
        passed7 = (r7.status_code == 422)
        test_results.append({
            "id": "TC-07",
            "scenario": "Validasi Nilai Negatif milage (< 0)",
            "input": "milage = -1500.0",
            "expected_status": 422,
            "actual_status": r7.status_code,
            "result": "LULUS" if passed7 else "GAGAL",
            "notes": "Ditolak otomatis oleh Pydantic Field(ge=0.0)"
        })

        # Case 8: Input milage di atas batas wajar (> 405.000 mil)
        p8 = valid_payload.copy()
        p8["milage"] = 600000.0
        r8 = client.post("/predict", json=p8)
        passed8 = (r8.status_code == 422)
        test_results.append({
            "id": "TC-08",
            "scenario": "Validasi Batas Maksimal milage (> 405.000)",
            "input": "milage = 600000.0",
            "expected_status": 422,
            "actual_status": r8.status_code,
            "result": "LULUS" if passed8 else "GAGAL",
            "notes": "Ditolak otomatis oleh Pydantic Field(le=405000.0)"
        })

        # Case 9: Missing Field (Atribut Engine tidak dikirim)
        p9 = valid_payload.copy()
        del p9["engine"]
        r9 = client.post("/predict", json=p9)
        passed9 = (r9.status_code == 422)
        test_results.append({
            "id": "TC-09",
            "scenario": "Validasi Missing Field (Atribut Wajib Hilang)",
            "input": "Payload JSON tanpa atribut 'engine'",
            "expected_status": 422,
            "actual_status": r9.status_code,
            "result": "LULUS" if passed9 else "GAGAL",
            "notes": "Ditolak dengan rincian: 'engine: Field required'"
        })

        # Case 10: String Kosong atau Spasi Murni
        p10 = valid_payload.copy()
        p10["brand"] = "   "
        r10 = client.post("/predict", json=p10)
        passed10 = (r10.status_code == 422)
        test_results.append({
            "id": "TC-10",
            "scenario": "Validasi String Kosong / Spasi pada Fitur Teks",
            "input": "brand = '   ' (whitespace only)",
            "expected_status": 422,
            "actual_status": r10.status_code,
            "result": "LULUS" if passed10 else "GAGAL",
            "notes": "Tertangkap oleh validator validate_and_strip_string"
        })

        # Case 11: Penolakan Kombinasi Brand & Model yang Tidak Sesuai
        p11 = valid_payload.copy()
        p11["brand"] = "Toyota"
        p11["model"] = "Palisade SEL"  # Palisade SEL adalah model Hyundai, bukan Toyota
        r11 = client.post("/predict", json=p11)
        passed11 = (r11.status_code == 422)
        test_results.append({
            "id": "TC-11",
            "scenario": "Penolakan Kombinasi Brand-Model Tidak Cocok",
            "input": "Brand='Toyota', Model='Palisade SEL'",
            "expected_status": 422,
            "actual_status": r11.status_code,
            "result": "LULUS" if passed11 else "GAGAL",
            "notes": "Ditolak oleh validate_brand_and_model_compatibility"
        })

        # Case 12: Penolakan Merek yang Tidak Ada dalam Dataset
        p12 = valid_payload.copy()
        p12["brand"] = "Koenigsegg"
        p12["model"] = "Jesko Absolut"
        r12 = client.post("/predict", json=p12)
        passed12 = (r12.status_code == 422)
        test_results.append({
            "id": "TC-12",
            "scenario": "Penolakan Merek Tidak Terdaftar di Dataset",
            "input": "Brand='Koenigsegg'",
            "expected_status": 422,
            "actual_status": r12.status_code,
            "result": "LULUS" if passed12 else "GAGAL",
            "notes": "Ditolak: 'Merek Koenigsegg tidak terdaftar dalam dataset'"
        })

        # Case 13: Penyajian Halaman Web Utama (GET /)
        r13 = client.get("/")
        passed13 = (r13.status_code == 200 and "searchable-combobox" in r13.text)
        test_results.append({
            "id": "TC-13",
            "scenario": "Penyajian Antarmuka Web (GET /)",
            "input": "GET / (Root URL)",
            "expected_status": 200,
            "actual_status": r13.status_code,
            "result": "LULUS" if passed13 else "GAGAL",
            "notes": "Menyajikan static/index.html dengan antarmuka profesional"
        })

        # Case 14: Penyajian Stylesheet CSS (GET /static/style.css)
        r14 = client.get("/static/style.css")
        passed14 = (r14.status_code == 200 and "combobox-trigger" in r14.text)
        test_results.append({
            "id": "TC-14",
            "scenario": "Penyajian Stylesheet CSS (GET /static/style.css)",
            "input": "GET /static/style.css",
            "expected_status": 200,
            "actual_status": r14.status_code,
            "result": "LULUS" if passed14 else "GAGAL",
            "notes": "Berisi styling otomotif profesional, bersih & responsif"
        })

        # Case 15: Penyajian Pemetaan Brand & Model (GET /api/brand-models)
        r15 = client.get("/api/brand-models")
        passed15 = (r15.status_code == 200 and len(r15.json()) == 57)
        test_results.append({
            "id": "TC-15",
            "scenario": "API Metadata Brand-Model (GET /api/brand-models)",
            "input": "GET /api/brand-models",
            "expected_status": 200,
            "actual_status": r15.status_code,
            "result": "LULUS" if passed15 else "GAGAL",
            "notes": f"Berhasil mengembalikan {len(r15.json())} merek beserta modelnya"
        })

    # Cetak Tabel Hasil
    print(f"{'ID':<7} | {'Skenario Pengujian':<44} | {'Input':<25} | {'Exp':<5} | {'Act':<5} | {'Status':<6} | {'Catatan'}")
    print("-" * 130)
    for t in test_results:
        print(f"{t['id']:<7} | {t['scenario']:<44} | {t['input']:<25} | {t['expected_status']:<5} | {t['actual_status']:<5} | {t['result']:<6} | {t['notes']}")
    
    total = len(test_results)
    lulus = sum(1 for t in test_results if t["result"] == "LULUS")
    print("=" * 130)
    print(f"HASIL AKHIR: {lulus}/{total} TEST CASES LULUS ({lulus/total*100:.1f}%)")
    print("=" * 130)

if __name__ == "__main__":
    run_tests()
