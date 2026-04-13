const express = require('express');
const router = express.Router();
const { getStaff, addStaff, updateStaff, deleteStaff, resetStaffPassword, getReports, getSettings, updateSetting, resetQueue } = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken, requireAdmin);

router.get('/staff', getStaff);
router.post('/staff', addStaff);
router.put('/staff/:user_id', updateStaff);
router.delete('/staff/:user_id', deleteStaff);
router.post('/staff/:user_id/reset-password', resetStaffPassword);

router.get('/reports', getReports);
router.get('/settings', getSettings);
router.post('/settings', updateSetting);
router.post('/reset-queue', resetQueue);

module.exports = router;
