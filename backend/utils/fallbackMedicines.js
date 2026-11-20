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
                verificationToken: m.verificationToken || m._id || m.batchNumber
            }));
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
