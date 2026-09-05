/**
 * Skema database untuk menyimpan konten menu dalam format JSON
 */

const initMenuContentTables = async (connection) => {
  try {
    // Tabel menu_contents untuk menyimpan konten menu dalam format JSON
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS menu_contents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        menu_id INT NOT NULL,
        sub_menu_id INT NOT NULL,
        content_json LONGTEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_id) REFERENCES menus(id),
        FOREIGN KEY (sub_menu_id) REFERENCES sub_menus(id),
        UNIQUE KEY menu_sub_menu_unique (menu_id, sub_menu_id)
      )
    `);

    // Tabel admin untuk mengelola pengguna admin
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL UNIQUE,
        role VARCHAR(50) DEFAULT 'editor',
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX (username),
        INDEX (phone_number)
      )
    `);

    // Tabel menu_edit_history untuk melacak perubahan konten menu
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS menu_edit_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        menu_content_id INT NOT NULL,
        admin_id INT NOT NULL,
        previous_content LONGTEXT,
        new_content LONGTEXT NOT NULL,
        edit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (menu_content_id) REFERENCES menu_contents(id),
        FOREIGN KEY (admin_id) REFERENCES admins(id)
      )
    `);

    console.log('Menu content tables created successfully');
    return true;
  } catch (error) {
    console.error('Error creating menu content tables:', error.message);
    throw error;
  }
};

module.exports = {
  initMenuContentTables
};