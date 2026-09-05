/**
 * Model untuk mengelola konten menu dalam format JSON menggunakan SQLite
 */

class SQLiteMenuContent {
  constructor(db) {
    this.db = db;
  }

  // Mendapatkan konten menu berdasarkan menu_id dan sub_menu_id
  getMenuContent(menuId, subMenuId) {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM menu_contents WHERE menu_id = ? AND sub_menu_id = ?'
      );
      const row = stmt.get(menuId, subMenuId);
      return row || null;
    } catch (error) {
      console.error('Error getting menu content:', error.message);
      throw error;
    }
  }

  // Mendapatkan semua konten menu
  getAllMenuContents() {
    try {
      const stmt = this.db.prepare(
        'SELECT mc.*, m.name as menu_name, sm.name as sub_menu_name FROM menu_contents mc ' +
        'JOIN menus m ON mc.menu_id = m.id ' +
        'JOIN sub_menus sm ON mc.sub_menu_id = sm.id ' +
        'ORDER BY m.order_num, sm.order_num'
      );
      const rows = stmt.all();
      return rows;
    } catch (error) {
      console.error('Error getting all menu contents:', error.message);
      throw error;
    }
  }

  // Menambahkan konten menu baru
  addMenuContent(menuContent) {
    try {
      const { menu_id, sub_menu_id, content_json } = menuContent;
      
      // Konversi objek JSON ke string jika perlu
      const contentJsonStr = typeof content_json === 'object' ? 
        JSON.stringify(content_json) : content_json;
      
      // Cek apakah konten sudah ada
      const existingContent = this.getMenuContent(menu_id, sub_menu_id);
      
      if (existingContent) {
        // Update jika sudah ada
        const updateStmt = this.db.prepare(
          'UPDATE menu_contents SET content_json = ?, last_updated = CURRENT_TIMESTAMP ' +
          'WHERE menu_id = ? AND sub_menu_id = ?'
        );
        updateStmt.run(contentJsonStr, menu_id, sub_menu_id);
        return { id: existingContent.id, ...menuContent };
      } else {
        // Insert jika belum ada
        const insertStmt = this.db.prepare(
          'INSERT INTO menu_contents (menu_id, sub_menu_id, content_json) VALUES (?, ?, ?)'
        );
        const result = insertStmt.run(menu_id, sub_menu_id, contentJsonStr);
        return { id: result.lastInsertRowid, ...menuContent };
      }
    } catch (error) {
      console.error('Error adding menu content:', error.message);
      throw error;
    }
  }

  // Mengupdate konten menu
  updateMenuContent(id, menuContent, adminId = null) {
    try {
      // Dapatkan konten sebelumnya untuk history
      const getStmt = this.db.prepare('SELECT * FROM menu_contents WHERE id = ?');
      const prevContent = getStmt.get(id);
      
      if (!prevContent) {
        throw new Error(`Menu content with id ${id} not found`);
      }
      
      // Konversi objek JSON ke string jika perlu
      const contentJsonStr = typeof menuContent.content_json === 'object' ? 
        JSON.stringify(menuContent.content_json) : menuContent.content_json;
      
      // Update konten menu
      const updateStmt = this.db.prepare(
        'UPDATE menu_contents SET content_json = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?'
      );
      updateStmt.run(contentJsonStr, id);
      
      // Simpan history perubahan jika ada adminId
      if (adminId) {
        const historyStmt = this.db.prepare(
          'INSERT INTO menu_edit_history (menu_content_id, admin_id, previous_content, new_content) ' +
          'VALUES (?, ?, ?, ?)'
        );
        historyStmt.run(id, adminId, prevContent.content_json, contentJsonStr);
      }
      
      return { id, ...menuContent };
    } catch (error) {
      console.error('Error updating menu content:', error.message);
      throw error;
    }
  }

  // Mendapatkan history perubahan konten menu
  getMenuContentHistory(menuContentId) {
    try {
      const stmt = this.db.prepare(
        'SELECT h.*, a.username as admin_name FROM menu_edit_history h ' +
        'JOIN admins a ON h.admin_id = a.id ' +
        'WHERE h.menu_content_id = ? ' +
        'ORDER BY h.edit_timestamp DESC'
      );
      const rows = stmt.all(menuContentId);
      return rows;
    } catch (error) {
      console.error('Error getting menu content history:', error.message);
      throw error;
    }
  }
}

module.exports = SQLiteMenuContent;