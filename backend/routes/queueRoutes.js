const express = require('express');
const router = express.Router();
const { joinQueue, getQueue, getQueueStatus } = require('../controllers/queueController');

// Customer joins queue
router.post('/join', joinQueue);

// Get full queue list
router.get('/', getQueue);

// Customer checks their token status
router.get('/status/:token', getQueueStatus);

module.exports = router;
