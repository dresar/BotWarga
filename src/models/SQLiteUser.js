/**
 * Model untuk mengelola data pengguna dan limit harian
 * Dibuat oleh anak UMSU
 */

class SQLiteUser {
  constructor(db) {
    this.db = db;
  }

  // Mendapatkan atau membuat pengguna baru
  getOrCreateUser(phoneNumber) {
    try {
      // Cek apakah user sudah ada
      const existingUser = this.db.prepare(`
        SELECT * FROM users WHERE phone_number = ?
      `).get(phoneNumber);

      if (existingUser) {
        // Update last_activity dan total_interactions
        this.db.prepare(`
          UPDATE users 
          SET last_activity = CURRENT_TIMESTAMP, 
              total_interactions = total_interactions + 1
          WHERE phone_number = ?
        `).run(phoneNumber);
        
        return existingUser;
      }

      // Buat user baru
      const result = this.db.prepare(`
        INSERT INTO users (phone_number, is_new_user, total_interactions)
        VALUES (?, 1, 1)
      `).run(phoneNumber);

      return this.db.prepare(`
        SELECT * FROM users WHERE id = ?
      `).get(result.lastInsertRowid);
    } catch (error) {
      console.error('Error in getOrCreateUser:', error.message);
      throw error;
    }
  }

  // Menandai user sebagai bukan user baru lagi
  markUserAsExisting(phoneNumber) {
    try {
      this.db.prepare(`
        UPDATE users SET is_new_user = 0 WHERE phone_number = ?
      `).run(phoneNumber);
    } catch (error) {
      console.error('Error in markUserAsExisting:', error.message);
      throw error;
    }
  }

  // Cek dan update limit harian
  checkDailyLimit(phoneNumber, maxLimit = 50, isAdmin = false) {
    try {
      // Admin memiliki akses tak terbatas
      if (isAdmin) {
        return { withinLimit: true, count: 0, remaining: 'unlimited', isAdmin: true };
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Cek limit hari ini
      const dailyLimit = this.db.prepare(`
        SELECT * FROM daily_limits 
        WHERE user_id = ? AND date = ?
      `).get(phoneNumber, today);

      if (!dailyLimit) {
        // Buat record baru untuk hari ini
        this.db.prepare(`
          INSERT INTO daily_limits (user_id, date, interaction_count)
          VALUES (?, ?, 1)
        `).run(phoneNumber, today);
        
        return { withinLimit: true, count: 1, remaining: maxLimit - 1 };
      }

      // Update count
      const newCount = dailyLimit.interaction_count + 1;
      const withinLimit = newCount <= maxLimit;
      
      this.db.prepare(`
        UPDATE daily_limits 
        SET interaction_count = ?, limit_reached = ?
        WHERE user_id = ? AND date = ?
      `).run(newCount, withinLimit ? 0 : 1, phoneNumber, today);

      return {
        withinLimit,
        count: newCount,
        remaining: Math.max(0, maxLimit - newCount)
      };
    } catch (error) {
      console.error('Error in checkDailyLimit:', error.message);
      throw error;
    }
  }

  // Mendapatkan statistik pengguna
  getUserStats(phoneNumber) {
    try {
      const user = this.db.prepare(`
        SELECT * FROM users WHERE phone_number = ?
      `).get(phoneNumber);

      if (!user) return null;

      const today = new Date().toISOString().split('T')[0];
      const dailyLimit = this.db.prepare(`
        SELECT * FROM daily_limits 
        WHERE user_id = ? AND date = ?
      `).get(phoneNumber, today);

      return {
        user,
        dailyUsage: dailyLimit ? dailyLimit.interaction_count : 0,
        isNewUser: user.is_new_user === 1
      };
    } catch (error) {
      console.error('Error in getUserStats:', error.message);
      throw error;
    }
  }

  // Reset semua user menjadi new user (untuk testing)
  resetAllUsersAsNew() {
    try {
      this.db.prepare(`
        UPDATE users SET is_new_user = 1
      `).run();
    } catch (error) {
      console.error('Error in resetAllUsersAsNew:', error.message);
      throw error;
    }
  }
}

module.exports = SQLiteUser;