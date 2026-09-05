/**
 * Konfigurasi database untuk SQLite
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

// Pastikan direktori database ada
const dbDir = path.join(process.cwd(), 'database');
fs.ensureDirSync(dbDir);

// Path ke file database SQLite
const dbPath = path.join(dbDir, 'bot_layanan_warga.sqlite');

// Konfigurasi SQLite dengan opsi keamanan
const connectSQLite = () => {
  try {
    const db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null,
      fileMustExist: false, // Buat file jika belum ada
      timeout: 5000, // Timeout dalam ms
      readonly: false // Mode baca-tulis
    });
    
    // Aktifkan foreign keys untuk integritas referensial
    db.pragma('foreign_keys = ON');
    
    // Aktifkan WAL mode untuk performa dan konkurensi yang lebih baik
    db.pragma('journal_mode = WAL');
    
    // Aktifkan synchronous mode untuk keamanan data
    db.pragma('synchronous = NORMAL');
    
    console.log('SQLite connected successfully');
    return db;
  } catch (error) {
    console.error('SQLite connection error:', error.message);
    throw error;
  }
};

module.exports = {
  connectSQLite
};