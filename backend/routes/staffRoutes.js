const express = require('express');
const router = express.Router();
const { callNext, skipToken, serveToken, getFullQueue } = require('../controllers/staffController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/queue', getFullQueue);
router.post('/call-next', callNext);
router.post('/skip/:queue_id', skipToken);
router.post('/serve/:queue_id', serveToken);

module.exports = router;
