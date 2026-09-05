/**
 * Controller untuk mengelola menu dan sub-menu
 */

const fs = require('fs-extra');
const path = require('path');

// HAPUS: require ke uploads/menus sebagai module karena file index.js sudah dihapus
// const menuDefinitions = require(path.join(process.cwd(), 'uploads', 'menus'));

// Helper: Baca struktur menu dari uploads/menus (selalu 6 menu utama)
const readMenusFromFS = async () => {
  const basePath = path.join(process.cwd(), 'uploads', 'menus');
  const result = [];
  try {
    const mainMenus = await fs.readdir(basePath);
    // Urutkan berdasarkan angka prefix
    const sorted = mainMenus
      .filter((name) => /^(\d+)-/.test(name))
      .sort((a, b) => parseInt(a) - parseInt(b));

    for (const folderName of sorted) {
      const mainPath = path.join(basePath, folderName);
      const stat = await fs.stat(mainPath).catch(() => null);
      if (!stat || !stat.isDirectory()) continue;

      const match = folderName.match(/^(\d+)-(.+)$/);
      if (!match) continue;
      const id = parseInt(match[1]);
      const name = match[2].replace(/_/g, ' ');

      // Ambil submenus (A, B, C ...)
      const subMenus = [];
      const entries = await fs.readdir(mainPath).catch(() => []);
      const subSorted = entries
        .filter((n) => /^(\d+[A-Za-z])-/.test(n))
        .sort((a, b) => a.localeCompare(b));
      for (const subFolder of subSorted) {
        const subPath = path.join(mainPath, subFolder);
        const sStat = await fs.stat(subPath).catch(() => null);
        if (!sStat || !sStat.isDirectory()) continue;
        const sm = subFolder.match(/^(\d+)([A-Za-z])-(.+)$/);
        if (!sm) continue;
        const letter = sm[2].toUpperCase();
        const subName = sm[3].replace(/_/g, ' ');
        subMenus.push({ letter, name: subName, folder: subFolder });
      }

      result.push({ id, name, folder: folderName, subMenus });
    }
  } catch (e) {
    console.error('Gagal membaca struktur menus dari filesystem:', e.message);
  }
  return result;
};

// Helper: cari menu by id
const getMenuByIdFS = async (menuId) => {
  const menus = await readMenusFromFS();
  return menus.find((m) => m.id === parseInt(menuId));
};

// Helper: sub-menu virtual untuk Informasi Desa (menu 4)
// 4E: Informasi Wisata (uploads/tourism)
// 4F: Berita Desa (uploads/news)
// 4G: Informasi Desa (uploads/village_info)
const getVirtualSubMenusForInformasiDesa = async () => {
  return [
    { letter: 'E', name: 'Informasi Wisata (tourism)', virtual: true },
    { letter: 'F', name: 'Berita Desa (news)', virtual: true },
    { letter: 'G', name: 'Profil/Informasi Desa (village_info)', virtual: true }
  ];
};

// Fungsi untuk membersihkan chat memory yang tidak aktif
const cleanupInactiveMemory = async (hours = 24) => {
  try {
    // Gunakan SQLite untuk membersihkan chat memory
    const { connectSQLite } = require('../config/sqlite');
    const SQLiteChat = require('../models/SQLiteChat');
    
    // Buat koneksi database terlebih dahulu
    const db = connectSQLite();
    
    if (!db) {
      console.error('Error connecting to SQLite database');
      return false;
    }
    
    try {
      const chatModel = new SQLiteChat(db);
      
      // Bersihkan chat memory yang tidak aktif selama periode tertentu
      const result = await chatModel.cleanupInactiveMemory(hours);
      console.log(`Membersihkan chat memory yang tidak aktif selama ${hours} jam. ${result?.deleted || 0} item dihapus.`);
      
      return true;
    } catch (innerError) {
      console.error('Error saat membersihkan chat memory:', innerError.message);
      return false;
    }
  } catch (error) {
    console.error('Error saat membersihkan chat memory:', error.message);
    return false;
  }
};

// Fungsi untuk membaca struktur menu dari folder
const readMenuStructure = async () => {
  try {
    const menus = await readMenusFromFS();
    // Tambahkan virtual submenus untuk menu 4 (Informasi Desa)
    for (const m of menus) {
      if (m.id === 4) {
        const virtuals = await getVirtualSubMenusForInformasiDesa();
        // Hanya tambahkan jika huruf belum dipakai
        const existingLetters = new Set(m.subMenus.map((s) => s.letter));
        for (const v of virtuals) {
          if (!existingLetters.has(v.letter)) {
            m.subMenus.push({ letter: v.letter, name: v.name, folder: null, virtual: true });
          }
        }
        // Urutkan ulang by letter
        m.subMenus.sort((a, b) => a.letter.localeCompare(b.letter));
      }
    }
    return menus;
  } catch (error) {
    console.error('Error saat membaca struktur menu:', error.message);
    return [];
  }
};

// Fungsi untuk memformat menu menjadi pesan WhatsApp
const formatMenuMessage = async (menuModel) => {
  try {
    const menus = await readMenusFromFS();

    if (!menus || menus.length === 0) {
      return { text: 'Maaf, menu tidak tersedia saat ini.\n\nDibuat oleh Mahasiswa UMSU' };
    }

    // Header dengan design yang lebih menarik
    let message = '🏛️ *LAYANAN DIGITAL PULOSAROK* \n';
    message += '═'.repeat(35) + '\n\n';
    
    // Deskripsi singkat
    message += '📋 *Pilih layanan yang Anda butuhkan:*\n\n';

    // Menu dengan emoji dan deskripsi
    const menuDescriptions = {
      1: { emoji: '👥', desc: 'Layanan administrasi kependudukan' },
      2: { emoji: '📄', desc: 'Pengurusan izin dan perizinan' },
      3: { emoji: '🏥', desc: 'Informasi kesehatan masyarakat' },
      4: { emoji: '📢', desc: 'Berita dan informasi desa' },
      5: { emoji: '🏪', desc: 'Informasi UMKM desa' },
      6: { emoji: '🔍', desc: 'Pencarian berita dan informasi' },
      7: { emoji: '📝', desc: 'Aduan layanan publik' }
    };

    for (const m of menus) {
      const menuInfo = menuDescriptions[m.id] || { emoji: '📌', desc: 'Layanan desa' };
      message += `${menuInfo.emoji} *${m.id}. ${m.name}*\n`;
      message += `   ${menuInfo.desc}\n\n`;
    }

    // Separator
    message += '─'.repeat(35) + '\n\n';
    
    // Tutorial penggunaan
    message += '📱 *CARA PENGGUNAAN:*\n';
    message += '• Ketik *nomor menu* (contoh: 1)\n';
    message += '• Ketik *kode langsung* (contoh: 1A, 4E)\n';
    message += '• Ketik *reset* untuk kembali ke menu\n';
    message += '• Ketik *menu* untuk menampilkan menu ini\n\n';
    
    
    
    // Informasi layanan
    message += '⏰ *JAM LAYANAN:*\n';
    message += 'Senin - Jumat: 08:00 - 16:00 WIB\n';
    message += 'Sabtu: 08:00 - 12:00 WIB\n\n';
    
    message += '📞 *KONTAK DARURAT:*\n';
    message += 'Kantor Desa: (0274) 123-4567\n';
    message += 'WhatsApp: 0812-3456-7890\n\n';
    
    // Footer
    message += '═'.repeat(35) + '\n';
    message += '💡 *Tips:* Gunakan kata kunci yang jelas\n';
    message += '_Sistem dibuat oleh Mahasiswa UMSU_';

    return { text: message };
  } catch (error) {
    console.error('Error saat memformat pesan menu:', error.message);
    return { text: 'Maaf, terjadi kesalahan saat memuat menu.' };
  }
};

// Fungsi untuk memformat submenu berdasarkan menu utama
const formatSubMenuMessage = async (menuModel, mainMenuId) => {
  try {
    const menuId = parseInt(mainMenuId);
    const menus = await readMenuStructure();
    const selected = menus.find((m) => m.id === menuId);

    if (!selected) {
      return { text: `Maaf, menu dengan ID ${menuId} tidak tersedia.\n\nDibuat oleh Mahasiswa UMSU` };
    }

    let responseText = `*${selected.id}. ${selected.name}*\n\n`;
    selected.subMenus.forEach((s) => {
      responseText += `${selected.id}${s.letter}. ${s.name}\n`;
    });

    responseText += '\nKetik kode sub menu (contoh: 1A atau 4E) untuk melihat detail layanan.';
    responseText += '\nKetik 0 atau kembali untuk kembali ke menu utama.';
    responseText += '\n\n─'.repeat(35) + '\n';
    responseText += '_Dibuat oleh Mahasiswa UMSU_';

    return { text: responseText };
  } catch (error) {
    console.error('Error saat memformat pesan sub menu:', error.message);
    return { text: 'Maaf, terjadi kesalahan saat memuat sub menu.' };
  }
};

// Helper: buat teks daftar file dari sebuah folder
const readFolderItemsAsList = async (folderPath) => {
  try {
    const exists = await fs.pathExists(folderPath);
    if (!exists) return 'Belum ada data.';
    const items = await fs.readdir(folderPath);
    if (!items || items.length === 0) return 'Belum ada data.';
    // Tampilkan maksimum 20 agar tidak terlalu panjang
    const maxShow = 20;
    const limited = items.slice(0, maxShow);
    let txt = limited.map((f, i) => `- ${f}`).join('\n');
    if (items.length > maxShow) txt += `\n... dan ${items.length - maxShow} item lainnya`;
    return txt;
  } catch (e) {
    return 'Belum ada data.';
  }
};

// Fungsi untuk mendapatkan konten sub-menu berdasarkan ID
const getSubMenuContent = async (menuContentModel, mainMenuId, subMenuLetter) => {
  try {
    // Normalisasi input seperti "1A" atau (1,"A")
    const match = String(subMenuLetter).match(/^(\d+)?([A-Za-z])$/);
    let menuId = parseInt(mainMenuId);
    let letter = String(subMenuLetter).toUpperCase();
    if (match && match[1] && match[2]) {
      menuId = parseInt(match[1]);
      letter = match[2].toUpperCase();
    } else if (/^[A-Za-z]$/.test(letter)) {
      // letter already correct
    } else {
      // Fallback: coba ekstrak huruf terakhir
      const letters = String(subMenuLetter).toUpperCase().match(/[A-Z]/g);
      if (letters && letters.length) letter = letters[letters.length - 1];
    }

    // Tangani sub-menu virtual Informasi Desa
    if (menuId === 4 && ['E', 'F', 'G'].includes(letter)) {
      let title = '';
      let dir = '';
      if (letter === 'E') {
        title = '*4E. Informasi Wisata*';
        dir = path.join(process.cwd(), 'uploads', 'tourism');
      } else if (letter === 'F') {
        title = '*4F. Berita Desa*';
        dir = path.join(process.cwd(), 'uploads', 'news');
      } else if (letter === 'G') {
        title = '*4G. Profil/Informasi Desa*';
        dir = path.join(process.cwd(), 'uploads', 'village_info');
      }
      const listTxt = await readFolderItemsAsList(dir);
      return { text: `${title}\n\n${listTxt}` };
    }

    // Untuk sub-menu berbasis file biasa
    const selectedMenu = await getMenuByIdFS(menuId);
    if (!selectedMenu) {
      return { text: `Maaf, menu dengan ID ${menuId} tidak ditemukan.\n\nDibuat oleh Mahasiswa UMSU` };
    }

    const sub = selectedMenu.subMenus.find((s) => String(s.letter).toUpperCase() === letter);
    if (!sub) {
      return { text: `Maaf, sub-menu ${menuId}${letter} tidak ditemukan.\n\nDibuat oleh Mahasiswa UMSU` };
    }

    const basePath = path.join(process.cwd(), 'uploads', 'menus');
    const subPath = path.join(basePath, selectedMenu.folder, sub.folder);
    const contentPath = path.join(subPath, 'content.txt');

    try {
      const exists = await fs.pathExists(contentPath);
      if (!exists) {
        return { text: `*${menuId}${letter}. ${sub.name}*\n\nMaaf, konten untuk sub-menu ini belum tersedia.\n\n─`.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_' };
      }
      let content = await fs.readFile(contentPath, 'utf-8');
      
      // Tangani placeholder dinamis untuk UMKM (menu 5A)
      if (menuId === 5 && letter === 'A' && content.includes('{{DYNAMIC_UMKM_LIST}}')) {
        try {
          const { replaceDynamicUMKMContent } = require('./umkmController');
          content = await replaceDynamicUMKMContent(content);
        } catch (umkmError) {
          console.error('Error saat memproses konten UMKM dinamis:', umkmError.message);
          // Fallback: ganti placeholder dengan pesan error
          content = content.replace('{{DYNAMIC_UMKM_LIST}}', 'Maaf, terjadi kesalahan saat memuat data UMKM.');
        }
      }
      
      return { text: `*${menuId}${letter}. ${sub.name}*\n\n${content}\n\n─`.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_' };
    } catch (fileErr) {
      console.error('Gagal membaca content.txt:', fileErr);
      return { text: `*${menuId}${letter}. ${sub.name}*\n\nMaaf, terjadi kesalahan saat membaca konten sub-menu.\n\n─`.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_' };
    }
  } catch (error) {
    console.error('Error saat mendapatkan konten sub-menu:', error.message);
    return { text: 'Maaf, terjadi kesalahan saat memuat konten sub-menu.' };
  }
};

module.exports = {
  cleanupInactiveMemory,
  readMenuStructure,
  formatMenuMessage,
  formatSubMenuMessage,
  getSubMenuContent
};