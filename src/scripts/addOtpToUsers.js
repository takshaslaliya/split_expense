#!/usr/bin/env node
const { databases, DATABASE_ID, USERS_COLLECTION_ID } = require('../config/appwrite');

const addOtpAttributes = async () => {
    try {
        console.log('Adding OTP attributes to Users collection...');

        // Add otp_code attribute
        try {
            await databases.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'otp_code', 10, false);
            console.log('✅ Created otp_code attribute');
        } catch (e) {
            if (e.code === 409) console.log('✅ otp_code already exists');
            else console.log('❌ Failed to create otp_code:', e.message);
        }

        // Add otp_expires_at attribute
        try {
            await databases.createIntegerAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'otp_expires_at', false);
            console.log('✅ Created otp_expires_at attribute');
        } catch (e) {
            if (e.code === 409) console.log('✅ otp_expires_at already exists');
            else console.log('❌ Failed to create otp_expires_at:', e.message);
        }

        console.log('\nWaiting 3 seconds for Appwrite to provision the new attributes...');
        await new Promise(r => setTimeout(r, 3000));
        console.log('🎉 Done! OTPs can now be stored persistently in the database.');
    } catch (e) {
        console.error('Fatal error:', e.message);
    }
};

addOtpAttributes();
