/**
 * Script untuk memperbaiki format ID sub-menu dalam struktur folder
 * Format yang benar: [menuId][huruf] (contoh: 1A, 1B, 2A, dll)
 */

const fs = require('fs-extra');
const path = require('path');

// Fungsi untuk memperbaiki format ID sub-menu
const fixSubMenuIds = async () => {
  try {
    console.log('Memulai proses perbaikan format ID sub-menu...');
    
    const menuBasePath = path.join(process.cwd(), 'uploads', 'menus');
    const mainMenus = await fs.readdir(menuBasePath);
    
    // Urutkan menu utama berdasarkan ID numerik
    const sortedMainMenus = mainMenus.sort((a, b) => {
      const aId = parseInt(a.split('-')[0]);
      const bId = parseInt(b.split('-')[0]);
      return aId - bId;
    });
    
    let totalFixed = 0;
    
    for (const mainMenu of sortedMainMenus) {
      // Pastikan ini adalah folder
      const mainMenuPath = path.join(menuBasePath, mainMenu);
      const mainMenuStat = await fs.stat(mainMenuPath);
      
      if (mainMenuStat.isDirectory()) {
        const mainMenuId = parseInt(mainMenu.split('-')[0]);
        console.log(`Memeriksa menu: ${mainMenu}`);
        
        // Baca sub-menu
        const subMenus = await fs.readdir(mainMenuPath);
        
        // Urutkan sub-menu berdasarkan ID
        const sortedSubMenus = subMenus.sort((a, b) => {
          const aId = a.split('-')[0];
          const bId = b.split('-')[0];
          return aId.localeCompare(bId);
        });
        
        let subMenuIndex = 0;
        
        for (const subMenu of sortedSubMenus) {
          // Pastikan ini adalah folder
          const subMenuPath = path.join(mainMenuPath, subMenu);
          const subMenuStat = await fs.stat(subMenuPath);
          
          if (subMenuStat.isDirectory()) {
            const subMenuParts = subMenu.split('-');
            const subMenuId = subMenuParts[0];
            const subMenuName = subMenuParts.slice(1).join('-');
            
            // Cek apakah ID sub-menu sudah mengikuti format yang benar
            const correctFormat = new RegExp(`^${mainMenuId}[A-Z]$`);
            
            if (!correctFormat.test(subMenuId)) {
              // Buat ID sub-menu yang benar
              const letter = String.fromCharCode('A'.charCodeAt(0) + subMenuIndex);
              const newSubMenuId = `${mainMenuId}${letter}`;
              const newSubMenuName = `${newSubMenuId}-${subMenuName}`;
              const newSubMenuPath = path.join(mainMenuPath, newSubMenuName);
              
              console.log(`Memperbaiki sub-menu: ${subMenu} -> ${newSubMenuName}`);
              
              // Rename folder sub-menu
              await fs.rename(subMenuPath, newSubMenuPath);
              
              totalFixed++;
            }
            
            subMenuIndex++;
          }
        }
      }
    }
    
    console.log(`Proses selesai. Total sub-menu yang diperbaiki: ${totalFixed}`);
    return { success: true, totalFixed };
  } catch (error) {
    console.error('Error saat memperbaiki format ID sub-menu:', error.message);
    return { success: false, message: error.message };
  }
};

// Jalankan fungsi utama
fixSubMenuIds().then(result => {
  if (result.success) {
    console.log('Proses perbaikan format ID sub-menu selesai dengan sukses');
  } else {
    console.error('Proses perbaikan format ID sub-menu gagal:', result.message);
  }
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Error tidak tertangani:', error.message);
  process.exit(1);
});