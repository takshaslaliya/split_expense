const express = require('express');
const router = express.Router();
const {
    signup,
    verifyEmailOtp,
    resendOtp,
    login,
    loginOtpRequest,
    loginOtpVerify,
} = require('../controllers/authController');

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyEmailOtp);

// POST /api/auth/resend-otp
router.post('/resend-otp', resendOtp);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/login-otp-request
router.post('/login-otp-request', loginOtpRequest);

// POST /api/auth/login-otp-verify
router.post('/login-otp-verify', loginOtpVerify);

module.exports = router;
