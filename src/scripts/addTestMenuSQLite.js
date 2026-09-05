/**
 * Skrip untuk menambahkan menu dan sub-menu pengujian ke database SQLite
 */

const { connectSQLite } = require('../config/database');
const SQLiteMenu = require('../models/SQLiteMenu');

// Fungsi untuk menambahkan menu dan sub-menu pengujian
const addTestMenus = async () => {
  try {
    console.log('Menambahkan menu dan sub-menu pengujian ke SQLite...');
    
    // Koneksi ke database SQLite
    const db = connectSQLite();
    const menuModel = new SQLiteMenu(db);
    
    // Tambahkan menu utama
    const testMenu = await menuModel.addMenu({
      name: 'Menu Pengujian SQLite',
      description: 'Menu untuk pengujian migrasi ke SQLite',
      order_num: 99,
      access_level: 'public',
      is_active: 1
    });
    
    console.log(`Menu pengujian berhasil ditambahkan dengan ID: ${testMenu.id}`);
    
    // Tambahkan sub-menu
    const subMenus = [
      {
        name: 'Sub-menu Pengujian 1',
        description: 'Deskripsi sub-menu pengujian 1',
        order_num: 1
      },
      {
        name: 'Sub-menu Pengujian 2',
        description: 'Deskripsi sub-menu pengujian 2',
        order_num: 2
      },
      {
        name: 'Sub-menu Pengujian 3',
        description: 'Deskripsi sub-menu pengujian 3',
        order_num: 3
      }
    ];
    
    for (const subMenu of subMenus) {
      const newSubMenu = await menuModel.addSubMenu({
        menu_id: testMenu.id,
        name: subMenu.name,
        description: subMenu.description,
        order_num: subMenu.order_num
      });
      
      console.log(`Sub-menu pengujian berhasil ditambahkan dengan ID: ${newSubMenu.id}`);
    }
    
    console.log('Semua menu dan sub-menu pengujian berhasil ditambahkan!');
    return { success: true, message: 'Menu dan sub-menu pengujian berhasil ditambahkan' };
  } catch (error) {
    console.error('Error saat menambahkan menu pengujian:', error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
};

// Jalankan fungsi
addTestMenus().then(result => {
  console.log(result.message);
  process.exit(0);
}).catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});