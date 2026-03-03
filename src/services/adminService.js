const UserModel = require('../models/userModel');
const GroupModel = require('../models/groupModel');
const AchievementsService = require('./achievementsService');
const WhatsAppService = require('./whatsappService');
const bcrypt = require('bcryptjs');
const { ROLES, BCRYPT_SALT_ROUNDS } = require('../config/constants');

/**
 * Admin Service — business logic for admin operations
 */
const AdminService = {
    /**
     * Get all users with enriched data
     */
    getAllUsers: async () => {
        const users = await UserModel.findAll();

        // Enrich user objects
        const enrichedUsers = await Promise.all(users.map(async (u) => {
            const userGroups = await GroupModel.findByCreator(u.id);
            const total_splits = userGroups.filter(g => !g.parent_id).length;
            const waStatus = await WhatsAppService.getStatus(u.id);
            const achievements = await AchievementsService.getUserAchievements(u.id);
            return {
                ...u,
                total_splits,
                whatsapp_connected: waStatus.connected,
                unlocked_achievements: achievements.filter(a => a.is_unlocked).length
            };
        }));

        return enrichedUsers;
    },

    /**
     * Get all active WhatsApp sessions with corresponding users
     */
    getActiveWhatsAppSessions: async () => {
        const activeWaSessions = WhatsAppService.getActiveSessions(); // { userId, phone }[]

        const enrichedSessions = await Promise.all(activeWaSessions.map(async (sess) => {
            try {
                const user = await UserModel.findById(sess.userId);
                return {
                    user_id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    whatsapp_number: sess.phone,
                    role: user.role
                };
            } catch (error) {
                // If user doesn't exist anymore but session does
                return {
                    user_id: sess.userId,
                    whatsapp_number: sess.phone,
                    error: "User not found"
                };
            }
        }));

        return enrichedSessions;
    },

    /**
     * Get a specific user by ID with enriched data
     */
    getUserById: async (userId) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        const userGroups = await GroupModel.findByCreator(userId);
        const total_splits = userGroups.filter(g => !g.parent_id).length;
        const waStatus = await WhatsAppService.getStatus(userId);
        const achievements = await AchievementsService.getUserAchievements(userId);

        return {
            ...user,
            total_splits,
            whatsapp_connected: waStatus.connected,
            achievements
        };
    },

    /**
     * Update any user's role
     */
    updateUserRole: async (userId, role) => {
        if (!Object.values(ROLES).includes(role)) {
            const err = new Error(`Invalid role. Must be one of: ${Object.values(ROLES).join(', ')}`);
            err.statusCode = 400;
            throw err;
        }
        return await UserModel.updateRole(userId, role);
    },

    /**
     * Delete a user
     */
    deleteUser: async (userId) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }
        if (user.role === ROLES.ADMIN) {
            const err = new Error('Cannot delete an admin user.');
            err.statusCode = 403;
            throw err;
        }
        return await UserModel.deleteById(userId);
    },

    /**
     * Admin can update any user's profile
     */
    updateUser: async (userId, updates) => {
        const allowed = {};
        if (updates.full_name) allowed.full_name = updates.full_name;
        if (updates.username) allowed.username = updates.username;
        if (updates.mobile_number) allowed.mobile_number = updates.mobile_number;
        if (updates.email_verified !== undefined) allowed.email_verified = updates.email_verified;

        if (Object.keys(allowed).length === 0) {
            const err = new Error('No valid fields to update.');
            err.statusCode = 400;
            throw err;
        }

        return await UserModel.updateById(userId, allowed);
    },

    /**
     * Reset a user's password (admin)
     */
    resetUserPassword: async (userId, newPassword) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await UserModel.updateById(userId, { password: hashedPassword });
    },
};

module.exports = AdminService;
