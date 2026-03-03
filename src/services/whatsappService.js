const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = require('baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const baileysLogger = pino({ level: 'silent' });

// Store active sessions: { [userId]: { socket, phone, status, ... } }
const sessions = {};

// Auth sessions folder
const AUTH_DIR = path.join(__dirname, '../../wa_sessions');
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

// Session metadata file (persists userId→phone mapping for restore)
const META_FILE = path.join(AUTH_DIR, '_sessions.json');

/**
 * Normalize phone — always returns 91XXXXXXXXXX
 */
const normalizePhone = (phone) => {
    let num = String(phone).replace(/[^0-9]/g, '');
    if (!num.startsWith('91')) num = '91' + num;
    return num;
};

/**
 * Save session metadata to disk for restore on restart
 */
function saveSessionMeta() {
    const meta = {};
    for (const [userId, sess] of Object.entries(sessions)) {
        meta[userId] = { phone: sess.phone };
    }
    try {
        fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
    } catch (e) {
        console.error('Failed to save session meta:', e.message);
    }
}

/**
 * Read session metadata from disk
 */
function loadSessionMeta() {
    try {
        if (fs.existsSync(META_FILE)) {
            return JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Failed to load session meta:', e.message);
    }
    return {};
}

/**
 * Start a Baileys socket for a userId and keep it alive.
 * This function runs the socket persistently — it does NOT block.
 * @param pairingTimeoutMs - Max time allowed to complete pairing before dropping socket
 */
async function startSocket(userId, normalizedPhone, pairingTimeoutMs = null) {
    const sessionDir = path.join(AUTH_DIR, userId);
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`📱 Starting WhatsApp socket for user ${userId} (v${version.join('.')})`);

    const socket = makeWASocket({
        version,
        logger: baileysLogger,
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        retryRequestDelayMs: 5000,
    });

    // Ensure session entry exists
    if (!sessions[userId]) {
        sessions[userId] = {
            socket: null,
            phone: normalizedPhone,
            status: 'connecting',
            qr: null,
            pairingCode: null,
            qrCount: 0,
        };
    }
    sessions[userId].socket = socket;
    sessions[userId].status = 'connecting';

    // Save creds whenever they update (critical for pairing to persist!)
    socket.ev.on('creds.update', saveCreds);

    let pairingTimer = null;
    if (pairingTimeoutMs) {
        pairingTimer = setTimeout(() => {
            if (sessions[userId] && sessions[userId].status !== 'connected') {
                console.log(`⏳ Pairing timeout reached (${pairingTimeoutMs}ms) for ${userId}. Dismantling session.`);
                sessions[userId].status = 'disconnected';
                sessions[userId].reconnectEnabled = false; // Stop auto-reconnecting
                try { socket.end(undefined); } catch (e) { }
                const sessionDir = path.join(AUTH_DIR, userId);
                if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
                delete sessions[userId];
                saveSessionMeta();
            }
        }, pairingTimeoutMs);
    }

    // Connection lifecycle handler
    socket.ev.on('connection.update', async (update) => {
        if (!sessions[userId]) return; // Prevent crashes if session was already destroyed
        const { connection, lastDisconnect, qr } = update;

        // ── QR received ──
        if (qr) {
            sessions[userId].qrCount++;
            console.log(`📱 QR code generated for user ${userId} (${sessions[userId].qrCount}/2)`);
            if (sessions[userId].qrCount > 2) {
                console.log(`❌ QR limit reached for user ${userId}`);
                sessions[userId].status = 'failed';
                try { socket.end(undefined); } catch (e) { }
                return;
            }
            try {
                sessions[userId].qr = await QRCode.toDataURL(qr);
                sessions[userId].status = 'qr_ready';
            } catch (e) { }
        }

        // ── Connected! ──
        if (connection === 'open') {
            if (pairingTimer) clearTimeout(pairingTimer);
            sessions[userId].status = 'connected';
            sessions[userId].qrCount = 0;
            sessions[userId].qr = null;
            sessions[userId].reconnectEnabled = true;
            saveSessionMeta();
            console.log(`✅ WhatsApp CONNECTED for user: ${userId} (${normalizedPhone})`);
        }

        // ── Disconnected ──
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && sessions[userId]?.reconnectEnabled !== false;

            console.log(`⚠️ WhatsApp disconnected for user ${userId}. Code: ${statusCode}. Reconnect: ${shouldReconnect}`);

            if (shouldReconnect) {
                // Auto-reconnect — keeps the session alive during pairing & after
                sessions[userId].status = 'reconnecting';
                console.log(`🔄 Reconnecting in 3s for user ${userId}...`);
                await delay(3000);
                try {
                    // Retain pairing timer constraint across reconnects
                    await startSocket(userId, normalizedPhone, pairingTimeoutMs);
                } catch (e) {
                    console.error(`❌ Reconnect failed for ${userId}:`, e.message);
                    sessions[userId].status = 'disconnected';
                }
            } else {
                // Logged out — clean everything
                console.log(`🚪 User ${userId} logged out. Cleaning session.`);
                sessions[userId].status = 'disconnected';
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                }
                delete sessions[userId];
                saveSessionMeta();
            }
        }
    });

    return socket;
}

// ─── PUBLIC API ────────────────────────────────────────────

const WhatsAppService = {
    /**
     * Connect WhatsApp via OTP (pairing code) or QR
     */
    connect: async (userId, phoneNumber, type) => {
        const normalizedPhone = normalizePhone(phoneNumber);

        // Check if number is already used by ANOTHER user
        const meta = loadSessionMeta();
        for (const [uid, sess] of Object.entries(meta)) {
            if (uid !== userId && sess.phone === normalizedPhone) {
                const err = new Error('This WhatsApp number is already connected to another account.');
                err.statusCode = 400;
                throw err;
            }
        }
        for (const [uid, sess] of Object.entries(sessions)) {
            if (uid !== userId && sess.phone === normalizedPhone) {
                const err = new Error('This WhatsApp number is already connected to another account.');
                err.statusCode = 400;
                throw err;
            }
        }

        // Already connected?
        if (sessions[userId] && sessions[userId].status === 'connected') {
            return { status: 'connected', phone: normalizedPhone, message: 'WhatsApp is already connected.' };
        }

        // Kill any existing session for this user
        if (sessions[userId] && sessions[userId].socket) {
            try { sessions[userId].socket.end(undefined); } catch (e) { }
            delete sessions[userId];
        }

        // Clean old auth files for fresh pairing
        const sessionDir = path.join(AUTH_DIR, userId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }

        // Start the persistent socket (90 seconds = 90000ms max allowed for pairing)
        const socket = await startSocket(userId, normalizedPhone, 90000);
        saveSessionMeta();

        // ─── QR CODE FLOW ──────────────────────────────
        if (type === 'qr') {
            return new Promise((resolve) => {
                let resolved = false;
                const timeout = setTimeout(() => {
                    if (!resolved) { resolved = true; resolve({ status: 'timeout', phone: normalizedPhone, message: 'QR code timed out. Try again.' }); }
                }, 30000);

                // Poll for QR to appear
                const checker = setInterval(() => {
                    if (resolved) { clearInterval(checker); return; }
                    const sess = sessions[userId];
                    if (sess && sess.qr) {
                        clearInterval(checker); clearTimeout(timeout); resolved = true;
                        resolve({ status: 'qr_ready', phone: normalizedPhone, qr_code: sess.qr, message: 'Scan this QR code with your WhatsApp app.' });
                    }
                    if (sess && sess.status === 'connected') {
                        clearInterval(checker); clearTimeout(timeout); resolved = true;
                        resolve({ status: 'connected', phone: normalizedPhone, message: 'WhatsApp connected!' });
                    }
                }, 500);
            });
        }

        // ─── OTP (PAIRING CODE) FLOW ───────────────────
        if (type === 'otp') {
            await delay(3000); // wait for socket to stabilize

            try {
                if (socket.authState.creds.registered) {
                    return { status: 'connected', phone: normalizedPhone, message: 'Session restored. Already connected.' };
                }

                console.log(`📱 Requesting pairing code for ${normalizedPhone}...`);
                const code = await socket.requestPairingCode(normalizedPhone);
                sessions[userId].pairingCode = code;
                sessions[userId].status = 'waiting_for_pairing';

                return {
                    status: 'pairing_code',
                    phone: normalizedPhone,
                    pairing_code: code,
                    message: `Enter code ${code} in WhatsApp > Linked Devices > Link with phone number.`,
                };
            } catch (err) {
                console.error('❌ Pairing code error:', err.message);
                return { status: 'error', phone: normalizedPhone, message: 'Failed to get pairing code: ' + err.message };
            }
        }

        return { status: 'error', message: 'Invalid type. Use "otp" or "qr".' };
    },

    /**
     * Get session status
     */
    getStatus: (userId) => {
        const session = sessions[userId];
        if (!session) return { status: 'not_connected', message: 'No WhatsApp session found.' };
        return {
            status: session.status,
            phone: session.phone,
            pairing_code: session.pairingCode || undefined,
            message: session.status === 'connected' ? 'WhatsApp is connected.' : `Status: ${session.status}`,
        };
    },

    /**
     * Disconnect and clear session
     */
    disconnect: async (userId) => {
        const session = sessions[userId];
        if (!session) { const err = new Error('No active WhatsApp session.'); err.statusCode = 404; throw err; }
        try { session.socket.end(undefined); } catch (e) { }
        const sessionDir = path.join(AUTH_DIR, userId);
        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
        delete sessions[userId];
        saveSessionMeta();
        return { status: 'disconnected', message: 'WhatsApp disconnected and session cleared.' };
    },

    /**
     * Send a text or image message
     */
    sendMessage: async (userId, toPhone, message, file = null) => {
        const session = sessions[userId];
        if (!session || session.status !== 'connected') {
            const err = new Error('Please connect your WhatsApp number from the profile section.');
            err.statusCode = 400;
            throw err;
        }

        const jid = normalizePhone(toPhone) + '@s.whatsapp.net';

        let content;
        if (file) {
            content = {
                image: file.buffer,
                caption: message || undefined
            };
        } else {
            content = { text: message };
        }

        await session.socket.sendMessage(jid, content);
        return { to: normalizePhone(toPhone), message, has_image: !!file, status: 'sent' };
    },

    /**
     * Get all currently connected WhatsApp sessions
     */
    getActiveSessions: () => {
        const active = [];
        for (const [userId, session] of Object.entries(sessions)) {
            if (session.status === 'connected') {
                active.push({ userId, phone: session.phone });
            }
        }
        return active;
    },

    /**
     * Restore all saved sessions on server startup
     */
    restoreSessions: async () => {
        const meta = loadSessionMeta();
        const userIds = Object.keys(meta);

        if (userIds.length === 0) {
            console.log('📱 No WhatsApp sessions to restore.');
            return;
        }

        console.log(`📱 Restoring ${userIds.length} WhatsApp session(s)...`);

        for (const userId of userIds) {
            const sessionDir = path.join(AUTH_DIR, userId);
            if (!fs.existsSync(sessionDir)) {
                console.log(`   ⏭️  Skipping ${userId} — no auth files on disk.`);
                continue;
            }

            try {
                console.log(`   🔄 Restoring session for user ${userId} (${meta[userId].phone})...`);
                await startSocket(userId, meta[userId].phone);
            } catch (e) {
                console.error(`   ❌ Failed to restore ${userId}: ${e.message}`);
            }
        }
    },
};

module.exports = WhatsAppService;
