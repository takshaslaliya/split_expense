require('dotenv').config();
const { databases, DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID } = require('./src/config/appwrite');
async function add() {
    try {
        await databases.createBooleanAttribute(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, 'is_paid', false, false);
        console.log("Attribute added.");
    } catch (e) { console.error("Error adding attribute:", e.message); }
}
add();
