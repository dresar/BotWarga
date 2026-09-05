/**
 * Skema database SQLite untuk menyimpan konten menu dalam format JSON
 */

const initMenuContentTables = (db) => {
  try {
    // Tabel menu_contents untuk menyimpan konten menu dalam format JSON
    db.exec(`
      CREATE TABLE IF NOT EXISTS menu_contents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_id INTEGER NOT NULL,
        sub_menu_id INTEGER NOT NULL,
        content_json TEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_id) REFERENCES menus(id),
        FOREIGN KEY (sub_menu_id) REFERENCES sub_menus(id),
        UNIQUE (menu_id, sub_menu_id)
      )
    `);

    // Tabel admin untuk mengelola pengguna admin
    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        phone_number TEXT NOT NULL UNIQUE,
        role TEXT DEFAULT 'editor',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    
    // Indeks untuk admin
    db.exec(`CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_admins_phone ON admins(phone_number)`);

    // Tabel menu_edit_history untuk melacak perubahan konten menu
    db.exec(`
      CREATE TABLE IF NOT EXISTS menu_edit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_content_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        previous_content TEXT,
        new_content TEXT NOT NULL,
        edit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_content_id) REFERENCES menu_contents(id),
        FOREIGN KEY (admin_id) REFERENCES admins(id)
      )
    `);

    console.log('Menu content tables initialized successfully');
  } catch (error) {
    console.error('Error initializing menu content tables:', error.message);
    throw error;
  }
};

module.exports = {
  initMenuContentTables
};