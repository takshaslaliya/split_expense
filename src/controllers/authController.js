const AuthService = require('../services/authService');
const AchievementsService = require('../services/achievementsService');

// ─── SIGNUP ───────────────────────────────────────────────
const signup = async (req, res) => {
    try {
        const { mobile_number, email, username, full_name, password } = req.body;

        if (!mobile_number || !email || !username || !full_name || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: mobile_number, email, username, full_name, password',
            });
        }

        const newUser = await AuthService.signup({ mobile_number, email, username, full_name, password });

        return res.status(201).json({
            success: true,
            message: 'User registered successfully. OTP sent to your email for verification.',
            data: newUser,
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── VERIFY OTP ───────────────────────────────────────────
const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const data = await AuthService.verifyEmail(email, otp);

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully.',
            data,
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── RESEND OTP ───────────────────────────────────────────
const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        await AuthService.resendOtp(email);

        return res.status(200).json({ success: true, message: 'OTP resent to your email.' });
    } catch (error) {
        console.error('Resend OTP error:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── LOGIN ────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email_or_mobile, password } = req.body;
        if (!email_or_mobile || !password) {
            return res.status(400).json({ success: false, message: 'email_or_mobile and password are required.' });
        }

        const data = await AuthService.login(email_or_mobile, password);

        // Track app usage achievement on successful login
        const unlockedAchievements = await AchievementsService.trackAction(data.user.id, 'app_usage');
        if (unlockedAchievements.length > 0) {
            data.unlocked_achievements = unlockedAchievements;
        }

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data,
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── LOGIN OTP REQUEST ───────────────────────────────────
const loginOtpRequest = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        await AuthService.loginOtpRequest(email);

        return res.status(200).json({ success: true, message: 'OTP sent to your email for login.' });
    } catch (error) {
        console.error('Login OTP request error:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── LOGIN OTP VERIFY ────────────────────────────────────
const loginOtpVerify = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
        }

        const data = await AuthService.loginOtpVerify(email, otp);

        // Track app usage achievement on successful login
        const unlockedAchievements = await AchievementsService.trackAction(data.user.id, 'app_usage');
        if (unlockedAchievements.length > 0) {
            data.unlocked_achievements = unlockedAchievements;
        }

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            data,
        });
    } catch (error) {
        console.error('Login OTP verify error:', error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

module.exports = { signup, verifyEmailOtp, resendOtp, login, loginOtpRequest, loginOtpVerify };
