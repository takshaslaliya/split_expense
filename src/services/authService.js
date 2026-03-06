const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const { sendOtpEmail } = require('../utils/emailService');
const { generateOtp, storeOtp, verifyOtp } = require('../utils/otpStore');
const { ROLES, JWT_EXPIRY, BCRYPT_SALT_ROUNDS } = require('../config/constants');
const { normalizePhone } = require('../utils/phoneUtils');
require('dotenv').config();

/**
 * Auth Service — business logic for authentication
 */
const AuthService = {
    /**
     * Register a new user
     */
    signup: async ({ mobile_number, email, username, full_name, password }) => {
        // Normalize mobile number
        const normalizedMobile = mobile_number;

        // Check for existing user
        const existing = await UserModel.findExisting(email, username, normalizedMobile);
        if (existing) {
            let conflict = 'User';
            if (existing.email === email) conflict = 'Email';
            else if (existing.username === username) conflict = 'Username';
            else if (existing.mobile_number === mobile_number) conflict = 'Mobile number';
            const err = new Error(`${conflict} already exists.`);
            err.statusCode = 409;
            throw err;
        }

        // Hash password & create user
        const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await UserModel.create({
            mobile_number: normalizedMobile,
            email: email.toLowerCase(),
            username,
            full_name,
            password: hashedPassword,
            email_verified: false,
            role: ROLES.USER,
        });

        // Send OTP
        const otp = generateOtp();
        await UserModel.updateById(newUser.id, {
            otp_code: otp,
            otp_expires_at: Date.now() + (5 * 60 * 1000)
        });

        await sendOtpEmail(email, otp);

        return newUser;
    },

    /**
     * Verify email OTP
     */
    verifyEmail: async (email, otp) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        if (!user.otp_code || user.otp_code !== String(otp) || Date.now() > user.otp_expires_at) {
            // Optional: clear OTP if expired
            if (user.otp_expires_at && Date.now() > user.otp_expires_at) {
                await UserModel.updateById(user.$id || user.id, { otp_code: '', otp_expires_at: null });
            }
            const err = new Error('Invalid or expired OTP.');
            err.statusCode = 400;
            throw err;
        }

        // Clear OTP and mark verified
        return await UserModel.updateById(user.$id || user.id, {
            email_verified: true,
            otp_code: '',
            otp_expires_at: null
        });
    },

    /**
     * Resend OTP for email verification
     */
    resendOtp: async (email) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }
        if (user.email_verified) {
            const err = new Error('Email is already verified.');
            err.statusCode = 400;
            throw err;
        }
        const otp = generateOtp();
        await UserModel.updateById(user.$id || user.id, {
            otp_code: otp,
            otp_expires_at: Date.now() + (5 * 60 * 1000)
        });
        await sendOtpEmail(email, otp);
    },

    /**
     * Login with email/mobile + password
     */
    login: async (email_or_mobile, password) => {
        const user = await UserModel.findByEmailOrMobile(email_or_mobile);
        if (!user) {
            const err = new Error('Invalid credentials.');
            err.statusCode = 401;
            throw err;
        }

        if (!user.email_verified) {
            const err = new Error('Email not verified. Please verify your email first.');
            err.statusCode = 403;
            throw err;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            const err = new Error('Invalid credentials.');
            err.statusCode = 401;
            throw err;
        }

        const token = AuthService._generateToken(user);
        return {
            token,
            type: user.role,
            user: AuthService._sanitizeUser(user),
        };
    },

    /**
     * Request OTP for email-only login
     */
    loginOtpRequest: async (email) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }
        if (!user.email_verified) {
            const err = new Error('Email not verified. Please verify your email first.');
            err.statusCode = 403;
            throw err;
        }
        const otp = generateOtp();
        await UserModel.updateById(user.$id || user.id, {
            otp_code: otp,
            otp_expires_at: Date.now() + (5 * 60 * 1000)
        });
        await sendOtpEmail(email, otp);
    },

    /**
     * Verify OTP and login
     */
    loginOtpVerify: async (email, otp) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        if (!user.otp_code || user.otp_code !== String(otp) || Date.now() > user.otp_expires_at) {
            // Optional: clear OTP if expired
            if (user.otp_expires_at && Date.now() > user.otp_expires_at) {
                await UserModel.updateById(user.$id || user.id, { otp_code: '', otp_expires_at: null });
            }
            const err = new Error('Invalid or expired OTP.');
            err.statusCode = 400;
            throw err;
        }

        // Clear the OTP
        await UserModel.updateById(user.$id || user.id, {
            otp_code: '',
            otp_expires_at: null
        });

        const token = AuthService._generateToken(user);
        return {
            token,
            type: user.role,
            user: AuthService._sanitizeUser(user),
        };
    },

    // ─── INTERNAL HELPERS ─────────────────────────────────

    _generateToken: (user) => {
        return jwt.sign(
            { id: user.id || user.$id, email: user.email, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
    },

    _sanitizeUser: (user) => ({
        id: user.id || user.$id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        mobile_number: user.mobile_number,
        role: user.role,
    }),
};

module.exports = AuthService;
