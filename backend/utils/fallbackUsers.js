const defaultUsers = [
    {
        _id: '673aa1010000000000000001',
        name: 'System Administrator',
        email: 'admin@pharmatrace.com',
        role: 'admin',
        organization: 'PharmaTrace National Regulatory Authority',
        accountStatus: 'active',
        passwordPlain: 'Admin@12345',
        phone: '+91 98765 43210'
    },
    {
        _id: '673aa1010000000000000002',
        name: 'Apex Pharmaceuticals Ltd',
        email: 'manufacturer@apexpharma.com',
        role: 'manufacturer',
        organization: 'Apex Pharmaceuticals Manufacturing Unit-1',
        licenseNumber: 'MFG/FDA/2026/0891',
        accountStatus: 'active',
        passwordPlain: 'Password@123',
        phone: '+91 98234 56789'
    },
    {
        _id: '673aa1010000000000000003',
        name: 'Apollo Care Pharmacy',
        email: 'retailer@apollocare.com',
        role: 'retailer',
        organization: 'Apollo Care Pharmacy - Unit 4, Delhi',
        licenseNumber: 'RET/DL/2026/554',
        accountStatus: 'active',
        passwordPlain: 'Password@123',
        phone: '+91 98111 22233'
    },
    {
        _id: '673aa1010000000000000004',
        name: 'Jane Customer',
        email: 'customer@example.com',
        role: 'customer',
        accountStatus: 'active',
        passwordPlain: 'Password@123',
        phone: '+91 99999 88888'
    }
];

let inMemoryUsers = [...defaultUsers];

function getFallbackUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return inMemoryUsers.find(u => u.email.toLowerCase() === normalized) || null;
}

function getFallbackUserById(id) {
    if (!id) return null;
    const strId = id.toString();
    return inMemoryUsers.find(u => u._id.toString() === strId) || null;
}

function addFallbackUser(user) {
    inMemoryUsers.push(user);
    return user;
}

function getAllFallbackUsers() {
    return inMemoryUsers;
}

module.exports = {
    defaultUsers,
    getFallbackUserByEmail,
    getFallbackUserById,
    addFallbackUser,
    getAllFallbackUsers
};
