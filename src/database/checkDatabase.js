/**
 * Script untuk memeriksa struktur database
 */

const Database = require('better-sqlite3');
const path = require('path');

const checkDatabase = () => {
  try {
    // Buka koneksi database
    const dbPath = path.join(process.cwd(), 'src', 'database', 'chat.db');
    const db = new Database(dbPath);
    
    console.log('📋 Memeriksa struktur database...');
    
    // Cek semua tabel yang ada
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('\n🗂️ Tabel yang ada di database:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Cek struktur setiap tabel
    tables.forEach(table => {
      console.log(`\n📋 Struktur tabel ${table.name}:`);
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all();
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    });
    
    db.close();
    console.log('\n✅ Pemeriksaan database selesai');
    
  } catch (error) {
    console.error('❌ Error memeriksa database:', error.message);
  }
};

// Jalankan jika file ini dieksekusi langsung
if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };