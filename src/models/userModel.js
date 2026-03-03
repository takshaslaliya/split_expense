const { databases, DATABASE_ID, USERS_COLLECTION_ID, Query, ID } = require('../config/appwrite');

/**
 * User Model — all database operations using Appwrite
 */
const UserModel = {
    /**
     * Find user by email
     */
    findByEmail: async (email) => {
        const result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('email', email.toLowerCase()),
            Query.limit(1),
        ]);
        return result.documents.length > 0 ? result.documents[0] : null;
    },

    /**
     * Find user by ID
     */
    findById: async (id) => {
        try {
            const doc = await databases.getDocument(DATABASE_ID, USERS_COLLECTION_ID, id);
            return {
                id: doc.$id,
                email: doc.email,
                username: doc.username,
                full_name: doc.full_name,
                mobile_number: doc.mobile_number,
                upi_id: doc.upi_id || '',
                email_verified: doc.email_verified,
                role: doc.role,
                created_at: doc.$createdAt,
            };
        } catch (e) {
            if (e.code === 404) return null;
            throw e;
        }
    },

    /**
     * Find user by email or mobile number
     */
    findByEmailOrMobile: async (identifier) => {
        // Try email first
        let result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('email', identifier.toLowerCase()),
            Query.limit(1),
        ]);
        if (result.documents.length > 0) return result.documents[0];

        // Try mobile
        result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('mobile_number', identifier),
            Query.limit(1),
        ]);
        return result.documents.length > 0 ? result.documents[0] : null;
    },

    /**
     * Check if a user exists with the given email, username, or mobile
     */
    findExisting: async (email, username, mobile_number) => {
        // Check email
        let result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('email', email.toLowerCase()),
            Query.limit(1),
        ]);
        if (result.documents.length > 0) return { ...result.documents[0], id: result.documents[0].$id };

        // Check username
        result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('username', username),
            Query.limit(1),
        ]);
        if (result.documents.length > 0) return { ...result.documents[0], id: result.documents[0].$id };

        // Check mobile
        result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.equal('mobile_number', mobile_number),
            Query.limit(1),
        ]);
        if (result.documents.length > 0) return { ...result.documents[0], id: result.documents[0].$id };

        return null;
    },

    /**
     * Create a new user
     */
    create: async (userData) => {
        const doc = await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, ID.unique(), {
            username: userData.username,
            full_name: userData.full_name,
            email: userData.email.toLowerCase(),
            mobile_number: userData.mobile_number,
            password: userData.password,
            email_verified: userData.email_verified || false,
            role: userData.role || 'user',
        });
        return {
            id: doc.$id,
            email: doc.email,
            username: doc.username,
            full_name: doc.full_name,
            mobile_number: doc.mobile_number,
            upi_id: doc.upi_id || '',
            email_verified: doc.email_verified,
            role: doc.role,
            created_at: doc.$createdAt,
        };
    },

    /**
     * Update user fields by email
     */
    updateByEmail: async (email, updates) => {
        const user = await UserModel.findByEmail(email);
        if (!user) throw new Error('User not found');
        const doc = await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, user.$id, updates);
        return {
            id: doc.$id,
            email: doc.email,
            username: doc.username,
            full_name: doc.full_name,
            mobile_number: doc.mobile_number,
            upi_id: doc.upi_id || '',
            email_verified: doc.email_verified,
            role: doc.role,
        };
    },

    /**
     * Update user fields by ID
     */
    updateById: async (id, updates) => {
        const doc = await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, id, updates);
        return {
            id: doc.$id,
            email: doc.email,
            username: doc.username,
            full_name: doc.full_name,
            mobile_number: doc.mobile_number,
            upi_id: doc.upi_id || '',
            email_verified: doc.email_verified,
            role: doc.role,
        };
    },

    /**
     * Get all users (admin only)
     */
    findAll: async () => {
        // Appwrite limit max is 100, we'll fetch up to 100 or loop if needed. Let's just fetch default max 5000 if we could, but Appwrite limit max is 5000.
        const result = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
            Query.orderDesc('$createdAt'),
            Query.limit(5000), // High limit to fetch all typical users in one go
        ]);
        const users = result.documents.map((doc) => ({
            id: doc.$id,
            email: doc.email,
            username: doc.username,
            full_name: doc.full_name,
            mobile_number: doc.mobile_number,
            upi_id: doc.upi_id || '',
            email_verified: doc.email_verified,
            role: doc.role,
            created_at: doc.$createdAt,
        }));
        return users;
    },

    /**
     * Delete user by ID (admin only)
     */
    deleteById: async (id) => {
        const user = await UserModel.findById(id);
        if (!user) throw new Error('User not found');
        await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION_ID, id);
        return { id: user.id, email: user.email, username: user.username };
    },

    /**
     * Update user role (admin only)
     */
    updateRole: async (id, role) => {
        const doc = await databases.updateDocument(DATABASE_ID, USERS_COLLECTION_ID, id, { role });
        return {
            id: doc.$id,
            email: doc.email,
            username: doc.username,
            full_name: doc.full_name,
            role: doc.role,
        };
    },
};

module.exports = UserModel;
