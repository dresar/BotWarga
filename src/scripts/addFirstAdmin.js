/**
 * Script untuk menambahkan admin pertama ke sistem
 */

const { addAdmin } = require('../controllers/adminController');
const { initMySQLDatabase } = require('../database/initMySQLDb');

// Fungsi utama
const main = async () => {
  try {
    console.log('Menginisialisasi database...');
    await initMySQLDatabase();
    console.log('Database berhasil diinisialisasi');
    
    console.log('Menambahkan admin pertama...');
    const result = await addAdmin({
      username: 'admin',
      password: 'admin123',
      phone_number: process.env.ADMIN_NUMBER || '628123456789',
      role: 'admin'
    });
    
    if (result.success) {
      console.log('Admin berhasil ditambahkan:', result.admin);
    } else {
      console.error('Gagal menambahkan admin:', result.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

// Jalankan fungsi utama
main();