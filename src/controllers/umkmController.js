/**
 * Controller untuk mengelola UMKM melalui WhatsApp
 */

const SQLiteUMKM = require('../models/SQLiteUMKM');
const Database = require('better-sqlite3');
const path = require('path');

// Inisialisasi database
const dbPath = path.join(__dirname, '../../database/bot.db');
const db = new Database(dbPath);
const umkmModel = new SQLiteUMKM(db);

/**
 * Menambahkan UMKM baru melalui perintah admin
 * Format: !umkmadd nama|deskripsi|kategori|alamat|kontak|telepon
 */
const addUMKM = async (message, from) => {
  try {
    // Parse pesan untuk mendapatkan data UMKM
    const parts = message.replace('!umkmadd ', '').split('|');
    
    if (parts.length < 2) {
      return {
        text: '❌ *Format salah!*\n\n' +
              '📝 *Format yang benar:*\n' +
              '`!umkmadd nama|deskripsi|kategori|alamat|kontak|telepon`\n\n' +
              '📋 *Contoh:*\n' +
              '`!umkmadd Warung Bu Sari|Warung makan tradisional|kuliner|Jl. Raya No.1|Bu Sari|08123456789`\n\n' +
              '⚠️ *Minimal nama dan deskripsi harus diisi*'
      };
    }
    
    const [nama, deskripsi, kategori, alamat, kontak_person, nomor_telepon] = parts.map(p => p.trim());
    
    if (!nama || !deskripsi) {
      return {
        text: '❌ *Nama dan deskripsi UMKM wajib diisi!*\n\n' +
              '📝 Silakan gunakan format yang benar.'
      };
    }
    
    const umkmData = {
      nama,
      deskripsi,
      kategori: kategori || 'umum',
      alamat: alamat || '',
      kontak_person: kontak_person || '',
      nomor_telepon: nomor_telepon || ''
    };
    
    const newUMKM = umkmModel.addUMKM(umkmData);
    
    return {
      text: '✅ *UMKM berhasil ditambahkan!*\n\n' +
            `🏪 *Nama:* ${newUMKM.nama}\n` +
            `📝 *Deskripsi:* ${newUMKM.deskripsi}\n` +
            `🏷️ *Kategori:* ${newUMKM.kategori}\n` +
            `📍 *Alamat:* ${newUMKM.alamat || 'Belum diisi'}\n` +
            `👤 *Kontak:* ${newUMKM.kontak_person || 'Belum diisi'}\n` +
            `📞 *Telepon:* ${newUMKM.nomor_telepon || 'Belum diisi'}\n\n` +
            `🆔 *ID UMKM:* ${newUMKM.id}`
    };
    
  } catch (error) {
    console.error('Error saat menambahkan UMKM:', error);
    return {
      text: '❌ *Gagal menambahkan UMKM!*\n\n' +
            '🔧 Terjadi kesalahan sistem. Silakan coba lagi.'
    };
  }
};

/**
 * Menampilkan daftar UMKM
 * Format: !umkmlist [kategori]
 */
const listUMKM = async (message, from) => {
  try {
    const parts = message.split(' ');
    const kategori = parts[1] ? parts[1].trim() : null;
    
    let umkmList;
    if (kategori) {
      umkmList = umkmModel.getUMKMByKategori(kategori);
    } else {
      umkmList = umkmModel.getAllUMKM();
    }
    
    if (umkmList.length === 0) {
      const kategoriText = kategori ? ` kategori "${kategori}"` : '';
      return {
        text: `📋 *Daftar UMKM${kategoriText}*\n\n` +
              '❌ Belum ada UMKM yang terdaftar.\n\n' +
              '💡 *Tip:* Gunakan `!umkmadd` untuk menambahkan UMKM baru.'
      };
    }
    
    let response = `📋 *Daftar UMKM${kategori ? ` - ${kategori.toUpperCase()}` : ''}*\n`;
    response += '═'.repeat(30) + '\n\n';
    
    umkmList.forEach((umkm, index) => {
      response += `${index + 1}. 🏪 *${umkm.nama}*\n`;
      response += `   📝 ${umkm.deskripsi}\n`;
      response += `   🏷️ Kategori: ${umkm.kategori}\n`;
      if (umkm.alamat) {
        response += `   📍 ${umkm.alamat}\n`;
      }
      if (umkm.nomor_telepon) {
        response += `   📞 ${umkm.nomor_telepon}\n`;
      }
      response += `   🆔 ID: ${umkm.id}\n\n`;
    });
    
    // Tambahkan statistik
    const stats = umkmModel.getUMKMStats();
    response += '─'.repeat(30) + '\n';
    response += `📊 *Total UMKM:* ${stats.total_umkm}\n\n`;
    
    // Tampilkan kategori yang tersedia
    const kategoriList = umkmModel.getKategoriList();
    if (kategoriList.length > 0) {
      response += '🏷️ *Kategori tersedia:*\n';
      response += kategoriList.map(k => `• ${k}`).join('\n');
    }
    
    return { text: response };
    
  } catch (error) {
    console.error('Error saat menampilkan daftar UMKM:', error);
    return {
      text: '❌ *Gagal menampilkan daftar UMKM!*\n\n' +
            '🔧 Terjadi kesalahan sistem. Silakan coba lagi.'
    };
  }
};

/**
 * Mengedit UMKM
 * Format: !umkmedit id|field|value
 */
const editUMKM = async (message, from) => {
  try {
    const parts = message.replace('!umkmedit ', '').split('|');
    
    if (parts.length < 3) {
      return {
        text: '❌ *Format salah!*\n\n' +
              '📝 *Format yang benar:*\n' +
              '`!umkmedit id|field|value`\n\n' +
              '📋 *Field yang bisa diedit:*\n' +
              '• nama\n• deskripsi\n• kategori\n• alamat\n• kontak_person\n• nomor_telepon\n\n' +
              '📋 *Contoh:*\n' +
              '`!umkmedit 1|nama|Warung Bu Sari Baru`\n' +
              '`!umkmedit 1|alamat|Jl. Raya No.2`'
      };
    }
    
    const [id, field, value] = parts.map(p => p.trim());
    
    if (!id || !field || !value) {
      return {
        text: '❌ *Semua field harus diisi!*\n\n' +
              '📝 Format: `!umkmedit id|field|value`'
      };
    }
    
    // Validasi field yang diizinkan
    const allowedFields = ['nama', 'deskripsi', 'kategori', 'alamat', 'kontak_person', 'nomor_telepon'];
    if (!allowedFields.includes(field)) {
      return {
        text: '❌ *Field tidak valid!*\n\n' +
              '📋 *Field yang bisa diedit:*\n' +
              allowedFields.map(f => `• ${f}`).join('\n')
      };
    }
    
    // Cek apakah UMKM ada
    const existingUMKM = umkmModel.getUMKMById(parseInt(id));
    if (!existingUMKM) {
      return {
        text: `❌ *UMKM dengan ID ${id} tidak ditemukan!*\n\n` +
              '💡 Gunakan `!umkmlist` untuk melihat daftar UMKM.'
      };
    }
    
    // Update UMKM
    const updateData = { [field]: value };
    const updatedUMKM = umkmModel.updateUMKM(parseInt(id), updateData);
    
    return {
      text: '✅ *UMKM berhasil diperbarui!*\n\n' +
            `🏪 *${updatedUMKM.nama}*\n` +
            `📝 ${updatedUMKM.deskripsi}\n` +
            `🏷️ Kategori: ${updatedUMKM.kategori}\n` +
            `📍 Alamat: ${updatedUMKM.alamat || 'Belum diisi'}\n` +
            `👤 Kontak: ${updatedUMKM.kontak_person || 'Belum diisi'}\n` +
            `📞 Telepon: ${updatedUMKM.nomor_telepon || 'Belum diisi'}\n\n` +
            `🔄 *Field yang diubah:* ${field} → ${value}`
    };
    
  } catch (error) {
    console.error('Error saat mengedit UMKM:', error);
    return {
      text: '❌ *Gagal mengedit UMKM!*\n\n' +
            '🔧 Terjadi kesalahan sistem. Silakan coba lagi.'
    };
  }
};

/**
 * Menghapus UMKM
 * Format: !umkmdelete id
 */
const deleteUMKM = async (message, from) => {
  try {
    const parts = message.split(' ');
    const id = parts[1] ? parts[1].trim() : null;
    
    if (!id) {
      return {
        text: '❌ *Format salah!*\n\n' +
              '📝 *Format yang benar:*\n' +
              '`!umkmdelete id`\n\n' +
              '📋 *Contoh:*\n' +
              '`!umkmdelete 1`'
      };
    }
    
    // Cek apakah UMKM ada
    const existingUMKM = umkmModel.getUMKMById(parseInt(id));
    if (!existingUMKM) {
      return {
        text: `❌ *UMKM dengan ID ${id} tidak ditemukan!*\n\n` +
              '💡 Gunakan `!umkmlist` untuk melihat daftar UMKM.'
      };
    }
    
    // Hapus UMKM (soft delete)
    umkmModel.deleteUMKM(parseInt(id));
    
    return {
      text: '✅ *UMKM berhasil dihapus!*\n\n' +
            `🏪 *${existingUMKM.nama}* telah dihapus dari daftar UMKM.\n\n` +
            '💡 *Catatan:* Data masih tersimpan di database dengan status nonaktif.'
    };
    
  } catch (error) {
    console.error('Error saat menghapus UMKM:', error);
    return {
      text: '❌ *Gagal menghapus UMKM!*\n\n' +
            '🔧 Terjadi kesalahan sistem. Silakan coba lagi.'
    };
  }
};

/**
 * Menampilkan statistik UMKM
 * Format: !umkmstats
 */
const getUMKMStats = async (message, from) => {
  try {
    const stats = umkmModel.getUMKMStats();
    
    let response = '📊 *Statistik UMKM Desa*\n';
    response += '═'.repeat(25) + '\n\n';
    response += `🏪 *Total UMKM:* ${stats.total_umkm}\n\n`;
    
    if (stats.per_kategori.length > 0) {
      response += '📈 *Per Kategori:*\n';
      stats.per_kategori.forEach((kategori, index) => {
        response += `${index + 1}. ${kategori.kategori}: ${kategori.jumlah} UMKM\n`;
      });
    } else {
      response += '📋 Belum ada data kategori.\n';
    }
    
    response += '\n💡 *Tip:* Gunakan `!umkmadd` untuk menambahkan UMKM baru.';
    
    return { text: response };
    
  } catch (error) {
    console.error('Error saat menampilkan statistik UMKM:', error);
    return {
      text: '❌ *Gagal menampilkan statistik UMKM!*\n\n' +
            '🔧 Terjadi kesalahan sistem. Silakan coba lagi.'
    };
  }
};

/**
 * Mengganti placeholder dalam konten menu dengan data UMKM dari database
 */
const replaceDynamicUMKMContent = (content) => {
  try {
    if (!content.includes('{{DYNAMIC_UMKM_LIST}}')) {
      return content;
    }

    // Ambil semua UMKM dari database
    const umkmList = umkmModel.getAllUMKM('aktif');
    
    if (!umkmList || umkmList.length === 0) {
      const noDataMessage = '📭 *Belum ada UMKM yang terdaftar*\n\n' +
                           '💡 Untuk mendaftarkan UMKM, hubungi admin desa.\n\n' +
                           '📞 Admin: 0812-3456-7890';
      return content.replace('{{DYNAMIC_UMKM_LIST}}', noDataMessage);
    }

    // Format daftar UMKM berdasarkan kategori
    const kategoris = {};
    umkmList.forEach(umkm => {
      const kategori = umkm.kategori || 'lainnya';
      if (!kategoris[kategori]) {
        kategoris[kategori] = [];
      }
      kategoris[kategori].push(umkm);
    });

    let umkmContent = '';
    const kategoriIcons = {
      'kuliner': '🍽️',
      'retail': '🛍️', 
      'jasa': '🔧',
      'pertanian': '🌾',
      'fashion': '👕',
      'lainnya': '📦'
    };

    Object.keys(kategoris).forEach(kategori => {
      const icon = kategoriIcons[kategori] || '📦';
      umkmContent += `\n${icon} *${kategori.toUpperCase()}*\n`;
      umkmContent += '─'.repeat(20) + '\n';
      
      kategoris[kategori].forEach((umkm, index) => {
        umkmContent += `\n${index + 1}. *${umkm.nama}*\n`;
        umkmContent += `   📝 ${umkm.deskripsi}\n`;
        umkmContent += `   📍 ${umkm.alamat || 'Alamat belum tersedia'}\n`;
        if (umkm.kontak_telepon) {
          umkmContent += `   📞 ${umkm.kontak_telepon}\n`;
        }
        if (umkm.kontak_whatsapp) {
          umkmContent += `   💬 ${umkm.kontak_whatsapp}\n`;
        }
        if (umkm.jam_operasional) {
          umkmContent += `   🕒 ${umkm.jam_operasional}\n`;
        }
        umkmContent += '\n';
      });
    });

    umkmContent += `\n📊 *Total: ${umkmList.length} UMKM terdaftar*\n`;
    
    return content.replace('{{DYNAMIC_UMKM_LIST}}', umkmContent);
  } catch (error) {
    console.error('Error replacing dynamic UMKM content:', error.message);
    const errorMessage = '❌ *Terjadi kesalahan saat memuat data UMKM*\n\n' +
                        '🔄 Silakan coba lagi atau hubungi admin.';
    return content.replace('{{DYNAMIC_UMKM_LIST}}', errorMessage);
  }
};

/**
 * Menangani perintah UMKM dari user biasa
 */
const handleUMKMCommand = async (message, from) => {
  try {
    const command = message.toLowerCase().trim();
    
    // Daftar semua UMKM
    if (command === 'daftar umkm' || command === 'list umkm') {
      const umkmList = umkmModel.getAllUMKM('aktif');
      
      if (!umkmList || umkmList.length === 0) {
        return {
          text: '📭 *Belum ada UMKM yang terdaftar*\n\n' +
                '💡 Untuk mendaftarkan UMKM, hubungi admin desa.\n\n' +
                '📞 Admin: 0812-3456-7890\n\n' +
                '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
        };
      }
      
      return formatUMKMList(umkmList, 'Semua UMKM');
    }
    
    // Daftar kategori UMKM
    if (command === 'kategori umkm' || command === 'kategori') {
      const kategoris = umkmModel.getKategoriList();
      
      let response = '📂 *KATEGORI UMKM TERSEDIA*\n';
      response += '═'.repeat(25) + '\n\n';
      
      if (kategoris && kategoris.length > 0) {
        kategoris.forEach((kat, index) => {
          const icon = getKategoriIcon(kat.kategori);
          response += `${icon} *${kat.kategori.toUpperCase()}* (${kat.jumlah} UMKM)\n`;
        });
        
        response += '\n💡 *Cara menggunakan:*\n';
        response += '• Ketik "umkm [kategori]" untuk melihat UMKM per kategori\n';
        response += '• Contoh: "umkm kuliner" atau "umkm jasa"';
      } else {
        response += '📭 Belum ada kategori UMKM yang tersedia.';
      }
      
      response += '\n\n' + '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_';
      return { text: response };
    }
    
    // Filter berdasarkan kategori
    if (command.startsWith('umkm ')) {
      const kategori = command.replace('umkm ', '').trim();
      const umkmList = umkmModel.getUMKMByKategori(kategori);
      
      if (!umkmList || umkmList.length === 0) {
        return {
          text: `📭 *Tidak ada UMKM dengan kategori "${kategori}"*\n\n` +
                '💡 Ketik "kategori umkm" untuk melihat kategori yang tersedia.\n\n' +
                '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
        };
      }
      
      return formatUMKMList(umkmList, `UMKM Kategori: ${kategori.toUpperCase()}`);
    }
    
    // Pencarian berdasarkan nama
    if (command.startsWith('cari umkm ')) {
      const keyword = command.replace('cari umkm ', '').trim();
      const umkmList = umkmModel.searchUMKMByNama(keyword);
      
      if (!umkmList || umkmList.length === 0) {
        return {
          text: `🔍 *Tidak ditemukan UMKM dengan kata kunci "${keyword}"*\n\n` +
                '💡 Coba gunakan kata kunci lain atau ketik "daftar umkm" untuk melihat semua.\n\n' +
                '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
        };
      }
      
      return formatUMKMList(umkmList, `Hasil Pencarian: "${keyword}"`);
    }
    
    // Perintah tidak dikenali
    return {
      text: '❓ *Perintah tidak dikenali*\n\n' +
            '📋 *Perintah yang tersedia:*\n' +
            '• "daftar umkm" - Lihat semua UMKM\n' +
            '• "kategori umkm" - Lihat kategori\n' +
            '• "umkm [kategori]" - Filter berdasarkan kategori\n' +
            '• "cari umkm [nama]" - Cari berdasarkan nama\n\n' +
            '💡 Contoh: "umkm kuliner" atau "cari umkm warung"\n\n' +
            '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
    };
    
  } catch (error) {
    console.error('Error handling UMKM command:', error.message);
    return {
      text: '❌ *Terjadi kesalahan*\n\n' +
            '🔄 Silakan coba lagi atau hubungi admin.\n\n' +
            '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
    };
  }
};

/**
 * Format daftar UMKM untuk ditampilkan
 */
const formatUMKMList = (umkmList, title) => {
  let response = `🏪 *${title.toUpperCase()}*\n`;
  response += '═'.repeat(title.length + 5) + '\n\n';
  
  umkmList.forEach((umkm, index) => {
    const icon = getKategoriIcon(umkm.kategori);
    response += `${icon} *${index + 1}. ${umkm.nama}*\n`;
    response += `📝 ${umkm.deskripsi}\n`;
    response += `📂 Kategori: ${umkm.kategori}\n`;
    response += `📍 ${umkm.alamat || 'Alamat belum tersedia'}\n`;
    
    if (umkm.kontak_telepon) {
      response += `📞 ${umkm.kontak_telepon}\n`;
    }
    if (umkm.kontak_whatsapp) {
      response += `💬 WA: ${umkm.kontak_whatsapp}\n`;
    }
    if (umkm.kontak_email) {
      response += `📧 ${umkm.kontak_email}\n`;
    }
    if (umkm.jam_operasional) {
      response += `🕒 ${umkm.jam_operasional}\n`;
    }
    if (umkm.website) {
      response += `🌐 ${umkm.website}\n`;
    }
    if (umkm.media_sosial) {
      response += `📱 ${umkm.media_sosial}\n`;
    }
    
    response += '\n' + '─'.repeat(25) + '\n\n';
  });
  
  response += `📊 *Total: ${umkmList.length} UMKM*\n\n`;
  response += '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_';
  
  return { text: response };
};

/**
 * Mendapatkan icon berdasarkan kategori
 */
const getKategoriIcon = (kategori) => {
  const icons = {
    'kuliner': '🍽️',
    'retail': '🛍️',
    'jasa': '🔧',
    'pertanian': '🌾',
    'fashion': '👕',
    'kerajinan': '🎨'
  };
  return icons[kategori?.toLowerCase()] || '📦';
};

module.exports = {
  addUMKM,
  listUMKM,
  editUMKM,
  deleteUMKM,
  getUMKMStats,
  replaceDynamicUMKMContent,
  handleUMKMCommand
};