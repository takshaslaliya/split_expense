// setup_achievements.js
const { client, databases, DATABASE_ID } = require('./src/config/appwrite');
const { ID } = require('node-appwrite');

async function setupAchievements() {
    try {
        console.log('Creating achievements collection...');
        const achievementsId = 'achievements';
        try {
            await databases.createCollection(DATABASE_ID, achievementsId, 'Achievements');
            console.log('Created achievements collection.');

            // Add attributes
            await databases.createStringAttribute(DATABASE_ID, achievementsId, 'title', 255, true);
            await databases.createStringAttribute(DATABASE_ID, achievementsId, 'description', 1000, true);
            await databases.createStringAttribute(DATABASE_ID, achievementsId, 'type', 50, true); // e.g., 'regular_split', 'sub_split', 'app_usage'
            await databases.createIntegerAttribute(DATABASE_ID, achievementsId, 'gold_required', true);
            await databases.createIntegerAttribute(DATABASE_ID, achievementsId, 'reward_points', true);
            await databases.createDatetimeAttribute(DATABASE_ID, achievementsId, 'created_at', false);

            console.log('Waiting for attributes to be created...');
            await new Promise(resolve => setTimeout(resolve, 3000)); // wait for attributes to provision

            // Seed Some default achievements
            const defaultAchievements = [
                {
                    title: 'Split Novice',
                    description: 'Create your first 5 regular splits.',
                    type: 'regular_split',
                    gold_required: 5,
                    reward_points: 50,
                    created_at: new Date().toISOString()
                },
                {
                    title: 'Split Pro',
                    description: 'Create 20 regular splits.',
                    type: 'regular_split',
                    gold_required: 20,
                    reward_points: 200,
                    created_at: new Date().toISOString()
                },
                {
                    title: 'Sub-Split Starter',
                    description: 'Add 3 sub-splits inside a group.',
                    type: 'sub_split',
                    gold_required: 3,
                    reward_points: 75,
                    created_at: new Date().toISOString()
                },
                {
                    title: 'Sub-Split Master',
                    description: 'Add 15 sub-splits inside a group.',
                    type: 'sub_split',
                    gold_required: 15,
                    reward_points: 300,
                    created_at: new Date().toISOString()
                },
                {
                    title: 'Consistent User',
                    description: 'Open the app 7 times.',
                    type: 'app_usage',
                    gold_required: 7,
                    reward_points: 100,
                    created_at: new Date().toISOString()
                }
            ];

            for (const ach of defaultAchievements) {
                await databases.createDocument(DATABASE_ID, achievementsId, ID.unique(), ach);
            }
            console.log('Seeded default achievements.');

        } catch (e) {
            if (e.code === 409) console.log('achievements collection already exists.');
            else throw e;
        }

        console.log('\nCreating user_achievements collection...');
        const userAchievementsId = 'user_achievements';
        try {
            await databases.createCollection(DATABASE_ID, userAchievementsId, 'User Achievements');
            console.log('Created user_achievements collection.');

            // Add attributes
            await databases.createStringAttribute(DATABASE_ID, userAchievementsId, 'user_id', 255, true);
            await databases.createStringAttribute(DATABASE_ID, userAchievementsId, 'achievement_id', 255, true);
            await databases.createIntegerAttribute(DATABASE_ID, userAchievementsId, 'current_progress', false, 0, 0, false);
            await databases.createBooleanAttribute(DATABASE_ID, userAchievementsId, 'is_unlocked', false, false, false);
            await databases.createDatetimeAttribute(DATABASE_ID, userAchievementsId, 'unlocked_at', false);
            await databases.createDatetimeAttribute(DATABASE_ID, userAchievementsId, 'created_at', false);
            await databases.createDatetimeAttribute(DATABASE_ID, userAchievementsId, 'updated_at', false);

            console.log('Waiting for attributes to be created...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Create Indexes
            await databases.createIndex(DATABASE_ID, userAchievementsId, 'user_id_idx', 'key', ['user_id']);
            await databases.createIndex(DATABASE_ID, userAchievementsId, 'ach_user_idx', 'unique', ['user_id', 'achievement_id']);
            console.log('Indexes created for user_achievements.');

        } catch (e) {
            if (e.code === 409) console.log('user_achievements collection already exists.');
            else throw e;
        }

        console.log('Achievements setup complete!');
    } catch (e) {
        console.error('Setup failed:', e);
    }
}

setupAchievements();
