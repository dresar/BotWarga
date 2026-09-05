/**
 * Script untuk menambahkan menu dan sub-menu ke database SQLite berdasarkan struktur folder
 */

const fs = require('fs-extra');
const path = require('path');
const { connectSQLite } = require('../config/database');
const SQLiteMenu = require('../models/SQLiteMenu');
const { importMenusFromFolders } = require('../controllers/menuImportController');

// Fungsi utama
const main = async () => {
  try {
    console.log('Memulai proses penambahan menu dan sub-menu dari struktur folder ke SQLite...');
    
    // Panggil fungsi importMenusFromFolders dari controller
    const result = await importMenusFromFolders();
    
    if (result.success) {
      console.log('Proses impor menu berhasil!');
      console.log(`Menu ditambahkan: ${result.importedMenus || 0}`);
      console.log(`Menu diperbarui: ${result.updatedMenus || 0}`);
      console.log(`Sub-menu ditambahkan: ${result.importedSubMenus || 0}`);
      console.log(`Sub-menu diperbarui: ${result.updatedSubMenus || 0}`);
    } else {
      console.error('Proses impor menu gagal:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('Error saat proses:', error.message);
    return { success: false, message: error.message };
  }
};

// Jalankan fungsi utama
main().then(result => {
  if (result.success) {
    console.log('Proses selesai dengan sukses');
  } else {
    console.error('Proses selesai dengan error:', result.message);
  }
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Error tidak tertangani:', error.message);
  process.exit(1);
});