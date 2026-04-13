const db = require('../config/database');

// Generate next token number for today
const generateToken = async () => {
    const result = await db.query(
        `SELECT MAX(token_number) as last 
         FROM queue 
         WHERE DATE(created_at) = CURRENT_DATE`
    );

    return (result.rows[0].last || 0) + 1;
};

// Calculate estimated wait (based on total members ahead)
const calcEstimatedWait = async (priority, created_at) => {
    const setting = await db.query(
        `SELECT value FROM settings WHERE key = 'avg_wait_time'`
    );

    const avgWaitPerPerson = parseInt(setting.rows[0]?.value || '10', 10);

    const result = await db.query(
        `SELECT COALESCE(SUM(party_size), 0) as total_members 
         FROM queue
         WHERE status = 'waiting'
         AND (priority > $1 OR (priority = $1 AND created_at < $2))`,
        [priority, created_at]
    );

    return result.rows[0].total_members * avgWaitPerPerson;
};

// JOIN QUEUE
const joinQueue = async (req, res) => {
    try {
        const { customer_name, phone_number, party_size = 1 } = req.body;

        // Validation
        if (!customer_name || !phone_number) {
            return res.status(400).json({ message: 'Name and phone number are required' });
        }

        if (phone_number.toString().length < 10) {
            return res.status(400).json({ message: 'Enter a valid phone number' });
        }

        // Check existing active token
        const existing = await db.query(
            `SELECT * FROM queue 
             WHERE phone_number = $1 
             AND status IN ('waiting', 'called') 
             AND DATE(created_at) = CURRENT_DATE`,
            [phone_number]
        );

        if (existing.rows.length > 0) {
            const e = existing.rows[0];
            return res.status(400).json({
                message: 'You already have an active token today',
                token: e.token_number,
                status: e.status
            });
        }

        // Priority (default 0)
        const priority = 0;

        // Count people ahead
        const ahead = await db.query(
            `SELECT COUNT(*) as count, COALESCE(SUM(party_size), 0) as total_members 
             FROM queue
             WHERE status = 'waiting'
             AND (priority > $1 OR (priority = $1 AND created_at <= CURRENT_TIMESTAMP))`,
            [priority]
        );

        const position = parseInt(ahead.rows[0].count) + 1;

        const estimated_wait = await calcEstimatedWait(priority, '9999-12-31');

        const token_number = await generateToken();

        await db.query(
            `INSERT INTO queue 
            (token_number, customer_name, phone_number, party_size, priority, estimated_wait)
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [token_number, customer_name, phone_number, party_size, priority, estimated_wait]
        );

        req.io.emit('queue_updated');

        res.status(201).json({
            message: 'Joined queue successfully',
            token: token_number,
            position,
            estimated_wait
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET QUEUE
const getQueue = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM queue 
             WHERE status IN ('waiting', 'called') 
             ORDER BY priority DESC, created_at ASC`
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// GET QUEUE STATUS
const getQueueStatus = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token || isNaN(token)) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        const result = await db.query(
            `SELECT * FROM queue 
             WHERE token_number = $1 
             AND DATE(created_at) = CURRENT_DATE`,
            [token]
        );

        const entry = result.rows[0];

        if (!entry) {
            return res.status(404).json({ message: 'Token not found for today' });
        }

        // Recalculate position
        const ahead = await db.query(
            `SELECT COUNT(*) as count 
             FROM queue
             WHERE status = 'waiting'
             AND (priority > $1 OR (priority = $1 AND created_at < $2))`,
            [entry.priority, entry.created_at]
        );

        const position = parseInt(ahead.rows[0].count) + 1;

        const estimated_wait = await calcEstimatedWait(
            entry.priority,
            entry.created_at
        );

        res.json({ ...entry, position, estimated_wait });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { joinQueue, getQueue, getQueueStatus };