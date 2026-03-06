const UserModel = require('../models/userModel');
const GroupModel = require('../models/groupModel');
const bcrypt = require('bcryptjs');
const { ROLES, BCRYPT_SALT_ROUNDS } = require('../config/constants');
const { normalizePhone } = require('../utils/phoneUtils');

/**
 * User Service — business logic for user profile management
 */
const UserService = {
    /**
     * Get user profile by ID (includes total_splits count)
     */
    getProfile: async (userId) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Calculate total splits (top-level groups created by the user)
        const userGroups = await GroupModel.findByCreator(userId);
        const total_splits = userGroups.filter(g => !g.parent_id).length;

        return { ...user, total_splits };
    },

    /**
     * Update own profile
     */
    updateProfile: async (userId, { full_name, username, mobile_number, upi_id }) => {
        const updates = {};
        if (full_name) updates.full_name = full_name;
        if (username) updates.username = username;
        if (mobile_number) updates.mobile_number = mobile_number;
        if (upi_id !== undefined) updates.upi_id = upi_id;

        if (Object.keys(updates).length === 0) {
            const err = new Error('No fields to update.');
            err.statusCode = 400;
            throw err;
        }

        return await UserModel.updateById(userId, updates);
    },

    /**
     * Change password
     */
    changePassword: async (userId, oldPassword, newPassword) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Need full user record with password
        const fullUser = await UserModel.findByEmail(user.email);
        const isMatch = await bcrypt.compare(oldPassword, fullUser.password);
        if (!isMatch) {
            const err = new Error('Current password is incorrect.');
            err.statusCode = 401;
            throw err;
        }

        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await UserModel.updateById(userId, { password: hashedPassword });
    },

    /**
     * Get User Dashboard (owing, owed, recent groups)
     */
    getDashboard: async (userId) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        // Parallelize fetching all components of the dashboard
        const normalizedPhone = normalizePhone(user.mobile_number);
        const [myMemberDocs, myCreatedGroups, waStatus] = await Promise.all([
            GroupModel.getMemberDocsByUser(userId, normalizedPhone),
            GroupModel.findByCreator(userId),
            require('./whatsappService').getStatus(userId)
        ]);

        // 1. Calculate money I owe to others
        const subgroupsIOweTo = myMemberDocs.filter(m => !m.is_paid && m.expense_amount > 0);
        let money_to_send = 0;

        if (subgroupsIOweTo.length > 0) {
            // Fetch all unique groups concurrently
            const uniqueGroupIds = [...new Set(subgroupsIOweTo.map(m => m.group_id))];
            const groupsMap = {};
            const groupDocs = await Promise.all(uniqueGroupIds.map(id => GroupModel.findById(id)));
            groupDocs.forEach(g => { if (g) groupsMap[g.id] = g; });

            for (const memberDoc of subgroupsIOweTo) {
                const group = groupsMap[memberDoc.group_id];
                if (group && group.parent_id && group.created_by !== userId) {
                    money_to_send += memberDoc.expense_amount;
                }
            }
        }

        // 2. Calculate money owed to me
        let money_to_receive = 0;
        const myCreatedSubGroups = myCreatedGroups.filter(g => g.parent_id);

        if (myCreatedSubGroups.length > 0) {
            // Fetch members of all sub-groups concurrently
            const membersResults = await Promise.all(myCreatedSubGroups.map(sg => GroupModel.getMembers(sg.id)));

            membersResults.forEach(members => {
                for (const member of members) {
                    // If member is not me, and hasn't paid, they owe me
                    if (member.user_id !== userId && !member.is_paid && member.expense_amount > 0) {
                        money_to_receive += member.expense_amount;
                    }
                }
            });
        }

        // 3. Get last 2 main groups
        const GroupService = require('./groupService');
        const [myTopGroups, sharedGroups] = await Promise.all([
            GroupService.getMyGroups(userId),
            GroupService.getSharedGroups(userId)
        ]);

        const allMainGroups = [...myTopGroups, ...sharedGroups];
        allMainGroups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const recent_groups = allMainGroups.slice(0, 2);

        return {
            user: {
                id: user.id,
                full_name: user.full_name,
                username: user.username,
                email: user.email,
                mobile_number: user.mobile_number,
                upi_id: user.upi_id,
                whatsapp_connected: waStatus.status === 'connected',
            },
            money_to_send,
            money_to_receive,
            recent_groups
        };
    },
};

module.exports = UserService;
