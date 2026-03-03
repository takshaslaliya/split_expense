const GroupService = require('../services/groupService');
const AchievementsService = require('../services/achievementsService');

const createGroup = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Group name is required.' });
        const group = await GroupService.createGroup(req.user.id, { name, description });

        // Track regular split creation achievement
        const unlockedAchievements = await AchievementsService.trackAction(req.user.id, 'regular_split');
        const responseData = { ...group, unlocked_achievements: unlockedAchievements };

        return res.status(201).json({ success: true, message: 'Group created successfully.', data: responseData });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const createSubGroup = async (req, res) => {
    try {
        const { name, description, total_expense, members } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Sub-group name is required.' });
        const subGroup = await GroupService.createSubGroup(req.user.id, req.params.id, {
            name, description, total_expense, members,
        });

        // Track sub split creation achievement
        const unlockedAchievements = await AchievementsService.trackAction(req.user.id, 'sub_split');
        const responseData = { ...subGroup, unlocked_achievements: unlockedAchievements };

        return res.status(201).json({ success: true, message: 'Sub-group created successfully.', data: responseData });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const getMyGroups = async (req, res) => {
    try {
        const groups = await GroupService.getMyGroups(req.user.id);
        return res.status(200).json({ success: true, data: groups });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const getSharedGroups = async (req, res) => {
    try {
        const groups = await GroupService.getSharedGroups(req.user.id);
        return res.status(200).json({ success: true, data: groups });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const getGroupDetails = async (req, res) => {
    try {
        const group = await GroupService.getGroupDetails(req.user.id, req.params.id);
        return res.status(200).json({ success: true, data: group });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const updateGroup = async (req, res) => {
    try {
        const group = await GroupService.updateGroup(req.user.id, req.params.id, req.body);
        return res.status(200).json({ success: true, message: 'Group updated successfully.', data: group });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const deleteGroup = async (req, res) => {
    try {
        const group = await GroupService.deleteGroup(req.user.id, req.params.id);
        return res.status(200).json({ success: true, message: 'Group deleted successfully.', data: group });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const addMember = async (req, res) => {
    try {
        const { phone_number, name, expense_amount } = req.body;
        if (!phone_number || !name) return res.status(400).json({ success: false, message: 'phone_number and name are required.' });
        const member = await GroupService.addMember(req.user.id, req.params.id, { phone_number, name, expense_amount });
        return res.status(201).json({ success: true, message: 'Member added successfully.', data: member });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const editMemberExpense = async (req, res) => {
    try {
        const member = await GroupService.editMemberExpense(req.user.id, req.params.id, req.params.memberId, req.body);
        return res.status(200).json({ success: true, message: 'Member expense updated.', data: member });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const updateMemberStatus = async (req, res) => {
    try {
        const { is_paid } = req.body;
        if (is_paid === undefined) return res.status(400).json({ success: false, message: 'is_paid is required.' });
        const member = await GroupService.updateMemberStatus(req.user.id, req.params.id, req.params.memberId, { is_paid });
        return res.status(200).json({ success: true, message: 'Member status updated.', data: member });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

const removeMember = async (req, res) => {
    try {
        await GroupService.removeMember(req.user.id, req.params.id, req.params.memberId);
        return res.status(200).json({ success: true, message: 'Member removed successfully.' });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

module.exports = { createGroup, createSubGroup, getMyGroups, getSharedGroups, getGroupDetails, updateGroup, deleteGroup, addMember, editMemberExpense, updateMemberStatus, removeMember };
