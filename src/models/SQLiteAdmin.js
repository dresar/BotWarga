/**
 * Model untuk mengelola admin menggunakan SQLite
 */

const bcrypt = require('bcrypt');

class SQLiteAdmin {
  constructor(db) {
    this.db = db;
  }

  // Mendapatkan semua admin
  getAllAdmins() {
    try {
      const stmt = this.db.prepare(
        'SELECT id, username, phone_number, role, is_active, created_at, last_login FROM admins'
      );
      return stmt.all();
    } catch (error) {
      console.error('Error getting all admins:', error.message);
      throw error;
    }
  }

  // Mendapatkan admin berdasarkan ID
  getAdminById(id) {
    try {
      const stmt = this.db.prepare(
        'SELECT id, username, phone_number, role, is_active, created_at, last_login FROM admins WHERE id = ?'
      );
      return stmt.get(id);
    } catch (error) {
      console.error('Error getting admin by id:', error.message);
      throw error;
    }
  }

  // Mendapatkan admin berdasarkan username
  getAdminByUsername(username) {
    try {
      const stmt = this.db.prepare('SELECT * FROM admins WHERE username = ?');
      return stmt.get(username);
    } catch (error) {
      console.error('Error getting admin by username:', error.message);
      throw error;
    }
  }


  
  // Mendapatkan admin berdasarkan nomor telepon
  getAdminByPhoneNumber(phoneNumber) {
    try {
      const stmt = this.db.prepare('SELECT * FROM admins WHERE phone_number = ?');
      return stmt.get(phoneNumber);
    } catch (error) {
      console.error('Error getting admin by phone number:', error.message);
      throw error;
    }
  }

  // Menambahkan admin baru
  async addAdmin(admin) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      
      const stmt = this.db.prepare(
        'INSERT INTO admins (username, password, phone_number, role, is_active) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(
        admin.username,
        hashedPassword,
        admin.phone_number,
        admin.role || 'editor',
        admin.is_active !== undefined ? admin.is_active : 1
      );
      
      // Return admin tanpa password
      const { password, ...adminWithoutPassword } = admin;
      return { id: result.lastInsertRowid, ...adminWithoutPassword };
    } catch (error) {
      console.error('Error adding admin:', error.message);
      throw error;
    }
  }

  // Mengupdate admin
  async updateAdmin(id, admin) {
    try {
      let query = 'UPDATE admins SET username = ?, phone_number = ?, role = ?, is_active = ?';
      let params = [admin.username, admin.phone_number, admin.role, admin.is_active];
      
      // Jika password diubah, hash password baru
      if (admin.password) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        query += ', password = ?';
        params.push(hashedPassword);
      }
      
      query += ' WHERE id = ?';
      params.push(id);
      
      const stmt = this.db.prepare(query);
      stmt.run(...params);
      
      // Return admin tanpa password
      const { password, ...adminWithoutPassword } = admin;
      return { id, ...adminWithoutPassword };
    } catch (error) {
      console.error('Error updating admin:', error.message);
      throw error;
    }
  }

  // Menghapus admin
  deleteAdmin(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM admins WHERE id = ?');
      stmt.run(id);
      return { id };
    } catch (error) {
      console.error('Error deleting admin:', error.message);
      throw error;
    }
  }

  // Verifikasi login admin
  async verifyLogin(username, password) {
    try {
      // Dapatkan admin berdasarkan username
      const admin = this.getAdminByUsername(username);
      
      if (!admin) {
        return null; // Admin tidak ditemukan
      }
      
      // Verifikasi password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      
      if (!isPasswordValid) {
        return null; // Password salah
      }
      
      // Update last_login
      const updateStmt = this.db.prepare(
        'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
      );
      updateStmt.run(admin.id);
      
      // Return admin tanpa password
      const { password: _, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    } catch (error) {
      console.error('Error verifying login:', error.message);
      throw error;
    }
  }

  // Verifikasi password admin (alias untuk verifyLogin)
  async verifyPassword(username, password) {
    return await this.verifyLogin(username, password);
  }
}

module.exports = SQLiteAdmin;