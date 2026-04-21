from flask import Flask, render_template, jsonify, request
import sqlite3
import os

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "medifind.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.executescript("""
        CREATE TABLE IF NOT EXISTS Pharmacy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            hours TEXT,
            lat REAL,
            lng REAL
        );

        CREATE TABLE IF NOT EXISTS Medicine (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT
        );

        CREATE TABLE IF NOT EXISTS Stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pharmacy_id INTEGER NOT NULL,
            medicine_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 0,
            FOREIGN KEY (pharmacy_id) REFERENCES Pharmacy(id),
            FOREIGN KEY (medicine_id) REFERENCES Medicine(id)
        );
    """)

    # Seed data
    cur.execute("SELECT COUNT(*) FROM Pharmacy")
    if cur.fetchone()[0] == 0:
        pharmacies = [
            ("MedPlus Pharmacy", "MG Road", "123, MG Road, Bangalore – 560001", "+91 80 2345 6789", "Open · Closes 10:00 PM", 12.9716, 77.5946),
            ("Apollo Pharmacy", "Koramangala", "45, 80 Feet Rd, Koramangala, Bangalore – 560034", "+91 80 4567 8901", "Open · Closes 11:00 PM", 12.9352, 77.6245),
            ("Wellness Forever", "Indiranagar", "78, 100 Feet Rd, Indiranagar, Bangalore – 560038", "+91 80 2345 1234", "Open · Closes 9:30 PM", 12.9784, 77.6408),
            ("Sun Pharma Store", "HSR Layout", "12, Sector 1, HSR Layout, Bangalore – 560102", "+91 80 6789 0123", "Open · Closes 10:00 PM", 12.9116, 77.6389),
            ("HealthKart Pharmacy", "Whitefield", "56, ITPL Main Rd, Whitefield, Bangalore – 560066", "+91 80 8901 2345", "Open · Closes 9:00 PM", 12.9698, 77.7499),
            ("CureFit Pharmacy", "Jayanagar", "34, 4th Block, Jayanagar, Bangalore – 560011", "+91 80 3456 7890", "Open · Closes 10:30 PM", 12.9302, 77.5836),
            ("Netmeds Store", "Electronic City", "89, Phase 1, Electronic City, Bangalore – 560100", "+91 80 5678 9012", "Open · Closes 11:00 PM", 12.8391, 77.6769),
            ("PharmEasy Point", "BTM Layout", "23, 2nd Stage, BTM Layout, Bangalore – 560076", "+91 80 7890 1234", "Open · Closes 10:00 PM", 12.9165, 77.6101),
        ]
        cur.executemany(
            "INSERT INTO Pharmacy (name, location, address, phone, hours, lat, lng) VALUES (?,?,?,?,?,?,?)",
            pharmacies
        )

        medicines = [
            ("Paracetamol", "Analgesic"),
            ("Dolo 650", "Analgesic"),
            ("Crocin", "Analgesic"),
            ("Azithromycin", "Antibiotic"),
            ("Pantoprazole", "Antacid"),
            ("Augmentin 625", "Antibiotic"),
            ("Cetirizine", "Antihistamine"),
            ("Metformin", "Antidiabetic"),
            ("Atorvastatin", "Statin"),
            ("Amoxicillin", "Antibiotic"),
            ("Ibuprofen", "Analgesic"),
            ("Omeprazole", "Antacid"),
        ]
        cur.executemany("INSERT INTO Medicine (name, category) VALUES (?,?)", medicines)

        # Stock data: (pharmacy_id, medicine_id, quantity)
        stock_data = [
            # MedPlus
            (1,1,45),(1,2,30),(1,3,20),(1,4,15),(1,5,8),(1,6,12),(1,7,0),(1,8,25),
            # Apollo
            (2,1,60),(2,2,0),(2,3,35),(2,4,0),(2,5,18),(2,6,8),(2,7,5),(2,8,0),(2,9,12),
            # Wellness Forever
            (3,1,5),(3,2,8),(3,3,0),(3,4,12),(3,5,22),(3,6,2),(3,7,14),(3,8,6),
            # Sun Pharma
            (4,1,0),(4,2,0),(4,3,0),(4,4,5),(4,5,3),(4,6,0),(4,7,9),(4,9,8),
            # HealthKart
            (5,1,100),(5,2,45),(5,3,60),(5,4,30),(5,5,12),(5,6,20),(5,7,25),(5,8,15),(5,10,8),
            # CureFit
            (6,1,22),(6,2,15),(6,3,18),(6,4,6),(6,5,0),(6,6,5),(6,11,30),(6,12,10),
            # Netmeds
            (7,1,80),(7,2,70),(7,3,55),(7,4,40),(7,5,28),(7,6,35),(7,7,20),(7,8,45),(7,9,18),(7,10,12),(7,11,50),
            # PharmEasy
            (8,1,35),(8,2,25),(8,3,0),(8,4,18),(8,5,7),(8,6,9),(8,11,20),(8,12,15),
        ]
        cur.executemany("INSERT INTO Stock (pharmacy_id, medicine_id, quantity) VALUES (?,?,?)", stock_data)

    conn.commit()
    conn.close()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/search")
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT 
            p.id, p.name, p.location, p.address, p.phone, p.hours,
            m.name AS medicine_name, m.category,
            s.quantity
        FROM Stock s
        JOIN Pharmacy p ON p.id = s.pharmacy_id
        JOIN Medicine m ON m.id = s.medicine_id
        WHERE m.name LIKE ?
        ORDER BY s.quantity DESC, p.name ASC
    """, (f"%{query}%",))
    rows = cur.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "pharmacy_id": r["id"],
            "pharmacy_name": r["name"],
            "location": r["location"],
            "address": r["address"],
            "phone": r["phone"],
            "hours": r["hours"],
            "medicine_name": r["medicine_name"],
            "category": r["category"],
            "quantity": r["quantity"],
            "status": "in_stock" if r["quantity"] > 10 else ("low_stock" if r["quantity"] > 0 else "out_of_stock")
        })

    return jsonify(results)


@app.route("/api/pharmacy/<int:pharmacy_id>")
def pharmacy_detail(pharmacy_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Pharmacy WHERE id = ?", (pharmacy_id,))
    pharmacy = cur.fetchone()
    if not pharmacy:
        return jsonify({"error": "Not found"}), 404

    cur.execute("""
        SELECT m.name, m.category, s.quantity
        FROM Stock s JOIN Medicine m ON m.id = s.medicine_id
        WHERE s.pharmacy_id = ?
        ORDER BY m.name
    """, (pharmacy_id,))
    stock = cur.fetchall()
    conn.close()

    return jsonify({
        "id": pharmacy["id"],
        "name": pharmacy["name"],
        "location": pharmacy["location"],
        "address": pharmacy["address"],
        "phone": pharmacy["phone"],
        "hours": pharmacy["hours"],
        "stock": [{"medicine": s["name"], "category": s["category"], "quantity": s["quantity"]} for s in stock]
    })


@app.route("/api/medicines")
def medicines():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, category FROM Medicine ORDER BY name")
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


from flask import redirect, url_for

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if username == "admin" and password == "1234":
            return redirect(url_for("home"))
        else:
            return "Invalid Credentials ❌"

    return render_template("login.html")

@app.route("/google-login")
def google_login():
    return "Google Sign-In coming soon 🚀"

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
