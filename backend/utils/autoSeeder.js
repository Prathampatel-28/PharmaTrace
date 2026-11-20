const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const TrackingHistory = require('../models/TrackingHistory');
const QRVerification = require('../models/QRVerification');
const { isMongoConnected } = require('../config/db');

async function autoSeed() {
    if (!isMongoConnected()) {
        return;
    }
    try {
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@pharmatrace.com').toLowerCase();
        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
            const hash = await bcrypt.hash(adminPassword, 10);
            admin = await User.create({
                name: process.env.ADMIN_NAME || 'System Administrator',
                email: adminEmail,
                passwordHash: hash,
                role: 'admin',
                organization: 'PharmaTrace National Regulatory Authority',
                phone: '+91 98765 43210',
                accountStatus: 'active'
            });
            console.log(`[AutoSeed] Created Admin account: ${adminEmail}`);
        }

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
            console.log(`[AutoSeed] Created Manufacturer account: ${mfgEmail}`);
        }

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
            console.log(`[AutoSeed] Created Retailer account: ${retEmail}`);
        }

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
            console.log(`[AutoSeed] Created Customer account: ${custEmail}`);
        }

        const medCount = await Medicine.countDocuments();
        if (medCount < 3) {
            const initialBatches = [
                {
                    medicineName: 'Dolo 650mg (Paracetamol)',
                    genericName: 'Paracetamol IP 650mg',
                    batchNumber: 'DL-7',
                    manufacturingDate: '2026-11-10',
                    expiryDate: '2028-11-10',
                    licenseNumber: 'MFG/FDA/2026/0891',
                    composition: 'Paracetamol 650mg, Excipients q.s.',
                    dosage: 'Oral Tablet, 1 tablet every 6 hours',
                    packaging: 'Blister Strip of 15 Tablets',
                    quantity: 5000,
                    currentStatus: 'In Stock',
                    verificationToken: 'd0107777777777777777777777777777',
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
                            description: 'Shipment received, packaging verified',
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
                    medicineName: 'Imatinib 400mg (Targeted Cancer Therapy)',
                    genericName: 'Imatinib Mesylate 400mg',
                    batchNumber: 'CAN-10',
                    manufacturingDate: '2026-10-15',
                    expiryDate: '2029-10-15',
                    licenseNumber: 'MFG/FDA/2026/0891',
                    composition: 'Imatinib Mesylate equivalent to Imatinib 400mg',
                    dosage: '400mg daily with a meal as directed',
                    packaging: 'Bottle of 30 Film-coated Tablets',
                    quantity: 1200,
                    currentStatus: 'Received',
                    verificationToken: 'ca101010101010101010101010101010',
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
                            description: 'Cold chain verified (2-8°C) and logged',
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
                    recallReason: 'Regulatory Safety Advisory: Secondary packaging seal defect flagged in audit',
                    recalledAt: new Date('2026-11-18T08:00:00Z'),
                    verificationToken: 'ca090909090909090909090909090909',
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
                    scanCount: 5
                });

                await TrackingHistory.create({
                    medicineId: med._id,
                    batchNumber: med.batchNumber,
                    previousStatus: 'None',
                    newStatus: med.currentStatus,
                    updatedBy: manufacturer._id,
                    updaterName: manufacturer.name,
                    userRole: 'manufacturer',
                    remarks: 'Initial verified pharmaceutical release',
                    location: manufacturer.organization
                });
            }
            console.log('[AutoSeed] Seeded verified pharmaceutical batches and checkpoints.');
        }
    } catch (err) {
        console.error('AutoSeed error:', err.message);
    }
}

module.exports = { autoSeed };
