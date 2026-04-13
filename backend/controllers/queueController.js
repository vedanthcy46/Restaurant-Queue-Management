const { db } = require('../config/database');

// Generate next token number for today
const generateToken = async () => {
    const last = await db().get(`SELECT MAX(token_number) as last FROM queue WHERE DATE(created_at) = DATE('now')`);
    return (last?.last || 0) + 1;
};

// Dynamic wait based on total MEMBERS ahead (sum of party_size), not just position count
const calcEstimatedWait = async (priority, created_at) => {
    const setting = await db().get(`SELECT value FROM settings WHERE key = 'avg_wait_time'`);
    const avgWaitPerPerson = parseInt(setting?.value || '10', 10);

    // Sum all party_size of entries ahead in queue
    const result = await db().get(
        `SELECT COALESCE(SUM(party_size), 0) as total_members FROM queue
         WHERE status = 'waiting'
         AND (priority > ? OR (priority = ? AND created_at < ?))`,
        [priority, priority, created_at]
    );

    return result.total_members * avgWaitPerPerson;
};

const joinQueue = async (req, res) => {
    try {
        const { customer_name, phone_number, party_size = 1 } = req.body;

        // ── Validation ──────────────────────────────────────────
        if (!customer_name || !phone_number) {
            return res.status(400).json({ message: 'Name and phone number are required' });
        }
        if (phone_number.toString().length < 10) {
            return res.status(400).json({ message: 'Enter a valid phone number' });
        }

        // ── One active token per phone (waiting OR called) ──────
        const existing = await db().get(
            `SELECT * FROM queue WHERE phone_number = ? AND status IN ('waiting', 'called') AND DATE(created_at) = DATE('now')`,
            [phone_number]
        );
        if (existing) {
            return res.status(400).json({
                message: 'You already have an active token today',
                token: existing.token_number,
                status: existing.status
            });
        }

        // ── Check priority setting ───────────────────────────────
        const prioritySetting = await db().get(`SELECT value FROM settings WHERE key = 'priority_queue'`);
        const priorityEnabled = prioritySetting?.value === 'true';
        // Customers join as normal (priority=0); staff can upgrade via admin if needed
        const priority = 0;

        // ── Count people ahead (priority DESC, then FIFO) ────────
        const ahead = await db().get(
            `SELECT COUNT(*) as count, COALESCE(SUM(party_size), 0) as total_members FROM queue
             WHERE status = 'waiting'
             AND (priority > ? OR (priority = ? AND created_at <= CURRENT_TIMESTAMP))`,
            [priority, priority]
        );
        const position = (ahead?.count || 0) + 1;
        // Pass priority=0 and a future timestamp so all waiting entries are counted
        const estimated_wait = await calcEstimatedWait(priority, '9999-12-31');
        const token_number = await generateToken();

        await db().run(
            `INSERT INTO queue (token_number, customer_name, phone_number, party_size, priority, estimated_wait)
             VALUES (?, ?, ?, ?, ?, ?)`,
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

const getQueue = async (req, res) => {
    try {
        const queue = await db().all(
            `SELECT * FROM queue WHERE status IN ('waiting', 'called') ORDER BY priority DESC, created_at ASC`
        );
        res.json(queue);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getQueueStatus = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token || isNaN(token)) return res.status(400).json({ message: 'Invalid token' });

        const entry = await db().get(
            `SELECT * FROM queue WHERE token_number = ? AND DATE(created_at) = DATE('now')`,
            [token]
        );
        if (!entry) return res.status(404).json({ message: 'Token not found for today' });

        // Recalculate live position
        const ahead = await db().get(
            `SELECT COUNT(*) as count FROM queue
             WHERE status = 'waiting'
             AND (priority > ? OR (priority = ? AND created_at < ?))`,
            [entry.priority, entry.priority, entry.created_at]
        );
        const position = (ahead?.count || 0) + 1;
        const estimated_wait = await calcEstimatedWait(entry.priority, entry.created_at);

        res.json({ ...entry, position, estimated_wait });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { joinQueue, getQueue, getQueueStatus };
