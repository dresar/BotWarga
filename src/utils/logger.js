/**
 * logger.js - Sistem logging untuk bot WhatsApp
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Pastikan direktori logs ada
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Format log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Konfigurasi logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'whatsapp-bot' },
  transports: [
    // Log error ke file terpisah
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Log semua level ke file combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // Log ke konsol saat development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  // Jangan berhenti saat error
  exitOnError: false
});

/**
 * Log pesan info
 * @param {string} message - Pesan log
 * @param {object} meta - Metadata tambahan
 */
const info = (message, meta = {}) => {
  logger.info(message, meta);
};

/**
 * Log pesan error
 * @param {string} message - Pesan log
 * @param {Error|object} error - Error object atau metadata
 */
const error = (message, error = {}) => {
  if (error instanceof Error) {
    logger.error(`${message}: ${error.message}`, { stack: error.stack });
  } else {
    logger.error(message, error);
  }
};

/**
 * Log pesan warning
 * @param {string} message - Pesan log
 * @param {object} meta - Metadata tambahan
 */
const warn = (message, meta = {}) => {
  logger.warn(message, meta);
};

/**
 * Log pesan debug
 * @param {string} message - Pesan log
 * @param {object} meta - Metadata tambahan
 */
const debug = (message, meta = {}) => {
  logger.debug(message, meta);
};

/**
 * Log interaksi pengguna
 * @param {string} userId - ID pengguna
 * @param {string} userMessage - Pesan dari pengguna
 * @param {string} botResponse - Respons dari bot
 */
const logInteraction = (userId, userMessage, botResponse) => {
  logger.info('User interaction', {
    userId,
    userMessage: userMessage.substring(0, 100), // Batasi panjang untuk log
    botResponse: botResponse.substring(0, 100), // Batasi panjang untuk log
    timestamp: new Date().toISOString()
  });
};

/**
 * Log error WhatsApp
 * @param {string} context - Konteks error
 * @param {Error} error - Error object
 */
const logWhatsAppError = (context, error) => {
  logger.error(`WhatsApp Error [${context}]: ${error.message}`, {
    stack: error.stack,
    context
  });
};

/**
 * Log performa
 * @param {string} operation - Nama operasi
 * @param {number} duration - Durasi dalam ms
 * @param {object} meta - Metadata tambahan
 */
const logPerformance = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation} took ${duration}ms`, {
    operation,
    duration,
    ...meta
  });
};

module.exports = {
  info,
  error,
  warn,
  debug,
  logInteraction,
  logWhatsAppError,
  logPerformance
};