/**
 * Skema database untuk menyimpan konten menu dalam format JSON
 */

// Fungsi untuk membuat tabel menu_contents dan menu_edit_history
const initMenuContentTables = async (connection) => {
  try {
    console.log('Initializing menu content tables...');
    
    // Buat tabel menu_contents jika belum ada
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_contents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menu_id INT NOT NULL,
        sub_menu_id INT NOT NULL,
        content_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY menu_sub_menu_unique (menu_id, sub_menu_id),
        FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
        FOREIGN KEY (sub_menu_id) REFERENCES sub_menus(id) ON DELETE CASCADE
      )
    `);
    
    // Buat tabel menu_edit_history jika belum ada
    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_edit_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        menu_content_id INT NOT NULL,
        admin_id INT,
        content_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_content_id) REFERENCES menu_contents(id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
      )
    `);
    
    // Buat tabel admins jika belum ada
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        role ENUM('admin', 'editor') NOT NULL DEFAULT 'editor',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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