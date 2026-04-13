const db = require('../config/database'); // better-sqlite3 instance

const getTables = (req, res) => {
    try {
        const tables = db.prepare(
            `SELECT * FROM tables_info`
        ).all();

        res.json(tables);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

const updateTableStatus = (req, res) => {
    try {
        const { table_id } = req.params;
        const { status } = req.body; // 'available' | 'occupied' | 'reserved'

        db.prepare(
            `UPDATE tables_info SET status = ? WHERE table_id = ?`
        ).run(status, table_id);

        // If table becomes available → call next customer
        if (status === 'available') {
            const next = db.prepare(
                `SELECT * FROM queue 
                 WHERE status = 'waiting' 
                 ORDER BY priority DESC, created_at ASC 
                 LIMIT 1`
            ).get();

            if (next) {
                db.prepare(
                    `UPDATE queue SET status = 'called' WHERE queue_id = ?`
                ).run(next.queue_id);

                req.io.emit('token_called', {
                    token: next.token_number,
                    name: next.customer_name
                });
            }
        }

        req.io.emit('queue_updated');

        res.json({ message: 'Table status updated' });

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getTables, updateTableStatus };
