const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('../middleware/role');
const { ROLES } = require('../config/constants');
const {
    getAllUsers,
    getActiveWhatsAppSessions,
    getUserById,
    updateUserRole,
    updateUser,
    deleteUser,
    resetUserPassword,
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(authMiddleware);
router.use(roleMiddleware(ROLES.ADMIN));

// GET /api/admin/users
router.get('/users', getAllUsers);

// GET /api/admin/whatsapp-sessions
router.get('/whatsapp-sessions', getActiveWhatsAppSessions);

// GET /api/admin/users/:id
router.get('/users/:id', getUserById);

// PUT /api/admin/users/:id
router.put('/users/:id', updateUser);

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', updateUserRole);

// PUT /api/admin/users/:id/reset-password
router.put('/users/:id/reset-password', resetUserPassword);

// DELETE /api/admin/users/:id
router.delete('/users/:id', deleteUser);

module.exports = router;
