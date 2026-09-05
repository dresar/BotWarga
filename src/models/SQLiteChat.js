/**
 * Model untuk mengelola chat memory, complaints, dan village info menggunakan SQLite
 */

class SQLiteChat {
  constructor(db) {
    this.db = db;
  }

  // === CHAT MEMORY ===
  
  // Mendapatkan semua chat memory
  getAllChatMemory() {
    try {
      const stmt = this.db.prepare('SELECT * FROM chat_memory ORDER BY last_updated DESC');
      return stmt.all();
    } catch (error) {
      console.error('Error getting all chat memory:', error.message);
      throw error;
    }
  }

  // Mendapatkan chat memory berdasarkan user ID
  getChatMemoryByUserId(userId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM chat_memory WHERE user_id = ? ORDER BY last_updated DESC');
      return stmt.all(userId);
    } catch (error) {
      console.error('Error getting chat memory by user ID:', error.message);
      throw error;
    }
  }

  // Menambahkan chat memory baru
  addChatMemory(chatMemory) {
    try {
      const stmt = this.db.prepare(
        'INSERT INTO chat_memory (user_id, context) VALUES (?, ?)'
      );
      const result = stmt.run(
        chatMemory.user_id,
        chatMemory.context || JSON.stringify({})
      );
      return { id: result.lastInsertRowid, ...chatMemory };
    } catch (error) {
      console.error('Error adding chat memory:', error.message);
      throw error;
    }
  }
  
  // Membersihkan chat memory yang tidak aktif
  cleanupInactiveMemory(hours = 24) {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - hours);
      
      const stmt = this.db.prepare('DELETE FROM chat_memory WHERE last_updated < ?');
      const result = stmt.run(cutoffTime.toISOString());
      
      return { deleted: result.changes };
    } catch (error) {
      console.error('Error cleaning up inactive memory:', error.message);
      throw error;
    }
  }

  // Menghapus chat memory berdasarkan user ID
  deleteChatMemoryByUserId(userId) {
    try {
      const stmt = this.db.prepare('DELETE FROM chat_memory WHERE user_id = ?');
      stmt.run(userId);
      return { user_id: userId };
    } catch (error) {
      console.error('Error deleting chat memory by user ID:', error.message);
      throw error;
    }
  }

  // === COMPLAINTS ===
  
  // Mendapatkan semua keluhan
  getAllComplaints() {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM complaints ORDER BY created_at DESC'
      );
      return stmt.all();
    } catch (error) {
      console.error('Error getting all complaints:', error.message);
      throw error;
    }
  }

  // Mendapatkan keluhan berdasarkan ID
  getComplaintById(id) {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM complaints WHERE id = ?'
      );
      return stmt.get(id);
    } catch (error) {
      console.error('Error getting complaint by ID:', error.message);
      throw error;
    }
  }

  // Mendapatkan keluhan berdasarkan user ID
  getComplaintsByUserId(userId) {
    try {
      const stmt = this.db.prepare(
        'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC'
      );
      return stmt.all(userId);
    } catch (error) {
      console.error('Error getting complaints by user ID:', error.message);
      throw error;
    }
  }

  // Menambahkan keluhan baru
  addComplaint(complaint) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO complaints (
          reporter_name, reporter_address, description, photo_path, status, phone_number
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(
        complaint.reporter_name,
        complaint.reporter_address,
        complaint.description,
        complaint.photo_path || null,
        complaint.status || 'pending',
        complaint.phone_number || null
      );
      return { id: result.lastInsertRowid, ...complaint };
    } catch (error) {
      console.error('Error adding complaint:', error.message);
      throw error;
    }
  }

  // Mengupdate keluhan
  updateComplaint(id, complaint) {
    try {
      const stmt = this.db.prepare(
        'UPDATE complaints SET title = ?, description = ?, status = ? WHERE id = ?'
      );
      stmt.run(
        complaint.title,
        complaint.description,
        complaint.status || 'pending',
        id
      );
      return { id, ...complaint };
    } catch (error) {
      console.error('Error updating complaint:', error.message);
      throw error;
    }
  }

  // Mengupdate status keluhan
  updateComplaintStatus(id, status) {
    try {
      const stmt = this.db.prepare(
        'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      );
      stmt.run(status, id);
      return { id, status };
    } catch (error) {
      console.error('Error updating complaint status:', error.message);
      throw error;
    }
  }

  // Menghapus keluhan
  deleteComplaint(id) {
    try {
      const stmt = this.db.prepare('DELETE FROM complaints WHERE id = ?');
      stmt.run(id);
      return { id };
    } catch (error) {
      console.error('Error deleting complaint:', error.message);
      throw error;
    }
  }

  // === VILLAGE INFO ===
  
  // Mendapatkan informasi desa
  getVillageInfo() {
    try {
      const stmt = this.db.prepare('SELECT * FROM village_info LIMIT 1');
      return stmt.get();
    } catch (error) {
      console.error('Error getting village info:', error.message);
      throw error;
    }
  }

  // Mengupdate atau menambahkan informasi desa
  updateVillageInfo(info) {
    try {
      // Cek apakah sudah ada data
      const existingInfo = this.getVillageInfo();
      
      if (existingInfo) {
        // Update jika sudah ada
        const stmt = this.db.prepare(
          'UPDATE village_info SET name = ?, address = ?, phone = ?, email = ?, website = ?, ' +
          'description = ?, head_name = ?, head_photo = ?, logo = ?, last_updated = CURRENT_TIMESTAMP'
        );
        stmt.run(
          info.name,
          info.address,
          info.phone,
          info.email,
          info.website,
          info.description,
          info.head_name,
          info.head_photo,
          info.logo
        );
        return { id: existingInfo.id, ...info };
      } else {
        // Insert jika belum ada
        const stmt = this.db.prepare(
          'INSERT INTO village_info (name, address, phone, email, website, description, head_name, head_photo, logo) ' +
          'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        const result = stmt.run(
          info.name,
          info.address,
          info.phone,
          info.email,
          info.website,
          info.description,
          info.head_name,
          info.head_photo,
          info.logo
        );
        return { id: result.lastInsertRowid, ...info };
      }
    } catch (error) {
      console.error('Error updating village info:', error.message);
      throw error;
    }
  }

  // Method untuk statistik pengaduan
  getTotalComplaints() {
    try {
      const stmt = this.db.prepare('SELECT COUNT(*) as total FROM complaints');
      const result = stmt.get();
      return result.total;
    } catch (error) {
      console.error('Error getting total complaints:', error.message);
      return 0;
    }
  }

  getComplaintsThisMonth() {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as total FROM complaints 
        WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      `);
      const result = stmt.get();
      return result.total;
    } catch (error) {
      console.error('Error getting complaints this month:', error.message);
      return 0;
    }
  }

  getComplaintsToday() {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as total FROM complaints 
        WHERE date(created_at) = date('now')
      `);
      const result = stmt.get();
      return result.total;
    } catch (error) {
      console.error('Error getting complaints today:', error.message);
      return 0;
    }
  }
}

module.exports = SQLiteChat;