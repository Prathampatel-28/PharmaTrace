require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const TrackingHistory = require('../models/TrackingHistory');
const QRVerification = require('../models/QRVerification');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

async function seed() {
    console.log('--- PharmaTrace Database Seeding Started ---');
    await connectDB();

    const adminName = process.env.ADMIN_NAME || 'System Administrator';
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pharmatrace.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';

    // 1. Seed or update Admin
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
        const hash = await bcrypt.hash(adminPassword, 10);
        admin = await User.create({
            name: adminName,
            email: adminEmail,
            passwordHash: hash,
            role: 'admin',
            organization: 'PharmaTrace National Regulatory Authority',
            phone: '+91 98765 43210',
            accountStatus: 'active'
        });
        console.log(`[+] Admin created: ${adminEmail}`);
    } else {
        console.log(`[i] Admin already exists: ${adminEmail}`);
    }

    // 2. Seed Sample Manufacturer
    const mfgEmail = 'manufacturer@apexpharma.com';
    let manufacturer = await User.findOne({ email: mfgEmail });
    if (!manufacturer) {
        const hash = await bcrypt.hash('Password@123', 10);
        manufacturer = await User.create({
            name: 'Apex Pharmaceuticals Ltd',
            email: mfgEmail,
            passwordHash: hash,
            role: 'manufacturer',
            organization: 'Apex Pharmaceuticals Manufacturing Unit-1',
            licenseNumber: 'MFG/FDA/2026/0891',
            phone: '+91 98234 56789',
            accountStatus: 'active'
        });
        console.log(`[+] Manufacturer created: ${mfgEmail}`);
    }

    // 3. Seed Sample Retailer
    const retEmail = 'retailer@apollocare.com';
    let retailer = await User.findOne({ email: retEmail });
    if (!retailer) {
        const hash = await bcrypt.hash('Password@123', 10);
        retailer = await User.create({
            name: 'Apollo Care Pharmacy',
            email: retEmail,
            passwordHash: hash,
            role: 'retailer',
            organization: 'Apollo Care Pharmacy, Bilaspur Outlet #4',
            licenseNumber: 'RET/DL/2026/4321',
            phone: '+91 97123 45678',
            accountStatus: 'active'
        });
        console.log(`[+] Retailer created: ${retEmail}`);
    }

    // 4. Seed Sample Customer
    const custEmail = 'customer@example.com';
    let customer = await User.findOne({ email: custEmail });
    if (!customer) {
        const hash = await bcrypt.hash('Password@123', 10);
        customer = await User.create({
            name: 'Rahul Sharma',
            email: custEmail,
            passwordHash: hash,
            role: 'customer',
            phone: '+91 96111 22334',
            accountStatus: 'active'
        });
        console.log(`[+] Customer created: ${custEmail}`);
    }

    // 5. Seed Initial Batches if collection has fewer than 2
    const count = await Medicine.countDocuments();
    if (count < 3) {
        const initialBatches = [
            {
                medicineName: 'Dolo 650mg (Paracetamol)',
                genericName: 'Paracetamol IP 650mg',
                batchNumber: 'DL-7',
                manufacturingDate: '2026-11-10',
                expiryDate: '2028-11-10',
                licenseNumber: 'MFG/FDA/2026/0891',
                composition: 'Paracetamol 650mg, Excipients q.s.',
                dosage: 'Oral Tablet, 1 tablet every 6 hours as prescribed',
                packaging: 'Blister Strip of 15 Tablets',
                quantity: 5000,
                currentStatus: 'In Stock',
                verificationToken: crypto.randomBytes(16).toString('hex'),
                checkpoints: [
                    {
                        stage: 'Manufacturer',
                        status: 'Manufactured',
                        location: 'Apex Pharmaceuticals Manufacturing Unit-1',
                        description: 'Batch produced and quality approved',
                        updatedBy: manufacturer._id,
                        updaterName: manufacturer.name,
                        timestamp: new Date('2026-11-10T10:00:00Z')
                    },
                    {
                        stage: 'Retailer',
                        status: 'Received',
                        location: 'Apollo Care Pharmacy, Bilaspur Outlet #4',
                        description: 'Shipment received, seals inspected and intact',
                        updatedBy: retailer._id,
                        updaterName: retailer.name,
                        timestamp: new Date('2026-11-15T14:30:00Z')
                    },
                    {
                        stage: 'Retailer',
                        status: 'In Stock',
                        location: 'Apollo Care Pharmacy, Bilaspur Outlet #4',
                        description: 'Stock verified and available on retail shelves',
                        updatedBy: retailer._id,
                        updaterName: retailer.name,
                        timestamp: new Date('2026-11-16T09:00:00Z')
                    }
                ]
            },
            {
                medicineName: 'Imatinib 400mg (Cancer Therapy)',
                genericName: 'Imatinib Mesylate 400mg',
                batchNumber: 'CAN-10',
                manufacturingDate: '2026-10-15',
                expiryDate: '2029-10-15',
                licenseNumber: 'MFG/FDA/2026/0891',
                composition: 'Imatinib Mesylate equivalent to Imatinib 400mg',
                dosage: '400mg daily with a meal as directed by oncologist',
                packaging: 'Bottle of 30 Film-coated Tablets',
                quantity: 1200,
                currentStatus: 'Received',
                verificationToken: crypto.randomBytes(16).toString('hex'),
                checkpoints: [
                    {
                        stage: 'Manufacturer',
                        status: 'Manufactured',
                        location: 'Apex Pharmaceuticals Cleanroom Facility',
                        description: 'Sterile oncology batch packaging completed',
                        updatedBy: manufacturer._id,
                        updaterName: manufacturer.name,
                        timestamp: new Date('2026-10-15T08:00:00Z')
                    },
                    {
                        stage: 'Retailer',
                        status: 'Received',
                        location: 'Apollo Care Pharmacy, Bilaspur Outlet #4',
                        description: 'Cold chain verified (2-8°C) and logged into secure storage',
                        updatedBy: retailer._id,
                        updaterName: retailer.name,
                        timestamp: new Date('2026-10-22T11:00:00Z')
                    }
                ]
            },
            {
                medicineName: 'Cisplatin 50mg Injection (Oncology)',
                genericName: 'Cisplatin Injection IP 50mg/50ml',
                batchNumber: 'CAN-09',
                manufacturingDate: '2026-09-01',
                expiryDate: '2028-09-01',
                licenseNumber: 'MFG/FDA/2026/0891',
                composition: 'Cisplatin 1mg/ml in sterile aqueous solution',
                dosage: 'Intravenous infusion under expert oncological supervision',
                packaging: 'Single-dose Vial of 50ml',
                quantity: 800,
                currentStatus: 'Recalled',
                isRecalled: true,
                recallReason: 'Regulatory Safety Advisory: Secondary packaging seal integrity defect',
                recalledAt: new Date('2026-11-18T08:00:00Z'),
                verificationToken: crypto.randomBytes(16).toString('hex'),
                checkpoints: [
                    {
                        stage: 'Manufacturer',
                        status: 'Manufactured',
                        location: 'Apex Pharmaceuticals Cleanroom Facility',
                        description: 'Sterile injectable batch manufactured',
                        updatedBy: manufacturer._id,
                        updaterName: manufacturer.name,
                        timestamp: new Date('2026-09-01T10:00:00Z')
                    },
                    {
                        stage: 'Recall Notice',
                        status: 'Recalled',
                        location: 'Regulatory & Quality Compliance Office',
                        description: 'URGENT RECALL: Secondary packaging seal defect flagged in audit',
                        updatedBy: admin._id,
                        updaterName: admin.name,
                        timestamp: new Date('2026-11-18T08:00:00Z')
                    }
                ]
            }
        ];

        for (const item of initialBatches) {
            const med = await Medicine.create({
                ...item,
                manufacturerId: manufacturer._id,
                manufacturerName: manufacturer.organization
            });

            await QRVerification.create({
                medicineId: med._id,
                batchNumber: med.batchNumber,
                verificationToken: med.verificationToken,
                scanCount: 3
            });

            await TrackingHistory.create({
                medicineId: med._id,
                batchNumber: med.batchNumber,
                previousStatus: 'None',
                newStatus: med.currentStatus,
                updatedBy: manufacturer._id,
                updaterName: manufacturer.name,
                userRole: 'manufacturer',
                remarks: 'Initial seed entry',
                location: manufacturer.organization
            });
        }
        console.log('[+] Seeded 3 verified pharmaceutical batches with tracking history.');
    }

    console.log('\n========================================================');
    console.log('✅ SEEDING COMPLETE! You can log in with:');
    console.log('--------------------------------------------------------');
    console.log(`👑 Admin:        ${adminEmail}  | Password: ${adminPassword}`);
    console.log(`🏭 Manufacturer: ${mfgEmail}  | Password: Password@123`);
    console.log(`🏪 Retailer:     ${retEmail}  | Password: Password@123`);
    console.log(`📱 Customer:     ${custEmail}  | Password: Password@123`);
    console.log('========================================================\n');
}

seed().then(() => {
    console.log('Seeder finished.');
    process.exit(0);
}).catch(err => {
    console.error('Seeder failed:', err);
    process.exit(1);
});
