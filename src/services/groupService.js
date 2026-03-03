const GroupModel = require('../models/groupModel');
const UserModel = require('../models/userModel');

const GroupService = {
    /**
     * Create a top-level group and auto-add creator as member
     */
    createGroup: async (userId, { name, description }) => {
        const creator = await UserModel.findById(userId);
        const group = await GroupModel.create({
            name, description: description || '', created_by: userId, parent_id: '', total_expense: 0,
        });
        await GroupModel.addMember({
            group_id: group.id, user_id: userId, added_by: userId,
            name: creator ? creator.full_name : 'Unknown',
            phone_number: creator ? creator.mobile_number : '',
            is_registered: true, expense_amount: 0,
        });
        return group;
    },

    /**
     * Create a sub-group with total_expense and members + their shares
     * members = [{ name, phone_number, expense_amount }]
     */
    createSubGroup: async (userId, parentId, { name, description, total_expense, members }) => {
        const parent = await GroupModel.findById(parentId);
        if (!parent) {
            const err = new Error('Parent group not found.');
            err.statusCode = 404;
            throw err;
        }

        // Verify caller is a member of the parent group
        const isMember = await GroupModel.findMember(parentId, userId);
        if (!isMember && parent.created_by !== userId) {
            const err = new Error('You are not a member of the parent group.');
            err.statusCode = 403;
            throw err;
        }

        const creator = await UserModel.findById(userId);

        // Create sub-group with total expense
        const subGroup = await GroupModel.create({
            name, description: description || '', created_by: userId,
            parent_id: parentId, total_expense: total_expense || 0,
        });

        // Auto-add creator as member
        const creatorExpense = members ? 0 : 0;
        await GroupModel.addMember({
            group_id: subGroup.id, user_id: userId, added_by: userId,
            name: creator ? creator.full_name : 'Unknown',
            phone_number: creator ? creator.mobile_number : '',
            is_registered: true, expense_amount: creatorExpense,
        });

        // Add members with their expense shares
        const addedMembers = [];
        if (members && Array.isArray(members)) {
            for (const m of members) {
                if (!m.phone_number || !m.name) continue;

                // Check if registered
                const registeredUser = await UserModel.findByEmailOrMobile(m.phone_number);
                const is_registered = !!registeredUser;
                const linked_user_id = registeredUser ? (registeredUser.$id || registeredUser.id) : '';

                const member = await GroupModel.addMember({
                    group_id: subGroup.id, user_id: linked_user_id, added_by: userId,
                    name: m.name, phone_number: m.phone_number,
                    is_registered, expense_amount: m.expense_amount || 0,
                });
                addedMembers.push(member);
            }
        }

        return { ...subGroup, members: addedMembers };
    },

    /**
     * Get all top-level groups
     */
    getMyGroups: async (userId) => {
        const groupIds = await GroupModel.getGroupsByUser(userId);
        const createdGroups = await GroupModel.findByCreator(userId);
        const allGroupIds = [...new Set([...groupIds, ...createdGroups.map(g => g.id)])];

        // Fetch all groups concurrently
        const groupFetchPromises = allGroupIds.map(gId => GroupModel.findById(gId));
        const fetchedGroups = await Promise.all(groupFetchPromises);

        // Filter valid top-level groups
        const topLevelGroups = fetchedGroups.filter(g => g && !g.parent_id);

        // Concurrently fetch members and sub-groups for each top-level group
        const enrichedGroupsPromises = topLevelGroups.map(async (group) => {
            const [members, subGroups] = await Promise.all([
                GroupModel.getMembers(group.id),
                GroupModel.getSubGroups(group.id)
            ]);

            let total_sub_expense = 0;
            for (const sg of subGroups) total_sub_expense += sg.total_expense || 0;

            return {
                ...group,
                member_count: members.length,
                sub_group_count: subGroups.length,
                total_sub_expense,
            };
        });

        const groups = await Promise.all(enrichedGroupsPromises);

        // Sort by created_at descending just in case Promise.all changed ordering
        return groups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    /**
     * Get groups where the user is a member but NOT the creator
     */
    getSharedGroups: async (userId) => {
        // 1. Find all group IDs where the user is a member
        const groupIds = await GroupModel.getGroupsByUser(userId);
        if (!groupIds || groupIds.length === 0) return [];

        // 2. Fetch those specific groups
        const groupsPromises = groupIds.map(id => GroupModel.findById(id));
        const rawGroups = await Promise.all(groupsPromises);

        // 3. Filter out groups the user actually created or nulls
        const sharedGroups = rawGroups.filter(g => g && g.created_by !== userId && !g.parent_id);

        // 4. Enrich them with member counts, etc.
        const enrichedGroupsPromises = sharedGroups.map(async (group) => {
            const members = await GroupModel.getMembers(group.id);
            const subGroups = await GroupModel.getSubGroups(group.id);

            let total_sub_expense = 0;
            for (const sg of subGroups) {
                total_sub_expense += (sg.total_expense || 0);
            }

            return {
                ...group,
                member_count: members.length,
                sub_group_count: subGroups.length,
                total_sub_expense,
            };
        });

        const groups = await Promise.all(enrichedGroupsPromises);
        return groups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    /**
     * Get group details with members, expenses, and sub-groups
     */
    getGroupDetails: async (userId, groupId) => {
        const group = await GroupModel.findById(groupId);
        if (!group) {
            const err = new Error('Group not found.');
            err.statusCode = 404;
            throw err;
        }

        const isMember = await GroupModel.findMember(groupId, userId);
        if (!isMember && group.created_by !== userId) {
            if (group.parent_id) {
                const isParentMember = await GroupModel.findMember(group.parent_id, userId);
                if (!isParentMember) {
                    const err = new Error('You are not a member of this group.');
                    err.statusCode = 403;
                    throw err;
                }
            } else {
                const err = new Error('You are not a member of this group.');
                err.statusCode = 403;
                throw err;
            }
        }

        const members = await GroupModel.getMembers(groupId);
        const subGroups = await GroupModel.getSubGroups(groupId);
        const subGroupsWithDetails = [];
        for (const sg of subGroups) {
            const sgMembers = await GroupModel.getMembers(sg.id);
            subGroupsWithDetails.push({ ...sg, members: sgMembers });
        }

        return { ...group, members, sub_groups: subGroupsWithDetails };
    },

    /**
     * Update group (creator only)
     */
    updateGroup: async (userId, groupId, updates) => {
        const group = await GroupModel.findById(groupId);
        if (!group) {
            const err = new Error('Group not found.');
            err.statusCode = 404; throw err;
        }
        if (group.created_by !== userId) {
            const err = new Error('Only the group creator can update.');
            err.statusCode = 403; throw err;
        }

        const allowed = {};
        if (updates.name) allowed.name = updates.name;
        if (updates.description !== undefined) allowed.description = updates.description;
        if (updates.total_expense !== undefined) allowed.total_expense = updates.total_expense;

        return await GroupModel.update(groupId, allowed);
    },

    /**
     * Delete group + sub-groups + all members (creator only)
     */
    deleteGroup: async (userId, groupId) => {
        const group = await GroupModel.findById(groupId);
        if (!group) {
            const err = new Error('Group not found.');
            err.statusCode = 404; throw err;
        }
        if (group.created_by !== userId) {
            const err = new Error('Only the group creator can delete.');
            err.statusCode = 403; throw err;
        }

        const subGroups = await GroupModel.getSubGroups(groupId);
        for (const sg of subGroups) {
            const sgMembers = await GroupModel.getMembers(sg.id);
            for (const m of sgMembers) await GroupModel.removeMember(m.id);
            await GroupModel.deleteById(sg.id);
        }

        const members = await GroupModel.getMembers(groupId);
        for (const m of members) await GroupModel.removeMember(m.id);

        await GroupModel.deleteById(groupId);
        return group;
    },

    /**
     * Add a member by phone + name + expense
     */
    addMember: async (userId, groupId, { phone_number, name, expense_amount }) => {
        const group = await GroupModel.findById(groupId);
        if (!group) {
            const err = new Error('Group not found.');
            err.statusCode = 404; throw err;
        }

        const callerMember = await GroupModel.findMember(groupId, userId);
        if (!callerMember && group.created_by !== userId) {
            const err = new Error('You are not a member of this group.');
            err.statusCode = 403; throw err;
        }

        const existingByPhone = await GroupModel.findMemberByPhone(groupId, phone_number);
        if (existingByPhone) {
            const err = new Error('A member with this phone number is already in this group.');
            err.statusCode = 409; throw err;
        }

        const registeredUser = await UserModel.findByEmailOrMobile(phone_number);
        const is_registered = !!registeredUser;
        const linked_user_id = registeredUser ? (registeredUser.$id || registeredUser.id) : '';

        return await GroupModel.addMember({
            group_id: groupId, user_id: linked_user_id, added_by: userId,
            name, phone_number, is_registered, expense_amount: expense_amount || 0,
        });
    },

    /**
     * Edit a member's expense amount (and optionally name)
     */
    editMemberExpense: async (userId, groupId, memberId, updatesData) => {
        const group = await GroupModel.findById(groupId);
        if (!group) {
            const err = new Error('Group not found.');
            err.statusCode = 404; throw err;
        }
        if (group.created_by !== userId) {
            const err = new Error('Only the group creator can edit member expenses.');
            err.statusCode = 403; throw err;
        }

        const member = await GroupModel.findMemberById(memberId);
        if (!member) {
            const err = new Error('Member not found in this group.');
            err.statusCode = 404; throw err;
        }
        if (member.group_id !== groupId) {
            const err = new Error('Member does not belong to this group.');
            err.statusCode = 400; throw err;
        }

        const updates = {};
        if (updatesData.expense_amount !== undefined) updates.expense_amount = updatesData.expense_amount;
        if (updatesData.name) updates.name = updatesData.name;
        if (updatesData.is_paid !== undefined) updates.is_paid = updatesData.is_paid;

        return await GroupModel.updateMember(memberId, updates);
    },

    /**
     * Update a member's payment status (is_paid)
     */
    updateMemberStatus: async (userId, groupId, memberId, { is_paid }) => {
        const group = await GroupModel.findById(groupId);
        if (!group) {
            const err = new Error('Group not found.');
            err.statusCode = 404; throw err;
        }

        // Only creator or the member themselves can update their payment status
        if (group.created_by !== userId) {
            const isSelf = await GroupModel.findMember(groupId, userId);
            if (!isSelf || isSelf.id !== memberId) {
                const err = new Error('You do not have permission to update this member status.');
                err.statusCode = 403; throw err;
            }
        }

        const member = await GroupModel.findMemberById(memberId);
        if (!member) {
            const err = new Error('Member not found.');
            err.statusCode = 404; throw err;
        }
        if (member.group_id !== groupId) {
            const err = new Error('Member does not belong to this group.');
            err.statusCode = 400; throw err;
        }

        return await GroupModel.updateMember(memberId, { is_paid });
    },

    /**
     * Remove member
     */
    removeMember: async (userId, groupId, memberId) => {
        const group = await GroupModel.findById(groupId);
        if (!group) {
            const err = new Error('Group not found.');
            err.statusCode = 404; throw err;
        }

        const member = await GroupModel.findMemberById(memberId);
        if (!member || member.group_id !== groupId) {
            const err = new Error('Member not found in this group.');
            err.statusCode = 404; throw err;
        }

        if (group.created_by !== userId && member.user_id !== userId) {
            const err = new Error('Only the group creator or the member themselves can remove.');
            err.statusCode = 403; throw err;
        }

        if (member.user_id === group.created_by) {
            const err = new Error('Group creator cannot be removed.');
            err.statusCode = 400; throw err;
        }

        await GroupModel.removeMember(memberId);
    },
};

module.exports = GroupService;
