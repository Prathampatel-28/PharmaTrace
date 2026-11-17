require('dotenv').config();
const express = require('express');
const path = require('path');
const { connectDB } = require('./config/db');
const medicineRoutes = require('./routes/medicineRoutes');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api/medicines', medicineRoutes);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', message: 'PharmaTrace server is running healthy' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`PharmaTrace server running at http://localhost:${PORT}`);
    });
}

startServer();
