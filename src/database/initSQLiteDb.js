/**
 * Inisialisasi database SQLite dan data default
 */

const { connectSQLite } = require('../config/sqlite');
const { initMenuContentTables } = require('./menuContentSQLiteSchema');

// Inisialisasi koneksi database
const initSQLiteDatabase = () => {
  try {
    const db = connectSQLite();
    console.log('Connected to SQLite database');
    return db;
  } catch (error) {
    console.error('Error connecting to SQLite database:', error.message);
    throw error;
  }
};

// Inisialisasi tabel-tabel database
const initTables = (db) => {
  try {
    // Tabel menus
    db.exec(`
      CREATE TABLE IF NOT EXISTS menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        order_num INTEGER NOT NULL,
        access_level TEXT DEFAULT 'public',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel sub_menus
    db.exec(`
      CREATE TABLE IF NOT EXISTS sub_menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        order_num INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_id) REFERENCES menus(id)
      )
    `);

    // Tabel chat_memory
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        context TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Indeks untuk chat_memory
    db.exec(`CREATE INDEX IF NOT EXISTS idx_chat_memory_user_id ON chat_memory(user_id)`);

    // Tabel users untuk tracking pengguna
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT UNIQUE NOT NULL,
        name TEXT,
        is_new_user INTEGER DEFAULT 1,
        first_visit_date DATE DEFAULT CURRENT_DATE,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        total_interactions INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel daily_limits untuk tracking limit harian
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_limits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date DATE DEFAULT CURRENT_DATE,
        interaction_count INTEGER DEFAULT 0,
        limit_reached INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date)
      )
    `);
    
    // Indeks untuk daily_limits
    db.exec(`CREATE INDEX IF NOT EXISTS idx_daily_limits_user_date ON daily_limits(user_id, date)`);

    // Tabel complaints
    db.exec(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_name TEXT NOT NULL,
        reporter_address TEXT NOT NULL,
        description TEXT NOT NULL,
        photo_path TEXT,
        status TEXT DEFAULT 'pending',
        ml_category TEXT,
        ml_priority TEXT DEFAULT 'medium',
        ml_sentiment TEXT DEFAULT 'neutral',
        ml_confidence REAL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Tabel village_info
    db.exec(`
      CREATE TABLE IF NOT EXISTS village_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        image_path TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabel UMKM
    db.exec(`
      CREATE TABLE IF NOT EXISTS umkm (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        deskripsi TEXT,
        kategori TEXT NOT NULL,
        alamat TEXT,
        kontak_telepon TEXT,
        kontak_whatsapp TEXT,
        kontak_email TEXT,
        jam_operasional TEXT,
        website TEXT,
        media_sosial TEXT,
        latitude REAL,
        longitude REAL,
        foto_path TEXT,
        status TEXT DEFAULT 'aktif',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indeks untuk tabel UMKM
    db.exec(`CREATE INDEX IF NOT EXISTS idx_umkm_kategori ON umkm(kategori)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_umkm_status ON umkm(status)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_umkm_active ON umkm(is_active)`);

    // Inisialisasi tabel konten menu
    initMenuContentTables(db);

    console.log('All tables initialized successfully');
  } catch (error) {
    console.error('Error initializing tables:', error.message);
    throw error;
  }
};

// Inisialisasi database dan tabel
const initDatabaseAndTables = () => {
  const db = initSQLiteDatabase();
  initTables(db);
  return db;
};

module.exports = {
  initSQLiteDatabase,
  initTables,
  initDatabaseAndTables
};