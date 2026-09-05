/**
 * Model SQLite untuk mengelola data UMKM
 */

class SQLiteUMKM {
  constructor(db) {
    this.db = db;
    this.initTable();
  }

  // Inisialisasi tabel UMKM
  initTable() {
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS umkm (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nama TEXT NOT NULL,
          deskripsi TEXT,
          kategori TEXT,
          alamat TEXT,
          latitude REAL,
          longitude REAL,
          kontak_person TEXT,
          nomor_telepon TEXT,
          email TEXT,
          jam_operasional TEXT,
          produk_layanan TEXT,
          harga_range TEXT,
          foto_url TEXT,
          status TEXT DEFAULT 'aktif',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Indeks untuk pencarian
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_umkm_kategori ON umkm(kategori)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_umkm_status ON umkm(status)`);
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_umkm_nama ON umkm(nama)`);
      
      console.log('Tabel UMKM berhasil diinisialisasi');
    } catch (error) {
      console.error('Error saat inisialisasi tabel UMKM:', error.message);
      throw error;
    }
  }

  // Menambahkan UMKM baru
  addUMKM(umkmData) {
    try {
      const {
        nama,
        deskripsi = '',
        kategori = 'umum',
        alamat = '',
        latitude = null,
        longitude = null,
        kontak_telepon = '',
        kontak_whatsapp = '',
        kontak_email = '',
        jam_operasional = '',
        status = 'aktif'
      } = umkmData;

      const stmt = this.db.prepare(`
        INSERT INTO umkm (
          nama, deskripsi, kategori, alamat, latitude, longitude,
          kontak_person, nomor_telepon, email, jam_operasional,
          produk_layanan, harga_range, foto_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        nama, deskripsi, kategori, alamat, latitude, longitude,
        kontak_telepon, kontak_whatsapp, kontak_email, jam_operasional,
        '', '', '', status
      );

      return {
        id: result.lastInsertRowid,
        nama,
        deskripsi,
        kategori,
        alamat,
        latitude,
        longitude,
        kontak_telepon,
        kontak_whatsapp,
        kontak_email,
        jam_operasional,
        status
      };
    } catch (error) {
      console.error('Error saat menambahkan UMKM:', error.message);
      throw error;
    }
  }

  // Mendapatkan semua UMKM
  getAllUMKM(status = 'aktif') {
    try {
      const stmt = this.db.prepare('SELECT * FROM umkm WHERE status = ? ORDER BY nama ASC');
      return stmt.all(status);
    } catch (error) {
      console.error('Error saat mengambil semua UMKM:', error.message);
      throw error;
    }
  }

  // Mendapatkan UMKM berdasarkan ID
  getUMKMById(id) {
    try {
      const stmt = this.db.prepare('SELECT * FROM umkm WHERE id = ?');
      return stmt.get(id);
    } catch (error) {
      console.error('Error saat mengambil UMKM berdasarkan ID:', error.message);
      throw error;
    }
  }

  // Mendapatkan UMKM berdasarkan kategori
  getUMKMByKategori(kategori) {
    try {
      const stmt = this.db.prepare('SELECT * FROM umkm WHERE kategori = ? AND status = \'aktif\' ORDER BY nama ASC');
      return stmt.all(kategori);
    } catch (error) {
      console.error('Error saat mengambil UMKM berdasarkan kategori:', error.message);
      throw error;
    }
  }

  // Mencari UMKM berdasarkan nama
  searchUMKMByNama(keyword) {
    try {
      const stmt = this.db.prepare('SELECT * FROM umkm WHERE nama LIKE ? AND status = \'aktif\' ORDER BY nama ASC');
      return stmt.all(`%${keyword}%`);
    } catch (error) {
      console.error('Error saat mencari UMKM berdasarkan nama:', error.message);
      throw error;
    }
  }

  // Memperbarui UMKM
  updateUMKM(id, umkmData) {
    try {
      const fields = [];
      const values = [];
      
      // Daftar field yang bisa diupdate
      const allowedFields = [
        'nama', 'deskripsi', 'kategori', 'alamat', 'latitude', 'longitude',
        'kontak_person', 'nomor_telepon', 'email', 'jam_operasional',
        'produk_layanan', 'harga_range', 'foto_url', 'status'
      ];
      
      // Build query dinamis
      for (const field of allowedFields) {
        if (umkmData.hasOwnProperty(field)) {
          fields.push(`${field} = ?`);
          values.push(umkmData[field]);
        }
      }
      
      if (fields.length === 0) {
        throw new Error('Tidak ada field yang akan diupdate');
      }
      
      // Tambahkan updated_at
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      const query = `UPDATE umkm SET ${fields.join(', ')} WHERE id = ?`;
      const stmt = this.db.prepare(query);
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error('UMKM tidak ditemukan atau tidak ada perubahan');
      }
      
      return this.getUMKMById(id);
    } catch (error) {
      console.error('Error saat memperbarui UMKM:', error.message);
      throw error;
    }
  }

  // Menghapus UMKM (soft delete)
  deleteUMKM(id) {
    try {
      const stmt = this.db.prepare('UPDATE umkm SET status = "nonaktif", updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error('UMKM tidak ditemukan');
      }
      
      return { success: true, message: 'UMKM berhasil dihapus' };
    } catch (error) {
      console.error('Error saat menghapus UMKM:', error.message);
      throw error;
    }
  }

  // Mendapatkan statistik UMKM
  getUMKMStats() {
    try {
      const totalStmt = this.db.prepare('SELECT COUNT(*) as total FROM umkm WHERE status = \'aktif\'');
      const kategoriStmt = this.db.prepare('SELECT kategori, COUNT(*) as jumlah FROM umkm WHERE status = \'aktif\' GROUP BY kategori ORDER BY jumlah DESC');
      
      const total = totalStmt.get().total;
      const perKategori = kategoriStmt.all();
      
      return {
        total_umkm: total,
        per_kategori: perKategori
      };
    } catch (error) {
      console.error('Error saat mengambil statistik UMKM:', error.message);
      throw error;
    }
  }

  // Mendapatkan daftar kategori UMKM dengan jumlah
  getKategoriList() {
    try {
      const stmt = this.db.prepare('SELECT kategori, COUNT(*) as jumlah FROM umkm WHERE status = \'aktif\' GROUP BY kategori ORDER BY kategori ASC');
      return stmt.all();
    } catch (error) {
      console.error('Error saat mengambil daftar kategori:', error.message);
      throw error;
    }
  }
}

module.exports = SQLiteUMKM;