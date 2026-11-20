# 📘 PharmaTrace — Complete Project Manual & Feature Interaction Guide

---

## 1. Complete Technology Stack & Architecture

### Frontend (Client-Side)
* **HTML5**: Semantic, accessible markup across 7 interactive portals:
  * `index.html`: Public landing page, platform metrics, and system navigation.
  * `login.html`: Unified authentication, multi-role registration, and password recovery.
  * `admin.html`: Executive administration, user governance, recall management, and audit logs.
  * `manufacturer.html`: Batch registration, QR code generation, and packaging label printer.
  * `retailer.html`: Camera QR scanner, inventory intake, and status transitions.
  * `customer.html`: Public verification portal, authenticity certificates, and timeline journey.
  * `ledger.html`: Public supply chain ledger with live search and status filters.
* **CSS3 (`style.css`)**:
  * Enterprise SaaS color palette (Pharma Navy `#0f172a`, Medical Blue `#2563eb`, Emerald Green `#10b981`, Amber Warning `#f59e0b`, Crimson Danger `#ef4444`).
  * CSS Grid and Flexbox responsive layouts.
  * Print stylesheet (`@media print`) rendering high-resolution medicine packaging labels.
  * Modal dialog overlays and animated status badges.
* **JavaScript (ES6+)**:
  * **Fetch API**: Asynchronous HTTP communication with `credentials: 'include'` for secure cookie exchange.
  * **HTML5-QRCode (`html5-qrcode`)**: Direct mobile smartphone camera and desktop webcam QR code scanning.
  * **Chart.js (`chart.js`)**: Interactive data visualization of batch volume and supply chain distribution.
  * **FontAwesome 6**: Intuitive icon sets for pharmaceutical and logistical actions.

### Backend (Server-Side)
* **Node.js**: Asynchronous event-driven runtime environment.
* **Express.js (`express`)**: RESTful API framework handling routing and static asset delivery.
* **JWT (`jsonwebtoken`)**: Signed, stateless authentication tokens stored in secure `httpOnly` cookies.
* **Bcrypt (`bcryptjs`)**: Salted cryptographic password hashing (10 salt rounds).
* **Cookie-Parser (`cookie-parser`)**: Parses encrypted HTTP-only session cookies.
* **Helmet (`helmet`)**: Sets HTTP response headers protecting against XSS, clickjacking, and MIME sniffing.
* **CORS (`cors`)**: Origin validation with credential support.
* **Express Rate Limit (`express-rate-limit`)**: Prevents brute-force authentication attacks and QR token enumeration.
* **QRCode (`qrcode`)**: Generates high-resolution PNG Data URLs for pharmaceutical packaging labels.
* **Crypto (Native Node.js)**: Generates 256-bit cryptographically secure random verification tokens (`crypto.randomBytes(32)`).

### Database & Persistence
* **MongoDB & Mongoose (`mongoose`)**: Strictly typed database schemas, indexes, and aggregation pipelines.
* **MongoDB Compass Integration**: Listens on standard port `27017` (`mongodb://127.0.0.1:27017/pharmatrace`).
* **In-Memory Engine Fallback (`mongodb-memory-server`)**: Ensures zero-setup instant execution with full MongoDB features even if native MongoDB Community Service is not pre-installed on the host.

---

## 2. Project Directory Structure

```
PharmaTrace_Updated/
├── backend/
│   ├── config/
│   │   └── db.js                 # Database connection & Compass port 27017 binding
│   ├── controllers/
│   │   ├── adminController.js    # System metrics, user governance, audit stream
│   │   ├── authController.js     # JWT auth, registration, password lifecycle
│   │   ├── medicineController.js # Batch creation, crypto tokens, recalls
│   │   ├── notificationController.js # User alerts and notifications
│   │   ├── qrController.js       # Public QR verification & scan logging
│   │   └── retailerController.js # Stock status transitions & validation
│   ├── middleware/
│   │   ├── auth.js               # JWT verification (cookie & header) + optionalAuth
│   │   ├── rateLimiter.js        # Auth, scan, and general API rate limiting
│   │   └── rbac.js               # Role-based access control guards
│   ├── models/
│   │   ├── AuditLog.js           # Immutable regulatory audit trail
│   │   ├── Medicine.js           # Pharmaceutical batch dossier schema
│   │   ├── Notification.js       # System notifications schema
│   │   ├── PasswordResetToken.js # Expiring password reset tokens
│   │   ├── QRVerification.js     # Scan analytics & client telemetry
│   │   ├── TrackingHistory.js    # Detailed custody movement ledger
│   │   └── User.js               # User accounts with roles & status flags
│   ├── routes/
│   │   ├── adminRoutes.js        # Protected administrative routes
│   │   ├── authRoutes.js         # Authentication & profile routes
│   │   ├── medicineRoutes.js     # Batch registration & query routes
│   │   ├── notificationRoutes.js # User notification routes
│   │   ├── qrRoutes.js           # Public QR token resolution routes
│   │   └── retailerRoutes.js     # Retailer inventory & transition routes
│   ├── scripts/
│   │   └── testSuite.js          # 14-point automated end-to-end integration test
│   ├── utils/
│   │   └── autoSeeder.js         # Automated database provisioning on boot
│   ├── .env                      # Environment configuration
│   ├── .env.example              # Configuration template
│   ├── package.json              # Backend dependencies
│   └── server.js                 # Server entry point & security middleware
├── frontend/
│   ├── admin.html                # Admin governance dashboard
│   ├── customer.html             # Public customer verification portal
│   ├── index.html                # Main landing page
│   ├── ledger.html               # Public ledger
│   ├── login.html                # Multi-role authentication & registration
│   ├── manufacturer.html         # Manufacturer batch management & QR generator
│   ├── retailer.html             # Retailer inventory & camera scanner
│   ├── script.js                 # Core frontend controller & API client
│   └── style.css                 # Enterprise design system
├── README.md                     # Platform overview & setup instructions
├── PROJECT_MANUAL_AND_FEATURE_FLOW.md # This comprehensive manual
└── TEACHER_EXPLANATION_GUIDE.md  # Viva & evaluation preparation guide
```

---

## 3. Page-by-Page Feature Interaction Guide

### 🏠 1. Landing Page (`index.html`)

| UI Element | User Action | Behind the Scenes | Visual Output |
| :--- | :--- | :--- | :--- |
| **Page Load** | Navigate to `http://localhost:5000` | Browser sends `GET /api/medicines` and `GET /api/auth/me`. Updates KPI badges and renders user role badge in navbar. | Hero section with dynamic statistics (Active Batches, Checkpoints, Verified Count). |
| **Quick Search Bar** | Enter batch number and click "Verify Batch" | Redirects to `customer.html?search=<batchNumber>`. | Opens Customer verification page with search results. |
| **Portal Cards** | Click Manufacturer, Retailer, Customer, or Admin card | Validates session. If not logged in, redirects to `login.html`. If logged in with wrong role, displays access notice. | Navigates directly to the authorized dashboard. |
| **Navbar Login/Profile** | Click "Sign In" or user avatar | If signed in, opens profile dropdown with role badge, profile link, and logout button. | Profile menu or redirects to `login.html`. |

---

### 🔑 2. Authentication Portal (`login.html`)

| UI Element | User Action | Behind the Scenes | Visual Output |
| :--- | :--- | :--- | :--- |
| **Tab Switcher** | Click "Sign In" or "Register" | Toggles active CSS tab class without reloading. | Switches between Login and Registration views. |
| **Role Selector (Register)** | Select Manufacturer, Retailer, or Customer | Dynamically shows/hides role-specific fields (e.g., Organization, License Number). | Form updates with appropriate registration fields. |
| **Sign In Form** | Enter credentials & click "Sign In" | Sends `POST /api/auth/login`. Server checks bcrypt hash, validates account status (`active`), and issues signed JWT in HTTP-only cookie. | Green banner; redirects user directly to their role dashboard (`admin.html`, `manufacturer.html`, etc.). |
| **Suspended Account Login** | Enter credentials of a suspended user | Server returns HTTP 403: `"Account suspended. Contact administrator."` | Red error alert on screen; access denied. |
| **Forgot Password Link** | Click "Forgot Password?" | Opens modal prompting for account email. | Sends `POST /api/auth/forgot-password` and returns a secure reset link. |

---

### 👑 3. Admin Governance Panel (`admin.html`)

*Restricted to users with role `admin`.*

| UI Element | User Action | Behind the Scenes | Visual Output |
| :--- | :--- | :--- | :--- |
| **9 KPI Metric Cards** | Automatic on page load | Calls `GET /api/admin/metrics`. Aggregates counts across Users, Batches, Verifications, Recalls, and Suspensions. | Live counters for all key platform indicators. |
| **Analytics Charts** | Automatic on page load | Calls `GET /api/admin/analytics`. Uses MongoDB `$group` aggregation pipeline; renders Chart.js bar and doughnut charts. | Interactive charts for batch volume and supply-chain statuses. |
| **User Search & Filter** | Type in search box or select role filter | Client-side filters user array by name, email, or role in real time. | Table updates immediately with matching users. |
| **Suspend / Reactivate User** | Click "Suspend" or "Reactivate" button | Sends `PUT /api/admin/users/:id/status` with confirmation prompt. Logs action in `AuditLog`. | Account status changes to `suspended` or `active`. User is blocked from logging in. |
| **Change User Role** | Select new role from dropdown | Sends `PUT /api/admin/users/:id/role`. Safeguard prevents removing the last admin. | Role badge updates in table. |
| **Recall Medicine Batch** | Click "Recall" button on a batch | Opens modal requiring mandatory regulatory reason. Sends `POST /api/medicines/:id/recall`. | Batch status changes to `Recalled` (red). Warning flag set across all customer scans. |
| **System Audit Logs** | View Audit Logs tab | Calls `GET /api/admin/audit-logs`. Renders immutable record of administrative and security events. | Chronological audit trail showing actor, action, IP, and timestamp. |

---

### 🏭 4. Manufacturer Portal (`manufacturer.html`)

*Restricted to users with role `manufacturer`.*

| UI Element | User Action | Behind the Scenes | Visual Output |
| :--- | :--- | :--- | :--- |
| **Batch Registration Form** | Fill name, generic name, batch number, dates, dosage, packaging, quantity, and storage instructions | Validates that expiry date > manufacturing date. Sends `POST /api/medicines`. | Server generates cryptographic token and associates batch with the manufacturer. |
| **Submit Registration** | Click "Register Batch & Generate QR" | Creates batch, logs `Manufactured` tracking checkpoint, and generates scannable QR code. | Success alert appears; QR modal pops up with high-resolution QR code. |
| **Download QR Code** | Click "Download PNG" in QR modal | Triggers client download of base64 image data URL. | High-resolution PNG file saved to user's computer. |
| **Print Packaging Label** | Click "Print Packaging Label" | Formats medicine dossier and QR into standard packaging dimensions and calls `window.print()`. | System print dialog opens ready for physical label printing. |
| **My Batches Table** | View registered batches | Calls `GET /api/medicines/my-batches`. Shows batch number, status badge, scan counts, and date. | Clean table of all batches owned by this manufacturer. |

---

### 🏪 5. Retailer Portal (`retailer.html`)

*Restricted to users with role `retailer`.*

| UI Element | User Action | Behind the Scenes | Visual Output |
| :--- | :--- | :--- | :--- |
| **Start Camera Scanner** | Click "Start Camera Scanner" | Initializes `Html5QrcodeScanner`. Requests camera permissions. | Live camera viewfinder opens. Pointing at a QR code auto-detects and loads the batch. |
| **Select Inventory Batch** | Select batch from inventory dropdown | Calls `GET /api/retailer/inventory`. Populates current status and details. | Displays current batch information. |
| **Update Stock Status** | Select new status (`Received`, `In Stock`, `Sold`), enter location and notes, click "Update Status" | Sends `POST /api/retailer/status-update`. Server validates state transition rules. Appends new checkpoint in `TrackingHistory`. | Success notification; batch status updates in real time. |
| **Recalled Batch Guard** | Attempt to transition a recalled batch | Backend blocks update with HTTP 400: *"Cannot update status of a recalled medicine batch."* | Red error alert: Update rejected for patient safety. |
| **Recent Activity Ledger** | View transaction history | Calls `GET /api/retailer/history`. Shows all stock transitions performed by this retailer account. | Detailed audit table with timestamps, actions, and locations. |

---

### 📱 6. Customer Verification Portal (`customer.html`)

*Publicly accessible without login.*

| UI Element | User Action | Behind the Scenes | Visual Output |
| :--- | :--- | :--- | :--- |
| **Camera Scan** | Click "Scan QR with Camera" | Opens camera scanner. When QR is detected, extracts verification token from URL. | Automatically resolves verification without manual typing. |
| **Batch Search** | Enter batch number into search input and click "Verify" | Calls `GET /api/qr/batch/:batchNumber`. | Fetches authenticity report. |
| **Token Verification** | Scan QR code from external phone camera | Opens `http://localhost:5000/customer.html?token=<cryptoToken>`. Calls `GET /api/qr/verify/:token`. Increments scan count. | Displays Digital Authenticity Certificate. |
| **Authenticity Certificate** | View verification result | Renders batch number, generic name, manufacturer, composition, dosage, mfg & exp dates. | Green "GENUINE MEDICINE" certificate with seal. |
| **Recall Alert Banner** | Scan a recalled batch | Detects `isRecalled: true`. Overrides certificate with prominent warning banner. | Bright red "PRODUCT RECALL WARNING" alert displaying official recall reason. |
| **Journey Timeline** | Scroll to Supply Chain Journey | Renders chronological checkpoints from factory release to retail shelf. | Interactive visual timeline showing location, timestamp, and stage. |
| **Retailer Quick Actions** | Authenticated retailer scans customer QR | Server detects retailer session via cookie. Renders quick status transition buttons directly on the page. | Retailer can update status in one click without leaving the page. |

---

### 📜 7. Public Ledger (`ledger.html`)

| UI Element | User Action | Behind the Scenes | Visual Output |
| :--- | :--- | :--- | :--- |
| **Page Load** | Open `ledger.html` | Calls `GET /api/medicines` with search/pagination parameters. | Shows all public batches in circulation. |
| **Search & Status Filter** | Type medicine name or filter by status (`In Stock`, `Sold`, `Recalled`) | Triggers parameterized query `GET /api/medicines?search=...&status=...`. | Table instantly filters to matching records. |
| **Verify Deep-Link** | Click "Verify" button on any batch row | Opens `customer.html?token=<token>` in a new tab. | Direct verification of selected batch. |

---

## 4. Security Controls Summary

1. **HTTP-Only Cookie Storage**: Prevents JavaScript access to tokens, completely neutralizing Cross-Site Scripting (XSS) credential extraction.
2. **Cryptographic Verification Tokens**: QR codes use 256-bit cryptographically random tokens (`crypto.randomBytes(32)`). MongoDB ObjectIds are never exposed publicly.
3. **Strict State Machine**: Batches can only progress along approved supply chain stages (`Manufactured` ➔ `Received` ➔ `In Stock` ➔ `Sold`).
4. **Safety Recall Locks**: Recalled batches are instantly locked; retailers cannot mark them as sold or available.
5. **Rate Limiting**: Authentication endpoints and QR verification are protected against brute-force and scraping attacks.
6. **Regulatory Audit Logging**: All administrative, user status, and recall actions are permanently stored in an immutable audit collection.
