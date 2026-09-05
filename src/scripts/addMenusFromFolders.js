/**
 * Script untuk menambahkan menu dan sub-menu ke database berdasarkan struktur folder
 */

const fs = require('fs-extra');
const path = require('path');
const mysql = require('mysql2/promise');

// Fungsi utama
const main = async () => {
  let connection;
  try {
    console.log('Memulai proses penambahan menu dan sub-menu dari struktur folder...');
    
    // Koneksi ke database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'bot_layanan_warga'
    });
    console.log('Connected to MySQL');
    
    // Dapatkan semua folder menu
    const menuBasePath = path.join(process.cwd(), 'uploads', 'menus');
    const menuFolders = await fs.readdir(menuBasePath);
    
    const results = [];
    let menuAddedCount = 0;
    let subMenuAddedCount = 0;
    
    // Proses setiap folder menu
    for (const menuFolder of menuFolders) {
      const menuPath = path.join(menuBasePath, menuFolder);
      const menuStat = await fs.stat(menuPath);
      
      if (!menuStat.isDirectory()) continue;
      
      // Ekstrak ID dan nama menu dari nama folder
      const menuParts = menuFolder.split('-');
      const menuId = parseInt(menuParts[0]);
      const menuName = menuParts.slice(1).join('-').replace(/_/g, ' ');
      
      // Cek apakah menu sudah ada di database
      const [existingMenus] = await connection.query(
        'SELECT * FROM menus WHERE id = ?',
        [menuId]
      );
      
      let menuDbId = menuId;
      
      if (existingMenus.length === 0) {
        // Tambahkan menu baru ke database
        await connection.query(
          'INSERT INTO menus (id, name, description, order_num, is_active) VALUES (?, ?, ?, ?, ?)',
          [menuId, menuName, menuName, menuId, 1]
        );
        console.log(`Menu baru ditambahkan: ${menuName} (ID: ${menuId})`);
        menuAddedCount++;
      } else {
        console.log(`Menu sudah ada: ${menuName} (ID: ${menuId})`);
      }
      
      // Dapatkan sub-menu folders
      const subMenuFolders = await fs.readdir(menuPath);
      
      for (const subMenuFolder of subMenuFolders) {
        const subMenuPath = path.join(menuPath, subMenuFolder);
        const subMenuStat = await fs.stat(subMenuPath);
        
        if (!subMenuStat.isDirectory()) continue;
        
        // Ekstrak ID dan nama sub-menu dari nama folder
        const subMenuParts = subMenuFolder.split('-');
        const subMenuIdStr = subMenuParts[0];
        const subMenuOrderNum = parseInt(subMenuIdStr.replace(/[A-Z]/g, ''));
        const subMenuName = subMenuParts.slice(1).join('-').replace(/_/g, ' ');
        
        // Cek apakah sub-menu sudah ada di database
        const [existingSubMenus] = await connection.query(
          'SELECT * FROM sub_menus WHERE menu_id = ? AND order_num = ?',
          [menuDbId, subMenuOrderNum]
        );
        
        if (existingSubMenus.length === 0) {
          // Tambahkan sub-menu baru ke database
          await connection.query(
            'INSERT INTO sub_menus (menu_id, name, description, order_num, is_active) VALUES (?, ?, ?, ?, ?)',
            [menuDbId, subMenuName, subMenuName, subMenuOrderNum, 1]
          );
          console.log(`Sub-menu baru ditambahkan: ${subMenuName} (Menu ID: ${menuDbId}, Order: ${subMenuOrderNum})`);
          subMenuAddedCount++;
          
          // Cek apakah ada file content.txt
          const contentPath = path.join(subMenuPath, 'content.txt');
          
          if (await fs.pathExists(contentPath)) {
            try {
              // Dapatkan ID sub-menu yang baru ditambahkan
              const [newSubMenu] = await connection.query(
                'SELECT * FROM sub_menus WHERE menu_id = ? AND order_num = ?',
                [menuDbId, subMenuOrderNum]
              );
              
              if (newSubMenu.length > 0) {
                const subMenuDbId = newSubMenu[0].id;
                
                // Baca konten file
                const txtContent = await fs.readFile(contentPath, 'utf8');
                
                // Konversi ke JSON
                const jsonContent = convertTxtToJson(txtContent);
                
                // Simpan ke database
                await connection.query(
                  'INSERT INTO menu_contents (menu_id, sub_menu_id, content_json) VALUES (?, ?, ?)',
                  [menuDbId, subMenuDbId, JSON.stringify(jsonContent)]
                );
                console.log(`Konten untuk menu ${menuDbId}, sub-menu ${subMenuDbId} berhasil ditambahkan`);
              }
            } catch (error) {
              console.error(`Error processing content for ${menuFolder}/${subMenuFolder}:`, error.message);
            }
          }
        } else {
          console.log(`Sub-menu sudah ada: ${subMenuName} (Menu ID: ${menuDbId}, Order: ${subMenuOrderNum})`);
        }
      }
    }
    
    console.log(`Proses selesai. ${menuAddedCount} menu dan ${subMenuAddedCount} sub-menu berhasil ditambahkan.`);
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error saat proses:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
};

// Fungsi untuk mengkonversi konten txt ke format JSON
const convertTxtToJson = (txtContent) => {
  try {
    // Parsing konten txt
    const lines = txtContent.split('\n');
    const result = {
      title: '',
      sections: []
    };

    let currentSection = null;
    let currentList = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip baris kosong
      if (!line) continue;

      // Deteksi judul (# Judul)
      if (line.startsWith('# ')) {
        result.title = line.substring(2).trim();
        continue;
      }

      // Deteksi sub-judul (## Sub Judul)
      if (line.startsWith('## ')) {
        currentSection = {
          title: line.substring(3).trim(),
          content: [],
          lists: []
        };
        result.sections.push(currentSection);
        currentList = null;
        continue;
      }

      // Deteksi item list (1. Item atau - Item)
      const listItemMatch = line.match(/^(\d+\.|-)\s+(.+)$/);
      if (listItemMatch) {
        // Pastikan currentSection tidak null sebelum mengakses lists
        if (!currentSection) {
          // Jika tidak ada section, buat section default
          currentSection = {
            title: 'Informasi',
            content: [],
            lists: []
          };
          result.sections.push(currentSection);
        }
        
        // Jika belum ada list, buat list baru
        if (!currentList) {
          currentList = {
            type: listItemMatch[1].includes('.') ? 'ordered' : 'unordered',
            items: []
          };
          currentSection.lists.push(currentList);
        }

        currentList.items.push(listItemMatch[2].trim());
        continue;
      }

      // Jika bukan list item, reset currentList
      currentList = null;

      // Tambahkan sebagai konten biasa
      if (currentSection) {
        currentSection.content.push(line);
      } else {
        // Jika tidak ada section, buat section default
        currentSection = {
          title: 'Informasi',
          content: [line],
          lists: []
        };
        result.sections.push(currentSection);
      }
    }

    return result;
  } catch (error) {
    console.error('Error converting txt to JSON:', error.message);
    throw error;
  }
};

// Jalankan fungsi utama
main();