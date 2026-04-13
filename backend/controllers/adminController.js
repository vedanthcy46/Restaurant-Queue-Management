const bcrypt = require('bcrypt');
const db = require('../config/database'); // better-sqlite3 instance

// GET all staff
const getStaff = (req, res) => {
    const staff = db.prepare(
        `SELECT user_id, name, email, phone_number, role, date_time 
         FROM user WHERE role = 'staff'`
    ).all();

    res.json(staff);
};

// POST add new staff
const addStaff = (req, res) => {
    const { name, email, phone_number, password } = req.body;

    if (!name || !email || !phone_number || !password)
        return res.status(400).json({ message: 'All fields are required' });

    const exists = db.prepare(
        `SELECT * FROM user WHERE email = ?`
    ).get(email);

    if (exists)
        return res.status(400).json({ message: 'Email already exists' });

    if (password.length < 8)
        return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hashed = bcrypt.hashSync(password, 10);
    const date_time = new Date().toISOString().split('T')[0];

    db.prepare(
        `INSERT INTO user (name, email, phone_number, password, role, date_time) 
         VALUES (?, ?, ?, ?, 'staff', ?)`
    ).run(name, email, phone_number, hashed, date_time);

    res.json({ message: 'Staff added successfully' });
};

// PUT update staff details
const updateStaff = (req, res) => {
    const { user_id } = req.params;
    const { name, email, phone_number } = req.body;

    db.prepare(
        `UPDATE user 
         SET name = ?, email = ?, phone_number = ? 
         WHERE user_id = ? AND role = 'staff'`
    ).run(name, email, phone_number, user_id);

    res.json({ message: 'Staff updated successfully' });
};

// DELETE remove staff
const deleteStaff = (req, res) => {
    const { user_id } = req.params;

    db.prepare(
        `DELETE FROM user WHERE user_id = ? AND role = 'staff'`
    ).run(user_id);

    res.json({ message: 'Staff removed successfully' });
};

// POST reset staff password
const resetStaffPassword = (req, res) => {
    const { user_id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8)
        return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hashed = bcrypt.hashSync(password, 10);

    db.prepare(
        `UPDATE user SET password = ? 
         WHERE user_id = ? AND role = 'staff'`
    ).run(hashed, user_id);

    res.json({ message: 'Password reset successfully' });
};

// GET reports
const getReports = (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const totalServed = db.prepare(
        `SELECT COUNT(*) as count FROM queue 
         WHERE status = 'served' AND DATE(created_at) = ?`
    ).get(today);

    const totalSkipped = db.prepare(
        `SELECT COUNT(*) as count FROM queue 
         WHERE status = 'skipped' AND DATE(created_at) = ?`
    ).get(today);

    const totalWaiting = db.prepare(
        `SELECT COUNT(*) as count FROM queue 
         WHERE status = 'waiting'`
    ).get();

    const avgWait = db.prepare(
        `SELECT AVG(estimated_wait) as avg FROM queue 
         WHERE DATE(created_at) = ?`
    ).get(today);

    const history = db.prepare(
        `SELECT token_number, customer_name, party_size, status, created_at, served_at
         FROM queue 
         WHERE DATE(created_at) = ? 
         ORDER BY created_at DESC 
         LIMIT 50`
    ).all(today);

    res.json({
        today,
        totalServed: totalServed.count,
        totalSkipped: totalSkipped.count,
        totalWaiting: totalWaiting.count,
        avgWaitMins: Math.round(avgWait.avg || 0),
        history
    });
};

// GET settings
const getSettings = (req, res) => {
    const rows = db.prepare(`SELECT key, value FROM settings`).all();

    const settings = {};
    rows.forEach(r => {
        settings[r.key] = r.value;
    });

    res.json(settings);
};

// POST update a setting
const updateSetting = (req, res) => {
    const { key, value } = req.body;

    db.prepare(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, value);

    res.json({ message: 'Setting updated' });
};

// POST reset queue
const resetQueue = (req, res) => {
    db.prepare(
        `UPDATE queue 
         SET status = 'served' 
         WHERE status IN ('waiting', 'called')`
    ).run();

    res.json({ message: 'Queue reset successfully' });
};

module.exports = {
    getStaff,
    addStaff,
    updateStaff,
    deleteStaff,
    resetStaffPassword,
    getReports,
    getSettings,
    updateSetting,
    resetQueue
};
