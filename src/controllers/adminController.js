const AdminService = require('../services/adminService');

// ─── GET ALL USERS ───────────────────────────────────────
const getAllUsers = async (req, res) => {
    try {
        const data = await AdminService.getAllUsers();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── GET ALL ACTIVE WHATSAPP SESSIONS ──────────────────────
const getActiveWhatsAppSessions = async (req, res) => {
    try {
        const data = await AdminService.getActiveWhatsAppSessions();
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── GET USER BY ID ──────────────────────────────────────
const getUserById = async (req, res) => {
    try {
        const user = await AdminService.getUserById(req.params.id);
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── UPDATE USER ROLE ────────────────────────────────────
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ success: false, message: 'role is required.' });
        }
        const user = await AdminService.updateUserRole(req.params.id, role);
        return res.status(200).json({
            success: true,
            message: 'User role updated successfully.',
            data: user,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── UPDATE USER ─────────────────────────────────────────
const updateUser = async (req, res) => {
    try {
        const user = await AdminService.updateUser(req.params.id, req.body);
        return res.status(200).json({
            success: true,
            message: 'User updated successfully.',
            data: user,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── DELETE USER ─────────────────────────────────────────
const deleteUser = async (req, res) => {
    try {
        const user = await AdminService.deleteUser(req.params.id);
        return res.status(200).json({
            success: true,
            message: 'User deleted successfully.',
            data: user,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── RESET USER PASSWORD ────────────────────────────────
const resetUserPassword = async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password) {
            return res.status(400).json({ success: false, message: 'new_password is required.' });
        }
        await AdminService.resetUserPassword(req.params.id, new_password);
        return res.status(200).json({ success: true, message: 'User password reset successfully.' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

module.exports = { getAllUsers, getActiveWhatsAppSessions, getUserById, updateUserRole, updateUser, deleteUser, resetUserPassword };
