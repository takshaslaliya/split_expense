const fs = require('fs');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const transport = new winston.transports.DailyRotateFile({
    filename: 'server-%DATE%.log',
    dirname: logDir,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
    ),
    transports: [
        transport,
        new winston.transports.Console() // Keep console output for local dev
    ]
});

// Override console methods to capture all terminal logs (including imported libraries)
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

console.log = function (...args) {
    logger.info(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
    // originalLog.apply(console, args); // Transport console already handles this
};

console.error = function (...args) {
    logger.error(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
};

console.warn = function (...args) {
    logger.warn(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
};

console.info = function (...args) {
    logger.info(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
};

module.exports = logger;
