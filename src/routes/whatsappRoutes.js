const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const { connect, getStatus, disconnect, sendMessage, sendPaymentRequest } = require('../controllers/whatsappController');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// All WhatsApp routes require authentication
router.use(authMiddleware);

// POST /api/whatsapp/connect — Connect WhatsApp (otp or qr)
router.post('/connect', connect);

// GET /api/whatsapp/status — Check connection status
router.get('/status', getStatus);

// POST /api/whatsapp/disconnect — Disconnect session
router.post('/disconnect', disconnect);

// POST /api/whatsapp/send — Send a message (with optional image)
router.post('/send', upload.single('image'), sendMessage);

// POST /api/whatsapp/send-payment — Send payment request with QR
router.post('/send-payment', sendPaymentRequest);

module.exports = router;
