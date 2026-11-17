# PharmaTrace — Updated Existing Project

This update keeps the original PharmaTrace visual style and changes its data layer from browser `localStorage` to MongoDB using Node.js, Express and Mongoose.

## Features
- Manufacturer registers medicine batches.
- A QR code is generated for each batch. It opens the customer verification page.
- Retailer updates status: Received, In Stock, Sold or Recalled.
- Customer can enter a batch number or scan its QR code to view medicine details, current status and tracking history.
- Ledger lists all medicine batches.

## Requirements
- Node.js (LTS recommended)
- MongoDB Community Server running locally, or a MongoDB Atlas connection string

## Run on Windows PowerShell
1. Extract this folder.
2. Open PowerShell inside `PharmaTrace_Updated/backend`.
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Create your environment file:
   ```powershell
   Copy-Item .env.example .env
   ```
5. Open `.env`. For local MongoDB, keep `MONGODB_URI=mongodb://127.0.0.1:27017/pharmatrace`. If using Atlas, replace it with your own connection string.
6. Start the server:
   ```powershell
   npm start
   ```
7. Open `http://localhost:5000` in your browser. Do not open the HTML files directly from File Explorer; use the server URL.

## QR code on another phone
The default QR URL uses `localhost`, which works only on the same computer. To scan from a phone, set `PUBLIC_BASE_URL` in `.env` to a URL reachable by that phone (for example, your computer's LAN IP and port, or a deployed HTTPS URL), restart the server, then generate the QR code again. Both devices must be able to reach that address.

## API summary
- `POST /api/medicines` — register a batch
- `GET /api/medicines` — list batches
- `GET /api/medicines/:id` — get one batch
- `GET /api/medicines/batch/:batchNumber` — customer batch lookup
- `GET /api/medicines/:id/qr` — generate QR image data URL
- `PUT /api/medicines/:id/status` — retailer status update

## Important prototype limitation
This is a simple academic prototype. It does not include login/role permissions, so do not expose the retailer update API publicly as a production medicine system. Real pharmaceutical verification also requires authenticated actors, audit controls, and validated product data.
