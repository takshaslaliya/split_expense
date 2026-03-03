// In-memory OTP store: email -> { otp, expiresAt }
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a random 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP for an email with expiry
 */
const storeOtp = (email, otp) => {
    otpStore.set(email.toLowerCase(), {
        otp,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
    });
};

/**
 * Verify OTP for an email
 * @returns {boolean} true if valid, false otherwise
 */
const verifyOtp = (email, otp) => {
    const entry = otpStore.get(email.toLowerCase());
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return false;
    }

    if (entry.otp !== otp) return false;

    // OTP used — remove it
    otpStore.delete(email.toLowerCase());
    return true;
};

module.exports = { generateOtp, storeOtp, verifyOtp };
