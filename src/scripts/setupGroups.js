/**
 * Setup script: Creates groups + group_members collections in Appwrite
 * Run once: node src/scripts/setupGroups.js
 */
const { databases, DATABASE_ID, ID } = require('../config/appwrite');

const GROUPS_COLLECTION_ID = 'groups';
const GROUP_MEMBERS_COLLECTION_ID = 'group_members';

const setup = async () => {
    try {
        // 1. Create Groups Collection
        console.log('Creating groups collection...');
        try {
            await databases.createCollection(DATABASE_ID, GROUPS_COLLECTION_ID, 'Groups', []);
            console.log('✅ Groups collection created');
        } catch (e) {
            if (e.code === 409) console.log('✅ Groups collection already exists');
            else throw e;
        }

        // 2. Create Groups Attributes
        console.log('Creating groups attributes...');
        const groupAttrs = [
            { method: 'createStringAttribute', args: [DATABASE_ID, GROUPS_COLLECTION_ID, 'name', 200, true] },
            { method: 'createStringAttribute', args: [DATABASE_ID, GROUPS_COLLECTION_ID, 'created_by', 50, true] },
            { method: 'createStringAttribute', args: [DATABASE_ID, GROUPS_COLLECTION_ID, 'description', 500, false, ''] },
        ];

        for (const attr of groupAttrs) {
            try {
                await databases[attr.method](...attr.args);
                console.log(`  ✅ ${attr.args[2]}`);
            } catch (e) {
                if (e.code === 409) console.log(`  ✅ ${attr.args[2]} (already exists)`);
                else console.log(`  ❌ ${attr.args[2]}: ${e.message}`);
            }
        }

        // 3. Create Group Members Collection
        console.log('\nCreating group_members collection...');
        try {
            await databases.createCollection(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, 'Group Members', []);
            console.log('✅ Group members collection created');
        } catch (e) {
            if (e.code === 409) console.log('✅ Group members collection already exists');
            else throw e;
        }

        // 4. Create Group Members Attributes
        console.log('Creating group_members attributes...');
        const memberAttrs = [
            { method: 'createStringAttribute', args: [DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, 'group_id', 50, true] },
            { method: 'createStringAttribute', args: [DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, 'user_id', 50, true] },
            { method: 'createStringAttribute', args: [DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, 'added_by', 50, true] },
        ];

        for (const attr of memberAttrs) {
            try {
                await databases[attr.method](...attr.args);
                console.log(`  ✅ ${attr.args[2]}`);
            } catch (e) {
                if (e.code === 409) console.log(`  ✅ ${attr.args[2]} (already exists)`);
                else console.log(`  ❌ ${attr.args[2]}: ${e.message}`);
            }
        }

        // 5. Wait for attributes
        console.log('\n⏳ Waiting 5 seconds for attributes to be provisioned...');
        await new Promise(r => setTimeout(r, 5000));

        // 6. Create Indexes
        console.log('Creating indexes...');
        try {
            await databases.createIndex(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, 'group_id_idx', 'key', ['group_id']);
            console.log('  ✅ group_id_idx');
        } catch (e) {
            if (e.code === 409) console.log('  ✅ group_id_idx (already exists)');
            else console.log(`  ❌ group_id_idx: ${e.message}`);
        }

        try {
            await databases.createIndex(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, 'user_id_idx', 'key', ['user_id']);
            console.log('  ✅ user_id_idx');
        } catch (e) {
            if (e.code === 409) console.log('  ✅ user_id_idx (already exists)');
            else console.log(`  ❌ user_id_idx: ${e.message}`);
        }

        try {
            await databases.createIndex(DATABASE_ID, GROUPS_COLLECTION_ID, 'created_by_idx', 'key', ['created_by']);
            console.log('  ✅ created_by_idx');
        } catch (e) {
            if (e.code === 409) console.log('  ✅ created_by_idx (already exists)');
            else console.log(`  ❌ created_by_idx: ${e.message}`);
        }

        console.log('\n🎉 Groups setup complete!\n');
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    }
};

setup();
