const db = require('../config/database'); // better-sqlite3 instance

const getFullQueue = (req, res) => {
    try {
        const queue = db.prepare(
            `SELECT * FROM queue ORDER BY
             CASE status WHEN 'called' THEN 0 WHEN 'waiting' THEN 1 ELSE 2 END,
             priority DESC, created_at ASC`
        ).all();

        res.json(queue);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const callNext = (req, res) => {
    try {
        // Check if already a called token
        const alreadyCalled = db.prepare(
            `SELECT * FROM queue WHERE status = 'called'`
        ).get();

        if (alreadyCalled) {
            return res.status(400).json({
                message: `Token #${alreadyCalled.token_number} is already called. Serve or skip it first.`
            });
        }

        // Get next (priority first)
        const next = db.prepare(
            `SELECT * FROM queue 
             WHERE status = 'waiting' 
             ORDER BY priority DESC, created_at ASC 
             LIMIT 1`
        ).get();

        if (!next) {
            return res.status(404).json({ message: 'No customers in queue' });
        }

        db.prepare(
            `UPDATE queue SET status = 'called' WHERE queue_id = ?`
        ).run(next.queue_id);

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
        res.status(500).json({ message: 'Server error' });
    }
};

const skipToken = (req, res) => {
    try {
        const { queue_id } = req.params;

        const entry = db.prepare(
            `SELECT * FROM queue WHERE queue_id = ?`
        ).get(queue_id);

        if (!entry) {
            return res.status(404).json({ message: 'Token not found' });
        }

        if (entry.status === 'served') {
            return res.status(400).json({ message: 'Token already served' });
        }

        if (entry.status === 'skipped') {
            return res.status(400).json({ message: 'Token already skipped' });
        }

        db.prepare(
            `UPDATE queue SET status = 'skipped' WHERE queue_id = ?`
        ).run(queue_id);

        req.io.emit('queue_updated');

        res.json({ message: `Token #${entry.token_number} skipped` });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const serveToken = (req, res) => {
    try {
        const { queue_id } = req.params;

        const entry = db.prepare(
            `SELECT * FROM queue WHERE queue_id = ?`
        ).get(queue_id);

        if (!entry) {
            return res.status(404).json({ message: 'Token not found' });
        }

        if (entry.status === 'served') {
            return res.status(400).json({ message: 'Token already served' });
        }

        db.prepare(
            `UPDATE queue 
             SET status = 'served', served_at = CURRENT_TIMESTAMP 
             WHERE queue_id = ?`
        ).run(queue_id);

        req.io.emit('queue_updated');

        res.json({ message: `Token #${entry.token_number} served` });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getFullQueue, callNext, skipToken, serveToken };
