# 🎓 PharmaTrace — Complete Teacher & Examiner Explanation Guide

This guide is designed to help you confidently present, explain, and defend the PharmaTrace platform during project vivas, evaluations, and teacher reviews.

---

## 1. Executive Summary (The 30-Second Elevator Pitch)

> *"PharmaTrace is an enterprise-grade pharmaceutical supply chain and anti-counterfeit authentication platform. It provides end-to-end provenance tracking of medicine batches from licensed manufacturers through retail pharmacies to end consumers. By combining role-based access control, cryptographic verification tokens in scannable QR codes, live smartphone camera scanning, and an immutable audit trail, PharmaTrace ensures that expired, counterfeit, or recalled medicines can be detected instantly by patients before consumption."*

---

## 2. Real-World Pharmaceutical Challenges & Our Solutions

| Pharmaceutical Industry Challenge | PharmaTrace Engineering Solution |
| :--- | :--- |
| **Counterfeit & Substandard Drugs**: WHO estimates over 10% of medicines in developing nations are fake. | **Cryptographic QR Verification**: Every batch has a 256-bit cryptographically secure random token generated at manufacturing time. Internal database IDs are never exposed. |
| **Uncontrolled Sales of Recalled Batches**: Contaminated medicines often remain on pharmacy shelves for weeks after a recall. | **Real-Time Regulatory Recall Lock**: Admins can issue an immediate batch recall with an audit reason. The system blocks retailers from selling it and triggers a prominent warning on all customer scans. |
| **Lack of Supply Chain Transparency**: Consumers have no insight into storage conditions, transit history, or authenticity. | **Verifiable Supply Chain Journey**: Visual chronological timeline showing every checkpoint, location, timestamp, and handling party from factory release to retail shelf. |
| **Credential Theft & Insecure Storage**: Tokens stored in client localStorage are vulnerable to XSS attacks. | **Enterprise Security**: Stateless JWTs stored exclusively in secure `httpOnly`, `SameSite=Lax` cookies, with salted bcrypt password hashing and rate limiting. |

---

## 3. High-Level Architecture Diagram

```
 +-------------------------------------------------------------------------------+
 |                              FRONTEND CLIENT                                  |
 |  • Admin Panel (admin.html)        • Manufacturer Portal (manufacturer.html)  |
 |  • Retailer Scanner (retailer.html)• Customer Verification (customer.html)    |
 |  • Public Ledger (ledger.html)     • Authentication Portal (login.html)       |
 |                                                                               |
 |  Technologies: HTML5, Modern CSS Grid/Flexbox, ES6 Fetch API, Chart.js,       |
 |                HTML5-QRCode Camera Scanner, FontAwesome 6 Icons               |
 +---------------------------------------+---------------------------------------+
                                         |
                            HTTP/REST API (JSON)
                            Credentials: include (HTTP-Only Cookies)
                                         |
                                         v
 +-------------------------------------------------------------------------------+
 |                              BACKEND SERVER (Node.js & Express)               |
 |  Security & Middleware:                                                       |
 |  • Helmet (HTTP Security Headers)    • Express Rate Limiting (Brute-force)    |
 |  • CORS with Credentials             • Cookie Parser                          |
 |  • JWT Auth Verification Middleware  • Role-Based Access Control (RBAC)       |
 |                                                                               |
 |  Controllers:                                                                 |
 |  • Auth Controller                   • Medicine Controller (Crypto Tokens)    |
 |  • Retailer Controller (Transitions) • QR Controller (Camera/Scans)           |
 |  • Admin Controller (Metrics/Charts) • Notification Controller                |
 +---------------------------------------+---------------------------------------+
                                         |
                             Mongoose ODM / MongoDB Driver
                                         |
                                         v
 +-------------------------------------------------------------------------------+
 |                              DATABASE LAYER                                   |
 |  MongoDB Collections (Port 27017 - MongoDB Compass Ready):                    |
 |  • Users              • Medicines              • TrackingHistory              |
 |  • QRVerification     • AuditLogs              • Notifications                |
 |  • PasswordResetTokens                                                        |
 +-------------------------------------------------------------------------------+
```

---

## 4. Key Engineering Modules Explained

### 🔑 A. Multi-Role Authentication & Access Control (RBAC)
- **4 Distinct Roles**:
  - `admin`: Platform supervision, user suspension/deletion, medicine recalls, audit streams.
  - `manufacturer`: Batch registration, QR code generation, label printing, batch tracking.
  - `retailer`: Live camera scanning, inventory intake, status transitions (`Received` ➔ `In Stock` ➔ `Sold`).
  - `customer`: Zero-login public verification, authenticity certificate, journey timeline.
- **Why HTTP-Only Cookies?**
  - Many beginner projects store JWTs in `localStorage`. This is a severe security vulnerability because any malicious JavaScript (XSS) can steal the token. By using `httpOnly: true`, the browser automatically attaches the cookie to requests, but JavaScript cannot read it.

### 🛡️ B. Cryptographic QR Verification System
- **The Vulnerability in Basic Projects**:
  - Naive systems generate QR codes like `http://example.com/verify?id=65a123...` using predictable MongoDB `_id`s or sequential numbers. An attacker can write a simple script to enumerate all batches.
- **PharmaTrace Solution**:
  - We use Node's native `crypto.randomBytes(32).toString('hex')` to create a 256-bit unguessable token (e.g., `4e28bf61...`).
  - The QR code contains `http://localhost:5000/customer.html?token=<token>`.
  - When scanned, the backend resolves the token to the medicine dossier while keeping the internal database ID completely private.
  - Scans are rate-limited and logged with client IP and user agent in the `QRVerification` collection.

### 📦 C. Supply Chain State Machine & Transition Validation
- Medicines must follow a strict physical lifecycle:
  $$\text{Manufactured} \longrightarrow \text{Received} \longrightarrow \text{In Stock} \longrightarrow \text{Sold}$$
- The backend enforces these transition rules:
  1. A retailer cannot mark a batch as `Sold` if it was never `Received` or `In Stock`.
  2. If an admin issues a **Recall**, the batch is permanently locked. Retailers are prevented from updating its status, ensuring contaminated or recalled medicines cannot be marked as sold.
  3. Every status transition creates an immutable record in `TrackingHistory` linking the action to the authenticated retailer's user ID, location, and timestamp.

### 📊 D. MongoDB Aggregation Pipeline & Real-Time Analytics
- In `adminController.js`, we use MongoDB aggregation pipelines (`$group`, `$facet`, `$project`) rather than fetching all rows into memory:
  ```javascript
  const statusStats = await Medicine.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
  ]);
  ```
- This enables sub-millisecond real-time analytics displayed via interactive Chart.js bar and doughnut visualizations on the Admin dashboard.

### 🗄️ E. Dual-Mode Database Architecture (Compass Ready)
- When developing locally, instructors or examiners often want to see the database in **MongoDB Compass**.
- PharmaTrace checks for an active MongoDB instance. If not running, it automatically boots an in-memory MongoDB instance bound to standard port `27017`.
- Anyone can open MongoDB Compass and connect to `mongodb://127.0.0.1:27017/pharmatrace` to inspect the live data immediately.

---

## 5. Top 10 Viva / Teacher Questions & Exact Model Answers

### Q1: *"What is the main objective of your project?"*
> **Answer**: *"The objective of PharmaTrace is to eliminate counterfeit medicines and improve pharmaceutical recall management. It provides end-to-end supply chain transparency, allowing manufacturers to register batches and generate secure QR codes, retailers to log inventory movement, and consumers to verify authenticity instantly on any smartphone."*

---

### Q2: *"How is user authentication implemented?"*
> **Answer**: *"We use JSON Web Tokens (JWT) signed with HMAC SHA-256 and stored in secure HTTP-only cookies. Passwords are never stored in plain text; they are salted and hashed using bcrypt with 10 rounds of hashing. We also enforce role-based access control middleware so users can only access endpoints authorized for their role."*

---

### Q3: *"Why did you use HTTP-only cookies instead of localStorage for JWT tokens?"*
> **Answer**: *"If a token is saved in localStorage, any client-side JavaScript script can read it. If the application has any Cross-Site Scripting (XSS) vulnerability, an attacker could steal the token. With HTTP-only cookies, the browser automatically attaches the cookie to backend requests, but the token cannot be accessed by client-side JavaScript, providing enterprise-grade session protection."*

---

### Q4: *"Why do you use cryptographic tokens in the QR code instead of MongoDB ObjectIds?"*
> **Answer**: *"MongoDB ObjectIds follow a predictable 24-character hexadecimal pattern based on timestamp, machine ID, and process ID. If we put internal ObjectIds in QR codes, an attacker could enumerate or guess other medicine batch IDs. By using crypto.randomBytes(32), we generate 256 bits of cryptographic entropy, making brute-force token enumeration mathematically impossible."*

---

### Q5: *"What happens when a medicine batch is recalled by regulatory authorities?"*
> **Answer**: *"An authorized administrator can issue a recall from the Admin Panel with a required regulatory justification. Once recalled:
> 1. The batch status in MongoDB changes to 'Recalled' with the recall reason and timestamp.
> 2. Retailers are programmatically blocked by backend validation from updating or selling the batch.
> 3. Any customer scanning the QR code immediately sees a bright red 'PRODUCT RECALL WARNING' banner explaining why the batch was recalled."*

---

### Q6: *"How does the live camera QR code scanner work?"*
> **Answer**: *"We integrated the html5-qrcode library. It uses the browser's MediaDevices API to access the device's camera stream with user permission. It processes video frames in real time using Canvas to locate and decode QR code matrices. Once decoded, it extracts the verification token and triggers an asynchronous fetch to our verification API without requiring manual typing."*

---

### Q7: *"Can a retailer alter or delete another retailer's updates or manufacturer records?"*
> **Answer**: *"No. Role-based middleware ensures retailers cannot access manufacturer registration routes. Furthermore, in our retailer controller, status updates only append new chronological tracking checkpoints into the TrackingHistory collection; they cannot edit or overwrite previous entries. Every checkpoint records the authenticated retailer's unique ID."*

---

### Q8: *"How do you handle soft deletion versus hard deletion?"*
> **Answer**: *"In pharmaceutical supply chains, FDA and regulatory standards mandate keeping complete audit records. We use soft deletion by setting an `isDeleted: true` flag on user accounts and batches rather than dropping documents with `.deleteOne()`. This preserves the historical provenance and audit trail for compliance."*

---

### Q9: *"How are the admin dashboard analytics generated?"*
> **Answer**: *"The analytics are generated using MongoDB aggregation pipelines on the backend. We use `$match` to filter active records, `$group` to aggregate counts by status and manufacturer, and `$facet` to compute multi-dimensional statistics in a single database roundtrip. The frontend renders these aggregated numbers using Chart.js."*

---

### Q10: *"What security measures are implemented against Denial of Service (DoS) and brute force attacks?"*
> **Answer**: *"We implemented express-rate-limit with multiple rate limiters: a strict limiter on authentication routes (login/register) to prevent credential stuffing, a dedicated limiter on public QR verification to prevent automated token scraping, and a general limiter across all API routes. We also use Helmet to set secure HTTP headers."*
