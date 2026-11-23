const path = require('path');
const fs = require('fs');

let inMemoryMedicines = null;

function loadInitialMedicines() {
    if (inMemoryMedicines) return inMemoryMedicines;
    try {
        const filePath = path.join(__dirname, '..', 'data', 'medicines.json');
        if (fs.existsSync(filePath)) {
            const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            inMemoryMedicines = raw.map(m => ({
                ...m,
                manufacturerId: m.manufacturerId || '673aa1010000000000000002',
                manufacturerName: m.manufacturerName || 'Apex Pharmaceuticals Manufacturing Unit-1',
                verificationToken: m.verificationToken || m._id || m.batchNumber
            }));

            // Add BioCare Laboratories' batch for multi-manufacturer testing
            inMemoryMedicines.push({
                _id: '673aa1010000000000000050',
                medicineName: 'Amoxicillin 500mg (Antibiotic)',
                genericName: 'Amoxicillin Trihydrate IP 500mg',
                batchNumber: 'AMX-2026-01',
                manufacturingDate: '2026-11-01',
                expiryDate: '2028-11-01',
                mfgDate: '2026-11-01',
                expDate: '2028-11-01',
                licenseNumber: 'MFG/FDA/2026/0412',
                composition: 'Amoxicillin Trihydrate equivalent to Amoxicillin 500mg',
                dosage: 'Oral Capsule, 1 capsule every 8 hours',
                packaging: 'Blister Strip of 10 Capsules',
                quantity: 4000,
                currentStatus: 'Manufactured',
                verificationToken: 'amx01010101010101010101010101010',
                manufacturerId: '673aa1010000000000000005',
                manufacturerName: 'BioCare Research & Formulations Hub',
                checkpoints: [
                    {
                        stage: 'Manufacturer',
                        status: 'Manufactured',
                        location: 'BioCare Research & Formulations Hub, Gujarat',
                        description: 'Antibiotic batch encapsulated and laboratory tested',
                        updatedBy: '673aa1010000000000000005',
                        updaterName: 'BioCare Laboratories Ltd',
                        timestamp: new Date('2026-11-01T10:00:00Z')
                    }
                ]
            });

            return inMemoryMedicines;
        }
    } catch (e) {
        console.error('Error loading fallback medicines:', e);
    }
    inMemoryMedicines = [];
    return inMemoryMedicines;
}

function getFallbackMedicines() {
    return loadInitialMedicines();
}

function addFallbackMedicine(medicine) {
    const list = loadInitialMedicines();
    list.unshift(medicine);
    return medicine;
}

function findFallbackMedicine(idOrTokenOrBatch) {
    if (!idOrTokenOrBatch) return null;
    const term = idOrTokenOrBatch.toString().trim();
    const upper = term.toUpperCase();
    const list = loadInitialMedicines();
    return list.find(m => 
        (m._id && m._id.toString() === term) ||
        (m.verificationToken && m.verificationToken === term) ||
        (m.batchNumber && m.batchNumber.toUpperCase() === upper)
    ) || null;
}

module.exports = {
    getFallbackMedicines,
    addFallbackMedicine,
    findFallbackMedicine
};
