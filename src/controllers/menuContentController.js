/**
 * Controller untuk mengelola konten menu dalam format JSON
 */

const fs = require('fs-extra');
const path = require('path');

// Fungsi untuk mengkonversi konten txt ke format JSON yang lebih formal
const convertTxtToJson = (txtContent) => {
  try {
    // Parsing konten txt
    const lines = txtContent.split('\n');
    const result = {
      title: '',
      description: '',
      sections: [],
      requirements: [],
      procedures: [],
      contact: {},
      fees: [],
      processingTime: '',
      legalBasis: [],
      notes: []
    };

    let currentSection = null;
    let currentList = null;
    let currentListType = null; // 'requirements', 'procedures', 'fees', 'legalBasis', 'notes'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip baris kosong
      if (!line) continue;

      // Deteksi judul utama (# Judul)
      if (line.startsWith('# ')) {
        result.title = line.substring(2).trim();
        continue;
      }

      // Deteksi sub-judul (## Sub Judul)
      if (line.startsWith('## ')) {
        const sectionTitle = line.substring(3).trim();
        
        // Reset current list type
        currentListType = null;
        
        // Cek jenis section berdasarkan judul
        if (sectionTitle.toLowerCase().includes('persyaratan') || sectionTitle.toLowerCase().includes('requirements')) {
          currentListType = 'requirements';
          currentList = result.requirements;
        } else if (sectionTitle.toLowerCase().includes('prosedur') || sectionTitle.toLowerCase().includes('procedure')) {
          currentListType = 'procedures';
          currentList = result.procedures;
        } else if (sectionTitle.toLowerCase().includes('biaya') || sectionTitle.toLowerCase().includes('fee')) {
          currentListType = 'fees';
          currentList = result.fees;
        } else if (sectionTitle.toLowerCase().includes('dasar hukum') || sectionTitle.toLowerCase().includes('legal')) {
          currentListType = 'legalBasis';
          currentList = result.legalBasis;
        } else if (sectionTitle.toLowerCase().includes('catatan') || sectionTitle.toLowerCase().includes('note')) {
          currentListType = 'notes';
          currentList = result.notes;
        } else if (sectionTitle.toLowerCase().includes('kontak') || sectionTitle.toLowerCase().includes('contact')) {
          // Khusus untuk kontak, kita tidak menggunakan list
          currentListType = 'contact';
          currentList = null;
        } else if (sectionTitle.toLowerCase().includes('waktu') || sectionTitle.toLowerCase().includes('time')) {
          // Khusus untuk waktu pemrosesan, kita tidak menggunakan list
          currentListType = 'processingTime';
          currentList = null;
        } else if (sectionTitle.toLowerCase().includes('deskripsi') || sectionTitle.toLowerCase().includes('description')) {
          // Khusus untuk deskripsi, kita tidak menggunakan list
          currentListType = 'description';
          currentList = null;
        } else {
          // Section lainnya
          currentSection = {
            title: sectionTitle,
            content: ''
          };
          result.sections.push(currentSection);
          currentListType = null;
          currentList = null;
        }
        continue;
      }

      // Deteksi item list (- Item)
      if (line.startsWith('- ') && currentListType && currentList) {
        const itemContent = line.substring(2).trim();
        currentList.push(itemContent);
        continue;
      }

      // Deteksi key-value pair untuk kontak (Key: Value)
      if (currentListType === 'contact' && line.includes(':')) {
        const [key, value] = line.split(':').map(part => part.trim());
        if (key && value) {
          result.contact[key.toLowerCase()] = value;
        }
        continue;
      }

      // Simpan waktu pemrosesan
      if (currentListType === 'processingTime') {
        result.processingTime = line;
        continue;
      }

      // Simpan deskripsi
      if (currentListType === 'description') {
        result.description += line + ' ';
        continue;
      }

      // Tambahkan konten ke section saat ini
      if (currentSection) {
        currentSection.content += line + ' ';
      }
    }

    // Trim deskripsi
    result.description = result.description.trim();

    // Trim konten section
    result.sections.forEach(section => {
      section.content = section.content.trim();
    });

    return result;
  } catch (error) {
    console.error('Error converting TXT to JSON:', error.message);
    throw error;
  }
};

// Fungsi untuk mengkonversi JSON ke format TXT
const convertJsonToTxt = (jsonContent) => {
  try {
    let txtContent = '';

    // Tambahkan judul
    if (jsonContent.title) {
      txtContent += `# ${jsonContent.title}\n\n`;
    }

    // Tambahkan deskripsi
    if (jsonContent.description) {
      txtContent += `## Deskripsi\n${jsonContent.description}\n\n`;
    }

    // Tambahkan persyaratan
    if (jsonContent.requirements && jsonContent.requirements.length > 0) {
      txtContent += `## Persyaratan\n`;
      jsonContent.requirements.forEach(req => {
        txtContent += `- ${req}\n`;
      });
      txtContent += '\n';
    }

    // Tambahkan prosedur
    if (jsonContent.procedures && jsonContent.procedures.length > 0) {
      txtContent += `## Prosedur\n`;
      jsonContent.procedures.forEach(proc => {
        txtContent += `- ${proc}\n`;
      });
      txtContent += '\n';
    }

    // Tambahkan biaya
    if (jsonContent.fees && jsonContent.fees.length > 0) {
      txtContent += `## Biaya\n`;
      jsonContent.fees.forEach(fee => {
        txtContent += `- ${fee}\n`;
      });
      txtContent += '\n';
    }

    // Tambahkan waktu pemrosesan
    if (jsonContent.processingTime) {
      txtContent += `## Waktu Pemrosesan\n${jsonContent.processingTime}\n\n`;
    }

    // Tambahkan kontak
    if (jsonContent.contact && Object.keys(jsonContent.contact).length > 0) {
      txtContent += `## Kontak\n`;
      for (const [key, value] of Object.entries(jsonContent.contact)) {
        txtContent += `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}\n`;
      }
      txtContent += '\n';
    }

    // Tambahkan dasar hukum
    if (jsonContent.legalBasis && jsonContent.legalBasis.length > 0) {
      txtContent += `## Dasar Hukum\n`;
      jsonContent.legalBasis.forEach(legal => {
        txtContent += `- ${legal}\n`;
      });
      txtContent += '\n';
    }

    // Tambahkan catatan
    if (jsonContent.notes && jsonContent.notes.length > 0) {
      txtContent += `## Catatan\n`;
      jsonContent.notes.forEach(note => {
        txtContent += `- ${note}\n`;
      });
      txtContent += '\n';
    }

    // Tambahkan section lainnya
    if (jsonContent.sections && jsonContent.sections.length > 0) {
      jsonContent.sections.forEach(section => {
        if (section.title && section.content) {
          txtContent += `## ${section.title}\n${section.content}\n\n`;
        }
      });
    }

    return txtContent;
  } catch (error) {
    console.error('Error converting JSON to TXT:', error.message);
    throw error;
  }
};

// Fungsi untuk mendapatkan konten menu dari file
const getMenuContentFromFile = async (menuId, subMenuId) => {
  try {
    // Tentukan path ke file konten
    const contentPath = path.join(
      process.cwd(),
      'data',
      'menus',
      `${menuId}-menu`,
      `${subMenuId}-sub-menu`,
      'content.txt'
    );

    // Cek apakah file ada
    if (!await fs.pathExists(contentPath)) {
      return null;
    }

    // Baca konten file
    const txtContent = await fs.readFile(contentPath, 'utf8');

    // Konversi ke JSON
    const jsonContent = convertTxtToJson(txtContent);

    return {
      menu_id: menuId,
      sub_menu_id: subMenuId,
      content_json: jsonContent,
      txt_content: txtContent
    };
  } catch (error) {
    console.error('Error getting menu content from file:', error.message);
    throw error;
  }
};

// Fungsi untuk menyimpan konten menu ke file dan database
const saveMenuContent = async (menuId, subMenuId, jsonContent, adminId = null) => {
  try {
    // Konversi JSON ke TXT
    const txtContent = convertJsonToTxt(jsonContent);

    // Tentukan path ke file konten
    const menuPath = path.join(
      process.cwd(),
      'data',
      'menus',
      `${menuId}-menu`
    );
    const subMenuPath = path.join(menuPath, `${subMenuId}-sub-menu`);
    const contentPath = path.join(subMenuPath, 'content.txt');

    // Buat direktori jika belum ada
    await fs.ensureDir(subMenuPath);

    // Tulis konten ke file
    await fs.writeFile(contentPath, txtContent, 'utf8');
    
    // Simpan ke database jika koneksi tersedia
    let result = {
      menu_id: menuId,
      sub_menu_id: subMenuId,
      content_json: jsonContent,
      txt_content: txtContent,
      saved_to_db: false
    };
    
    try {
      const { connectSQLite } = require('../config/sqlite');
      const SQLiteMenuContent = require('../models/SQLiteMenuContent');
      
      // Coba koneksi ke SQLite
      const db = connectSQLite();
      
      if (db) {
        // Instansiasi model dengan koneksi
        const menuContentModel = new SQLiteMenuContent(db);
        
        // Dapatkan konten menu yang sudah ada
        const existingContent = menuContentModel.getMenuContent(menuId, subMenuId);
        
        if (existingContent && existingContent.id) {
          // Update konten menu
          menuContentModel.updateMenuContent(existingContent.id, {
            content_json: jsonContent
          }, adminId);
        } else {
          // Tambahkan konten menu baru
          menuContentModel.addMenuContent({
            menu_id: menuId,
            sub_menu_id: subMenuId,
            content_json: jsonContent
          });
        }
        
        result.saved_to_db = true;
      }
    } catch (dbError) {
      console.error('Error saving to database:', dbError.message);
      // Lanjutkan meskipun gagal menyimpan ke database
    }
    
    return result;
  } catch (error) {
    console.error('Error saving menu content:', error.message);
    throw error;
  }
};

// Fungsi untuk mengkonversi semua file TXT ke JSON dan menyimpannya ke database
const convertAllTxtToJson = async () => {
  try {
    // Import modul database
    const { connectSQLite } = require('../config/sqlite');
    const SQLiteMenuContent = require('../models/SQLiteMenuContent');
    
    // Coba koneksi ke SQLite
    let db = null;
    let connection = null;
    
    try {
      db = connectSQLite();
      connection = db;
    } catch (dbError) {
      console.error('Error connecting to SQLite:', dbError.message);
      // Lanjutkan tanpa koneksi database
    }
    
    // Instansiasi model jika koneksi berhasil
    let menuContentModel = null;
    if (connection) {
      menuContentModel = new SQLiteMenuContent(connection);
    }
    
    // Path ke direktori menu
    const menusPath = path.join(process.cwd(), 'data', 'menus');
    
    // Cek apakah direktori ada
    if (!await fs.pathExists(menusPath)) {
      console.warn('Warning: Menus directory not found');
      return [];
    }
    
    // Baca semua folder menu
    const menuFolders = await fs.readdir(menusPath);
    
    // Hasil konversi
    const results = [];
    
    // Iterasi melalui folder menu
    for (const menuFolder of menuFolders) {
      // Cek apakah folder menu valid
      if (!menuFolder.includes('-menu')) continue;
      
      const menuId = menuFolder.split('-')[0];
      if (!menuId) continue;
      
      const menuPath = path.join(menusPath, menuFolder);
      
      // Baca semua folder sub-menu
      const subMenuFolders = await fs.readdir(menuPath);
      
      // Iterasi melalui folder sub-menu
      for (const subMenuFolder of subMenuFolders) {
        // Cek apakah folder sub-menu valid
        if (!subMenuFolder.includes('-sub-menu')) continue;
        
        const subMenuPath = path.join(menuPath, subMenuFolder);
        const subMenuId = subMenuFolder.split('-')[0];
        if (!subMenuId) continue;
        
        // Cek apakah ada file content.txt
        const contentPath = path.join(subMenuPath, 'content.txt');
        if (!await fs.pathExists(contentPath)) {
          console.warn(`Warning: No content.txt found for menu ${menuId} sub-menu ${subMenuId}`);
          continue;
        }
        
        try {
          // Baca konten file
          const txtContent = await fs.readFile(contentPath, 'utf8');
          
          // Konversi ke JSON
          const jsonContent = convertTxtToJson(txtContent);
          
          // Simpan ke database jika koneksi tersedia
          let savedToDb = false;
          if (connection && menuContentModel) {
            try {
              // Simpan konten ke database
              menuContentModel.addMenuContent({
                menu_id: menuId,
                sub_menu_id: subMenuId,
                content_json: jsonContent
              });
              savedToDb = true;
            } catch (addError) {
              if (addError.message.includes('UNIQUE constraint failed')) {
                // Jika sudah ada, update saja
                // Dapatkan konten menu yang sudah ada
                const existingContent = menuContentModel.getMenuContent(menuId, subMenuId);
                if (existingContent && existingContent.id) {
                  // Update konten menu
                  menuContentModel.updateMenuContent(existingContent.id, {
                    content_json: jsonContent
                  });
                  savedToDb = true;
                }
              } else {
                throw addError;
              }
            }
          }
          
          // Tambahkan hasil konversi
          results.push({
            menu_id: menuId,
            sub_menu_id: subMenuId,
            title: jsonContent.title || `Menu ${menuId} Sub-menu ${subMenuId}`,
            saved_to_db: savedToDb
          });
        } catch (convError) {
          console.error(`Error converting content for menu ${menuId} sub-menu ${subMenuId}:`, convError.message);
          // Lanjutkan ke file berikutnya
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error converting all TXT to JSON:', error.message);
    throw error;
  }
};

module.exports = {
  convertTxtToJson,
  convertJsonToTxt,
  getMenuContentFromFile,
  saveMenuContent,
  convertAllTxtToJson
};