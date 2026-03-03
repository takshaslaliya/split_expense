require('dotenv').config();
const { databases, DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID } = require('./src/config/appwrite');
async function check() {
    try {
        const doc = await databases.listDocuments(DATABASE_ID, GROUP_MEMBERS_COLLECTION_ID, []);
        if (doc.documents.length > 0) {
            console.log(doc.documents[0]);
        } else {
            console.log("No docs.");
        }
    } catch (e) { console.error(e); }
}
check();
