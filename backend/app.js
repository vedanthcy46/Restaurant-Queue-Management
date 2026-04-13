const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./config/database'); // pg Pool
const authRoutes = require('./routes/authRoutes');
const queueRoutes = require('./routes/queueRoutes');
const staffRoutes = require('./routes/staffRoutes');
const tableRoutes = require('./routes/tableRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] } // allow Render frontend
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// Attach socket.io
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/admin', adminRoutes);

// Socket
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () =>
        console.log('Client disconnected:', socket.id)
    );
});

const PORT = process.env.PORT || 5000;

// 🚀 START SERVER (ASYNC for PostgreSQL)
const startServer = async () => {
    try {
        // ✅ Create tables (PostgreSQL syntax)
        await db.query(`
        CREATE TABLE IF NOT EXISTS "user" (
            user_id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone_number VARCHAR(15) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff',
            date_time DATE NOT NULL
        );

        CREATE TABLE IF NOT EXISTS queue (
            queue_id SERIAL PRIMARY KEY,
            token_number INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            party_size INTEGER DEFAULT 1,
            status TEXT DEFAULT 'waiting',
            priority INTEGER DEFAULT 0,
            estimated_wait INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            served_at TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tables_info (
            table_id SERIAL PRIMARY KEY,
            table_name TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            status TEXT DEFAULT 'available'
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        `);

        // ✅ Seed settings
        const settingsCount = await db.query(
            `SELECT COUNT(*) FROM settings`
        );

        if (parseInt(settingsCount.rows[0].count) === 0) {
            await db.query(
                `INSERT INTO settings (key, value) VALUES ($1, $2)`,
                ['avg_wait_time', '10']
            );

            await db.query(
                `INSERT INTO settings (key, value) VALUES ($1, $2)`,
                ['priority_queue', 'false']
            );

            console.log('Default settings seeded');
        }

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (err) {
        console.log('Startup Error:', err);
    }
};

startServer();