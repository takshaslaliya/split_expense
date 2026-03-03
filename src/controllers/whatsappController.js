const WhatsAppService = require('../services/whatsappService');
const UserService = require('../services/userService');
const QRCode = require('qrcode');

// ─── CONNECT WHATSAPP ────────────────────────────────────
const connect = async (req, res) => {
    try {
        const { phone_number, type } = req.body;
        if (!phone_number) {
            return res.status(400).json({ success: false, message: 'phone_number is required.' });
        }
        if (!type || !['otp', 'qr'].includes(type)) {
            return res.status(400).json({ success: false, message: 'type is required. Must be "otp" or "qr".' });
        }

        const result = await WhatsAppService.connect(req.user.id, phone_number, type);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── GET STATUS ──────────────────────────────────────────
const getStatus = async (req, res) => {
    try {
        const result = WhatsAppService.getStatus(req.user.id);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── DISCONNECT ──────────────────────────────────────────
const disconnect = async (req, res) => {
    try {
        const result = await WhatsAppService.disconnect(req.user.id);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── SEND MESSAGE ────────────────────────────────────────
const sendMessage = async (req, res) => {
    try {
        const { phone_number, message } = req.body;
        const file = req.file;

        if (!phone_number) {
            return res.status(400).json({ success: false, message: 'phone_number is required.' });
        }

        if (!message && !file) {
            return res.status(400).json({ success: false, message: 'Either a message or an image is required.' });
        }

        const result = await WhatsAppService.sendMessage(req.user.id, phone_number, message || '', file);
        return res.status(200).json({ success: true, message: 'Message sent.', data: result });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

// ─── SEND PAYMENT REQUEST (BULK) ────────────────────────
const sendPaymentRequest = async (req, res) => {
    try {
        const { requests, message } = req.body;

        if (!requests || !Array.isArray(requests) || requests.length === 0 || !message) {
            return res.status(400).json({ success: false, message: 'A requests array and a base message are required.' });
        }

        // 1. Get sender's UPI ID and Name
        const sender = await UserService.getProfile(req.user.id);
        if (!sender.upi_id) {
            return res.status(400).json({ success: false, message: 'You must set a UPI ID in your profile before requesting payments.' });
        }

        const senderName = encodeURIComponent(sender.full_name || sender.username);

        // 2. Process all requests concurrently
        const sendPromises = requests.map(async (reqItem) => {
            const { phone_number, name, amount } = reqItem;
            if (!phone_number || !amount) return { phone_number, success: false, error: 'Missing phone_number or amount' };

            try {
                // Generate personal UPI URI and QR Code
                const upiUri = `upi://pay?pa=${sender.upi_id}&pn=${senderName}&am=${amount}&cu=INR`;
                const qrBuffer = await QRCode.toBuffer(upiUri);

                // Format Personal Message
                let formattedMessage = message;
                if (name) formattedMessage = formattedMessage.replace(/%name%/g, name);
                formattedMessage = formattedMessage.replace(/%amount%/g, amount);

                // Send Message via WhatsApp
                const fileObj = { buffer: qrBuffer, mimetype: 'image/png' };
                await WhatsAppService.sendMessage(req.user.id, phone_number, formattedMessage, fileObj);

                return { phone_number, success: true };
            } catch (err) {
                return { phone_number, success: false, error: err.message };
            }
        });

        const results = await Promise.all(sendPromises);

        return res.status(200).json({ success: true, message: 'Bulk payment requests processed.', data: results });
    } catch (error) {
        return res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
};

module.exports = { connect, getStatus, disconnect, sendMessage, sendPaymentRequest };
