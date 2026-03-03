const logger = require('./src/utils/logger'); // MUST BE AT THE VERY TOP to catch all logs
const express = require('express');
const cors = require('cors');
const ngrok = require('@ngrok/ngrok');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const whatsappRoutes = require('./src/routes/whatsappRoutes');
const achievementsRoutes = require('./src/routes/achievementsRoutes');
const WhatsAppService = require('./src/services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request/Response Logger
app.use((req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);

    // Log request
    console.log(`\n📥 ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
        const logBody = { ...req.body };
        if (logBody.password) logBody.password = '***';
        if (logBody.old_password) logBody.old_password = '***';
        if (logBody.new_password) logBody.new_password = '***';
        console.log('   Body:', JSON.stringify(logBody));
    }

    // Intercept response to log it
    res.json = (body) => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const icon = status < 400 ? '✅' : '❌';
        console.log(`${icon} ${status} (${duration}ms)`, JSON.stringify(body).substring(0, 300));
        return originalJson(body);
    };

    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/achievements', achievementsRoutes);

// Health check
app.get('/', (req, res) => {
    res.json({ success: true, message: 'Split Expense API is running thank you fro visting🚀' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server and expose via ngrok
app.listen(PORT, () => {
    console.log(`\n🚀 Split Expense API running on http://localhost:${PORT}`);
    console.log(`📋 Auth endpoints:   http://localhost:${PORT}/api/auth`);
    console.log(`📋 User endpoints:   http://localhost:${PORT}/api/user`);
    console.log(`📋 Admin endpoints:  http://localhost:${PORT}/api/admin`);
    console.log(`📋 Group endpoints:  http://localhost:${PORT}/api/groups`);
    console.log(`📋 WhatsApp endpoints: http://localhost:${PORT}/api/whatsapp\n`);

    // Restore WhatsApp sessions from previous runs
    WhatsAppService.restoreSessions().catch(err => {
        console.error('❌ WhatsApp session restore failed:', err.message);
    });

    // Connect ngrok
    ngrok.connect({ addr: PORT, authtoken: process.env.NGROK_AUTHTOKEN })
        .then((listener) => {
            console.log(`🌐 Ngrok tunnel established at: ${listener.url()}`);
            console.log(`📋 Public URL: ${listener.url()}\n`);
        })
        .catch((err) => {
            if (err.message.includes('already online') || err.message.includes('ERR_NGROK_334')) {
                console.log('🌐 Ngrok tunnel is already active on this port.');
            } else {
                console.error('❌ Ngrok connection failed:', err.message);
                console.log('Server is still running locally.\n');
            }
        });
});
