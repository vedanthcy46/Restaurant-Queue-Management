const express = require('express');
const router = express.Router();
const { getTables, updateTableStatus } = require('../controllers/tableController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', getTables);
router.post('/update/:table_id', authenticateToken, updateTableStatus);

module.exports = router;
