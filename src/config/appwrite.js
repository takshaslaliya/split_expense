const { Client, Databases, Query, ID } = require('node-appwrite');
require('dotenv').config();

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const DATABASE_ID = '69a3fc660037fbe3073c';
const USERS_COLLECTION_ID = 'users';
const GROUPS_COLLECTION_ID = 'groups';
const GROUP_MEMBERS_COLLECTION_ID = 'group_members';
const ACHIEVEMENTS_COLLECTION_ID = 'achievements';
const USER_ACHIEVEMENTS_COLLECTION_ID = 'user_achievements';

module.exports = {
    client, databases, DATABASE_ID, USERS_COLLECTION_ID,
    GROUPS_COLLECTION_ID, GROUP_MEMBERS_COLLECTION_ID,
    ACHIEVEMENTS_COLLECTION_ID, USER_ACHIEVEMENTS_COLLECTION_ID, Query, ID
};
