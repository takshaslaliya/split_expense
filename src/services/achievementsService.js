const { databases, DATABASE_ID, ACHIEVEMENTS_COLLECTION_ID, USER_ACHIEVEMENTS_COLLECTION_ID, Query, ID } = require('../config/appwrite');

const AchievementsService = {
    /**
     * Get all available achievements
     */
    getAllAchievements: async () => {
        const response = await databases.listDocuments(
            DATABASE_ID,
            ACHIEVEMENTS_COLLECTION_ID,
            [Query.orderAsc('gold_required')]
        );
        return response.documents;
    },

    /**
     * Get user's achievements with progress
     */
    getUserAchievements: async (userId) => {
        // Get all achievements
        const allAchievements = await AchievementsService.getAllAchievements();

        // Get user's progress
        const userProgress = await databases.listDocuments(
            DATABASE_ID,
            USER_ACHIEVEMENTS_COLLECTION_ID,
            [Query.equal('user_id', userId)]
        );

        const progressMap = {};
        userProgress.documents.forEach(up => {
            progressMap[up.achievement_id] = up;
        });

        // Combine
        return allAchievements.map(ach => {
            const progress = progressMap[ach.$id];
            return {
                id: ach.$id,
                title: ach.title,
                description: ach.description,
                type: ach.type,
                is_unlocked: progress ? progress.is_unlocked : false,
                unlocked_at: progress ? progress.unlocked_at : null
            };
        });
    },

    /**
     * Track an action and update progress
     * type: 'regular_split', 'sub_split', 'app_usage'
     */
    trackAction: async (userId, type, increment = 1) => {
        // Find all achievements for this type
        const achievementsList = await databases.listDocuments(
            DATABASE_ID,
            ACHIEVEMENTS_COLLECTION_ID,
            [Query.equal('type', type)]
        );

        if (achievementsList.documents.length === 0) return []; // No achievements for this action

        const unlockedNow = [];

        for (const achievement of achievementsList.documents) {
            // Check current progress
            const existingProgress = await databases.listDocuments(
                DATABASE_ID,
                USER_ACHIEVEMENTS_COLLECTION_ID,
                [
                    Query.equal('user_id', userId),
                    Query.equal('achievement_id', achievement.$id)
                ]
            );

            let progressDoc;
            let newProgress = increment;

            if (existingProgress.documents.length > 0) {
                progressDoc = existingProgress.documents[0];
                if (progressDoc.is_unlocked) continue; // Already unlocked

                newProgress = progressDoc.current_progress + increment;
                const isUnlocked = newProgress >= achievement.gold_required;

                await databases.updateDocument(
                    DATABASE_ID,
                    USER_ACHIEVEMENTS_COLLECTION_ID,
                    progressDoc.$id,
                    {
                        current_progress: newProgress,
                        is_unlocked: isUnlocked,
                        unlocked_at: isUnlocked ? new Date().toISOString() : null,
                        updated_at: new Date().toISOString()
                    }
                );

                if (isUnlocked) {
                    unlockedNow.push({
                        id: achievement.$id,
                        title: achievement.title,
                        description: achievement.description
                    });
                }
            } else {
                const isUnlocked = newProgress >= achievement.gold_required;

                await databases.createDocument(
                    DATABASE_ID,
                    USER_ACHIEVEMENTS_COLLECTION_ID,
                    ID.unique(),
                    {
                        user_id: userId,
                        achievement_id: achievement.$id,
                        current_progress: newProgress,
                        is_unlocked: isUnlocked,
                        unlocked_at: isUnlocked ? new Date().toISOString() : null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                );

                if (isUnlocked) {
                    unlockedNow.push({
                        id: achievement.$id,
                        title: achievement.title,
                        description: achievement.description
                    });
                }
            }
        }

        return unlockedNow;
    }
};

module.exports = AchievementsService;
