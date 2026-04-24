from flask import Flask, render_template, jsonify, request, redirect, url_for
import sqlite3
import os
from datetime import datetime

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
            price REAL DEFAULT 0,
            FOREIGN KEY (pharmacy_id) REFERENCES Pharmacy(id),
            FOREIGN KEY (medicine_id) REFERENCES Medicine(id)
        );

        CREATE TABLE IF NOT EXISTS Orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_phone TEXT,
            customer_address TEXT,
            pharmacy_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TEXT NOT NULL,
            total REAL DEFAULT 0,
            FOREIGN KEY (pharmacy_id) REFERENCES Pharmacy(id)
        );

        CREATE TABLE IF NOT EXISTS OrderItems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            medicine_id INTEGER NOT NULL,
            medicine_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES Orders(id)
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

        # Stock data: (pharmacy_id, medicine_id, quantity, price)
        stock_data = [
            # MedPlus
            (1,1,45,12.5),(1,2,30,45.0),(1,3,20,18.0),(1,4,15,85.0),(1,5,8,32.0),(1,6,12,95.0),(1,7,0,22.0),(1,8,25,28.0),
            # Apollo
            (2,1,60,12.5),(2,2,0,45.0),(2,3,35,18.0),(2,4,0,85.0),(2,5,18,32.0),(2,6,8,95.0),(2,7,5,22.0),(2,8,0,28.0),(2,9,12,55.0),
            # Wellness Forever
            (3,1,5,13.0),(3,2,8,46.0),(3,3,0,18.0),(3,4,12,86.0),(3,5,22,33.0),(3,6,2,96.0),(3,7,14,23.0),(3,8,6,29.0),
            # Sun Pharma
            (4,1,0,12.5),(4,2,0,45.0),(4,3,0,18.0),(4,4,5,85.0),(4,5,3,32.0),(4,6,0,95.0),(4,7,9,22.0),(4,9,8,55.0),
            # HealthKart
            (5,1,100,11.0),(5,2,45,44.0),(5,3,60,17.0),(5,4,30,84.0),(5,5,12,31.0),(5,6,20,94.0),(5,7,25,21.0),(5,8,15,27.0),(5,10,8,48.0),
            # CureFit
            (6,1,22,12.5),(6,2,15,45.0),(6,3,18,18.0),(6,4,6,85.0),(6,5,0,32.0),(6,6,5,95.0),(6,11,30,38.0),(6,12,10,42.0),
            # Netmeds
            (7,1,80,10.5),(7,2,70,43.0),(7,3,55,16.5),(7,4,40,83.0),(7,5,28,30.0),(7,6,35,93.0),(7,7,20,21.0),(7,8,45,27.0),(7,9,18,54.0),(7,10,12,47.0),(7,11,50,37.0),
            # PharmEasy
            (8,1,35,12.0),(8,2,25,45.0),(8,3,0,18.0),(8,4,18,85.0),(8,5,7,32.0),(8,6,9,95.0),(8,11,20,38.0),(8,12,15,42.0),
        ]
        cur.executemany("INSERT INTO Stock (pharmacy_id, medicine_id, quantity, price) VALUES (?,?,?,?)", stock_data)

    conn.commit()
    conn.close()


# ─── PAGES ───────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/pharmacies")
def pharmacies_page():
    return render_template("pharmacies.html")


@app.route("/orders")
def orders_page():
    return render_template("orders.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if username == "admin" and password == "1234":
            return redirect(url_for("index"))
        else:
            return "Invalid Credentials ❌"
    return render_template("login.html")


@app.route("/google-login")
def google_login():
    return "Google Sign-In coming soon 🚀"


# ─── EXISTING APIs ───────────────────────────────────────

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
            m.id AS medicine_id, m.name AS medicine_name, m.category,
            s.quantity, s.price
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
            "medicine_id": r["medicine_id"],
            "medicine_name": r["medicine_name"],
            "category": r["category"],
            "quantity": r["quantity"],
            "price": r["price"],
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
        SELECT m.id, m.name, m.category, s.quantity, s.price
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
        "stock": [{"medicine_id": s["id"], "medicine": s["name"], "category": s["category"], "quantity": s["quantity"], "price": s["price"]} for s in stock]
    })


@app.route("/api/medicines")
def medicines():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name, category FROM Medicine ORDER BY name")
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ─── PHARMACIES API ───────────────────────────────────────

@app.route("/api/pharmacies")
def all_pharmacies():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT p.id, p.name, p.location, p.address, p.phone, p.hours,
               COUNT(s.id) AS medicine_count,
               SUM(CASE WHEN s.quantity > 0 THEN 1 ELSE 0 END) AS in_stock_count
        FROM Pharmacy p
        LEFT JOIN Stock s ON s.pharmacy_id = p.id
        GROUP BY p.id
        ORDER BY p.name
    """)
    rows = cur.fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ─── ORDERS API ──────────────────────────────────────────

@app.route("/api/orders", methods=["GET"])
def get_orders():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT o.id, o.customer_name, o.customer_phone, o.customer_address,
               o.status, o.created_at, o.total,
               p.name AS pharmacy_name, p.location AS pharmacy_location
        FROM Orders o
        JOIN Pharmacy p ON p.id = o.pharmacy_id
        ORDER BY o.created_at DESC
    """)
    orders = cur.fetchall()

    result = []
    for order in orders:
        cur.execute("""
            SELECT medicine_name, quantity, price
            FROM OrderItems WHERE order_id = ?
        """, (order["id"],))
        items = cur.fetchall()
        o = dict(order)
        o["items"] = [dict(i) for i in items]
        result.append(o)

    conn.close()
    return jsonify(result)


@app.route("/api/orders", methods=["POST"])
def place_order():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    customer_name = data.get("customer_name", "").strip()
    customer_phone = data.get("customer_phone", "").strip()
    customer_address = data.get("customer_address", "").strip()
    pharmacy_id = data.get("pharmacy_id")
    items = data.get("items", [])

    if not customer_name or not pharmacy_id or not items:
        return jsonify({"error": "Missing required fields"}), 400

    total = sum(i["price"] * i["quantity"] for i in items)
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()

    # Verify stock
    for item in items:
        cur.execute(
            "SELECT quantity FROM Stock WHERE pharmacy_id = ? AND medicine_id = ?",
            (pharmacy_id, item["medicine_id"])
        )
        row = cur.fetchone()
        if not row or row["quantity"] < item["quantity"]:
            conn.close()
            return jsonify({"error": f"Insufficient stock for {item['medicine_name']}"}), 400

    # Insert order
    cur.execute(
        "INSERT INTO Orders (customer_name, customer_phone, customer_address, pharmacy_id, status, created_at, total) VALUES (?,?,?,?,?,?,?)",
        (customer_name, customer_phone, customer_address, pharmacy_id, "confirmed", created_at, total)
    )
    order_id = cur.lastrowid

    # Insert items + deduct stock
    for item in items:
        cur.execute(
            "INSERT INTO OrderItems (order_id, medicine_id, medicine_name, quantity, price) VALUES (?,?,?,?,?)",
            (order_id, item["medicine_id"], item["medicine_name"], item["quantity"], item["price"])
        )
        cur.execute(
            "UPDATE Stock SET quantity = quantity - ? WHERE pharmacy_id = ? AND medicine_id = ?",
            (item["quantity"], pharmacy_id, item["medicine_id"])
        )

    conn.commit()
    conn.close()

    return jsonify({"success": True, "order_id": order_id, "total": total})


@app.route("/api/orders/<int:order_id>/cancel", methods=["POST"])
def cancel_order(order_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM Orders WHERE id = ?", (order_id,))
    order = cur.fetchone()
    if not order:
        conn.close()
        return jsonify({"error": "Order not found"}), 404
    if order["status"] != "confirmed":
        conn.close()
        return jsonify({"error": "Only confirmed orders can be cancelled"}), 400

    # Restore stock
    cur.execute("SELECT * FROM OrderItems WHERE order_id = ?", (order_id,))
    items = cur.fetchall()
    for item in items:
        cur.execute(
            "UPDATE Stock SET quantity = quantity + ? WHERE pharmacy_id = ? AND medicine_id = ?",
            (item["quantity"], order["pharmacy_id"], item["medicine_id"])
        )

    cur.execute("UPDATE Orders SET status = 'cancelled' WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
