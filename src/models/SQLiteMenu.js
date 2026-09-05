/**
 * Model untuk mengelola menu dan sub-menu menggunakan SQLite
 */

class SQLiteMenu {
  constructor(db) {
    this.db = db;
  }

  // Mendapatkan semua menu
  getAllMenus() {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM menus ORDER BY order_num'
      );
      return stmt.all();
    } catch (error) {
      console.error('Error getting all menus:', error.message);
      throw error;
    }
  }

  // Mendapatkan menu berdasarkan ID
  getMenuById(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM menus WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      console.error('Error getting menu by id:', error.message);
      throw error;
    }
  }

  // Menambahkan menu baru
  addMenu(menu) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO menus (name, description, order_num, access_level, is_active) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        menu.name,
        menu.description || '',
        menu.order_num,
        menu.access_level || 'public',
        menu.is_active !== undefined ? menu.is_active : 1
      );
      return { id: result.lastInsertRowid, ...menu };
    } catch (error) {
      console.error('Error adding menu:', error.message);
      throw error;
    }
  }

  // Mengupdate menu
  updateMenu(id, menu) {
    try {
      const stmt = this.db.prepare(
        'UPDATE menus SET name = ?, description = ?, order_num = ?, access_level = ?, is_active = ? WHERE id = ?'
      );
      stmt.run(
        menu.name,
        menu.description || '',
        menu.order_num,
        menu.access_level || 'public',
        menu.is_active !== undefined ? menu.is_active : 1,
        id
      );
      return { id, ...menu };
    } catch (error) {
      console.error('Error updating menu:', error.message);
      throw error;
    }
  }

  // Menghapus menu
  deleteMenu(id) {
    try {
      // Hapus sub-menu terlebih dahulu
      const deleteSubMenusStmt = this.db.prepare('DELETE FROM sub_menus WHERE menu_id = ?');
      deleteSubMenusStmt.run(id);
      
      // Hapus menu
      const deleteMenuStmt = this.db.prepare('DELETE FROM menus WHERE id = ?');
      deleteMenuStmt.run(id);
      
      return { id };
    } catch (error) {
      console.error('Error deleting menu:', error.message);
      throw error;
    }
  }

  // Mendapatkan semua sub-menu untuk menu tertentu
  getSubMenusByMenuId(menuId) {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM sub_menus WHERE menu_id = ? ORDER BY order_num'
      );
      return stmt.all(menuId);
    } catch (error) {
      console.error('Error getting sub-menus by menu id:', error.message);
      throw error;
    }
  }

  // Mendapatkan sub-menu berdasarkan ID
  getSubMenuById(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM sub_menus WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      console.error('Error getting sub-menu by id:', error.message);
      throw error;
    }
  }

  // Menambahkan sub-menu baru
  addSubMenu(subMenu) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO sub_menus (menu_id, name, description, order_num, is_active) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        subMenu.menu_id,
        subMenu.name,
        subMenu.description || '',
        subMenu.order_num,
        subMenu.is_active !== undefined ? subMenu.is_active : 1
      );
      return { id: result.lastInsertRowid, ...subMenu };
    } catch (error) {
      console.error('Error adding sub-menu:', error.message);
      throw error;
    }
  }

  // Mengupdate sub-menu
  updateSubMenu(id, subMenu) {
    try {
      const stmt = this.db.prepare(
        'UPDATE sub_menus SET menu_id = ?, name = ?, description = ?, order_num = ?, is_active = ? WHERE id = ?'
      );
      stmt.run(
        subMenu.menu_id,
        subMenu.name,
        subMenu.description || '',
        subMenu.order_num,
        subMenu.is_active !== undefined ? subMenu.is_active : 1,
        id
      );
      return { id, ...subMenu };
    } catch (error) {
      console.error('Error updating sub-menu:', error.message);
      throw error;
    }
  }

  // Menghapus sub-menu
  deleteSubMenu(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM sub_menus WHERE id = ?');
      stmt.run(id);
      return { id };
    } catch (error) {
      console.error('Error deleting sub-menu:', error.message);
      throw error;
    }
  }

  // Mendapatkan struktur menu lengkap dengan sub-menu
  getMenuStructure() {
    try {
      const menus = this.getAllMenus();
      
      // Tambahkan sub-menu ke setiap menu
      for (const menu of menus) {
        menu.sub_menus = this.getSubMenusByMenuId(menu.id);
      }
      
      return menus;
    } catch (error) {
      console.error('Error getting menu structure:', error.message);
      throw error;
    }
  }
}

module.exports = SQLiteMenu;