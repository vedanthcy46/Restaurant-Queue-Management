const { db } = require('../config/database');

const getFullQueue = async (req, res) => {
    try {
        const queue = await db().all(
            `SELECT * FROM queue ORDER BY
             CASE status WHEN 'called' THEN 0 WHEN 'waiting' THEN 1 ELSE 2 END,
             priority DESC, created_at ASC`
        );
        res.json(queue);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const callNext = async (req, res) => {
    try {
        // Block if a token is already called and not yet served/skipped
        const alreadyCalled = await db().get(`SELECT * FROM queue WHERE status = 'called'`);
        if (alreadyCalled) {
            return res.status(400).json({
                message: `Token #${alreadyCalled.token_number} is already called. Serve or skip it first.`
            });
        }

        // Priority tokens first (priority DESC), then FIFO
        const next = await db().get(
            `SELECT * FROM queue WHERE status = 'waiting' ORDER BY priority DESC, created_at ASC LIMIT 1`
        );
        if (!next) return res.status(404).json({ message: 'No customers in queue' });

        await db().run(`UPDATE queue SET status = 'called' WHERE queue_id = ?`, [next.queue_id]);

        req.io.emit('queue_updated');
        req.io.emit('token_called', { token: next.token_number, name: next.customer_name });

        res.json({ message: `Token #${next.token_number} called`, token: next.token_number, customer: next.customer_name });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const skipToken = async (req, res) => {
    try {
        const { queue_id } = req.params;

        const entry = await db().get(`SELECT * FROM queue WHERE queue_id = ?`, [queue_id]);
        if (!entry) return res.status(404).json({ message: 'Token not found' });
        if (entry.status === 'served') return res.status(400).json({ message: 'Token already served' });
        if (entry.status === 'skipped') return res.status(400).json({ message: 'Token already skipped' });

        await db().run(`UPDATE queue SET status = 'skipped' WHERE queue_id = ?`, [queue_id]);

        req.io.emit('queue_updated');
        res.json({ message: `Token #${entry.token_number} skipped` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const serveToken = async (req, res) => {
    try {
        const { queue_id } = req.params;

        const entry = await db().get(`SELECT * FROM queue WHERE queue_id = ?`, [queue_id]);
        if (!entry) return res.status(404).json({ message: 'Token not found' });
        if (entry.status === 'served') return res.status(400).json({ message: 'Token already served' });

        await db().run(
            `UPDATE queue SET status = 'served', served_at = CURRENT_TIMESTAMP WHERE queue_id = ?`,
            [queue_id]
        );

        req.io.emit('queue_updated');
        res.json({ message: `Token #${entry.token_number} served` });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getFullQueue, callNext, skipToken, serveToken };
