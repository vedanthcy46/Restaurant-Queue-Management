const db = require('../config/database'); // pg Pool

// GET TABLES
const getTables = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM tables_info`
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// UPDATE TABLE STATUS
const updateTableStatus = async (req, res) => {
    const client = await db.connect();

    try {
        const { table_id } = req.params;
        const { status } = req.body; // available | occupied | reserved

        await client.query('BEGIN');

        // Update table
        await client.query(
            `UPDATE tables_info SET status = $1 WHERE table_id = $2`,
            [status, table_id]
        );

        // If table becomes available → call next
        if (status === 'available') {

            const nextResult = await client.query(
                `SELECT * FROM queue
                 WHERE status = 'waiting'
                 ORDER BY priority DESC, created_at ASC
                 LIMIT 1
                 FOR UPDATE SKIP LOCKED`
            );

            const next = nextResult.rows[0];

            if (next) {
                await client.query(
                    `UPDATE queue SET status = 'called' WHERE queue_id = $1`,
                    [next.queue_id]
                );

                req.io.emit('token_called', {
                    token: next.token_number,
                    name: next.customer_name
                });
            }
        }

        await client.query('COMMIT');

        req.io.emit('queue_updated');

        res.json({ message: 'Table status updated' });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Server error' });

    } finally {
        client.release();
    }
};

module.exports = { getTables, updateTableStatus };