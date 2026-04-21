# MediFind – Medicine Availability Finder

A full-stack web application to find nearby pharmacies with real-time medicine availability.

## Tech Stack
- **Backend**: Python Flask
- **Database**: SQLite (auto-created on first run)
- **Frontend**: Vanilla HTML/CSS/JS (no build step)

## Project Structure
```
medifind/
├── app.py               # Flask backend + SQLite init
├── requirements.txt
├── medifind.db          # Auto-created on first run
├── templates/
│   └── index.html       # Main UI
└── static/
    ├── css/style.css
    └── js/app.js
```

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the app
```bash
python app.py
```

## Features
- 🔍 Search any medicine by name
- 🟢 Color-coded stock status (In Stock / Low Stock / Out of Stock)
- 📋 Pharmacy detail modal with full inventory
- 🗺 Google Maps directions integration
- 📱 Fully responsive mobile-friendly UI
- ⚡ Quick-search popular medicines

## Database Schema
- **Pharmacy**: id, name, location, address, phone, hours, lat, lng
- **Medicine**: id, name, category
- **Stock**: pharmacy_id, medicine_id, quantity

## API Endpoints
- `GET /api/search?q=<medicine>` – Search pharmacies by medicine name
- `GET /api/pharmacy/<id>` – Get pharmacy details + full stock
- `GET /api/medicines` – List all medicines
