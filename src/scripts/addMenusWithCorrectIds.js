/**
 * Script untuk menambahkan menu dan sub-menu ke database dengan ID yang sesuai
 */

const fs = require('fs-extra');
const path = require('path');
const mysql = require('mysql2/promise');

// Fungsi utama
const main = async () => {
  let connection;
  try {
    console.log('Memulai proses penambahan menu dan sub-menu dengan ID yang sesuai...');
    
    // Koneksi ke database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'bot_layanan_warga'
    });
    console.log('Connected to MySQL');
    
    // Dapatkan semua menu dan sub-menu dari database
    const [existingMenus] = await connection.query('SELECT * FROM menus');
    const [existingSubMenus] = await connection.query('SELECT * FROM sub_menus');
    
    // Buat struktur folder menu dan sub-menu
    const menuBasePath = path.join(process.cwd(), 'uploads', 'menus');
    await fs.ensureDir(menuBasePath);
    
    // Definisikan menu dan sub-menu yang akan ditambahkan
    const menuData = [
      { id: 1, name: 'Administrasi Kependudukan', description: 'Layanan administrasi kependudukan desa', order_num: 1 },
      { id: 2, name: 'Perizinan', description: 'Layanan perizinan desa', order_num: 2 },
      { id: 3, name: 'Keuangan Desa', description: 'Informasi keuangan desa', order_num: 3 },
      { id: 4, name: 'Pertanian', description: 'Informasi pertanian desa', order_num: 4 },
      { id: 5, name: 'Kesehatan', description: 'Layanan kesehatan desa', order_num: 5 },
      { id: 6, name: 'Informasi Desa', description: 'Informasi umum tentang desa', order_num: 6 },
      { id: 7, name: 'Pengaduan', description: 'Layanan pengaduan masyarakat', order_num: 7 },
      { id: 8, name: 'Pendidikan', description: 'Informasi pendidikan di desa', order_num: 8 },
      { id: 9, name: 'Keamanan', description: 'Informasi keamanan desa', order_num: 9 }
    ];
    
    const subMenuData = [
      // Menu 1: Administrasi Kependudukan
      { menu_id: 1, name: 'Pembuatan KTP', description: 'Informasi pembuatan KTP', order_num: 1 },
      { menu_id: 1, name: 'Pembuatan KK', description: 'Informasi pembuatan Kartu Keluarga', order_num: 2 },
      { menu_id: 1, name: 'Akta Kelahiran', description: 'Informasi pembuatan akta kelahiran', order_num: 3 },
      { menu_id: 1, name: 'Akta Kematian', description: 'Informasi pembuatan akta kematian', order_num: 4 },
      { menu_id: 1, name: 'Surat Pindah', description: 'Informasi pembuatan surat pindah', order_num: 5 },
      
      // Menu 2: Perizinan
      { menu_id: 2, name: 'Izin Usaha', description: 'Informasi perizinan usaha', order_num: 1 },
      { menu_id: 2, name: 'Izin Keramaian', description: 'Informasi perizinan keramaian', order_num: 2 },
      { menu_id: 2, name: 'Izin Mendirikan Bangunan', description: 'Informasi IMB', order_num: 3 },
      
      // Menu 3: Keuangan Desa
      { menu_id: 3, name: 'Anggaran Desa', description: 'Informasi anggaran desa', order_num: 1 },
      { menu_id: 3, name: 'Laporan Keuangan', description: 'Laporan keuangan desa', order_num: 2 },
      { menu_id: 3, name: 'Dana Desa', description: 'Informasi dana desa', order_num: 3 },
      
      // Menu 4: Pertanian
      { menu_id: 4, name: 'Jadwal Tanam', description: 'Jadwal tanam pertanian', order_num: 1 },
      { menu_id: 4, name: 'Bantuan Pertanian', description: 'Informasi bantuan pertanian', order_num: 2 },
      { menu_id: 4, name: 'Penyuluhan', description: 'Jadwal penyuluhan pertanian', order_num: 3 },
      
      // Menu 5: Kesehatan
      { menu_id: 5, name: 'Posyandu', description: 'Informasi posyandu desa', order_num: 1 },
      { menu_id: 5, name: 'Puskesmas', description: 'Informasi puskesmas desa', order_num: 2 },
      { menu_id: 5, name: 'Program Kesehatan', description: 'Program kesehatan desa', order_num: 3 },
      { menu_id: 5, name: 'Vaksinasi', description: 'Jadwal vaksinasi', order_num: 4 },
      
      // Menu 6: Informasi Desa
      { menu_id: 6, name: 'Profil Desa', description: 'Profil desa', order_num: 1 },
      { menu_id: 6, name: 'Fasilitas Umum', description: 'Informasi fasilitas umum', order_num: 2 },
      { menu_id: 6, name: 'Potensi Desa', description: 'Potensi desa', order_num: 3 },
      { menu_id: 6, name: 'Kontak Penting', description: 'Kontak penting desa', order_num: 4 },
      
      // Menu 7: Pengaduan
      { menu_id: 7, name: 'Jalan Rusak', description: 'Pengaduan jalan rusak', order_num: 1 },
      { menu_id: 7, name: 'Kebakaran', description: 'Pengaduan kebakaran', order_num: 2 },
      { menu_id: 7, name: 'Bencana Alam', description: 'Pengaduan bencana alam', order_num: 3 },
      { menu_id: 7, name: 'Keamanan', description: 'Pengaduan masalah keamanan', order_num: 4 },
      
      // Menu 8: Pendidikan
      { menu_id: 8, name: 'Sekolah', description: 'Informasi sekolah di desa', order_num: 1 },
      { menu_id: 8, name: 'Beasiswa', description: 'Informasi beasiswa', order_num: 2 },
      { menu_id: 8, name: 'PAUD', description: 'Informasi PAUD di desa', order_num: 3 },
      
      // Menu 9: Keamanan
      { menu_id: 9, name: 'Pos Kamling', description: 'Informasi pos kamling', order_num: 1 },
      { menu_id: 9, name: 'Ronda', description: 'Jadwal ronda desa', order_num: 2 },
      { menu_id: 9, name: 'Kontak Darurat', description: 'Kontak darurat keamanan', order_num: 3 }
    ];
    
    // Tambahkan menu ke database
    let menuAddedCount = 0;
    for (const menu of menuData) {
      // Cek apakah menu sudah ada di database
      const existingMenu = existingMenus.find(m => m.id === menu.id);
      
      if (!existingMenu) {
        // Tambahkan menu baru ke database
        await connection.query(
          'INSERT INTO menus (id, name, description, order_num, is_active) VALUES (?, ?, ?, ?, ?)',
          [menu.id, menu.name, menu.description, menu.order_num, 1]
        );
        console.log(`Menu baru ditambahkan: ${menu.name} (ID: ${menu.id})`);
        menuAddedCount++;
        
        // Buat folder menu
        const menuFolderName = `${menu.id}-${menu.name.replace(/ /g, '_')}`;
        const menuPath = path.join(menuBasePath, menuFolderName);
        await fs.ensureDir(menuPath);
        console.log(`Created menu folder: ${menuFolderName}`);
      } else {
        console.log(`Menu sudah ada: ${menu.name} (ID: ${menu.id})`);
      }
    }
    
    // Tambahkan sub-menu ke database
    let subMenuAddedCount = 0;
    for (const subMenu of subMenuData) {
      // Cek apakah sub-menu sudah ada di database
      const existingSubMenu = existingSubMenus.find(sm => 
        sm.menu_id === subMenu.menu_id && sm.order_num === subMenu.order_num
      );
      
      if (!existingSubMenu) {
        // Tambahkan sub-menu baru ke database
        const [result] = await connection.query(
          'INSERT INTO sub_menus (menu_id, name, description, order_num, is_active) VALUES (?, ?, ?, ?, ?)',
          [subMenu.menu_id, subMenu.name, subMenu.description, subMenu.order_num, 1]
        );
        const subMenuId = result.insertId;
        console.log(`Sub-menu baru ditambahkan: ${subMenu.name} (ID: ${subMenuId}, Menu ID: ${subMenu.menu_id}, Order: ${subMenu.order_num})`);
        subMenuAddedCount++;
        
        // Dapatkan menu yang sesuai
        const menu = menuData.find(m => m.id === subMenu.menu_id);
        if (menu) {
          // Buat folder sub-menu
          const menuFolderName = `${menu.id}-${menu.name.replace(/ /g, '_')}`;
          const subMenuFolderName = `${subMenu.order_num}${String.fromCharCode(65)}-${subMenu.name.replace(/ /g, '_')}`;
          const menuPath = path.join(menuBasePath, menuFolderName);
          const subMenuPath = path.join(menuPath, subMenuFolderName);
          await fs.ensureDir(subMenuPath);
          console.log(`Created sub-menu folder: ${menuFolderName}/${subMenuFolderName}`);
          
          // Buat file content.txt
          const contentPath = path.join(subMenuPath, 'content.txt');
          if (!await fs.pathExists(contentPath)) {
            await fs.writeFile(contentPath, `# ${subMenu.name}\n\n## Informasi\n\nIsi informasi tentang ${subMenu.name} di sini.\n\n1. Item 1\n2. Item 2\n3. Item 3\n\nUntuk informasi lebih lanjut, hubungi petugas desa.`);
            console.log(`Created content.txt for ${menuFolderName}/${subMenuFolderName}`);
            
            // Konversi ke JSON dan simpan ke database
            const txtContent = await fs.readFile(contentPath, 'utf8');
            const jsonContent = convertTxtToJson(txtContent);
            
            // Simpan ke database
            await connection.query(
              'INSERT INTO menu_contents (menu_id, sub_menu_id, content_json) VALUES (?, ?, ?)',
              [subMenu.menu_id, subMenuId, JSON.stringify(jsonContent)]
            );
            console.log(`Konten untuk menu ${subMenu.menu_id}, sub-menu ${subMenuId} berhasil ditambahkan`);
          }
        }
      } else {
        console.log(`Sub-menu sudah ada: ${subMenu.name} (Menu ID: ${subMenu.menu_id}, Order: ${subMenu.order_num})`);
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