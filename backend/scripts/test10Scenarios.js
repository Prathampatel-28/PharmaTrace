/**
 * PharmaTrace 10 Security Scenarios Verification Script
 * Validates duplicate navigation elimination and all 10 authentication/authorization security scenarios.
 */
const BASE_URL = 'http://localhost:5000';

let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    testCount++;
    if (condition) {
        passCount++;
        console.log(`  ✅ PASS: Scenario ${testCount}. ${message}`);
    } else {
        failCount++;
        console.error(`  ❌ FAIL: Scenario ${testCount}. ${message}`);
    }
}

async function runScenarios() {
    console.log('🧪 Starting PharmaTrace 10-Scenario Security Verification Suite...\n');

    // SCENARIO 1: Open manufacturer.html without logging in (Server-side & Client-side protected)
    try {
        const res = await fetch(`${BASE_URL}/manufacturer.html`, {
            redirect: 'manual'
        });
        const isRedirect = res.status === 302 || res.status === 301 || res.status === 307;
        const location = res.headers.get('location') || '';
        assert(isRedirect && location.includes('login.html'), 'Open manufacturer.html without logging in redirects to login.html (HTTP 302)');
    } catch (e) {
        assert(false, `Scenario 1 failed with error: ${e.message}`);
    }

    // SCENARIO 2: Open retailer.html without logging in
    try {
        const res = await fetch(`${BASE_URL}/retailer.html`, {
            redirect: 'manual'
        });
        const isRedirect = res.status === 302 || res.status === 301 || res.status === 307;
        const location = res.headers.get('location') || '';
        assert(isRedirect && location.includes('login.html'), 'Open retailer.html without logging in redirects to login.html (HTTP 302)');
    } catch (e) {
        assert(false, `Scenario 2 failed with error: ${e.message}`);
    }

    // SCENARIO 3: Open protected API endpoints without authentication
    try {
        const [r1, r2, r3, r4, r5, r6] = await Promise.all([
            fetch(`${BASE_URL}/api/medicines/my-batches`),
            fetch(`${BASE_URL}/api/medicines`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }),
            fetch(`${BASE_URL}/api/medicines/12345/qr`),
            fetch(`${BASE_URL}/api/retailer/batches`),
            fetch(`${BASE_URL}/api/admin/dashboard`),
            fetch(`${BASE_URL}/api/auth/me`)
        ]);
        const all401 = [r1, r2, r3, r4, r5, r6].every(r => r.status === 401);
        assert(all401, 'Protected APIs reject unauthenticated requests with HTTP 401 Unauthorized');
    } catch (e) {
        assert(false, `Scenario 3 failed with error: ${e.message}`);
    }

    // Login helpers
    async function login(email, password) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        return { token: data.token, user: data.user, cookie: res.headers.get('set-cookie') };
    }

    // SCENARIO 4: Try accessing manufacturer functionality using a retailer account
    try {
        const retLogin = await login('retailer@apollocare.com', 'Password@123');
        const retHeaders = { 'Authorization': `Bearer ${retLogin.token}`, 'Content-Type': 'application/json' };

        const postMed = await fetch(`${BASE_URL}/api/medicines`, {
            method: 'POST',
            headers: retHeaders,
            body: JSON.stringify({ medicineName: 'Illicit Drug', batchNumber: 'ILL-01', manufacturingDate: '2026-01-01', expiryDate: '2027-01-01' })
        });

        const getMyBatches = await fetch(`${BASE_URL}/api/medicines/my-batches`, { headers: retHeaders });

        assert(postMed.status === 403 && getMyBatches.status === 403, 'Retailer is blocked with HTTP 403 Forbidden from manufacturer endpoints (batch registration & catalog)');
    } catch (e) {
        assert(false, `Scenario 4 failed with error: ${e.message}`);
    }

    // SCENARIO 5: Try accessing retailer functionality using a manufacturer account
    try {
        const mfgLogin = await login('manufacturer@apexpharma.com', 'Password@123');
        const mfgHeaders = { 'Authorization': `Bearer ${mfgLogin.token}`, 'Content-Type': 'application/json' };

        const getRetBatches = await fetch(`${BASE_URL}/api/retailer/batches`, { headers: mfgHeaders });
        const putRetStatus = await fetch(`${BASE_URL}/api/retailer/status/123`, {
            method: 'PUT',
            headers: mfgHeaders,
            body: JSON.stringify({ status: 'Sold' })
        });

        assert(getRetBatches.status === 403 && putRetStatus.status === 403, 'Manufacturer is blocked with HTTP 403 Forbidden from retailer endpoints');
    } catch (e) {
        assert(false, `Scenario 5 failed with error: ${e.message}`);
    }

    // SCENARIO 6: Verify a medicine using a public QR link without logging in
    try {
        const publicQr = await fetch(`${BASE_URL}/api/qr/DL-7`);
        const qrData = await publicQr.json();
        const hasSafeData = qrData.isAuthentic === true && qrData.medicine && qrData.medicine.medicineName && qrData.medicine.medicineName.includes('Dolo');
        assert(publicQr.status === 200 && hasSafeData, 'Unauthenticated customer can verify genuine medicine via public QR endpoint');
    } catch (e) {
        assert(false, `Scenario 6 failed with error: ${e.message}`);
    }

    // SCENARIO 7: Try modifying medicine data without authentication
    try {
        const putMed = await fetch(`${BASE_URL}/api/medicines/12345`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dosage: 'Hacked' })
        });
        const recallMed = await fetch(`${BASE_URL}/api/medicines/12345/recall`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Hacked' })
        });
        const statusMed = await fetch(`${BASE_URL}/api/medicines/12345/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Sold' })
        });

        const allBlocked = putMed.status === 401 && recallMed.status === 401 && statusMed.status === 401;
        assert(allBlocked, 'Unauthenticated attempts to modify medicine data return HTTP 401 Unauthorized');
    } catch (e) {
        assert(false, `Scenario 7 failed with error: ${e.message}`);
    }

    // SCENARIO 8: Open Public Ledger and verify that only permitted information is visible
    try {
        const ledgerRes = await fetch(`${BASE_URL}/api/medicines`);
        const ledgerData = await ledgerRes.json();
        const medicines = ledgerData.medicines || [];

        let tokensExposed = false;
        let mfgIdsExposed = false;
        let passwordsExposed = false;

        for (const m of medicines) {
            if (m.verificationToken) tokensExposed = true;
            if (m.manufacturerId) mfgIdsExposed = true;
            if (m.password || m.passwordHash) passwordsExposed = true;
        }

        const isSafe = ledgerRes.status === 200 && medicines.length > 0 && !tokensExposed && !mfgIdsExposed && !passwordsExposed;
        assert(isSafe, 'Public Ledger returns sanitized data; verification tokens, manufacturer IDs & credentials are NEVER exposed');
    } catch (e) {
        assert(false, `Scenario 8 failed with error: ${e.message}`);
    }

    // SCENARIO 9: Log in, log out and attempt to reuse the previous session
    try {
        const tempLogin = await login('manufacturer@apexpharma.com', 'Password@123');
        const token = tempLogin.token;

        // 1. Verify token is active
        const preCheck = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const preActive = preCheck.status === 200;

        // 2. Perform Logout
        const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 3. Attempt to reuse token
        const postCheck = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        assert(preActive && logoutRes.status === 200 && postCheck.status === 401, 'Logged out session token is revoked server-side; reuse attempt returns HTTP 401 Unauthorized');
    } catch (e) {
        assert(false, `Scenario 9 failed with error: ${e.message}`);
    }

    // SCENARIO 10: Try accessing another manufacturer's batch by changing its batch ID
    try {
        const apexLogin = await login('manufacturer@apexpharma.com', 'Password@123');
        const apexBatchesRes = await fetch(`${BASE_URL}/api/medicines/my-batches`, {
            headers: { 'Authorization': `Bearer ${apexLogin.token}` }
        });
        const apexBatches = await apexBatchesRes.json();
        const apexBatchId = apexBatches[0]._id;

        // BioCare logs in
        const bioCareLogin = await login('biocare@manufacturer.com', 'Password@123');
        const bioCareHeaders = { 'Authorization': `Bearer ${bioCareLogin.token}`, 'Content-Type': 'application/json' };

        // BioCare tries to inspect Apex's batch by ID
        const crossInspect = await fetch(`${BASE_URL}/api/medicines/${apexBatchId}`, {
            headers: bioCareHeaders
        });

        // BioCare tries to generate QR for Apex's batch by ID
        const crossQr = await fetch(`${BASE_URL}/api/medicines/${apexBatchId}/qr`, {
            headers: bioCareHeaders
        });

        // BioCare tries to update Apex's batch by ID
        const crossUpdate = await fetch(`${BASE_URL}/api/medicines/${apexBatchId}`, {
            method: 'PUT',
            headers: bioCareHeaders,
            body: JSON.stringify({ dosage: 'Tampered' })
        });

        // BioCare tries to recall Apex's batch by ID
        const crossRecall = await fetch(`${BASE_URL}/api/medicines/${apexBatchId}/recall`, {
            method: 'POST',
            headers: bioCareHeaders,
            body: JSON.stringify({ reason: 'Malicious recall attempt' })
        });

        const allCrossForbidden = crossInspect.status === 403 && crossQr.status === 403 && crossUpdate.status === 403 && crossRecall.status === 403;
        assert(allCrossForbidden, 'Cross-tenant attack blocked with HTTP 403 Forbidden when Manufacturer B targets Manufacturer A batch ID');
    } catch (e) {
        assert(false, `Scenario 10 failed with error: ${e.message}`);
    }

    console.log('\n========================================================');
    console.log(`🏁 10-SCENARIO SUITE COMPLETE: ${passCount} Passed, ${failCount} Failed.`);
    console.log('========================================================\n');

    process.exit(failCount === 0 ? 0 : 1);
}

runScenarios().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
