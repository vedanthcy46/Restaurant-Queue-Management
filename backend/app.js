const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { initializeDB } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const queueRoutes = require('./routes/queueRoutes');
const staffRoutes = require('./routes/staffRoutes');
const tableRoutes = require('./routes/tableRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Attach socket.io to every request so controllers can emit events
app.use((req, res, next) => {
    req.io = io;
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/admin', adminRoutes);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

const PORT = 5000;

const startServer = async () => {
    try {
        const db = await initializeDB();

        // Create tables if not exist
        await db.exec(`
            CREATE TABLE IF NOT EXISTS user (
                user_id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name      TEXT NOT NULL,
                email     TEXT UNIQUE NOT NULL,
                phone_number VARCHAR(15) UNIQUE NOT NULL,
                password  TEXT NOT NULL,
                role      TEXT NOT NULL DEFAULT 'staff',
                date_time DATE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS queue (
                queue_id        INTEGER PRIMARY KEY AUTOINCREMENT,
                token_number    INTEGER NOT NULL,
                customer_name   TEXT NOT NULL,
                phone_number    TEXT NOT NULL,
                party_size      INTEGER NOT NULL DEFAULT 1,
                status          TEXT NOT NULL DEFAULT 'waiting',
                priority        INTEGER NOT NULL DEFAULT 0,
                estimated_wait  INTEGER DEFAULT 0,
                created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
                served_at       DATETIME
            );

            CREATE TABLE IF NOT EXISTS tables_info (
                table_id    INTEGER PRIMARY KEY AUTOINCREMENT,
                table_name  TEXT NOT NULL,
                capacity    INTEGER NOT NULL,
                status      TEXT NOT NULL DEFAULT 'available'
            );

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);

        // Seed default settings if empty
        const settingsCount = await db.get(`SELECT COUNT(*) as count FROM settings`);
        if (settingsCount.count === 0) {
            await db.run(`INSERT INTO settings (key, value) VALUES ('avg_wait_time', '10')`);
            await db.run(`INSERT INTO settings (key, value) VALUES ('priority_queue', 'false')`);
            console.log('Default settings seeded');
        }

        // Migration: add role column if it doesn't exist
        const columns = await db.all(`PRAGMA table_info(user)`);
        const hasRole = columns.some(c => c.name === 'role');
        if (!hasRole) {
            await db.exec(`ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'staff'`);
            console.log('Migration: added role column to user table');
        }

        server.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.log('Startup Error:', err);
    }
};

startServer();
