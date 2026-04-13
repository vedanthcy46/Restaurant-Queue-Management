const bcrypt = require('bcrypt');
const { db } = require('../config/database');

// GET all staff
const getStaff = async (req, res) => {
    const staff = await db().all(`SELECT user_id, name, email, phone_number, role, date_time FROM user WHERE role = 'staff'`);
    res.json(staff);
};

// POST add new staff
const addStaff = async (req, res) => {
    const { name, email, phone_number, password } = req.body;
    if (!name || !email || !phone_number || !password)
        return res.status(400).json({ message: 'All fields are required' });
    const exists = await db().get(`SELECT * FROM user WHERE email = ?`, [email]);
    if (exists) return res.status(400).json({ message: 'Email already exists' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const hashed = await bcrypt.hash(password, 10);
    const date_time = new Date().toISOString().split('T')[0];
    await db().run(
        `INSERT INTO user (name, email, phone_number, password, role, date_time) VALUES (?, ?, ?, ?, 'staff', ?)`,
        [name, email, phone_number, hashed, date_time]
    );
    res.json({ message: 'Staff added successfully' });
};

// PUT update staff details
const updateStaff = async (req, res) => {
    const { user_id } = req.params;
    const { name, email, phone_number } = req.body;
    await db().run(
        `UPDATE user SET name = ?, email = ?, phone_number = ? WHERE user_id = ? AND role = 'staff'`,
        [name, email, phone_number, user_id]
    );
    res.json({ message: 'Staff updated successfully' });
};

// DELETE remove staff
const deleteStaff = async (req, res) => {
    const { user_id } = req.params;
    await db().run(`DELETE FROM user WHERE user_id = ? AND role = 'staff'`, [user_id]);
    res.json({ message: 'Staff removed successfully' });
};

// POST reset staff password
const resetStaffPassword = async (req, res) => {
    const { user_id } = req.params;
    const { password } = req.body;
    if (!password || password.length < 8)
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const hashed = await bcrypt.hash(password, 10);
    await db().run(`UPDATE user SET password = ? WHERE user_id = ? AND role = 'staff'`, [hashed, user_id]);
    res.json({ message: 'Password reset successfully' });
};

// GET reports — daily stats + queue history
const getReports = async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const totalServed = await db().get(
        `SELECT COUNT(*) as count FROM queue WHERE status = 'served' AND DATE(created_at) = ?`, [today]
    );
    const totalSkipped = await db().get(
        `SELECT COUNT(*) as count FROM queue WHERE status = 'skipped' AND DATE(created_at) = ?`, [today]
    );
    const totalWaiting = await db().get(
        `SELECT COUNT(*) as count FROM queue WHERE status = 'waiting'`
    );
    const avgWait = await db().get(
        `SELECT AVG(estimated_wait) as avg FROM queue WHERE DATE(created_at) = ?`, [today]
    );
    const history = await db().all(
        `SELECT token_number, customer_name, party_size, status, created_at, served_at
         FROM queue WHERE DATE(created_at) = ? ORDER BY created_at DESC LIMIT 50`, [today]
    );

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
const getSettings = async (req, res) => {
    const rows = await db().all(`SELECT key, value FROM settings`);
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
};

// POST update a setting
const updateSetting = async (req, res) => {
    const { key, value } = req.body;
    await db().run(
        `INSERT INTO settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
    );
    res.json({ message: 'Setting updated' });
};

// POST reset queue (end of day)
const resetQueue = async (req, res) => {
    await db().run(`UPDATE queue SET status = 'served' WHERE status IN ('waiting', 'called')`);
    res.json({ message: 'Queue reset successfully' });
};

module.exports = { getStaff, addStaff, updateStaff, deleteStaff, resetStaffPassword, getReports, getSettings, updateSetting, resetQueue };
