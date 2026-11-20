# 💊 PharmaTrace — Enterprise Pharmaceutical Supply Chain & Medicine Authentication Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Compass%20Ready-brightgreen.svg)](https://www.mongodb.com/products/compass)
[![Security](https://img.shields.io/badge/Security-Helmet%20%7C%20JWT%20Cookies%20%7C%20RateLimit-orange.svg)]()

PharmaTrace is an enterprise-grade, secure, database-driven pharmaceutical supply-chain traceability and anti-counterfeiting platform. It provides end-to-end provenance tracking from pharmaceutical manufacturers to authorized retailers and empowers patients and healthcare providers to instantly verify medicine authenticity, batch recall alerts, and full journey timelines using cryptographic QR codes and live smartphone camera scanning.

---

## 🌟 Key Features

### 🔐 1. Multi-Role Authentication & Access Control
- **4 Dedicated Roles**: **Admin**, **Manufacturer**, **Retailer**, and **Customer**.
- **JWT in Secure HTTP-Only Cookies**: Prevents client-side XSS token theft.
- **Bcrypt Password Hashing**: Salted and hashed passwords with minimum 8 characters.
- **Account Lifecycle Governance**: Supports `active`, `suspended`, and `deactivated` states.
- **Self-Service Authentication**: Tabbed login, role-specific registration (Manufacturer, Retailer, Customer), and password reset flows.
- **Admin Seeding**: Dedicated administrative accounts provisioned via secure seeder script (public admin registration is strictly disabled).

### 📊 2. Role-Based Dashboards & Portals
- **Admin Governance Panel (`admin.html`)**:
  - 9 real-time KPI metric cards (Users, Manufacturers, Retailers, Customers, Batches, Verifications, Recalls, Sales, Suspended accounts).
  - Dynamic analytics charts powered by Chart.js & MongoDB aggregation pipelines (Batch volume distribution & supply chain statuses).
  - User management: Search, role change with protection guards, suspend, reactivate, and soft deletion.
  - Medicine management: Search, view complete dossier, regulatory recall issuance with mandatory reason, and soft-delete/restore.
  - System Audit Logs: Real-time immutable record of administrative actions and security events.
- **Manufacturer Portal (`manufacturer.html`)**:
  - Comprehensive batch registration form (Generic Name, Composition, Dosage, Packaging, Quantity, Manufacturing/Expiry dates, Storage Instructions, License).
  - Batch directory with status badges and verification counts.
  - Cryptographic QR code generation with high-resolution PNG download.
  - Packaging label print generator (`@media print`) with scannable QR, barcode representation, and batch information.
- **Retailer Portal (`retailer.html`)**:
  - Live smartphone/webcam camera QR scanner powered by `html5-qrcode`.
  - Available inventory management with batch search.
  - Strict state transition workflow (`Manufactured` ➔ `Received` ➔ `In Stock` ➔ `Sold`).
  - Security safeguards preventing receipt or sale of recalled batches.
  - Personal stock action ledger with timestamps and physical locations.
- **Customer Verification Portal (`customer.html`)**:
  - Zero-login public verification via cryptographic QR code scanning or manual batch number search.
  - Live webcam and smartphone camera QR code scanner.
  - Digital Authenticity Certificate with batch integrity check.
  - High-visibility safety recall warning banners.
  - Supply Chain Journey Timeline displaying every checkpoint from manufacturing facility to pharmacy.
  - Retailer quick-action access when an authenticated retailer scans a public verification link.
- **Public Ledger (`ledger.html`)**:
  - Publicly accessible supply chain ledger with live status filtering and instant verification deep-links.

### 🛡️ 3. Advanced Security & Architecture
- **Cryptographic Verification Tokens**: QR codes embed high-entropy random hex tokens (`crypto.randomBytes(32)`). Internal MongoDB database `_id` values are never exposed in public URLs.
- **Express Rate Limiting**: Dedicated rate limiting for authentication endpoints and public QR verification endpoints to mitigate brute-force and token enumeration attacks.
- **Helmet HTTP Headers**: Protection against clickjacking, MIME-sniffing, and cross-site scripting.
- **Audit Logging**: Every state change, account suspension, and batch recall is immutably recorded in the `AuditLog` collection.
- **MongoDB Compass Connectivity**: Connects to native MongoDB or launches an embedded in-memory MongoDB engine bound to standard port `27017` (`mongodb://127.0.0.1:27017/pharmatrace`).

---

## 🗄️ Database Architecture

PharmaTrace utilizes Mongoose schemas for MongoDB:

1. **`Users`**: Name, email, passwordHash, role, accountStatus, organization, licenseNumber, phone, timestamps.
2. **`Medicines`**: Medicine name, generic name, batch number, manufacturer ID, manufacturing/expiry dates, composition, dosage, packaging, quantity, storage instructions, verificationToken, currentStatus, isRecalled, recallReason, isDeleted, checkpoints.
3. **`TrackingHistory`**: Medicine batch reference, previous status, new status, updatedBy (User), role, location, timestamp, remarks.
4. **`QRVerification`**: Medicine batch reference, verification token, scan count, scan history (timestamp, IP, userAgent).
5. **`AuditLogs`**: Action type, performedBy, targetType, targetId, ipAddress, details, timestamp.
6. **`Notifications`**: Recipient user ID, type, title, message, isRead, createdAt.
7. **`PasswordResetTokens`**: User reference, hashed token, expiresAt.

---

## 🚀 Quick Start (Windows PowerShell)

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB Compass**: (Optional, to visually inspect the live database)

### Installation & Execution

1. **Open PowerShell in the project directory**:
   ```powershell
   cd C:\Users\PRATHAM\Downloads\PharmaTrace_Updated
   ```

2. **Install dependencies**:
   ```powershell
   cd backend
   npm install
   cd ..
   ```

3. **Verify Environment Variables**:
   A pre-configured `.env` file is ready in `backend/.env`. Key parameters:
   ```ini
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/pharmatrace
   JWT_SECRET=super_secret_pharmatrace_jwt_enterprise_key_2026
   JWT_EXPIRES_IN=24h
   PUBLIC_BASE_URL=http://localhost:5000
   ```

4. **Start the PharmaTrace Server**:
   ```powershell
   node backend/server.js
   ```

5. **Open the Application**:
   Navigate to **[http://localhost:5000](http://localhost:5000)** in your browser.

6. **Connect MongoDB Compass**:
   Open **MongoDB Compass** and click **Connect** with:
   ```text
   mongodb://127.0.0.1:27017/pharmatrace
   ```
   *You will see the live collections: `users`, `medicines`, `trackinghistories`, `qrverifications`, and `auditlogs`.*

---

## 🔑 Pre-Seeded Test Credentials

On initial server boot, the system automatically provisions realistic test accounts:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pharmatrace.com` | `Admin@12345` | Complete platform governance, metrics, user management, batch recall, audit logs |
| **Manufacturer** | `manufacturer@apexpharma.com` | `Password@123` | Register batches, download QR codes, print packaging labels, track batches |
| **Retailer** | `retailer@apollocare.com` | `Password@123` | Scan QR codes via camera, update stock statuses (`Received`, `In Stock`, `Sold`) |
| **Customer** | `customer@example.com` | `Password@123` | Verify medicines, view authenticity reports & journey timelines |

---

## 🧪 Automated End-to-End Test Suite

PharmaTrace includes an automated integration test suite that verifies all critical system workflows, authentication, state transitions, security policies, and recall defenses:

```powershell
node backend/scripts/testSuite.js
```

### Verified Test Cases:
1. Server health check (`GET /health`)
2. Admin authentication & HTTP-only JWT issuance
3. Admin dashboard statistical metrics calculation
4. MongoDB aggregation pipeline for analytics charts
5. Manufacturer authentication & session establishment
6. Medicine batch registration with full pharmaceutical metadata
7. Cryptographic QR code generation (scannable Data URL)
8. Public customer verification via cryptographic random token
9. Retailer authentication & inventory inspection
10. Valid retailer state transition (`Manufactured` ➔ `In Stock`)
11. Regulatory recall issuance with audit logging
12. **Security validation**: Retailer blocked from selling or stocking a recalled batch
13. Customer verification displaying prominent recall safety warning
14. System audit log persistence and event streaming

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new Manufacturer, Retailer, or Customer
- `POST /api/auth/login` — Authenticate and receive HTTP-only JWT cookie
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `POST /api/auth/logout` — Clear session cookies
- `PUT /api/auth/profile` — Update account profile details
- `PUT /api/auth/change-password` — Update user password
- `POST /api/auth/forgot-password` — Request password reset token
- `POST /api/auth/reset-password` — Reset password using token

### Medicines & QR (`/api/medicines` & `/api/qr`)
- `GET /api/medicines` — Retrieve medicine batches with pagination and search
- `POST /api/medicines` — Register new medicine batch *(Manufacturer only)*
- `GET /api/medicines/my-batches` — Retrieve batches owned by authenticated manufacturer
- `GET /api/medicines/:id` — Retrieve comprehensive medicine details
- `GET /api/medicines/:id/qr` — Generate high-resolution scannable QR code
- `POST /api/medicines/:id/recall` — Issue official medicine recall *(Admin only)*
- `GET /api/qr/verify/:token` — Public cryptographic verification endpoint
- `GET /api/qr/batch/:batchNumber` — Fallback batch verification endpoint

### Retailer Operations (`/api/retailer`)
- `GET /api/retailer/inventory` — View active batches available for status update
- `POST /api/retailer/status-update` — Transition stock status with location and notes
- `GET /api/retailer/history` — Retailer personal transaction history

### Admin Governance (`/api/admin`)
- `GET /api/admin/metrics` — Aggregate KPI stats
- `GET /api/admin/analytics` — MongoDB aggregation pipeline data for Chart.js
- `GET /api/admin/users` — List and search registered users
- `PUT /api/admin/users/:id/role` — Update user role
- `PUT /api/admin/users/:id/status` — Suspend or reactivate user account
- `DELETE /api/admin/users/:id` — Soft-delete user account
- `GET /api/admin/audit-logs` — Stream system audit logs

---

## 🌐 Deploying to Vercel

PharmaTrace includes built-in Vercel configuration (`vercel.json` and `api/index.js` serverless handler).

### 1-Click / Git Deployment:
1. Push your repository to GitHub.
2. In [Vercel](https://vercel.com), click **Add New Project** and import `PharmaTrace`.
3. In **Project Settings > Environment Variables** (Optional, for persistent cloud database):
   - `MONGODB_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `JWT_SECRET`: A secure key for token signing
   - *Note: In MongoDB Atlas, ensure Network Access allows `0.0.0.0/0` (Access from Anywhere).*
4. Click **Deploy**. Vercel will build and host the frontend CDN and serverless backend API automatically!
5. **Zero-Setup Fallback**: If `MONGODB_URI` is not provided in Vercel, PharmaTrace automatically runs with a built-in fallback dataset so the website never crashes or shows "Failed to load".

---

## 📄 License
This project is licensed under the MIT License.
