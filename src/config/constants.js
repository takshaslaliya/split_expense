module.exports = {
    ROLES: {
        ADMIN: 'admin',
        USER: 'user',
    },
    OTP_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes
    JWT_EXPIRY: '7d',
    BCRYPT_SALT_ROUNDS: 10,
};
