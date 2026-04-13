const db = require('../config/database'); // pg Pool

// GET FULL QUEUE
const getFullQueue = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM queue 
             ORDER BY 
             CASE 
                WHEN status = 'called' THEN 0 
                WHEN status = 'waiting' THEN 1 
                ELSE 2 
             END,
             priority DESC, created_at ASC`
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// CALL NEXT (with transaction safety)
const callNext = async (req, res) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Check if already called
        const alreadyCalled = await client.query(
            `SELECT * FROM queue WHERE status = 'called' LIMIT 1`
        );

        if (alreadyCalled.rows.length > 0) {
            await client.query('ROLLBACK');
            const token = alreadyCalled.rows[0];

            return res.status(400).json({
                message: `Token #${token.token_number} is already called. Serve or skip it first.`
            });
        }

        // Lock next row (prevents double calling)
        const nextResult = await client.query(
            `SELECT * FROM queue 
             WHERE status = 'waiting'
             ORDER BY priority DESC, created_at ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED`
        );

        const next = nextResult.rows[0];

        if (!next) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'No customers in queue' });
        }

        await client.query(
            `UPDATE queue SET status = 'called' WHERE queue_id = $1`,
            [next.queue_id]
        );

        await client.query('COMMIT');

        req.io.emit('queue_updated');
        req.io.emit('token_called', {
            token: next.token_number,
            name: next.customer_name
        });

        res.json({
            message: `Token #${next.token_number} called`,
            token: next.token_number,
            customer: next.customer_name
        });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

// SKIP TOKEN
const skipToken = async (req, res) => {
    try {
        const { queue_id } = req.params;

        const result = await db.query(
            `SELECT * FROM queue WHERE queue_id = $1`,
            [queue_id]
        );

        const entry = result.rows[0];

        if (!entry) {
            return res.status(404).json({ message: 'Token not found' });
        }

        if (entry.status === 'served') {
            return res.status(400).json({ message: 'Token already served' });
        }

        if (entry.status === 'skipped') {
            return res.status(400).json({ message: 'Token already skipped' });
        }

        await db.query(
            `UPDATE queue SET status = 'skipped' WHERE queue_id = $1`,
            [queue_id]
        );

        req.io.emit('queue_updated');

        res.json({ message: `Token #${entry.token_number} skipped` });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// SERVE TOKEN
const serveToken = async (req, res) => {
    try {
        const { queue_id } = req.params;

        const result = await db.query(
            `SELECT * FROM queue WHERE queue_id = $1`,
            [queue_id]
        );

        const entry = result.rows[0];

        if (!entry) {
            return res.status(404).json({ message: 'Token not found' });
        }

        if (entry.status === 'served') {
            return res.status(400).json({ message: 'Token already served' });
        }

        await db.query(
            `UPDATE queue 
             SET status = 'served', served_at = CURRENT_TIMESTAMP 
             WHERE queue_id = $1`,
            [queue_id]
        );

        req.io.emit('queue_updated');

        res.json({ message: `Token #${entry.token_number} served` });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getFullQueue, callNext, skipToken, serveToken };