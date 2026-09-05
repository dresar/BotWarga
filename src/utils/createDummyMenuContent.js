/**
 * Utilitas untuk membuat konten dummy menu dan menyimpannya ke file
 */
const fs = require('fs-extra');
const path = require('path');
const { createDummyContent } = require('./menuContentTemplate');

/**
 * Membuat struktur folder untuk menu dan sub-menu
 * @param {number} menuId - ID menu utama
 * @param {string} menuName - Nama menu utama
 * @param {Array} subMenus - Array objek sub-menu dengan id dan name
 */
const createMenuFolderStructure = async (menuId, menuName, subMenus) => {
  try {
    const menuBasePath = path.join(process.cwd(), 'uploads', 'menus');
    
    // Pastikan folder uploads/menus ada
    await fs.ensureDir(menuBasePath);
    
    // Buat folder menu utama
    const formattedMenuName = menuName.replace(/\s+/g, '_');
    const menuFolderName = `${menuId}-${formattedMenuName}`;
    const menuFolderPath = path.join(menuBasePath, menuFolderName);
    
    await fs.ensureDir(menuFolderPath);
    
    // Buat folder sub-menu dan file content.txt
    for (const subMenu of subMenus) {
      const subMenuLetter = String.fromCharCode(65 + subMenu.id - 1); // 1 -> A, 2 -> B, dst.
      const formattedSubMenuName = subMenu.name.replace(/\s+/g, '_');
      const subMenuFolderName = `${subMenu.id}${subMenuLetter}-${formattedSubMenuName}`;
      const subMenuFolderPath = path.join(menuFolderPath, subMenuFolderName);
      
      await fs.ensureDir(subMenuFolderPath);
      
      // Tentukan kategori dan layanan berdasarkan menu
      let category = 'kependudukan';
      let service = 'ktp';
      
      if (menuId === 1) { // Administrasi Kependudukan
        category = 'kependudukan';
        if (subMenu.id === 1) service = 'ktp';
        else if (subMenu.id === 2) service = 'kk';
        else service = 'aktaKelahiran';
      } else if (menuId === 2) { // Perizinan
        category = 'perizinan';
        if (subMenu.id === 1) service = 'izinUsaha';
        else service = 'izinBangunan';
      } else if (menuId === 3) { // Pertanahan
        category = 'pertanahan';
        service = 'sertifikatTanah';
      }
      
      // Buat konten dummy berdasarkan kategori dan layanan
      const content = createDummyContent(category, service);
      
      // Simpan ke file content.txt
      const contentFilePath = path.join(subMenuFolderPath, 'content.txt');
      await fs.writeFile(contentFilePath, content);
      
      console.log(`Created content for ${menuFolderName}/${subMenuFolderName}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating menu folder structure:', error);
    return false;
  }
};

/**
 * Membuat konten dummy untuk semua menu
 */
const createAllDummyContent = async () => {
  try {
    // Definisi menu dan sub-menu
    const menus = [
      {
        id: 1,
        name: 'Administrasi Kependudukan',
        subMenus: [
          { id: 1, name: 'Pembuatan KTP' },
          { id: 2, name: 'Pembuatan KK' },
          { id: 3, name: 'Pembuatan Akta Kelahiran' },
          { id: 4, name: 'Pembuatan Akta Kematian' }
        ]
      },
      {
        id: 2,
        name: 'Perizinan',
        subMenus: [
          { id: 1, name: 'Izin Usaha' },
          { id: 2, name: 'Izin Mendirikan Bangunan' },
          { id: 3, name: 'Izin Keramaian' }
        ]
      },
      {
        id: 3,
        name: 'Pertanahan',
        subMenus: [
          { id: 1, name: 'Sertifikat Tanah' },
          { id: 2, name: 'Jual Beli Tanah' },
          { id: 3, name: 'Hibah Tanah' }
        ]
      },
      {
        id: 4,
        name: 'Bantuan Sosial',
        subMenus: [
          { id: 1, name: 'Bantuan Langsung Tunai' },
          { id: 2, name: 'Program Keluarga Harapan' },
          { id: 3, name: 'Bantuan Pangan' }
        ]
      },
      {
        id: 5,
        name: 'Kesehatan',
        subMenus: [
          { id: 1, name: 'Pendaftaran BPJS' },
          { id: 2, name: 'Posyandu' },
          { id: 3, name: 'Vaksinasi' }
        ]
      }
    ];
    
    // Buat struktur folder dan konten untuk setiap menu
    for (const menu of menus) {
      await createMenuFolderStructure(menu.id, menu.name, menu.subMenus);
    }
    
    console.log('Successfully created all dummy content');
    return true;
  } catch (error) {
    console.error('Error creating all dummy content:', error);
    return false;
  }
};

module.exports = {
  createMenuFolderStructure,
  createAllDummyContent
};