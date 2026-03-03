const UserService = require('../services/userService');
const WhatsAppService = require('../services/whatsappService');

// ─── GET MY PROFILE ──────────────────────────────────────
const getProfile = async (req, res) => {
    try {
        const user = await UserService.getProfile(req.user.id);
        const waStatus = WhatsAppService.getStatus(req.user.id);
        user.whatsapp_connected = waStatus.status === 'connected';
        return res.status(200).json({ success: true, data: user });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── GET DASHBOARD ───────────────────────────────────────
const getDashboard = async (req, res) => {
    try {
        const dashboardData = await UserService.getDashboard(req.user.id);
        return res.status(200).json({ success: true, data: dashboardData });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── UPDATE MY PROFILE ──────────────────────────────────
const updateProfile = async (req, res) => {
    try {
        const { full_name, username, mobile_number, upi_id } = req.body;
        const user = await UserService.updateProfile(req.user.id, { full_name, username, mobile_number, upi_id });
        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully.',
            data: user,
        });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── CHANGE PASSWORD ─────────────────────────────────────
const changePassword = async (req, res) => {
    try {
        const { old_password, new_password } = req.body;
        if (!old_password || !new_password) {
            return res.status(400).json({ success: false, message: 'old_password and new_password are required.' });
        }
        await UserService.changePassword(req.user.id, old_password, new_password);
        return res.status(200).json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

module.exports = { getProfile, getDashboard, updateProfile, changePassword };
