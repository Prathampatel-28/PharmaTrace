# PharmaTrace — Complete Project Manual & Feature Interaction Guide

---

## 1. What We Have Used in Everything (Tech Stack & Libraries)

### Frontend (Client-Side)
* **HTML5**: Semantic web structure for all portals (`index.html`, `manufacturer.html`, `retailer.html`, `customer.html`, `ledger.html`).
* **CSS3 (`style.css`)**: Custom styling system featuring:
  * Responsive layout (flexbox and grid)
  * Dark navigation bar (`#0f172a`) and clean card containers
  * Color-coded status badges:
    * **Manufactured**: Factory yellow (`#fef3c7`)
    * **Received**: Distributor blue (`#e0e7ff`)
    * **In Stock / Sold**: Pharmacy green (`#dcfce7`)
    * **Recalled**: Alert red (`#fee2e2`)
* **JavaScript (ES6+)**:
  * **Fetch API**: For asynchronous HTTP communication (`GET`, `POST`, `PUT`) with the backend without refreshing the page.
  * **DOM Manipulation**: Dynamic rendering of cards, select options, and alert boxes.
  * **URLSearchParams API**: Reads `?id=...` query parameters when customer scans a QR code.

### Backend (Server-Side)
* **Node.js**: Asynchronous JavaScript runtime environment.
* **Express.js (`express`)**: Minimalist web framework that handles HTTP routing, JSON body parsing, and serves static frontend files.
* **QRCode (`qrcode`)**: Generates base64 2D QR code Data URLs from verification links.
* **Mongoose (`mongoose`)**: MongoDB object modeling tool for schema validation and database interaction.
* **Dotenv (`dotenv`)**: Loads environment variables from `.env` file (port, base URL, database connection string).
* **Nodemon (`nodemon`)**: Development tool that automatically restarts the server on code changes.

### Database & Storage
* **Dual-Persistence Layer**:
  1. **MongoDB**: Used automatically when MongoDB Community Server or MongoDB Atlas is available.
  2. **Local JSON Storage (`backend/data/medicines.json`)**: Automatic zero-setup fallback when MongoDB is offline. Ensures the website always works on any machine without errors.

---

## 2. Project Directory Structure

```
PharmaTrace_Updated/
├── backend/
│   ├── config/
│   │   └── db.js               # Database connection manager with fallback
│   ├── data/
│   │   └── medicines.json      # Local JSON file storage (fallback database)
│   ├── models/
│   │   └── Medicine.js         # Unified Medicine data model & CRUD methods
│   ├── routes/
│   │   └── medicineRoutes.js   # 6 REST API endpoints for all operations
│   ├── .env                    # Configuration file (PORT, URLs, DB URI)
│   ├── .env.example            # Sample configuration template
│   ├── package.json            # Backend dependencies and start scripts
│   └── server.js               # Express server entry point
├── frontend/
│   ├── customer.html           # Customer verification portal
│   ├── distributor.html        # Redirects to retailer portal
│   ├── index.html              # Home dashboard
│   ├── ledger.html             # Public ledger showing all batches
│   ├── manufacturer.html       # Manufacturer batch registration & QR generator
│   ├── pharmacy.html           # Redirects to retailer portal
│   ├── retailer.html           # Retailer status update portal
│   ├── script.js               # Shared utility functions (api, badges, stats)
│   └── style.css               # Shared application styles and layout
├── package.json                # Root package configuration
├── PROJECT_MANUAL_AND_FEATURE_FLOW.md # This guide
├── README.md                   # Project overview
└── TEACHER_EXPLANATION_GUIDE.md# Viva preparation guide
```

---

## 3. What Happens When You Click / Press Everything (Page by Page)

### 🏠 Page 1: Home Dashboard (`index.html`)

| Element / Action | What You Press | What Happens Behind the Scenes | What You See on Screen |
| :--- | :--- | :--- | :--- |
| **Page Load** | Open `http://localhost:5000` | Browser calls `GET /api/medicines`. Calculates total batches and sums up all checkpoints. | Total batches number and tracking updates count update automatically. |
| **Top Navigation** | Click `Manufacturer`, `Retailer`, `Customer`, or `Ledger` | Browser navigates directly to that HTML page. | Switched to the selected portal immediately. |
| **Manufacturer Card** | Click `Open Manufacturer →` | Navigates to `manufacturer.html`. | Opens Manufacturer registration form. |
| **Retailer Card** | Click `Open Retailer →` | Navigates to `retailer.html`. | Opens Retailer status update form. |
| **Customer Card** | Click `Verify Medicine →` | Navigates to `customer.html`. | Opens Customer search and verification page. |
| **Ledger Card** | Click `Open Ledger →` | Navigates to `ledger.html`. | Opens Public ledger list of all batches. |

---

### 🏭 Page 2: Manufacturer Portal (`manufacturer.html`)

| Element / Action | What You Press | What Happens Behind the Scenes | What You See on Screen |
| :--- | :--- | :--- | :--- |
| **View Ledger button** | Click `View Ledger` (top right) | Navigates to `ledger.html`. | Shows all existing batches in ledger. |
| **Fill Form** | Enter Medicine Name, Batch Number, Mfg Date, Exp Date | Inputs are stored in form fields. | Text appears in input boxes. |
| **Submit Form** | Click **`Register Batch & Generate QR`** | 1. `event.preventDefault()` stops page reload.<br>2. Validates inputs (checks non-empty, checks expiry > mfg date).<br>3. Calls `POST /api/medicines` with JSON payload.<br>4. Server saves batch with status `'Manufactured'` and initial checkpoint.<br>5. Calls `GET /api/medicines/:id/qr`. Server generates QR code data URL.<br>6. Form resets automatically. | • Green success banner: *"Batch registered successfully! QR code is ready below."*<br>• QR code card appears with scannable QR image.<br>• Medicine batch number is displayed. |
| **Open Verification Link** | Click `Open Customer Verification Page ↗` | Opens `customer.html?id=<batch_id>` in a new browser tab. | Automatically verifies and displays the new medicine's details. |
| **Download QR Button** | Click `Download QR Code` | Downloads the generated QR image file (`medicine-qr.png`). | File downloads to your computer. |
| **Duplicate Batch Error** | Enter a batch number that already exists and click Submit | Server checks uniqueness in database and returns HTTP 409 Conflict. | Red alert box appears: *"This batch number already exists. Please use a unique batch number."* |

---

### 🏪 Page 3: Retailer Portal (`retailer.html`)

| Element / Action | What You Press | What Happens Behind the Scenes | What You See on Screen |
| :--- | :--- | :--- | :--- |
| **Page Load** | Open `retailer.html` | Calls `GET /api/medicines`. Reads all batches from database. | Dropdown list is populated with all registered batches and their current status. |
| **Select Batch** | Click dropdown and choose a batch | Sets the selected batch `_id` as the form's target. | Shows chosen batch number, medicine name, and status. |
| **Select Status** | Choose `Received`, `In Stock`, `Sold`, or `Recalled` | Updates the selected status value in the form. | Selected status appears in dropdown. |
| **Enter Location & Note** | Type Pharmacy name (e.g. *Care Pharmacy, Delhi*) and note | Saves values in input fields. | Text is ready for submission. |
| **Submit Update** | Click **`Update Medicine Status`** | 1. Calls `PUT /api/medicines/:id/status` with updated status, location, and note.<br>2. Server updates `currentStatus` and pushes a new object into `checkpoints` array.<br>3. Form resets.<br>4. Calls `loadRetailerBatches()` to refresh the dropdown. | • Green success banner: *"Medicine status updated successfully!"*<br>• Dropdown refreshes showing the batch's newly updated status. |

---

### 📱 Page 4: Customer Verification Portal (`customer.html`)

| Element / Action | What You Press | What Happens Behind the Scenes | What You See on Screen |
| :--- | :--- | :--- | :--- |
| **Manual Batch Search** | Type batch number (e.g. `PCM-2026-001`) and click **`Verify Medicine Authenticity`** | 1. Calls `GET /api/medicines/batch/:batchNumber`.<br>2. Server queries database for matching batch.<br>3. Returns medicine details and `checkpoints` array. | • Result card appears.<br>• Shows Medicine Name & Strength.<br>• Shows Batch Number.<br>• Shows color-coded status badge.<br>• Shows Mfg Date & Expiry Date.<br>• Shows full chronological journey cards under *"📍 Tracking Journey"*. |
| **QR Code Scan / Direct Link** | Scan QR code on phone OR open link `customer.html?id=...` | 1. Reads `?id=...` parameter from URL.<br>2. Calls `GET /api/medicines/:id`.<br>3. Automatically fills batch number into search box and triggers verification. | Details and tracking journey display immediately without having to type anything! |
| **Batch Not Found** | Type invalid batch number (e.g. `FAKE-999`) and click Verify | Server searches database, finds no match, and returns HTTP 404 Not Found. | Red alert box appears: *"Medicine batch 'FAKE-999' was not found in the system."* |

---

### 📜 Page 5: Medicine Public Ledger (`ledger.html`)

| Element / Action | What You Press | What Happens Behind the Scenes | What You See on Screen |
| :--- | :--- | :--- | :--- |
| **Page Load** | Open `ledger.html` | Calls `GET /api/medicines`. Retrieves all batches sorted newest first. | Displays all registered batches in card format. |
| **Batch Cards** | View cards | For each batch, displays: Name, Batch Number, colored Status Badge, Mfg & Exp dates. | Clean audit list of all medicines in circulation. |
| **View Customer Details** | Click `View Customer Verification Details →` | Navigates to `customer.html?id=<batch_id>`. | Opens Customer Verification page with that batch verified. |
| **Register New Batch** | Click `+ Register New Batch` (top right) | Navigates to `manufacturer.html`. | Opens registration form to add another batch. |

---

## 4. API Reference Summary

| Method | Endpoint | Purpose | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Server health check | None | `{ status: "ok" }` |
| `POST` | `/api/medicines` | Register new batch | `{ medicineName, batchNumber, mfgDate, expDate }` | Created medicine object (HTTP 201) |
| `GET` | `/api/medicines` | Get all batches | None | Array of all medicine objects (HTTP 200) |
| `GET` | `/api/medicines/:id` | Get batch by ID | None | Medicine object (HTTP 200) |
| `GET` | `/api/medicines/batch/:batchNumber` | Get batch by number | None | Medicine object (HTTP 200) |
| `GET` | `/api/medicines/:id/qr` | Generate QR code | None | `{ qrCode: "data:image/png;base64...", verificationUrl: "..." }` |
| `PUT` | `/api/medicines/:id/status` | Update batch status | `{ status, location, note }` | Updated medicine object (HTTP 200) |

---

## 5. Medicine Data Structure Example

```json
{
  "_id": "673aa1010000000000000001",
  "medicineName": "Paracetamol 650mg",
  "batchNumber": "PCM-2026-001",
  "mfgDate": "2026-01-15",
  "expDate": "2028-01-15",
  "currentStatus": "In Stock",
  "checkpoints": [
    {
      "stage": "Manufacturer",
      "status": "Manufactured",
      "location": "Apex Pharmaceuticals, Mumbai",
      "description": "Batch registered and packaged",
      "timestamp": "2026-01-15T10:00:00.000Z"
    },
    {
      "stage": "Retailer",
      "status": "Received",
      "location": "City Care Pharmacy, Delhi",
      "description": "Shipment received in good condition",
      "timestamp": "2026-01-20T14:30:00.000Z"
    },
    {
      "stage": "Retailer",
      "status": "In Stock",
      "location": "City Care Pharmacy, Delhi",
      "description": "Stock verified and placed on pharmacy shelves",
      "timestamp": "2026-01-21T09:15:00.000Z"
    }
  ],
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```
