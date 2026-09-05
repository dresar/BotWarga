/**
 * Script untuk menghapus sistem kategori pengaduan sepenuhnya
 */

const Database = require('better-sqlite3');
const path = require('path');

const removeCategorySystem = () => {
  try {
    // Buka koneksi database
    const dbPath = path.join(process.cwd(), 'database', 'bot_layanan_warga.sqlite');
    const db = new Database(dbPath);
    
    console.log('🗑️ Menghapus sistem kategori pengaduan...');
    
    // Nonaktifkan foreign key constraint
    db.pragma('foreign_keys = OFF');
    
    // Cek struktur tabel saat ini
    const complaintsTableInfo = db.prepare('PRAGMA table_info(complaints)').all();
    console.log('📋 Struktur tabel complaints saat ini:');
    complaintsTableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // Cek apakah tabel complaint_categories ada
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='complaint_categories'").all();
    
    if (tables.length > 0) {
      console.log('🗑️ Menghapus tabel complaint_categories...');
      db.exec('DROP TABLE complaint_categories');
      console.log('✅ Tabel complaint_categories berhasil dihapus');
    } else {
      console.log('ℹ️ Tabel complaint_categories tidak ditemukan');
    }
    
    // Cek apakah kolom category_id ada di tabel complaints
    const existingColumns = complaintsTableInfo.map(col => col.name);
    const hasCategoryId = existingColumns.includes('category_id');
    
    if (hasCategoryId) {
      console.log('🔄 Membuat ulang tabel complaints tanpa kolom category_id...');
      
      // 1. Buat tabel baru tanpa kolom category_id
      const createNewTableSQL = `
        CREATE TABLE complaints_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          reporter_name TEXT NOT NULL,
          reporter_address TEXT NOT NULL,
          description TEXT NOT NULL,
          photo_path TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        )
      `;
      
      db.exec(createNewTableSQL);
      console.log('✅ Tabel complaints_new berhasil dibuat');
      
      // 2. Copy data dari tabel lama ke tabel baru (tanpa kolom category_id)
      const copyDataSQL = `
        INSERT INTO complaints_new (
          id, reporter_name, reporter_address, description, 
          photo_path, status, created_at, updated_at, is_active
        )
        SELECT 
          id, reporter_name, reporter_address, description,
          photo_path, status, created_at, updated_at, is_active
        FROM complaints
      `;
      
      db.exec(copyDataSQL);
      console.log('✅ Data berhasil disalin ke tabel baru');
      
      // 3. Hapus tabel lama
      db.exec('DROP TABLE complaints');
      console.log('✅ Tabel complaints lama berhasil dihapus');
      
      // 4. Rename tabel baru menjadi complaints
      db.exec('ALTER TABLE complaints_new RENAME TO complaints');
      console.log('✅ Tabel complaints_new berhasil di-rename menjadi complaints');
      
    } else {
      console.log('ℹ️ Kolom category_id tidak ditemukan di tabel complaints');
    }
    
    // 5. Tampilkan struktur tabel yang baru
    const newTableInfo = db.prepare('PRAGMA table_info(complaints)').all();
    console.log('\n📋 Struktur tabel complaints setelah pembersihan:');
    newTableInfo.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
    // 6. Hitung jumlah data
    const count = db.prepare('SELECT COUNT(*) as count FROM complaints').get();
    console.log(`\n📊 Total data complaints: ${count.count}`);
    
    db.close();
    console.log('\n🎉 Sistem kategori pengaduan berhasil dihapus!');
    
    return { 
      success: true, 
      message: 'Berhasil menghapus sistem kategori pengaduan'
    };
    
  } catch (error) {
    console.error('❌ Error menghapus sistem kategori:', error.message);
    return { success: false, message: error.message };
  }
};

// Jalankan jika file ini dieksekusi langsung
if (require.main === module) {
  const result = removeCategorySystem();
  if (result.success) {
    console.log('✅ Proses penghapusan sistem kategori selesai dengan sukses');
    process.exit(0);
  } else {
    console.error('❌ Proses penghapusan sistem kategori gagal:', result.message);
    process.exit(1);
  }
}

module.exports = { removeCategorySystem };