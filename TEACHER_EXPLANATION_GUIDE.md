# 🎓 PharmaTrace – Complete Teacher Explanation Guide

This guide is prepared to help you confidently explain your project, architecture, workflow, and code to your teacher or examiner.

---

## 1. Quick Project Summary (30-Second Elevator Pitch)

> *"PharmaTrace is a web-based medicine supply chain traceability system designed to combat counterfeit and expired medicines. It tracks the complete journey of a medicine batch from the manufacturer to the retailer and allows end customers to instantly verify authenticity and expiry dates by scanning a unique QR code or entering the batch number."*

---

## 2. Real-World Problem & Solution

### The Problem:
* Counterfeit (fake) medicines are a major global health hazard.
* Patients often have no way to verify whether the medicine they bought from a pharmacy is genuine, recalled, or expired.
* Supply chains lack end-to-end transparency.

### The Solution:
* **Manufacturer** assigns a unique batch number and generates a scannable QR code.
* **Retailer/Pharmacy** records every status change (*Received*, *In Stock*, *Sold*, *Recalled*) along with location and timestamp.
* **Customer** scans the QR code on the medicine box with any smartphone camera to see the verified authenticity status and full tracking history.
* **Public Ledger** provides an open audit trail of all batches in circulation.

---

## 3. System Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────┐
   │                   Frontend (Client)                     │
   │   • HTML5 (Semantic Structure)                          │
   │   • CSS3 (Responsive Design & Status Badges)            │
   │   • JavaScript (Fetch API for async HTTP requests)       │
   └────────────────────────────┬────────────────────────────┘
                                │ HTTP / JSON
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                   Backend (Server)                      │
   │   • Node.js runtime                                     │
   │   • Express.js web framework                            │
   │   • QRCode library (generates verification QR codes)    │
   └────────────────────────────┬────────────────────────────┘
                                │
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │                   Database Layer                        │
   │   • MongoDB & Mongoose (when database server is active) │
   │   • Local JSON Storage (automatic fallback if offline)  │
   └─────────────────────────────────────────────────────────┘
```

---

## 4. Key Portals & How They Work (Step-by-Step)

### 🏭 1. Manufacturer Portal (`manufacturer.html`)
* **What the manufacturer does:**
  1. Enters Medicine Name & Strength (e.g., *Paracetamol 650mg*).
  2. Enters unique Batch Number (e.g., *PCM-2026-001*).
  3. Selects Manufacturing Date and Expiry Date.
  4. Clicks **"Register Batch & Generate QR"**.
* **What happens behind the scenes:**
  * Sends a `POST /api/medicines` request with JSON data.
  * Server saves the batch with initial status `'Manufactured'`.
  * Server generates a QR code pointing to `http://localhost:5000/customer.html?id=<batch_id>`.
  * The QR code image is displayed and can be downloaded to print on medicine packaging.

### 🏪 2. Retailer Portal (`retailer.html`)
* **What the retailer does:**
  1. Selects the medicine batch from a dropdown list.
  2. Chooses the updated status:
     * **Received**: Shipment arrived at warehouse / pharmacy.
     * **In Stock**: Checked and placed on shelves for sale.
     * **Sold**: Dispensed to a customer.
     * **Recalled**: Flagged for safety recall.
  3. Enters pharmacy name and location (e.g., *Apollo Pharmacy, Delhi*).
  4. Adds an optional note.
* **What happens behind the scenes:**
  * Sends a `PUT /api/medicines/:id/status` request.
  * Server appends a new checkpoint to the batch's `checkpoints` array with stage, status, location, and timestamp.

### 📱 3. Customer Verification (`customer.html`)
* **What the customer does:**
  * **Option A:** Scans the QR code on the medicine box using their smartphone camera. It automatically opens the customer page with the batch ID.
  * **Option B:** Types the batch number into the search box.
* **What is displayed:**
  * Medicine Name & Batch Number.
  * Current status badge (*In Stock*, *Sold*, *Recalled* in red).
  * Manufacturing and Expiry dates.
  * **Full Supply Chain Journey**: Chronological timeline of every location and checkpoint from factory to pharmacy.

### 📜 4. Public Ledger (`ledger.html`)
* Shows all registered batches and their latest statuses in a clean audit card layout.

---

## 5. Code Walkthrough – Files to Explain

### 1. `backend/server.js` (The Server Entry Point)
* **Lines 1-10:** Imports `express`, `path`, and routes.
* **Line 15:** `app.use(express.static(...))` serves all HTML/CSS/JS frontend files directly.
* **Line 18:** `app.use('/api/medicines', medicineRoutes)` mounts the REST API endpoints.
* **Line 28:** Starts the server on port `5000`.

### 2. `backend/routes/medicineRoutes.js` (The REST API)
Explain the 6 endpoints:
1. `POST /api/medicines` — Creates a new batch with validation (expiry > mfg date).
2. `GET /api/medicines` — Returns all medicine batches.
3. `GET /api/medicines/batch/:batchNumber` — Customer lookup by batch number.
4. `GET /api/medicines/:id/qr` — Generates base64 QR code data URL using `qrcode`.
5. `GET /api/medicines/:id` — Looks up single batch by ID.
6. `PUT /api/medicines/:id/status` — Retailer status update and timeline append.

### 3. `backend/models/Medicine.js` & `backend/config/db.js` (Smart Data Layer)
* Explain:
  *"Sir/Ma'am, our project uses MongoDB and Mongoose. But we also engineered a built-in JSON file storage fallback (`medicines.json`). If MongoDB is running on the computer, it uses MongoDB. If MongoDB is not installed, it seamlessly uses local JSON file storage so the website works anywhere without crashing!"*

### 4. `frontend/script.js` (Client-Side Helper)
* `api(path, options)`: Reusable wrapper around `fetch()`, handles JSON parsing and error throwing.
* `updateDashboardStats()`: Counts total batches and checkpoints for the homepage.
* `getStatusBadgeClass(status)`: Applies color codes (green for in stock, yellow for manufactured, red for recalled).

---

## 6. Likely Teacher Questions & Best Answers

### Q1: Why did you use QR codes instead of barcodes?
> **Answer:** *"Barcodes only store a standard product identifier (UPC/EAN) shared by millions of items. A 2D QR code can store a dynamic URL containing the unique batch identifier, allowing a smartphone to directly open the verification portal without needing a special barcode scanner."*

### Q2: How does the customer scan the QR code?
> **Answer:** *"Any standard smartphone camera or QR scanner can read the QR code. It opens `http://localhost:5000/customer.html?id=<batch_id>`, which automatically retrieves and displays the medicine's full journey."*

### Q3: What happens if someone tries to register the same batch number twice?
> **Answer:** *"The backend checks for uniqueness. If a duplicate batch number is submitted, it returns an HTTP 409 Conflict error and informs the user that the batch number already exists."*

### Q4: How is data persisted?
> **Answer:** *"Data is stored using MongoDB via Mongoose. Additionally, we implemented a fallback to local JSON file storage so that the project can be demonstrated on any computer even if MongoDB server is not running."*

### Q5: What security improvements could be added in a production version?
> **Answer:** *"For a production enterprise system, we would add Role-Based Access Control (JWT authentication so only verified manufacturers and licensed pharmacists can log in), digital cryptographic signatures on batches, and integrate with blockchain (Hyperledger or Ethereum) for an immutable distributed ledger."*
