/**
 * Script untuk menambahkan admin pertama ke sistem SQLite
 */

const { connectSQLite } = require('../config/sqlite');
const SQLiteAdmin = require('../models/SQLiteAdmin');
const { initSQLiteDatabase } = require('../database/initSQLiteDb');

// Fungsi utama
const main = async () => {
  try {
    console.log('Menginisialisasi database SQLite...');
    const { initDatabaseAndTables } = require('../database/initSQLiteDb');
    const db = initDatabaseAndTables();
    console.log('Database SQLite berhasil diinisialisasi');
    
    const adminModel = new SQLiteAdmin(db);
    
    // Cek apakah admin dengan nomor 6282392115909 sudah ada
    const targetPhone = '6282392115909';
    const existingAdmin = adminModel.getAdminByPhoneNumber(targetPhone);
    
    if (existingAdmin) {
      console.log('Admin dengan nomor tersebut sudah ada:');
      console.log(`- ${existingAdmin.username} (${existingAdmin.phone_number}) - Role: ${existingAdmin.role}`);
      
      // Update role menjadi superadmin jika belum
      if (existingAdmin.role !== 'superadmin') {
        console.log('Mengupdate role menjadi superadmin...');
        adminModel.updateAdmin(existingAdmin.id, {
          username: existingAdmin.username,
          phone_number: existingAdmin.phone_number,
          role: 'superadmin',
          is_active: 1
        });
        console.log('Role berhasil diupdate menjadi superadmin');
      }
      return;
    }
    
    console.log('Menambahkan super admin baru...');
    const result = await adminModel.addAdmin({
      username: 'superadmin',
      password: 'superadmin123',
      phone_number: targetPhone,
      role: 'superadmin',
      is_active: 1
    });
    
    console.log('Admin berhasil ditambahkan:', {
      id: result.id,
      username: result.username,
      phone_number: result.phone_number,
      role: result.role
    });
    
    console.log('\n=== INFORMASI ADMIN ===');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Phone Number:', result.phone_number);
    console.log('Role: admin');
    console.log('\n=== CARA MENGGUNAKAN ===');
    console.log('1. Kirim pesan !admin dari nomor WhatsApp:', result.phone_number);
    console.log('2. Menu admin akan muncul otomatis');
    console.log('3. Gunakan nomor menu (1-5) untuk navigasi');
    console.log('4. Ketik 0 untuk keluar dari mode admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

// Jalankan fungsi utama
main();