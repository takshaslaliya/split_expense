const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getProfile, getDashboard, updateProfile, changePassword } = require('../controllers/userController');

// All user routes require authentication
router.use(authMiddleware);

// GET /api/user/profile
router.get('/profile', getProfile);

// GET /api/user/dashboard
router.get('/dashboard', getDashboard);

// PUT /api/user/profile
router.put('/profile', updateProfile);

// PUT /api/user/change-password
router.put('/change-password', changePassword);

module.exports = router;
