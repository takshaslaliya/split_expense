const { databases, DATABASE_ID, GROUPS_COLLECTION_ID, GROUP_MEMBERS_COLLECTION_ID, Query, ID } = require('../config/appwrite');

const GroupModel = {
    // ─── GROUPS ────────────────────────────────────────────

    create: async (data) => {
        const doc = await databases.createDocument(DATABASE_ID, GROUPS_COLLECTION_ID, ID.unique(), {
            name: data.name,
            created_by: data.created_by,
            description: data.description || '',
            parent_id: data.parent_id || '',
            total_expense: data.total_expense || 0,
        });
        return {
            id: doc.$id, name: doc.name, created_by: doc.created_by,
            description: doc.description, parent_id: doc.parent_id || null,
            total_expense: doc.total_expense || 0, created_at: doc.$createdAt,
        };
    },

    findById: async (id) => {
        try {
            const doc = await databases.getDocument(DATABASE_ID, GROUPS_COLLECTION_ID, id);
            return {
                id: doc.$id, name: doc.name, created_by: doc.created_by,
                description: doc.description, parent_id: doc.parent_id || null,
                total_expense: doc.total_expense || 0, created_at: doc.$createdAt,
            };
        } catch (e) {
            if (e.code === 404) return null;
            throw e;
        }
    },

    findByCreator: async (userId) => {
        const result = await databases.listDocuments(DATABASE_ID, GROUPS_COLLECTION_ID, [
            Query.equal('created_by', userId),
            Query.orderDesc('$createdAt'),
        ]);
        return result.documents.map(doc => ({
            id: doc.$id, name: doc.name, created_by: doc.created_by,
            description: doc.description, parent_id: doc.parent_id || null,
            total_expense: doc.total_expense || 0, created_at: doc.$createdAt,
        }));
    },

    getSubGroups: async (parentId) => {
        const result = await databases.listDocuments(DATABASE_ID, GROUPS_COLLECTION_ID, [
            Query.equal('parent_id', parentId),
            Query.orderDesc('$createdAt'),
        ]);
        return result.documents.map(doc => ({
            id: doc.$id, name: doc.name, created_by: doc.created_by,
            description: doc.description, parent_id: doc.parent_id || null,
            total_expense: doc.total_expense || 0, created_at: doc.$createdAt,
        }));
    },

    update: async (id, updates) => {
        const doc = await databases.updateDocument(DATABASE_ID, GROUPS_COLLECTION_ID, id, updates);
        return {
            id: doc.$id, name: doc.name, created_by: doc.created_by,
            description: doc.description, parent_id: doc.parent_id || null,
            total_expense: doc.total_expense || 0, created_at: doc.$createdAt,
        };
    },

    deleteById: async (id) => {
        await databases.deleteDocument(DATABASE_ID, GROUPS_COLLECTION_ID, id);
    },

    // ─── GROUP MEMBERS ─────────────────────────────────────

    addMember: async ({ group_id, user_id, added_by, name, phone_number, is_registered, expense_amount, is_paid }) => {
        const doc = await databases.createDocument(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, ID.unique(), {
            group_id,
            user_id: user_id || '',
            added_by,
            name,
            phone_number,
            is_registered: is_registered || false,
            expense_amount: expense_amount || 0,
            is_paid: is_paid || false,
        });
        return {
            id: doc.$id, group_id: doc.group_id, user_id: doc.user_id || null,
            added_by: doc.added_by, name: doc.name, phone_number: doc.phone_number,
            is_registered: doc.is_registered, expense_amount: doc.expense_amount || 0,
            is_paid: doc.is_paid || false,
            joined_at: doc.$createdAt,
        };
    },

    findMember: async (group_id, user_id) => {
        const result = await databases.listDocuments(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, [
            Query.equal('group_id', group_id),
            Query.equal('user_id', user_id),
            Query.limit(1),
        ]);
        return result.documents.length > 0 ? result.documents[0] : null;
    },

    findMemberByPhone: async (group_id, phone_number) => {
        const result = await databases.listDocuments(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, [
            Query.equal('group_id', group_id),
            Query.equal('phone_number', phone_number),
            Query.limit(1),
        ]);
        return result.documents.length > 0 ? result.documents[0] : null;
    },

    findMemberById: async (memberId) => {
        try {
            const doc = await databases.getDocument(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, memberId);
            return {
                id: doc.$id, group_id: doc.group_id, user_id: doc.user_id || null,
                added_by: doc.added_by, name: doc.name, phone_number: doc.phone_number,
                is_registered: doc.is_registered, expense_amount: doc.expense_amount || 0,
                is_paid: doc.is_paid || false,
                joined_at: doc.$createdAt,
            };
        } catch (e) {
            if (e.code === 404) return null;
            throw e;
        }
    },

    updateMember: async (memberId, updates) => {
        const doc = await databases.updateDocument(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, memberId, updates);
        return {
            id: doc.$id, group_id: doc.group_id, user_id: doc.user_id || null,
            added_by: doc.added_by, name: doc.name, phone_number: doc.phone_number,
            is_registered: doc.is_registered, expense_amount: doc.expense_amount || 0,
            is_paid: doc.is_paid || false,
            joined_at: doc.$createdAt,
        };
    },

    getMembers: async (group_id) => {
        const result = await databases.listDocuments(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, [
            Query.equal('group_id', group_id),
            Query.limit(100),
        ]);
        return result.documents.map(doc => ({
            id: doc.$id, group_id: doc.group_id, user_id: doc.user_id || null,
            added_by: doc.added_by, name: doc.name, phone_number: doc.phone_number,
            is_registered: doc.is_registered, expense_amount: doc.expense_amount || 0,
            is_paid: doc.is_paid || false,
            joined_at: doc.$createdAt,
        }));
    },

    removeMember: async (memberDocId) => {
        await databases.deleteDocument(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, memberDocId);
    },

    getGroupsByUser: async (userId) => {
        const result = await databases.listDocuments(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, [
            Query.equal('user_id', userId),
            Query.limit(100),
        ]);
        return result.documents.map(doc => doc.group_id);
    },

    getMemberDocsByUser: async (userId) => {
        const result = await databases.listDocuments(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, [
            Query.equal('user_id', userId),
            Query.limit(100),
        ]);
        return result.documents.map(doc => ({
            id: doc.$id, group_id: doc.group_id, user_id: doc.user_id || null,
            added_by: doc.added_by, name: doc.name, phone_number: doc.phone_number,
            is_registered: doc.is_registered, expense_amount: doc.expense_amount || 0,
            is_paid: doc.is_paid || false,
            joined_at: doc.$createdAt,
        }));
    },
};

module.exports = GroupModel;
