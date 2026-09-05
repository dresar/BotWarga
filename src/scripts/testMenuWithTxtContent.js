/**
 * Skrip untuk menguji navigasi menu dan sub-menu dengan konten dari file TXT
 */

const { connectSQLite } = require('../config/sqlite');
const SQLiteMenu = require('../models/SQLiteMenu');
const admin = require('../controllers/admin');

async function testMenuNavigation() {
  try {
    console.log('Memulai pengujian navigasi menu dan sub-menu...');
    
    // Buat koneksi database
    const db = connectSQLite();
    if (!db) {
      console.error('Error connecting to SQLite database');
      return;
    }
    
    // Inisialisasi model menu
    const menuModel = new SQLiteMenu(db);
    
    // Uji menu utama
    console.log('\n--- Menguji Menu Utama ---');
    const mainMenuResponse = await admin.formatMenuMessage();
    console.log(mainMenuResponse.text);
    
    // Uji sub-menu untuk beberapa menu utama
    const menuIds = [1, 10, 11];
    
    for (const menuId of menuIds) {
      console.log(`\n--- Menguji Sub-Menu untuk Menu ${menuId} ---`);
      const subMenuResponse = await admin.formatSubMenuMessage(null, menuId);
      console.log(subMenuResponse.text);
      
      // Uji konten sub-menu untuk beberapa sub-menu
      const subMenuLetters = ['A', 'B', 'C'];
      
      for (const letter of subMenuLetters) {
        const subMenuId = `${menuId}${letter}`;
        console.log(`\n--- Menguji Konten untuk Sub-Menu ${subMenuId} ---`);
        const contentResponse = await admin.getSubMenuContent(null, menuId, letter);
        console.log(contentResponse.text);
      }
    }
    
    console.log('\nPengujian navigasi menu dan sub-menu selesai.');
  } catch (error) {
    console.error('Error saat menguji navigasi menu:', error);
  }
}

// Jalankan pengujian
testMenuNavigation();