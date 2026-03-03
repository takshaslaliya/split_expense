/**
 * Setup script: Creates database + users collection in Appwrite
 * Run once: node src/scripts/setupAppwrite.js
 */
const { client, databases, DATABASE_ID, USERS_COLLECTION_ID, ID } = require('../config/appwrite');
const bcrypt = require('bcryptjs');

const setup = async () => {
    try {
        // 1. Using existing database (free plan limit reached)
        console.log(`Using existing database: ${DATABASE_ID}`);


        // 2. Create Users Collection
        console.log('Creating users collection...');
        try {
            await databases.createCollection(DATABASE_ID, USERS_COLLECTION_ID, 'Users', [
                // Permissions: allow read/write for any authenticated user via server API key
            ]);
            console.log('✅ Users collection created');
        } catch (e) {
            if (e.code === 409) console.log('✅ Users collection already exists');
            else throw e;
        }

        // 3. Create Attributes
        console.log('Creating attributes...');
        const attributes = [
            { method: 'createStringAttribute', args: [DATABASE_ID, USERS_COLLECTION_ID, 'username', 100, true] },
            { method: 'createStringAttribute', args: [DATABASE_ID, USERS_COLLECTION_ID, 'full_name', 200, true] },
            { method: 'createEmailAttribute', args: [DATABASE_ID, USERS_COLLECTION_ID, 'email', true] },
            { method: 'createStringAttribute', args: [DATABASE_ID, USERS_COLLECTION_ID, 'mobile_number', 15, true] },
            { method: 'createStringAttribute', args: [DATABASE_ID, USERS_COLLECTION_ID, 'password', 500, true] },
            { method: 'createBooleanAttribute', args: [DATABASE_ID, USERS_COLLECTION_ID, 'email_verified', false, false] },
            { method: 'createStringAttribute', args: [DATABASE_ID, USERS_COLLECTION_ID, 'role', 10, false, 'user'] },
        ];

        for (const attr of attributes) {
            try {
                await databases[attr.method](...attr.args);
                console.log(`  ✅ ${attr.args[2]}`);
            } catch (e) {
                if (e.code === 409) console.log(`  ✅ ${attr.args[2]} (already exists)`);
                else console.log(`  ❌ ${attr.args[2]}: ${e.message}`);
            }
        }

        // 4. Wait for attributes to be ready
        console.log('\n⏳ Waiting 5 seconds for attributes to be provisioned...');
        await new Promise(r => setTimeout(r, 5000));

        // 5. Create Indexes
        console.log('Creating indexes...');
        const indexes = [
            { key: 'email_unique', type: 'unique', attributes: ['email'] },
            { key: 'username_unique', type: 'unique', attributes: ['username'] },
            { key: 'mobile_unique', type: 'unique', attributes: ['mobile_number'] },
        ];

        for (const idx of indexes) {
            try {
                await databases.createIndex(DATABASE_ID, USERS_COLLECTION_ID, idx.key, idx.type, idx.attributes);
                console.log(`  ✅ ${idx.key}`);
            } catch (e) {
                if (e.code === 409) console.log(`  ✅ ${idx.key} (already exists)`);
                else console.log(`  ❌ ${idx.key}: ${e.message}`);
            }
        }

        // 6. Seed default admin
        console.log('\nSeeding default admin...');
        const { Query } = require('node-appwrite');
        try {
            const existing = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [
                Query.equal('email', 'admin@gmail.com'),
            ]);
            if (existing.documents.length > 0) {
                console.log('✅ Admin already exists');
            } else {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash('admin123', salt);
                await databases.createDocument(DATABASE_ID, USERS_COLLECTION_ID, ID.unique(), {
                    username: 'admin',
                    full_name: 'Admin',
                    email: 'admin@gmail.com',
                    mobile_number: '0000000000',
                    password: hashedPassword,
                    email_verified: true,
                    role: 'admin',
                });
                console.log('✅ Default admin created (admin@gmail.com / admin123)');
            }
        } catch (e) {
            console.log(`❌ Admin seed failed: ${e.message}`);
            console.log('   This may happen if indexes are still building. Try again in a few seconds.');
        }

        console.log('\n🎉 Setup complete!\n');
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
    }
};

setup();
