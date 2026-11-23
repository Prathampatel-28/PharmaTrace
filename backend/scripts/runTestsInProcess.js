const app = require('../server');
const http = require('http');

const PORT = 5055;
const server = app.listen(PORT, async () => {
    console.log(`[Test Server] In-process server listening on port ${PORT}`);

    function request(path, options = {}, body = null, cookie = '') {
        return new Promise((resolve, reject) => {
            const u = new URL(`http://localhost:${PORT}` + path);
            const headers = {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            };
            if (cookie) headers['Cookie'] = cookie;

            const req = http.request(u, { method: options.method || 'GET', headers }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    const setCookie = res.headers['set-cookie'];
                    let parsed = {};
                    try { parsed = JSON.parse(data); } catch { parsed = { raw: data }; }
                    resolve({
                        status: res.statusCode,
                        body: parsed,
                        headers: res.headers,
                        cookie: setCookie ? setCookie[0].split(';')[0] : cookie
                    });
                });
            });
            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    let passCount = 0;
    let failCount = 0;

    function assert(condition, testName) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`);
            passCount++;
        } else {
            console.error(`  ❌ FAIL: ${testName}`);
            failCount++;
        }
    }

    try {
        // Test 1: Health
        const h = await request('/api/health');
        assert(h.status === 200 && h.body.status === 'ok', '1. Server Health Check returns 200 OK');

        // Test 2: Admin Login
        const adminLogin = await request('/api/auth/login', { method: 'POST' }, {
            email: 'admin@pharmatrace.com',
            password: 'Admin@12345'
        });
        assert(adminLogin.status === 200 && adminLogin.body.user.role === 'admin', '2. Admin Authentication & JWT Generation');
        const adminCookie = adminLogin.cookie;

        // Test 3: Admin Dashboard Stats
        const stats = await request('/api/admin/dashboard', {}, null, adminCookie);
        assert(stats.status === 200 && stats.body.totalUsers > 0, `3. Admin Dashboard Metrics (Total Users: ${stats.body.totalUsers})`);

        // Test 4: Admin Analytics
        const analytics = await request('/api/admin/analytics', {}, null, adminCookie);
        assert(analytics.status === 200 && Array.isArray(analytics.body.statusDistribution), '4. Admin MongoDB Analytics Aggregation');

        // Test 5: Manufacturer A Login
        const mfgLogin = await request('/api/auth/login', { method: 'POST' }, {
            email: 'manufacturer@apexpharma.com',
            password: 'Password@123'
        });
        assert(mfgLogin.status === 200 && mfgLogin.body.user.role === 'manufacturer', '5. Manufacturer A Authentication');
        const mfgCookie = mfgLogin.cookie;

        // Test 6: Manufacturer Create Batch
        const newBatchNumber = 'TEST-BATCH-' + Date.now().toString().slice(-4);
        const newBatch = await request('/api/medicines', { method: 'POST' }, {
            medicineName: 'Azithromycin 500mg Tablet',
            genericName: 'Azithromycin IP',
            batchNumber: newBatchNumber,
            manufacturingDate: '2026-11-01',
            expiryDate: '2028-11-01',
            dosage: '500mg oral once daily',
            packaging: 'Strip of 3 Tablets',
            quantity: 2500,
            storageInstructions: 'Store below 30°C'
        }, mfgCookie);
        assert(newBatch.status === 201 && newBatch.body.batchNumber === newBatchNumber, `6. Manufacturer Batch Registration (${newBatchNumber})`);
        const createdMed = newBatch.body;

        // Test 7: QR Code Generation
        const qrRes = await request(`/api/medicines/${createdMed._id}/qr`);
        assert(qrRes.status === 200 && qrRes.body.qrCode.startsWith('data:image/png;base64,'), '7. Cryptographic QR Code PNG Data URL Generation');

        // Test 8: Public Customer Verification (Read-Only)
        const verifyRes = await request(`/api/qr/${createdMed.verificationToken}`);
        assert(verifyRes.status === 200 && verifyRes.body.isAuthentic === true && verifyRes.body.medicine.batchNumber === newBatchNumber, '8. Public Customer QR Verification by Cryptographic Token');

        // Test 9: Retailer Login
        const retLogin = await request('/api/auth/login', { method: 'POST' }, {
            email: 'retailer@apollocare.com',
            password: 'Password@123'
        });
        assert(retLogin.status === 200 && retLogin.body.user.role === 'retailer', '9. Retailer Authentication');
        const retCookie = retLogin.cookie;

        // Test 10: Retailer Update Status to In Stock
        const updateStatusRes = await request(`/api/retailer/status/${createdMed._id}`, { method: 'PUT' }, {
            status: 'In Stock',
            location: 'Apollo Care Pharmacy, Bilaspur Outlet #4',
            remarks: 'Shipment verified and stocked on Shelf B'
        }, retCookie);
        assert(updateStatusRes.status === 200 && updateStatusRes.body.medicine.currentStatus === 'In Stock', '10. Retailer Stock Status Transition (Manufactured -> In Stock)');

        // Test 11: Admin Recall Batch
        const recallRes = await request(`/api/medicines/${createdMed._id}/recall`, { method: 'POST' }, {
            reason: 'Test safety recall verification audit'
        }, adminCookie);
        assert(recallRes.status === 200 && recallRes.body.medicine.currentStatus === 'Recalled', '11. Regulatory Recall Issued with Reason & Audit Log');

        // Test 12: Security Test - Retailer Blocked from Selling Recalled Medicine
        const blockedUpdate = await request(`/api/retailer/status/${createdMed._id}`, { method: 'PUT' }, {
            status: 'Sold',
            location: 'Apollo Care Pharmacy',
            remarks: 'Attempting to sell recalled stock'
        }, retCookie);
        assert(blockedUpdate.status === 400 && blockedUpdate.body.message.includes('RECALLED'), '12. SECURITY CHECK: Retailer prevented from selling/stocking recalled batch');

        // Test 13: Customer Verification Shows Prominent Recall
        const reVerify = await request(`/api/qr/${createdMed.verificationToken}`);
        assert(reVerify.status === 200 && reVerify.body.medicine.isRecalled === true, '13. Customer Verification flags Recall Warning');

        // Test 14: Audit Logs Recorded
        const audit = await request('/api/admin/audit-logs', {}, null, adminCookie);
        assert(audit.status === 200 && audit.body.logs.length > 0, `14. System Audit Logs Stream (Recorded: ${audit.body.logs.length} events)`);

        // Test 15: Multi-Tenant Manufacturer A Isolation
        const mfgABatches = await request('/api/medicines/my-batches', {}, null, mfgCookie);
        const mfgAHasBioCare = Array.isArray(mfgABatches.body) && mfgABatches.body.some(b => b.batchNumber === 'AMX-2026-01');
        assert(mfgABatches.status === 200 && !mfgAHasBioCare, '15. DATA ISOLATION: Manufacturer A (Apex) CANNOT see Manufacturer B (BioCare) batches');

        // Test 16: Multi-Tenant Manufacturer B Login & Visibility
        const mfgBLogin = await request('/api/auth/login', { method: 'POST' }, {
            email: 'biocare@manufacturer.com',
            password: 'Password@123'
        });
        assert(mfgBLogin.status === 200 && mfgBLogin.body.user.role === 'manufacturer', '16. Manufacturer B (BioCare Labs) Authentication');
        const mfgBCookie = mfgBLogin.cookie;

        const mfgBBatches = await request('/api/medicines/my-batches', {}, null, mfgBCookie);
        const mfgBHasOwn = Array.isArray(mfgBBatches.body) && mfgBBatches.body.some(b => b.batchNumber === 'AMX-2026-01');
        const mfgBHasApex = Array.isArray(mfgBBatches.body) && mfgBBatches.body.some(b => b.batchNumber === newBatchNumber || b.batchNumber === 'DL-7');
        assert(mfgBBatches.status === 200 && mfgBHasOwn && !mfgBHasApex, '17. DATA ISOLATION: Manufacturer B sees ONLY their own batches and zero Apex batches');

        // Test 17: Cross-Tenant Protection (403 Forbidden)
        const crossInspect = await request(`/api/medicines/${createdMed._id}`, {}, null, mfgBCookie);
        assert(crossInspect.status === 403, '18. CROSS-TENANT SECURITY: Manufacturer B blocked with 403 Forbidden from querying Manufacturer A product');

        const crossQr = await request(`/api/medicines/${createdMed._id}/qr`, {}, null, mfgBCookie);
        assert(crossQr.status === 403, '19. CROSS-TENANT SECURITY: Manufacturer B blocked with 403 Forbidden from generating Manufacturer A QR code');

        // Test 18: Public Customer Access Remains Unblocked
        const publicQr = await request(`/api/qr/${createdMed.verificationToken}`);
        assert(publicQr.status === 200 && publicQr.body.isAuthentic, '20. PUBLIC ACCESS: Unauthenticated patient can still verify genuine medicine');

        console.log(`\n========================================================`);
        console.log(`🏁 TEST SUITE COMPLETE: ${passCount} Passed, ${failCount} Failed.`);
        console.log(`========================================================\n`);

        server.close(() => {
            process.exit(failCount === 0 ? 0 : 1);
        });
    } catch (err) {
        console.error('Test Suite encountered an error:', err);
        server.close(() => process.exit(1));
    }
});
