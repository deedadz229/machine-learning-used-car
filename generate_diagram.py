import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(figsize=(14, 7.8), dpi=300)
ax.set_facecolor("#F8FAFC")
fig.patch.set_facecolor("#FFFFFF")

# Header Title
plt.text(7.1, 7.3, "DIAGRAM ARSITEKTUR SISTEM USED CAR PRICE ESTIMATOR", 
         fontsize=15, fontweight="bold", ha="center", color="#0F172A")
plt.text(7.1, 6.95, "Alur Integrasi: Frontend (HTML/JS) — Backend (FastAPI/Pydantic) — Machine Learning (Joblib Pipeline)", 
         fontsize=10.5, ha="center", color="#475569")

# Define boxes: (x, y, width, height, title, subtitle, color, border_color)
boxes = [
    # Top row (Left to Right)
    (0.8, 4.4, 2.6, 2.0, "1. User & HTML5 Form", "Pengguna memasukkan 10 atribut:\n- model_year, milage\n- brand, model, fuel_type\n- engine, transmission\n- ext_col, int_col, accident", "#EFF6FF", "#3B82F6"),
    (4.1, 4.4, 2.6, 2.0, "2. JavaScript (Fetch API)", "event.preventDefault()\nValidasi awal di browser,\nkonstruksi payload JSON,\nkirim HTTP POST /predict", "#EFF6FF", "#2563EB"),
    (7.4, 4.4, 2.6, 2.0, "3. FastAPI Backend", "Router /predict menerima request,\nasynchronous worker loop,\nCORS & Static middleware,\npenanganan HTTP status code", "#F0FDF4", "#16A34A"),
    (10.7, 4.4, 2.6, 2.0, "4. Pydantic Validation", "CarFeatures(BaseModel):\n• model_year: 1974 - 2024\n• milage: 0 - 405.000 mil\n• String non-empty stripping\n• HTTP 422 jika data anomali", "#F0FDF4", "#059669"),

    # Bottom row (Right to Left)
    (10.7, 1.2, 2.6, 2.0, "5. Pandas DataFrame", "Konversi dictionary valid\nmenjadi 1 baris DataFrame\ndengan susunan 10 kolom\nsesuai data pelatihan", "#FAF5FF", "#9333EA"),
    (7.4, 1.2, 2.6, 2.0, "6. Joblib ML Pipeline", "used_car_price_model.joblib:\n• ColumnTransformer (Imputer,\n  StandardScaler, OneHotEncoder)\n• Random Forest (200 Trees)\n• Inferensi model.predict()", "#FAF5FF", "#7E22CE"),
    (4.1, 1.2, 2.6, 2.0, "7. JSON Response", "HTTP 200 OK Response:\n{\n  \"success\": true,\n  \"predicted_price\": 34784.4,\n  \"currency\": \"USD\"\n}", "#FFFBEB", "#D97706"),
    (0.8, 1.2, 2.6, 2.0, "8. Display Result", "DOM Manipulation di Browser:\nFormat mata uang ($ USD),\ntampilkan Result Card,\ntanpa page reload (SPA UX)", "#FEF3C7", "#B45309"),
]

# Draw boxes
for x, y, w, h, title, subtitle, bg, border in boxes:
    rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.18",
                                  facecolor=bg, edgecolor=border, linewidth=2.2, zorder=2)
    ax.add_patch(rect)
    ax.text(x + w/2, y + h - 0.35, title, fontsize=9.2, fontweight="bold", ha="center", va="center", color="#0F172A", zorder=3)
    ax.text(x + w/2, y + (h - 0.45)/2, subtitle, fontsize=7.6, ha="center", va="center", color="#334155", zorder=3, linespacing=1.3)

# Draw arrows
arrows = [
    # 1 -> 2
    ((3.55, 5.4), (3.95, 5.4), "Form Submit"),
    # 2 -> 3
    ((6.85, 5.4), (7.25, 5.4), "POST /predict"),
    # 3 -> 4
    ((10.15, 5.4), (10.55, 5.4), "Request Body"),
    # 4 -> 5 (Vertical down)
    ((12.0, 4.25), (12.0, 3.35), "Valid Payload"),
    # 5 -> 6 (Right to left)
    ((10.55, 2.2), (10.15, 2.2), "input_df (10 col)"),
    # 6 -> 7
    ((7.25, 2.2), (6.85, 2.2), "Prediction Array"),
    # 7 -> 8
    ((3.95, 2.2), (3.55, 2.2), "JSON Response"),
]

for (x1, y1), (x2, y2), label in arrows:
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->", color="#1E40AF", lw=2.4, mutation_scale=16), zorder=4)
    mx, my = (x1 + x2)/2, (y1 + y2)/2
    if x1 == x2: # Vertical
        ax.text(mx + 0.15, my, label, fontsize=7.5, fontweight="bold", ha="left", va="center", color="#1E40AF", zorder=5)
    else: # Horizontal
        ax.text(mx, my + 0.28, label, fontsize=7.5, fontweight="bold", ha="center", va="center", color="#1E40AF", zorder=5)

ax.set_xlim(0.2, 14.0)
ax.set_ylim(0.5, 7.8)
ax.axis("off")
plt.tight_layout()
plt.savefig(r"e:\Tugas Besar Machine Learning\architecture_diagram.png", dpi=300, bbox_inches="tight")
print("Architecture diagram created successfully at e:\\Tugas Besar Machine Learning\\architecture_diagram.png")
