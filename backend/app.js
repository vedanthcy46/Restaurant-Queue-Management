const express = require('express');
const path = require('path');
const cors = require('cors');
const { initializeDB } = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

app.use('/api/auth', authRoutes);

const startServer = async () => {
    try {
        await initializeDB();
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.log("Database Error: " + err);
    }
};

startServer();
