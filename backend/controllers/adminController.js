const bcrypt = require('bcrypt');
const db = require('../config/database'); // pg Pool

// GET all staff
const getStaff = async (req, res) => {
    const result = await db.query(
        `SELECT user_id, name, email, phone_number, role, date_time 
         FROM "user" WHERE role = $1`,
        ['staff']
    );

    res.json(result.rows);
};

// POST add new staff
const addStaff = async (req, res) => {
    const { name, email, phone_number, password } = req.body;

    if (!name || !email || !phone_number || !password)
        return res.status(400).json({ message: 'All fields are required' });

    const exists = await db.query(
        `SELECT * FROM "user" WHERE email = $1`,
        [email]
    );

    if (exists.rows.length > 0)
        return res.status(400).json({ message: 'Email already exists' });

    if (password.length < 8)
        return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hashed = await bcrypt.hash(password, 10);
    const date_time = new Date().toISOString().split('T')[0];

    await db.query(
        `INSERT INTO "user" (name, email, phone_number, password, role, date_time)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, email, phone_number, hashed, 'staff', date_time]
    );

    res.json({ message: 'Staff added successfully' });
};

// PUT update staff
const updateStaff = async (req, res) => {
    const { user_id } = req.params;
    const { name, email, phone_number } = req.body;

    await db.query(
        `UPDATE "user" 
         SET name = $1, email = $2, phone_number = $3 
         WHERE user_id = $4 AND role = 'staff'`,
        [name, email, phone_number, user_id]
    );

    res.json({ message: 'Staff updated successfully' });
};

// DELETE staff
const deleteStaff = async (req, res) => {
    const { user_id } = req.params;

    await db.query(
        `DELETE FROM "user" WHERE user_id = $1 AND role = 'staff'`,
        [user_id]
    );

    res.json({ message: 'Staff removed successfully' });
};

// RESET password
const resetStaffPassword = async (req, res) => {
    const { user_id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8)
        return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
        `UPDATE "user" SET password = $1 
         WHERE user_id = $2 AND role = 'staff'`,
        [hashed, user_id]
    );

    res.json({ message: 'Password reset successfully' });
};

// GET reports
const getReports = async (req, res) => {
    const today = new Date().toISOString().split('T')[0];

    const totalServed = await db.query(
        `SELECT COUNT(*) FROM queue 
         WHERE status = 'served' AND DATE(created_at) = $1`,
        [today]
    );

    const totalSkipped = await db.query(
        `SELECT COUNT(*) FROM queue 
         WHERE status = 'skipped' AND DATE(created_at) = $1`,
        [today]
    );

    const totalWaiting = await db.query(
        `SELECT COUNT(*) FROM queue WHERE status = 'waiting'`
    );

    const avgWait = await db.query(
        `SELECT AVG(estimated_wait) FROM queue 
         WHERE DATE(created_at) = $1`,
        [today]
    );

    const history = await db.query(
        `SELECT token_number, customer_name, party_size, status, created_at, served_at
         FROM queue 
         WHERE DATE(created_at) = $1
         ORDER BY created_at DESC 
         LIMIT 50`,
        [today]
    );

    res.json({
        today,
        totalServed: parseInt(totalServed.rows[0].count),
        totalSkipped: parseInt(totalSkipped.rows[0].count),
        totalWaiting: parseInt(totalWaiting.rows[0].count),
        avgWaitMins: Math.round(avgWait.rows[0].avg || 0),
        history: history.rows
    });
};

// GET settings
const getSettings = async (req, res) => {
    const result = await db.query(`SELECT key, value FROM settings`);

    const settings = {};
    result.rows.forEach(r => {
        settings[r.key] = r.value;
    });

    res.json(settings);
};

// UPDATE setting
const updateSetting = async (req, res) => {
    const { key, value } = req.body;

    await db.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key)
         DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
    );

    res.json({ message: 'Setting updated' });
};

// RESET queue
const resetQueue = async (req, res) => {
    await db.query(
        `UPDATE queue 
         SET status = 'served' 
         WHERE status IN ('waiting', 'called')`
    );

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