/**
 * Controller untuk mengimpor menu dari struktur folder ke database
 */

const fs = require('fs-extra');
const path = require('path');
const { connectSQLite } = require('../config/database');
const SQLiteMenu = require('../models/SQLiteMenu');

// Fungsi untuk membaca struktur menu dari folder
const readMenuStructure = async () => {
  try {
    const menuBasePath = path.join(process.cwd(), 'uploads', 'menus');
    const mainMenus = await fs.readdir(menuBasePath);
    
    const menuStructure = [];
    
    // Urutkan menu utama berdasarkan ID numerik
    const sortedMainMenus = mainMenus.sort((a, b) => {
      const aId = parseInt(a.split('-')[0]);
      const bId = parseInt(b.split('-')[0]);
      return aId - bId;
    });
    
    for (const mainMenu of sortedMainMenus) {
      // Pastikan ini adalah folder
      const mainMenuPath = path.join(menuBasePath, mainMenu);
      const mainMenuStat = await fs.stat(mainMenuPath);
      
      if (mainMenuStat.isDirectory()) {
        const mainMenuId = parseInt(mainMenu.split('-')[0]);
        const mainMenuName = mainMenu.split('-')[1].replace(/_/g, ' ');
        
        // Baca sub-menu
        const subMenus = await fs.readdir(mainMenuPath);
        
        // Urutkan sub-menu berdasarkan ID
        const sortedSubMenus = subMenus.sort((a, b) => {
          const aId = a.split('-')[0];
          const bId = b.split('-')[0];
          return aId.localeCompare(bId);
        });
        
        const subMenuList = [];
        
        for (const subMenu of sortedSubMenus) {
          // Pastikan ini adalah folder
          const subMenuPath = path.join(mainMenuPath, subMenu);
          const subMenuStat = await fs.stat(subMenuPath);
          
          if (subMenuStat.isDirectory()) {
            const subMenuId = subMenu.split('-')[0];
            const subMenuName = subMenu.split('-')[1].replace(/_/g, ' ');
            
            // Cek apakah ada file content.txt
            const contentPath = path.join(subMenuPath, 'content.txt');
            let content = '';
            
            if (await fs.pathExists(contentPath)) {
              content = await fs.readFile(contentPath, 'utf-8');
            }
            
            subMenuList.push({
              id: subMenuId,
              name: subMenuName,
              content: content,
              order_num: parseInt(subMenuId) || 1
            });
          }
        }
        
        menuStructure.push({
          id: mainMenuId,
          name: mainMenuName,
          subMenus: subMenuList,
          order_num: mainMenuId
        });
      }
    }
    
    return menuStructure;
  } catch (error) {
    console.error('Error saat membaca struktur menu:', error.message);
    return [];
  }
};

// Fungsi untuk mengimpor menu dari struktur folder ke database
const importMenusFromFolders = async () => {
  try {
    const db = connectSQLite();
    const menuModel = new SQLiteMenu(db);
    
    // Baca struktur menu dari folder
    const menuStructure = await readMenuStructure();
    
    if (menuStructure.length === 0) {
      console.log('Tidak ada menu yang ditemukan di folder');
      return { success: false, message: 'Tidak ada menu yang ditemukan di folder' };
    }
    
    // Dapatkan menu yang sudah ada di database
    const existingMenus = await menuModel.getAllMenus();
    
    // Impor menu utama
    let importedMenus = 0;
    let updatedMenus = 0;
    let importedSubMenus = 0;
    let updatedSubMenus = 0;
    
    for (const menu of menuStructure) {
      // Cek apakah menu sudah ada di database
      const existingMenu = existingMenus.find(m => m.id === menu.id);
      
      if (existingMenu) {
        // Update menu yang sudah ada
        await menuModel.updateMenu(existingMenu.id, {
          name: menu.name,
          description: `Layanan ${menu.name}`,
          order_num: menu.order_num,
          access_level: 'public',
          is_active: 1
        });
        updatedMenus++;
      } else {
        // Tambahkan menu baru
        await menuModel.addMenu({
          id: menu.id,
          name: menu.name,
          description: `Layanan ${menu.name}`,
          order_num: menu.order_num,
          access_level: 'public'
        });
        importedMenus++;
      }
      
      // Dapatkan sub-menu yang sudah ada di database
      const existingSubMenus = await menuModel.getSubMenusByMenuId(menu.id);
      
      // Impor sub-menu
      for (const subMenu of menu.subMenus) {
        // Ekstrak nomor urut dari ID sub-menu (misalnya, dari "1A" ambil "1")
        let orderNum = 1;
        if (subMenu.id.match(/^\d+/)) {
          orderNum = parseInt(subMenu.id.match(/^\d+/)[0]);
        }
        
        // Cek apakah sub-menu sudah ada di database
        const existingSubMenu = existingSubMenus.find(sm => 
          sm.name.toLowerCase() === subMenu.name.toLowerCase());
        
        if (existingSubMenu) {
          // Update sub-menu yang sudah ada
          await menuModel.updateSubMenu(existingSubMenu.id, {
            menu_id: menu.id,
            name: subMenu.name,
            description: subMenu.content,
            order_num: orderNum,
            is_active: 1
          });
          updatedSubMenus++;
        } else {
          // Tambahkan sub-menu baru
          await menuModel.addSubMenu({
            menu_id: menu.id,
            name: subMenu.name,
            description: subMenu.content,
            order_num: orderNum
          });
          importedSubMenus++;
        }
      }
    }
    
    return {
      success: true,
      message: `Berhasil mengimpor ${importedMenus} menu baru, mengupdate ${updatedMenus} menu, mengimpor ${importedSubMenus} sub-menu baru, dan mengupdate ${updatedSubMenus} sub-menu.`
    };
  } catch (error) {
    console.error('Error saat mengimpor menu dari folder:', error.message);
    return { success: false, message: `Error: ${error.message} - Dibuat oleh Mahasiswa UMSU` };
  }
};

// Fungsi untuk menghapus data menu duplikat
const removeDuplicateMenus = async () => {
  try {
    const db = connectSQLite();
    
    // Hapus menu duplikat (simpan yang memiliki ID terkecil)
    await db.run(`
      DELETE FROM menus WHERE id IN (
        SELECT m1.id FROM menus m1
        JOIN menus m2 ON m1.name = m2.name AND m1.id > m2.id
      )
    `);
    
    // Hapus sub-menu duplikat (simpan yang memiliki ID terkecil)
    await db.run(`
      DELETE FROM sub_menus WHERE id IN (
        SELECT s1.id FROM sub_menus s1
        JOIN sub_menus s2 ON s1.menu_id = s2.menu_id AND s1.name = s2.name AND s1.id > s2.id
      )
    `);
    
    return { success: true, message: 'Berhasil menghapus data menu duplikat' };
  } catch (error) {
    console.error('Error saat menghapus data menu duplikat:', error.message);
    return { success: false, message: `Error: ${error.message} - Dibuat oleh Mahasiswa UMSU` };
  }
};

// Fungsi untuk menambahkan menu melalui WhatsApp
const addMenuViaWhatsApp = async (menuData) => {
  try {
    const db = connectSQLite();
    const menuModel = new SQLiteMenu(db);
    
    // Validasi data menu
    if (!menuData.name || !menuData.order_num) {
      return { success: false, message: 'Nama menu dan nomor urut harus diisi - Dibuat oleh Mahasiswa UMSU' };
    }
    
    // Tambahkan menu baru
    const newMenu = await menuModel.addMenu({
      name: menuData.name,
      description: menuData.description || `Layanan ${menuData.name}`,
      order_num: parseInt(menuData.order_num),
      access_level: 'public'
    });
    
    return { success: true, message: `Berhasil menambahkan menu ${menuData.name}`, menu: newMenu };
  } catch (error) {
    console.error('Error saat menambahkan menu via WhatsApp:', error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
};

// Fungsi untuk menambahkan sub-menu melalui WhatsApp
const addSubMenuViaWhatsApp = async (subMenuData) => {
  try {
    const db = connectSQLite();
    const menuModel = new SQLiteMenu(db);
    
    // Validasi data sub-menu
    if (!subMenuData.menu_id || !subMenuData.name || !subMenuData.order_num) {
      return { success: false, message: 'ID menu, nama sub-menu, dan nomor urut harus diisi - Dibuat oleh Mahasiswa UMSU' };
    }
    
    // Cek apakah menu utama ada
    const menu = await menuModel.getMenuById(subMenuData.menu_id);
    if (!menu) {
      return { success: false, message: `Menu dengan ID ${subMenuData.menu_id} tidak ditemukan - Dibuat oleh Mahasiswa UMSU` };
    }
    
    // Tambahkan sub-menu baru
    const newSubMenu = await menuModel.addSubMenu({
      menu_id: subMenuData.menu_id,
      name: subMenuData.name,
      description: subMenuData.description || '',
      order_num: parseInt(subMenuData.order_num)
    });
    
    return { success: true, message: `Berhasil menambahkan sub-menu ${subMenuData.name}`, subMenu: newSubMenu };
  } catch (error) {
    console.error('Error saat menambahkan sub-menu via WhatsApp:', error.message);
    return { success: false, message: `Error: ${error.message}` };
  }
};

module.exports = {
  importMenusFromFolders,
  removeDuplicateMenus,
  addMenuViaWhatsApp,
  addSubMenuViaWhatsApp
};