const { db } = require('../config/database');

const getTables = async (req, res) => {
    const tables = await db().all(`SELECT * FROM tables_info`);
    res.json(tables);
};

const updateTableStatus = async (req, res) => {
    const { table_id } = req.params;
    const { status } = req.body; // 'available' | 'occupied' | 'reserved'

    await db().run(`UPDATE tables_info SET status = ? WHERE table_id = ?`, [status, table_id]);

    // If table becomes available, auto-call next waiting customer
    if (status === 'available') {
        const next = await db().get(
            `SELECT * FROM queue WHERE status = 'waiting' ORDER BY priority DESC, created_at ASC LIMIT 1`
        );
        if (next) {
            await db().run(`UPDATE queue SET status = 'called' WHERE queue_id = ?`, [next.queue_id]);
            req.io.emit('token_called', { token: next.token_number, name: next.customer_name });
        }
    }

    req.io.emit('queue_updated');
    res.json({ message: 'Table status updated' });
};

module.exports = { getTables, updateTableStatus };
