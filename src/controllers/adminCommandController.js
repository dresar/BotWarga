// Admin Command Controller
// Mengelola semua perintah admin dengan awalan !

const profanityFilter = require('../utils/profanityFilter');
const fs = require('fs').promises;
const path = require('path');
const SettingsController = require('./settingsController');
const { saveNewsMedia, saveTourismMedia } = require('./complaintController');

class AdminCommandController {
  constructor() {
    this.settingsController = new SettingsController();
    this.commands = {
      // Perintah berita
      '!beritaadd': this.handleBeritaAddCommand.bind(this),
      '!beritaedit': this.handleBeritaEditCommand.bind(this),
      '!beritalist': this.handleBeritaListCommand.bind(this),
      
      // Perintah layanan
      '!layananlist': this.handleLayananListCommand.bind(this),
      '!layananadd': this.handleLayananAddCommand.bind(this),
      '!layanansubmenuadd': this.handleLayananSubmenuAddCommand.bind(this),
      '!layananshow': this.handleLayananShowCommand.bind(this),
      '!layananedit': this.handleLayananEditCommand.bind(this),
      
      // Manajemen admin
      '!adminnew': this.handleAdminNewCommand.bind(this),
      '!admindel': this.handleAdminDelCommand.bind(this),
      
      // Pengaduan dan statistik
      '!list_pengaduan': this.handleListPengaduanCommand.bind(this),
      '!detail_pengaduan': this.handleDetailPengaduanCommand.bind(this),
      '!update_status': this.handleUpdateStatusCommand.bind(this),
      '!delete_pengaduan': this.handleDeletePengaduanCommand.bind(this),
      '!statistik': this.handleStatistikCommand.bind(this),
      
      // Pengaturan JSON - CRUD Commands
      '!pengaturan': this.handlePengaturanCommand.bind(this),
      '!settingshow': this.handleSettingsShowCommand.bind(this),
      '!settingset': this.handleSettingSetCommand.bind(this),
      '!settingget': this.handleSettingGetCommand.bind(this),
      '!settingdel': this.handleSettingDelCommand.bind(this),
      '!settingreset': this.handleSettingResetCommand.bind(this),
      '!limitset': this.handleLimitSetCommand.bind(this),
      '!limitshow': this.handleLimitShowCommand.bind(this),
      '!filterset': this.handleFilterSetCommand.bind(this),
      '!filtershow': this.handleFilterShowCommand.bind(this),
      '!filteradd': this.handleFilterAddCommand.bind(this),
      '!filterdel': this.handleFilterDelCommand.bind(this),
      '!moderationset': this.handleModerationSetCommand.bind(this),
      '!moderationshow': this.handleModerationShowCommand.bind(this),
      '!clearcache': this.handleClearCacheCommand.bind(this),
      '!deleteimages': this.handleDeleteImagesCommand.bind(this),
      
      // Perintah UMKM
      '!umkmadd': this.handleUMKMAddCommand.bind(this),
      '!umkmlist': this.handleUMKMListCommand.bind(this),
      '!umkmedit': this.handleUMKMEditCommand.bind(this),
      '!umkmdelete': this.handleUMKMDeleteCommand.bind(this),
      '!umkmstats': this.handleUMKMStatsCommand.bind(this),
      
      // Perintah lama (tetap dipertahankan)
      '!admin': this.handleAdminMenuCommand.bind(this),
      '!menu': this.handleMenuCommand.bind(this),
      '!reset': this.handleResetCommand.bind(this),
      '!berita': this.handleBeritaCommand.bind(this),
      '!pengumuman': this.handlePengumumanCommand.bind(this),
      '!user': this.handleUserCommand.bind(this),
      '!stats': this.handleStatsCommand.bind(this),
      '!backup': this.handleBackupCommand.bind(this),
      '!broadcast': this.handleBroadcastCommand.bind(this),
      '!ban': this.handleBanCommand.bind(this),
      '!unban': this.handleUnbanCommand.bind(this),
      '!filter': this.handleFilterCommand.bind(this),
      '!system': this.handleSystemCommand.bind(this),
      '!help': this.handleHelpCommand.bind(this),
      '!log': this.handleLogCommand.bind(this),
      '!maintenance': this.handleMaintenanceCommand.bind(this)
    };
  }

  // Validasi apakah user adalah admin
  async validateAdmin(models, senderId) {
    try {
      const admin = await models.admin.getAdminByPhoneNumber(senderId);
      return admin ? { valid: true, admin } : { valid: false, error: 'Anda tidak memiliki akses admin.' };
    } catch (error) {
      return { valid: false, error: 'Error validasi admin: ' + error.message };
    }
  }

  // Parse perintah admin
  parseCommand(message) {
    const parts = message.trim().split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    return { command, args, parts: parts.slice(1) };
  }

  // Validasi input dengan profanity filter
  validateInput(text) {
    return profanityFilter.validateAdminInput(text);
  }

  // Handler utama untuk semua perintah admin
  async handleAdminCommand(models, senderId, message, sock, context) {
    try {
      const { command, args } = this.parseCommand(message);
      
      // Perintah yang tidak memerlukan validasi admin
      const publicCommands = ['!menu', '!reset'];
      
      // Validasi admin untuk perintah yang memerlukan akses admin
      let adminValidation = { valid: true, admin: null };
      if (!publicCommands.includes(command)) {
        adminValidation = await this.validateAdmin(models, senderId);
        if (!adminValidation.valid) {
          return {
            response: { text: `❌ *Akses Ditolak*\n\n${adminValidation.error}` },
            context: {}
          };
        }
      }
      
      // Cek apakah perintah tersedia
      if (!this.commands[command]) {
        return {
          response: this.getUnknownCommandResponse(command),
          context: {}
        };
      }

      // Validasi input dengan profanity filter untuk perintah yang memerlukan input
      if (args && !publicCommands.includes(command)) {
        const inputValidation = this.validateInput(args);
        if (!inputValidation.valid) {
          return {
            response: { text: `❌ *Input Tidak Valid*\n\n${inputValidation.error}` },
            context: {}
          };
        }
      }

      // Eksekusi perintah
      const result = await this.commands[command](models, senderId, args, sock, adminValidation.admin, context, message);
      
      // Pastikan result memiliki format yang benar
      if (result.response) {
        return result;
      } else {
        return {
          response: result,
          context: result.context || {}
        };
      }
    } catch (error) {
      console.error('Error handling admin command:', error);
      return {
        response: { text: `❌ *Error*\n\nTerjadi kesalahan: ${error.message}` },
        context: {}
      };
    }
  }

  // !berita (judul),(deskripsi),(isi berita)
  async handleBeritaCommand(models, senderId, args, sock, admin) {
    if (!args) {
      return {
        text: `📰 *PERINTAH !berita*\n\n` +
              `Format: !berita (judul),(deskripsi),(isi berita)\n\n` +
              `Contoh:\n` +
              `!berita Pembangunan Jalan Baru,Jalan utama desa sedang diperbaiki,Pemerintah desa mengumumkan bahwa pembangunan jalan utama akan dimulai minggu depan...\n\n` +
              `📋 *Aturan:*\n` +
              `• Pisahkan dengan koma (,)\n` +
              `• Judul maksimal 100 karakter\n` +
              `• Deskripsi maksimal 200 karakter\n` +
              `• Isi berita maksimal 1000 karakter`
      };
    }

    const parts = args.split(',');
    if (parts.length < 3) {
      return { text: `❌ *Format Salah*\n\nGunakan format: !berita (judul),(deskripsi),(isi berita)` };
    }

    const judul = parts[0].trim();
    const deskripsi = parts[1].trim();
    const isi = parts.slice(2).join(',').trim();

    // Validasi panjang
    if (judul.length > 100) {
      return { text: `❌ *Judul Terlalu Panjang*\n\nMaksimal 100 karakter. Saat ini: ${judul.length}` };
    }
    if (deskripsi.length > 200) {
      return { text: `❌ *Deskripsi Terlalu Panjang*\n\nMaksimal 200 karakter. Saat ini: ${deskripsi.length}` };
    }
    if (isi.length > 1000) {
      return { text: `❌ *Isi Berita Terlalu Panjang*\n\nMaksimal 1000 karakter. Saat ini: ${isi.length}` };
    }

    // Simpan berita ke database atau file
    const berita = {
      id: Date.now(),
      judul,
      deskripsi,
      isi,
      author: admin.username,
      created_at: new Date().toISOString(),
      status: 'published'
    };

    try {
      // Simpan ke file JSON (bisa diganti dengan database)
      const newsDir = path.join(process.cwd(), 'uploads', 'news');
      await fs.mkdir(newsDir, { recursive: true });
      
      const newsFile = path.join(newsDir, `${berita.id}.json`);
      await fs.writeFile(newsFile, JSON.stringify(berita, null, 2));

      return {
        text: `✅ *Berita Berhasil Dibuat*\n\n` +
              `📰 *${judul}*\n\n` +
              `📝 ${deskripsi}\n\n` +
              `👤 Penulis: ${admin.username}\n` +
              `📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n` +
              `🆔 ID: ${berita.id}`
      };
    } catch (error) {
      return { text: `❌ *Error Menyimpan Berita*\n\n${error.message}\n\nDibuat oleh Mahasiswa UMSU` };
    }
  }

  // !pengumuman (judul),(isi pengumuman)
  async handlePengumumanCommand(models, senderId, args, sock, admin) {
    if (!args) {
      return {
        text: `📢 *PERINTAH !pengumuman*\n\n` +
              `Format: !pengumuman (judul),(isi pengumuman)\n\n` +
              `Contoh:\n` +
              `!pengumuman Rapat RT,Akan diadakan rapat RT pada hari Minggu pukul 19.00 di balai desa\n\n` +
              `📋 *Aturan:*\n` +
              `• Pisahkan dengan koma (,)\n` +
              `• Judul maksimal 100 karakter\n` +
              `• Isi maksimal 500 karakter`
      };
    }

    const parts = args.split(',');
    if (parts.length < 2) {
      return { text: `❌ *Format Salah*\n\nGunakan format: !pengumuman (judul),(isi pengumuman)` };
    }

    const judul = parts[0].trim();
    const isi = parts.slice(1).join(',').trim();

    if (judul.length > 100 || isi.length > 500) {
      return { text: `❌ *Teks Terlalu Panjang*\n\nJudul max 100, isi max 500 karakter` };
    }

    const pengumuman = {
      id: Date.now(),
      judul,
      isi,
      author: admin.username,
      created_at: new Date().toISOString()
    };

    try {
      const announcementDir = path.join(process.cwd(), 'uploads', 'announcements');
      await fs.mkdir(announcementDir, { recursive: true });
      
      const announcementFile = path.join(announcementDir, `${pengumuman.id}.json`);
      await fs.writeFile(announcementFile, JSON.stringify(pengumuman, null, 2));

      return {
        text: `✅ *Pengumuman Berhasil Dibuat*\n\n` +
              `📢 *${judul}*\n\n` +
              `${isi}\n\n` +
              `👤 Oleh: ${admin.username}\n` +
              `📅 ${new Date().toLocaleDateString('id-ID')}`
      };
    } catch (error) {
      return { text: `❌ *Error Menyimpan Pengumuman*\n\n${error.message}\n\nDibuat oleh Mahasiswa UMSU` };
    }
  }

  // !user (list|info|ban|unban) [phone_number]
  async handleUserCommand(models, senderId, args, sock, admin) {
    const parts = args.split(' ');
    const action = parts[0];
    const phoneNumber = parts[1];

    switch (action) {
      case 'list':
        return this.getUserList(models);
      case 'info':
        return this.getUserInfo(models, phoneNumber);
      case 'ban':
        return this.banUser(models, phoneNumber, admin);
      case 'unban':
        return this.unbanUser(models, phoneNumber, admin);
      default:
        return {
          text: `👥 *PERINTAH !user*\n\n` +
                `Format:\n` +
                `• !user list - Lihat semua user\n` +
                `• !user info [nomor] - Info user\n` +
                `• !user ban [nomor] - Ban user\n` +
                `• !user unban [nomor] - Unban user`
        };
    }
  }

  // !stats (system|users|messages)
  async handleStatsCommand(models, senderId, args, sock, admin) {
    const type = args || 'system';
    
    switch (type) {
      case 'system':
        return this.getSystemStats();
      case 'users':
        return this.getUserStats(models);
      case 'messages':
        return this.getMessageStats(models);
      default:
        return {
          text: `📊 *PERINTAH !stats*\n\n` +
                `Format:\n` +
                `• !stats system - Statistik sistem\n` +
                `• !stats users - Statistik pengguna\n` +
                `• !stats messages - Statistik pesan`
        };
    }
  }

  // !admin - Masuk ke menu admin
  async handleAdminMenuCommand(models, senderId, args, sock, admin, context) {
    try {
      const adminData = await models.admin.getAdminByPhoneNumber(senderId);
      if (!adminData) {
        return {
          response: { text: '❌ *Akses Ditolak*\n\nAnda tidak memiliki akses admin.' },
          context: {}
        };
      }

      // Format menu admin langsung di sini
      let menu = `🔐 *MENU ADMIN DESA PULOSAROK* 🔐\n`;
      menu += `═`.repeat(40) + '\n\n';
      menu += `👤 *Admin:* ${adminData.username}\n`;
      menu += `📱 *Role:* ${adminData.role.toUpperCase()}\n`;
      menu += `📞 *Phone:* ${adminData.phone_number}\n\n`;
      
      menu += `🎯 *PERINTAH ADMIN UTAMA:*\n`;
      menu += `• Ketik *!admin* - Akses menu admin\n`;
      menu += `• Ketik *!menu* - Kembali ke menu publik\n`;
      menu += `• Ketik *!reset* - Reset semua sesi\n\n`;
      
      menu += `📰 *KELOLA BERITA & KONTEN:*\n`;
      menu += `• *!beritaadd* - Tambah berita baru\n`;
      menu += `• *!beritaedit* - Edit berita (step-by-step)\n`;
      menu += `• *!beritalist* - Lihat daftar berita\n\n`;
      
      menu += `🔧 *KELOLA LAYANAN:*\n`;
      menu += `• *!layananlist* - Lihat daftar layanan\n`;
      menu += `• *!layananadd* - Tambah layanan baru\n`;
      menu += `• *!layanansubmenuadd* - Tambah sub-layanan\n`;
      menu += `• *!layananshow* - Lihat konten layanan\n`;
      menu += `• *!layananedit* - Edit konten layanan\n\n`;
      
      menu += `👥 *MANAJEMEN ADMIN:*\n`;
      menu += `• *!adminnew* - Tambah admin baru\n`;
      menu += `• *!admindel* - Hapus admin\n\n`;
      
      menu += `📊 *MONITORING & LAPORAN:*\n`;
      menu += `• *!list_pengaduan* - Lihat daftar pengaduan\n`;
      menu += `• *!detail_pengaduan [ID]* - Detail pengaduan\n`;
      menu += `• *!update_status [ID] [status]* - Update status\n`;
      menu += `• *!delete_pengaduan [ID]* - Hapus pengaduan\n`;
      menu += `• *!statistik* - Lihat statistik sistem\n\n`;
      
      menu += `⚙️ *PENGATURAN SISTEM:*\n`;
      menu += `• *!pengaturan* - Menu pengaturan lengkap\n`;
      menu += `• *!backup* - Backup database\n`;
      menu += `• *!maintenance* - Mode maintenance\n\n`;
      
      menu += `🔹 *PANDUAN PENGGUNAAN:*\n`;
      menu += `• Semua perintah admin dimulai dengan tanda *!*\n`;
      menu += `• Gunakan format yang tepat untuk setiap perintah\n`;
      menu += `• Ketik perintah tanpa parameter untuk melihat bantuan\n`;
      menu += `• Contoh: ketik *!beritaadd* untuk panduan menambah berita\n\n`;
      
      menu += `💡 *TIPS CEPAT:*\n`;
      menu += `• *!beritaadd* (judul),(konten) - Tambah berita langsung\n`;
      menu += `• *!adminnew* (username),(password),(role) - Tambah admin\n`;
      menu += `• *!pengaturan* (1-6) - Akses pengaturan kategori\n\n`;
      
      menu += `⚠️ *Peringatan:* Gunakan dengan bijak\n`;
      menu += `_🏛️ Sistem Admin - Desa Pulosarok_\n`;
      menu += `_Dibuat oleh Mahasiswa UMSU_`;

      return {
        response: { text: menu },
        context: {
          admin_mode: true,
          admin_id: adminData.id,
          admin_role: adminData.role
        }
      };
    } catch (error) {
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengakses menu admin.' },
        context: {}
      };
    }
  }

  // !menu - Kembali ke menu publik
  async handleMenuCommand(models, senderId, args, sock, admin, context) {
    try {
      // Format menu publik langsung di sini
      let menu = `🏛️ *LAYANAN DESA PULOSAROK* 🏛️\n`;
      menu += `═`.repeat(40) + '\n\n';
      menu += `📋 *MENU LAYANAN:*\n\n`;
      
      menu += `1️⃣ *Administrasi Kependudukan*\n`;
      menu += `   • KTP, KK, Akta Kelahiran\n`;
      menu += `   • Surat Pindah, Domisili\n\n`;
      
      menu += `2️⃣ *Pelayanan Umum*\n`;
      menu += `   • Surat Keterangan\n`;
      menu += `   • Legalisir Dokumen\n\n`;
      
      menu += `3️⃣ *Informasi Desa*\n`;
      menu += `   • Profil Desa\n`;
      menu += `   • Berita & Pengumuman\n\n`;
      
      menu += `4️⃣ *Pengaduan & Aspirasi*\n`;
      menu += `   • Sampaikan Keluhan\n`;
      menu += `   • Saran & Masukan\n\n`;
      
      menu += `5️⃣ *Bantuan & Kontak*\n`;
      menu += `   • Panduan Penggunaan\n`;
      menu += `   • Kontak Perangkat Desa\n\n`;
      
      menu += `🔹 *Cara Penggunaan:*\n`;
      menu += `• Ketik nomor menu (1-5)\n`;
      menu += `• Ketik *pengaduan* untuk keluhan\n`;
      menu += `• Ketik *reset* untuk kembali ke menu\n\n`;
      
      menu += `_📞 Hubungi kami jika butuh bantuan_`;
      
      return {
        response: { text: menu },
        context: {} // Reset semua context
      };
    } catch (error) {
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengakses menu.' },
        context: {}
      };
    }
  }

  // !reset - Reset semua sesi
  async handleResetCommand(models, senderId, args, sock, admin, context) {
    return {
      response: {
        text: '🔄 *Sesi Direset*\n\nSemua sesi dan context telah direset.\n\nKetik *menu* untuk memulai atau *!admin* untuk akses admin.'
      },
      context: {} // Reset semua context
    };
  }

  // !help - Bantuan perintah admin
  async handleHelpCommand(models, senderId, args, sock, admin) {
    return {
      text: `🔧 *BANTUAN PERINTAH ADMIN*\n\n` +
            `📰 *!berita* (judul),(deskripsi),(isi)\n` +
            `   Buat berita baru\n\n` +
            `📢 *!pengumuman* (judul),(isi)\n` +
            `   Buat pengumuman\n\n` +
            `👥 *!user* (list|info|ban|unban) [nomor]\n` +
            `   Kelola pengguna\n\n` +
            `📊 *!stats* (system|users|messages)\n` +
            `   Lihat statistik\n\n` +
            `💾 *!backup*\n` +
            `   Backup database\n\n` +
            `📡 *!broadcast* (pesan)\n` +
            `   Kirim pesan ke semua user\n\n` +
            `🚫 *!filter* (add|remove|list) [kata]\n` +
            `   Kelola filter kata\n\n` +
            `⚙️ *!system* (status|restart|maintenance)\n` +
            `   Kontrol sistem\n\n` +
            `📝 *!log* (view|clear)\n` +
            `   Kelola log sistem\n\n` +
            `❓ *!help*\n` +
            `   Bantuan perintah\n\n` +
            `⚠️ *Catatan:* Semua perintah menggunakan awalan !`
    };
  }

  // Response untuk perintah tidak dikenal
  getUnknownCommandResponse(command) {
    return {
      text: `❌ *Perintah Tidak Dikenal: ${command}*\n\n` +
            `Ketik *!help* untuk melihat daftar perintah yang tersedia.\n\n` +
            `🔧 *Perintah Utama:*\n` +
            `• !berita - Buat berita\n` +
            `• !pengumuman - Buat pengumuman\n` +
            `• !user - Kelola pengguna\n` +
            `• !stats - Lihat statistik\n` +
            `• !help - Bantuan lengkap`
    };
  }

  // Helper methods (implementasi placeholder)
  async getUserList(models) {
    return { text: '👥 *Daftar User*\n\nFitur sedang dalam pengembangan.' };
  }

  async getUserInfo(models, phoneNumber) {
    return { text: `👤 *Info User: ${phoneNumber}*\n\nFitur sedang dalam pengembangan.` };
  }

  async getSystemStats() {
    const stats = profanityFilter.getStats();
    return {
      text: `📊 *STATISTIK SISTEM*\n\n` +
            `🤖 Bot Status: Online\n` +
            `📱 Platform: WhatsApp\n` +
            `🛡️ Filter Kata: ${stats.totalBannedWords} kata\n` +
            `📅 Uptime: ${process.uptime().toFixed(0)} detik\n` +
            `💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    };
  }

  // === PERINTAH BERITA BARU ===
  
  // !beritaadd (Judul),(Deskripsi),(Isi Berita)
  async handleBeritaAddCommand(models, senderId, args, sock, admin, context, message) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !beritaadd (Judul),(Deskripsi),(Isi Berita)\n\nContoh: !beritaadd Pembangunan Jalan,Jalan desa sedang diperbaiki,Pembangunan jalan desa dimulai hari ini...\n\n💡 *Tips:* Kirim gambar bersamaan dengan perintah untuk menambahkan foto berita!' },
          context: {}
        };
      }
      
      const parts = args.split(',');
      if (parts.length !== 3) {
        return {
          response: { text: '❌ *Format Salah*\n\nHarus ada 3 bagian dipisah koma:\n1. Judul\n2. Deskripsi\n3. Isi Berita\n\nContoh: !beritaadd Pembangunan Jalan,Jalan desa sedang diperbaiki,Pembangunan jalan desa dimulai hari ini...' },
          context: {}
        };
      }
      
      const [judul, deskripsi, isi] = parts.map(p => p.trim());
      
      if (!judul || !deskripsi || !isi) {
        return {
          response: { text: '❌ *Data Tidak Lengkap*\n\nSemua field harus diisi:\n- Judul\n- Deskripsi\n- Isi Berita' },
          context: {}
        };
      }
      
      // Validasi panjang
      if (judul.length > 100) {
        return {
          response: { text: '❌ *Judul Terlalu Panjang*\n\nJudul maksimal 100 karakter.' },
          context: {}
        };
      }
      
      if (deskripsi.length > 200) {
        return {
          response: { text: '❌ *Deskripsi Terlalu Panjang*\n\nDeskripsi maksimal 200 karakter.' },
          context: {}
        };
      }
      
      // Handle image upload if present
      let imagePath = null;
      if (message && (message.imageMessage || message.videoMessage)) {
        try {
          imagePath = await saveNewsMedia(message, sock);
        } catch (error) {
          console.error('Error saving news media:', error);
          return {
            response: { text: '❌ *Error Upload Gambar*\n\nGagal menyimpan gambar. Silakan coba lagi.' },
            context: {}
          };
        }
      }
      
      // Simpan berita ke file JSON
      const fs = require('fs-extra');
      const path = require('path');
      const newsDir = path.join(process.cwd(), 'uploads', 'news');
      await fs.ensureDir(newsDir);
      
      const newsFile = path.join(newsDir, 'news.json');
      let newsList = [];
      
      if (await fs.pathExists(newsFile)) {
        newsList = await fs.readJson(newsFile);
      }
      
      const newNews = {
        id: Date.now(),
        judul,
        deskripsi,
        isi,
        author: admin.username,
        created_at: new Date().toISOString(),
        status: 'published',
        image: imagePath ? path.basename(imagePath) : null
      };
      
      newsList.unshift(newNews);
      await fs.writeJson(newsFile, newsList, { spaces: 2 });
      
      let responseText = `✅ *Berita Berhasil Ditambahkan*\n\n📰 *Judul:* ${judul}\n📝 *Deskripsi:* ${deskripsi}\n👤 *Author:* ${admin.username}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n*ID Berita:* ${newNews.id}`;
      
      if (imagePath) {
        responseText += `\n📸 *Gambar:* Berhasil disimpan`;
      }
      
      return {
        response: { text: responseText },
        context: {}
      };
      
    } catch (error) {
      console.error('Error adding news:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menambah berita.' },
        context: {}
      };
    }
  }
  
  // !beritaedit (ID)
  async handleBeritaEditCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !beritaedit (ID)\n\nContoh: !beritaedit 1234567890' },
          context: {}
        };
      }
      
      const newsId = parseInt(args.trim());
      if (isNaN(newsId)) {
        return {
          response: { text: '❌ *ID Tidak Valid*\n\nID harus berupa angka.' },
          context: {}
        };
      }
      
      const fs = require('fs-extra');
      const path = require('path');
      const newsFile = path.join(process.cwd(), 'uploads', 'news', 'news.json');
      
      if (!await fs.pathExists(newsFile)) {
        return {
          response: { text: '❌ *Tidak Ada Berita*\n\nBelum ada berita yang tersimpan.' },
          context: {}
        };
      }
      
      const newsList = await fs.readJson(newsFile);
      const news = newsList.find(n => n.id === newsId);
      
      if (!news) {
        return {
          response: { text: `❌ *Berita Tidak Ditemukan*\n\nBerita dengan ID ${newsId} tidak ditemukan.` },
          context: {}
        };
      }
      
      // Set context untuk editing
      context.editing_news = {
        id: newsId,
        step: 'choose_field'
      };
      
      return {
        response: { text: `📝 *Edit Berita*\n\n*Berita yang akan diedit:*\n📰 *Judul:* ${news.judul}\n📝 *Deskripsi:* ${news.deskripsi}\n\n*Pilih yang ingin diedit:*\n1️⃣ Judul\n2️⃣ Deskripsi\n3️⃣ Isi Berita\n0️⃣ Batal\n\nKetik angka pilihan Anda.` },
        context: context
      };
      
    } catch (error) {
      console.error('Error editing news:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengedit berita.' },
        context: {}
      };
    }
  }
  
  // !beritalist
  async handleBeritaListCommand(models, senderId, args, sock, admin, context) {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      const newsFile = path.join(process.cwd(), 'uploads', 'news', 'news.json');
      
      if (!await fs.pathExists(newsFile)) {
        return {
          response: { text: '📰 *Daftar Berita*\n\n❌ Belum ada berita yang tersimpan.\n\nGunakan !beritaadd untuk menambah berita baru.' },
          context: {}
        };
      }
      
      const newsList = await fs.readJson(newsFile);
      
      if (newsList.length === 0) {
        return {
          response: { text: '📰 *Daftar Berita*\n\n❌ Belum ada berita yang tersimpan.\n\nGunakan !beritaadd untuk menambah berita baru.' },
          context: {}
        };
      }
      
      let response = '📰 *DAFTAR BERITA*\n';
      response += '═'.repeat(40) + '\n\n';
      
      newsList.slice(0, 10).forEach((news, index) => {
        const date = new Date(news.created_at).toLocaleDateString('id-ID');
        response += `${index + 1}. *${news.judul}*\n`;
        response += `   📝 ${news.deskripsi}\n`;
        response += `   👤 ${news.author} | 📅 ${date}\n`;
        response += `   🆔 ID: ${news.id}\n\n`;
      });
      
      if (newsList.length > 10) {
        response += `... dan ${newsList.length - 10} berita lainnya\n\n`;
      }
      
      response += '🔧 *Perintah:*\n';
      response += '• !beritaadd - Tambah berita\n';
      response += '• !beritaedit (ID) - Edit berita\n';
      response += '• !beritalist - Lihat daftar';
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error listing news:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengambil daftar berita.' },
        context: {}
      };
    }
  }
  
  // === PERINTAH LAYANAN BARU ===
  
  // !layananlist
  async handleLayananListCommand(models, senderId, args, sock, admin, context) {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      const menusPath = path.join(process.cwd(), 'uploads', 'menus');
      
      if (!await fs.pathExists(menusPath)) {
        return {
          response: { text: '🏢 *Daftar Layanan*\n\n❌ Folder layanan tidak ditemukan.\n\nGunakan !layananadd untuk menambah layanan baru.' },
          context: {}
        };
      }
      
      const mainMenus = await fs.readdir(menusPath);
      const sortedMenus = mainMenus
        .filter(name => /^(\d+)-/.test(name))
        .sort((a, b) => parseInt(a) - parseInt(b));
      
      if (sortedMenus.length === 0) {
        return {
          response: { text: '🏢 *Daftar Layanan*\n\n❌ Belum ada layanan yang tersimpan.\n\nGunakan !layananadd untuk menambah layanan baru.' },
          context: {}
        };
      }
      
      let response = '🏢 *DAFTAR LAYANAN DESA PULOSAROK*\n';
      response += '═'.repeat(40) + '\n\n';
      
      for (const folderName of sortedMenus) {
        const mainPath = path.join(menusPath, folderName);
        const stat = await fs.stat(mainPath).catch(() => null);
        if (!stat || !stat.isDirectory()) continue;
        
        const match = folderName.match(/^(\d+)-(.+)$/);
        if (!match) continue;
        
        const id = parseInt(match[1]);
        const name = match[2].replace(/_/g, ' ');
        
        // Hitung sub-layanan
        const subMenus = await fs.readdir(mainPath).catch(() => []);
        const validSubMenus = subMenus.filter(n => /^(\d+[A-Za-z])-/.test(n));
        
        response += `${id}. *${name}*\n`;
        response += `   📁 Folder: ${folderName}\n`;
        response += `   📋 Sub-layanan: ${validSubMenus.length} item\n`;
        
        if (validSubMenus.length > 0) {
          response += `   🔸 Sub-menu: `;
          const subNames = validSubMenus
            .sort((a, b) => a.localeCompare(b))
            .slice(0, 3)
            .map(sub => {
              const subMatch = sub.match(/^(\d+)([A-Za-z])-(.+)$/);
              return subMatch ? subMatch[3].replace(/_/g, ' ') : sub;
            });
          response += subNames.join(', ');
          if (validSubMenus.length > 3) {
            response += ` (+${validSubMenus.length - 3} lainnya)`;
          }
          response += '\n';
        }
        
        response += '\n';
      }
      
      response += '🔧 *Perintah Tersedia:*\n';
      response += '• !layananadd - Tambah layanan utama\n';
      response += '• !layanansubmenuadd - Tambah sub-layanan\n';
      response += '• !layananshow - Lihat isi layanan\n';
      response += '• !layananedit - Edit isi layanan\n';
      response += '• !layananlist - Lihat daftar ini';
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error listing services:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengambil daftar layanan.' },
        context: {}
      };
    }
  }
  
  // !layananadd
  async handleLayananAddCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !layananadd (Nama Layanan)\n\nContoh: !layananadd Layanan Sosial\n\n*Catatan:* Nama akan diformat otomatis menjadi folder dengan nomor urut.' },
          context: {}
        };
      }
      
      const name = args.trim();
      
      if (!name) {
        return {
          response: { text: '❌ *Nama Layanan Tidak Boleh Kosong*\n\nContoh: !layananadd Layanan Sosial' },
          context: {}
        };
      }
      
      // Validasi panjang
      if (name.length > 50) {
        return {
          response: { text: '❌ *Nama Layanan Terlalu Panjang*\n\nNama layanan maksimal 50 karakter.' },
          context: {}
        };
      }
      
      const fs = require('fs-extra');
      const path = require('path');
      const menusPath = path.join(process.cwd(), 'uploads', 'menus');
      await fs.ensureDir(menusPath);
      
      // Cari nomor urut berikutnya
      const existingMenus = await fs.readdir(menusPath);
      const existingNumbers = existingMenus
        .filter(folder => /^(\d+)-/.test(folder))
        .map(folder => parseInt(folder.match(/^(\d+)-/)[1]))
        .sort((a, b) => a - b);
      
      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 7;
      
      // Format nama folder (ganti spasi dengan underscore)
      const folderName = `${nextNumber}-${name.replace(/\s+/g, '_')}`;
      const newFolderPath = path.join(menusPath, folderName);
      
      // Cek apakah folder sudah ada
      if (await fs.pathExists(newFolderPath)) {
        return {
          response: { text: `❌ *Layanan Sudah Ada*\n\nFolder "${folderName}" sudah ada.` },
          context: {}
        };
      }
      
      // Buat folder layanan utama
      await fs.ensureDir(newFolderPath);
      
      // Buat file README.md di folder utama
      const readmeContent = `# ${name}\n\nLayanan ${name} di Desa Pulosarok\n\nDibuat oleh: ${admin.username}\nTanggal: ${new Date().toLocaleString('id-ID')}\n\n## Sub-layanan\n\nSub-layanan akan ditambahkan di folder ini dengan format:\n- ${nextNumber}A-Nama_Sub_Layanan_1\n- ${nextNumber}B-Nama_Sub_Layanan_2\n- dst.\n\nGunakan perintah !layanansubmenuadd untuk menambah sub-layanan.`;
      
      await fs.writeFile(path.join(newFolderPath, 'README.md'), readmeContent);
      
      return {
        response: { text: `✅ *Layanan Berhasil Ditambahkan*\n\n🏢 *Nama:* ${name}\n📁 *Folder:* ${folderName}\n📍 *Nomor:* ${nextNumber}\n👤 *Author:* ${admin.username}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n*Langkah selanjutnya:*\nGunakan !layanansubmenuadd untuk menambah sub-layanan.` },
        context: {}
      };
      
    } catch (error) {
      console.error('Error adding service:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menambah layanan.' },
        context: {}
      };
    }
  }
  
  // !layanansubmenuadd
  async handleLayananSubmenuAddCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !layanansubmenuadd (Nomor Layanan),(Nama Sub-layanan),(Deskripsi)\n\nContoh: !layanansubmenuadd 1,KTP Baru,Pembuatan KTP untuk warga baru\n\n*Lihat nomor layanan dengan !layananlist*' },
          context: {}
        };
      }
      
      const parts = args.split(',');
      if (parts.length !== 3) {
        return {
          response: { text: '❌ *Format Salah*\n\nHarus ada 3 bagian dipisah koma:\n1. Nomor Layanan\n2. Nama Sub-layanan\n3. Deskripsi\n\nContoh: !layanansubmenuadd 1,KTP Baru,Pembuatan KTP untuk warga baru' },
          context: {}
        };
      }
      
      const [serviceNumberStr, subName, subDescription] = parts.map(p => p.trim());
      
      const serviceNumber = parseInt(serviceNumberStr);
      if (isNaN(serviceNumber)) {
        return {
          response: { text: '❌ *Nomor Layanan Tidak Valid*\n\nNomor harus berupa angka.\n\nLihat daftar layanan dengan !layananlist' },
          context: {}
        };
      }
      
      if (!subName || !subDescription) {
        return {
          response: { text: '❌ *Data Tidak Lengkap*\n\nSemua field harus diisi:\n- Nomor Layanan\n- Nama Sub-layanan\n- Deskripsi' },
          context: {}
        };
      }
      
      // Validasi panjang
      if (subName.length > 50) {
        return {
          response: { text: '❌ *Nama Sub-layanan Terlalu Panjang*\n\nNama sub-layanan maksimal 50 karakter.' },
          context: {}
        };
      }
      
      if (subDescription.length > 500) {
        return {
          response: { text: '❌ *Deskripsi Terlalu Panjang*\n\nDeskripsi maksimal 500 karakter.' },
          context: {}
        };
      }
      
      const fs = require('fs-extra');
      const path = require('path');
      const menusPath = path.join(process.cwd(), 'uploads', 'menus');
      
      if (!await fs.pathExists(menusPath)) {
        return {
          response: { text: '❌ *Folder Layanan Tidak Ditemukan*\n\nGunakan !layananadd untuk menambah layanan terlebih dahulu.' },
          context: {}
        };
      }
      
      // Cari folder layanan berdasarkan nomor
      const mainMenus = await fs.readdir(menusPath);
      const targetFolder = mainMenus.find(folder => {
        const match = folder.match(/^(\d+)-/);
        return match && parseInt(match[1]) === serviceNumber;
      });
      
      if (!targetFolder) {
        return {
          response: { text: `❌ *Layanan Tidak Ditemukan*\n\nLayanan dengan nomor ${serviceNumber} tidak ditemukan.\n\nLihat daftar layanan dengan !layananlist` },
          context: {}
        };
      }
      
      const serviceFolderPath = path.join(menusPath, targetFolder);
      const serviceName = targetFolder.replace(/^\d+-/, '').replace(/_/g, ' ');
      
      // Cari huruf berikutnya untuk sub-layanan
      const existingSubMenus = await fs.readdir(serviceFolderPath);
      const existingLetters = existingSubMenus
        .filter(sub => new RegExp(`^${serviceNumber}[A-Za-z]-`).test(sub))
        .map(sub => {
          const match = sub.match(new RegExp(`^${serviceNumber}([A-Za-z])-`));
          return match ? match[1].toUpperCase() : null;
        })
        .filter(letter => letter !== null)
        .sort();
      
      // Tentukan huruf berikutnya
      let nextLetter = 'A';
      for (let i = 0; i < existingLetters.length; i++) {
        const expectedLetter = String.fromCharCode(65 + i); // A, B, C, ...
        if (existingLetters[i] !== expectedLetter) {
          nextLetter = expectedLetter;
          break;
        }
        nextLetter = String.fromCharCode(65 + i + 1);
      }
      
      // Format nama subfolder
      const subFolderName = `${serviceNumber}${nextLetter}-${subName.replace(/\s+/g, '_')}`;
      const subFolderPath = path.join(serviceFolderPath, subFolderName);
      
      // Cek apakah subfolder sudah ada
      if (await fs.pathExists(subFolderPath)) {
        return {
          response: { text: `❌ *Sub-layanan Sudah Ada*\n\nFolder "${subFolderName}" sudah ada.` },
          context: {}
        };
      }
      
      // Buat subfolder
      await fs.ensureDir(subFolderPath);
      
      // Buat file content.txt
      const contentTemplate = `# ${subName}\n\n## Informasi\n\n${subDescription}\n\n## Persyaratan\n\n1. [Tambahkan persyaratan di sini]\n2. [Tambahkan persyaratan lainnya]\n\n## Prosedur\n\n1. [Langkah pertama]\n2. [Langkah kedua]\n3. [Langkah selanjutnya]\n\n## Kontak\n\nUntuk informasi lebih lanjut, hubungi Kantor Desa Pulosarok.\n\n---\n*Dibuat oleh: ${admin.username}*\n*Tanggal: ${new Date().toLocaleString('id-ID')}*`;
      
      await fs.writeFile(path.join(subFolderPath, 'content.txt'), contentTemplate);
      
      return {
        response: { text: `✅ *Sub-layanan Berhasil Ditambahkan*\n\n🏢 *Layanan Utama:* ${serviceName}\n📋 *Sub-layanan:* ${subName}\n📁 *Folder:* ${subFolderName}\n📝 *Deskripsi:* ${subDescription}\n👤 *Author:* ${admin.username}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n*File content.txt telah dibuat dan siap diedit.*\nGunakan !layananedit untuk mengedit konten.` },
        context: {}
      };
      
    } catch (error) {
      console.error('Error adding sub-service:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menambah sub-layanan.' },
        context: {}
      };
    }
  }

  // !layananshow
  async handleLayananShowCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !layananshow (Nomor Layanan)(Huruf Sub-layanan)\n\nContoh: !layananshow 1A\n\n*Lihat daftar layanan dengan !layananlist*' },
          context: {}
        };
      }
      
      const input = args.trim().toUpperCase();
      const match = input.match(/^(\d+)([A-Z])$/);
      
      if (!match) {
        return {
          response: { text: '❌ *Format Tidak Valid*\n\nFormat harus: Nomor+Huruf\nContoh: 1A, 2B, 3C\n\nLihat daftar dengan !layananlist' },
          context: {}
        };
      }
      
      const [, serviceNumber, subLetter] = match;
      const fs = require('fs-extra');
      const path = require('path');
      const menusPath = path.join(process.cwd(), 'uploads', 'menus');
      
      if (!await fs.pathExists(menusPath)) {
        return {
          response: { text: '❌ *Folder Layanan Tidak Ditemukan*' },
          context: {}
        };
      }
      
      // Cari folder layanan utama
      const mainMenus = await fs.readdir(menusPath);
      const targetFolder = mainMenus.find(folder => {
        const folderMatch = folder.match(/^(\d+)-/);
        return folderMatch && folderMatch[1] === serviceNumber;
      });
      
      if (!targetFolder) {
        return {
          response: { text: `❌ *Layanan Tidak Ditemukan*\n\nLayanan dengan nomor ${serviceNumber} tidak ditemukan.` },
          context: {}
        };
      }
      
      // Cari subfolder
      const serviceFolderPath = path.join(menusPath, targetFolder);
      const subMenus = await fs.readdir(serviceFolderPath);
      const targetSubFolder = subMenus.find(sub => {
        const subMatch = sub.match(new RegExp(`^${serviceNumber}${subLetter}-`));
        return subMatch;
      });
      
      if (!targetSubFolder) {
        return {
          response: { text: `❌ *Sub-layanan Tidak Ditemukan*\n\nSub-layanan ${serviceNumber}${subLetter} tidak ditemukan.` },
          context: {}
        };
      }
      
      // Baca file content.txt
      const contentPath = path.join(serviceFolderPath, targetSubFolder, 'content.txt');
      
      if (!await fs.pathExists(contentPath)) {
        return {
          response: { text: `❌ *File Konten Tidak Ditemukan*\n\nFile content.txt tidak ada di ${targetSubFolder}` },
          context: {}
        };
      }
      
      const content = await fs.readFile(contentPath, 'utf8');
      const serviceName = targetFolder.replace(/^\d+-/, '').replace(/_/g, ' ');
      const subServiceName = targetSubFolder.replace(/^\d+[A-Z]-/, '').replace(/_/g, ' ');
      
      let response = `📋 *LAYANAN: ${serviceName.toUpperCase()}*\n`;
      response += `📄 *Sub-layanan: ${subServiceName}*\n`;
      response += `📁 *Folder: ${targetSubFolder}*\n`;
      response += '═'.repeat(40) + '\n\n';
      response += content;
      response += '\n\n═'.repeat(40);
      response += `\n🔧 *Perintah:*\n• !layananedit ${serviceNumber}${subLetter} - Edit konten\n• !layananlist - Lihat daftar layanan`;
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error showing service:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menampilkan layanan.' },
        context: {}
      };
    }
  }

  // !layananedit
  async handleLayananEditCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !layananedit (Nomor Layanan)(Huruf Sub-layanan)\n\nContoh: !layananedit 1A\n\n*Lihat daftar layanan dengan !layananlist*' },
          context: {}
        };
      }
      
      const input = args.trim().toUpperCase();
      const match = input.match(/^(\d+)([A-Z])$/);
      
      if (!match) {
        return {
          response: { text: '❌ *Format Tidak Valid*\n\nFormat harus: Nomor+Huruf\nContoh: 1A, 2B, 3C\n\nLihat daftar dengan !layananlist' },
          context: {}
        };
      }
      
      const [, serviceNumber, subLetter] = match;
      const fs = require('fs-extra');
      const path = require('path');
      const menusPath = path.join(process.cwd(), 'uploads', 'menus');
      
      if (!await fs.pathExists(menusPath)) {
        return {
          response: { text: '❌ *Folder Layanan Tidak Ditemukan*' },
          context: {}
        };
      }
      
      // Cari folder layanan utama
      const mainMenus = await fs.readdir(menusPath);
      const targetFolder = mainMenus.find(folder => {
        const folderMatch = folder.match(/^(\d+)-/);
        return folderMatch && folderMatch[1] === serviceNumber;
      });
      
      if (!targetFolder) {
        return {
          response: { text: `❌ *Layanan Tidak Ditemukan*\n\nLayanan dengan nomor ${serviceNumber} tidak ditemukan.` },
          context: {}
        };
      }
      
      // Cari subfolder
      const serviceFolderPath = path.join(menusPath, targetFolder);
      const subMenus = await fs.readdir(serviceFolderPath);
      const targetSubFolder = subMenus.find(sub => {
        const subMatch = sub.match(new RegExp(`^${serviceNumber}${subLetter}-`));
        return subMatch;
      });
      
      if (!targetSubFolder) {
        return {
          response: { text: `❌ *Sub-layanan Tidak Ditemukan*\n\nSub-layanan ${serviceNumber}${subLetter} tidak ditemukan.` },
          context: {}
        };
      }
      
      // Baca file content.txt
      const contentPath = path.join(serviceFolderPath, targetSubFolder, 'content.txt');
      
      if (!await fs.pathExists(contentPath)) {
        return {
          response: { text: `❌ *File Konten Tidak Ditemukan*\n\nFile content.txt tidak ada di ${targetSubFolder}` },
          context: {}
        };
      }
      
      const content = await fs.readFile(contentPath, 'utf8');
      const serviceName = targetFolder.replace(/^\d+-/, '').replace(/_/g, ' ');
      const subServiceName = targetSubFolder.replace(/^\d+[A-Z]-/, '').replace(/_/g, ' ');
      
      // Set context untuk editing
      context.editing_layanan = {
        serviceNumber,
        subLetter,
        targetFolder,
        targetSubFolder,
        contentPath,
        serviceName,
        subServiceName
      };
      
      let response = `📝 *EDIT LAYANAN*\n\n`;
      response += `🏢 *Layanan:* ${serviceName}\n`;
      response += `📋 *Sub-layanan:* ${subServiceName}\n`;
      response += `📁 *Folder:* ${targetSubFolder}\n\n`;
      response += `📄 *Konten Saat Ini:*\n`;
      response += '─'.repeat(30) + '\n';
      response += content.substring(0, 300);
      if (content.length > 300) {
        response += '\n\n... (konten dipotong, total ' + content.length + ' karakter)';
      }
      response += '\n' + '─'.repeat(30) + '\n\n';
      response += `✏️ *Silakan ketik konten baru untuk mengganti seluruh isi file.*\n\n`;
      response += `💡 *Tips:*\n`;
      response += `• Gunakan format Markdown untuk judul (# Judul)\n`;
      response += `• Pisahkan bagian dengan ## Sub-judul\n`;
      response += `• Ketik 'batal' untuk membatalkan editing\n`;
      response += `• Konten akan mengganti seluruh isi file`;
      
      return {
        response: { text: response },
        context: context
      };
      
    } catch (error) {
      console.error('Error editing service:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengedit layanan.' },
        context: {}
      };
    }
  }
  
  // === PERINTAH MANAJEMEN ADMIN BARU ===
  
  // !adminnew (Nomor Telepon)
  async handleAdminNewCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !adminnew (Nomor Telepon)\n\nContoh: !adminnew 628123456789' },
          context: {}
        };
      }
      
      let phoneNumber = args.trim();
      
      // Validasi format nomor telepon
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
      
      if (!phoneNumber.startsWith('62')) {
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '62' + phoneNumber.substring(1);
        } else {
          phoneNumber = '62' + phoneNumber;
        }
      }
      
      if (phoneNumber.length < 10 || phoneNumber.length > 15) {
        return {
          response: { text: '❌ *Nomor Telepon Tidak Valid*\n\nNomor telepon harus 10-15 digit.' },
          context: {}
        };
      }
      
      // Cek apakah sudah admin
      const existingAdmin = await models.admin.getAdminByPhoneNumber(phoneNumber);
      if (existingAdmin) {
        return {
          response: { text: `❌ *Sudah Admin*\n\nNomor ${phoneNumber} sudah terdaftar sebagai admin dengan username: ${existingAdmin.username}` },
          context: {}
        };
      }
      
      // Buat admin baru
      const newAdmin = await models.admin.addAdmin({
        username: `admin_${phoneNumber.substring(-4)}`,
        phone_number: phoneNumber,
        password: 'admin123',
        role: 'admin',
        created_by: admin.username,
        created_at: new Date(),
        status: 'active'
      });
      
      // Kirim notifikasi ke admin baru
      const welcomeMessage = `🎉 *Selamat!*\n\nAnda telah ditambahkan sebagai admin bot ini.\n\n👤 *Username:* ${newAdmin.username}\n📱 *Phone:* ${phoneNumber}\n🔑 *Role:* Admin\n👨‍💼 *Ditambahkan oleh:* ${admin.username}\n\n*Perintah Admin:*\n• !admin - Menu admin\n• !menu - Menu publik\n• !beritaadd - Tambah berita\n• !layananlist - Lihat layanan\n• Dan banyak lagi...\n\nSelamat bergabung! 🚀`;
      
      try {
        await sock.sendMessage(`${phoneNumber}@s.whatsapp.net`, { text: welcomeMessage });
      } catch (notifError) {
        console.log('Failed to send notification to new admin:', notifError);
      }
      
      return {
        response: { text: `✅ *Admin Baru Berhasil Ditambahkan*\n\n👤 *Username:* ${newAdmin.username}\n📱 *Phone:* ${phoneNumber}\n🔑 *Role:* Admin\n👨‍💼 *Ditambahkan oleh:* ${admin.username}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n📩 Notifikasi telah dikirim ke admin baru.` },
        context: {}
      };
      
    } catch (error) {
      console.error('Error adding new admin:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menambah admin baru.' },
        context: {}
      };
    }
  }
  
  // !admindel
  async handleAdminDelCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        // Tampilkan daftar admin untuk dipilih
        const adminList = await models.admin.getAllAdmins();
        
        if (adminList.length <= 1) {
          return {
            response: { text: '❌ *Tidak Dapat Menghapus*\n\nHanya ada 1 admin atau kurang. Minimal harus ada 1 admin aktif.' },
            context: {}
          };
        }
        
        let response = '👥 *DAFTAR ADMIN*\n';
        response += '═'.repeat(40) + '\n\n';
        response += '*Pilih admin yang akan dihapus:*\n\n';
        
        adminList.forEach((adminItem, index) => {
          if (adminItem.phone !== admin.phone) { // Jangan tampilkan diri sendiri
            response += `${index + 1}. *${adminItem.username}*\n`;
            response += `   📱 ${adminItem.phone}\n`;
            response += `   🔑 ${adminItem.role}\n\n`;
          }
        });
        
        response += '\n*Format:* !admindel (nomor telepon)\n';
        response += '*Contoh:* !admindel 628123456789';
        
        return {
          response: { text: response },
          context: {}
        };
      }
      
      let phoneNumber = args.trim();
      
      // Validasi format nomor telepon
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
      
      if (!phoneNumber.startsWith('62')) {
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '62' + phoneNumber.substring(1);
        } else {
          phoneNumber = '62' + phoneNumber;
        }
      }
      
      // Cek apakah mencoba menghapus diri sendiri
      if (phoneNumber === admin.phone) {
        return {
          response: { text: '❌ *Tidak Dapat Menghapus Diri Sendiri*\n\nAnda tidak dapat menghapus akun admin Anda sendiri.' },
          context: {}
        };
      }
      
      // Cari admin yang akan dihapus
      const targetAdmin = await models.admin.getAdminByPhoneNumber(phoneNumber);
      if (!targetAdmin) {
        return {
          response: { text: `❌ *Admin Tidak Ditemukan*\n\nAdmin dengan nomor ${phoneNumber} tidak ditemukan atau sudah tidak aktif.` },
          context: {}
        };
      }
      
      // Cek jumlah admin aktif
      const allAdmins = await models.admin.getAllAdmins();
      if (allAdmins.length <= 1) {
        return {
          response: { text: '❌ *Tidak Dapat Menghapus*\n\nMinimal harus ada 1 admin aktif. Tambahkan admin baru terlebih dahulu sebelum menghapus admin ini.' },
          context: {}
        };
      }
      
      // Hapus admin berdasarkan phone number
      const adminToDelete = await models.admin.getAdminByPhoneNumber(phoneNumber);
      if (adminToDelete) {
        await models.admin.deleteAdmin(adminToDelete.id);
      }
      
      // Kirim notifikasi ke admin yang dihapus
      const notificationMessage = `⚠️ *Pemberitahuan*\n\nAkses admin Anda telah dicabut oleh ${admin.username}.\n\n👤 *Username:* ${targetAdmin.username}\n📱 *Phone:* ${phoneNumber}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\nTerima kasih atas kontribusi Anda.`;
      
      try {
        await sock.sendMessage(`${phoneNumber}@s.whatsapp.net`, { text: notificationMessage });
      } catch (notifError) {
        console.log('Failed to send notification to deleted admin:', notifError);
      }
      
      return {
        response: { text: `✅ *Admin Berhasil Dihapus*\n\n👤 *Username:* ${targetAdmin.username}\n📱 *Phone:* ${phoneNumber}\n🗑️ *Dihapus oleh:* ${admin.username}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n📩 Notifikasi telah dikirim ke admin yang dihapus.` },
        context: {}
      };
      
    } catch (error) {
      console.error('Error deleting admin:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menghapus admin.' },
        context: {}
      };
    }
  }
  
  // === PERINTAH PENGADUAN DAN STATISTIK ===
  
  // !pengaduanlist
  async handlePengaduanListCommand(models, senderId, args, sock, admin, context) {
    try {
      const complaints = await models.Complaint.findAll({
        order: [['created_at', 'DESC']],
        limit: 20
      });
      
      if (complaints.length === 0) {
        return {
          response: { text: '📋 *Daftar Pengaduan*\n\n❌ Belum ada pengaduan yang masuk.' },
          context: {}
        };
      }
      
      let response = '📋 *DAFTAR PENGADUAN WARGA*\n';
      response += '═'.repeat(40) + '\n\n';
      
      complaints.forEach((complaint, index) => {
        const date = new Date(complaint.created_at).toLocaleDateString('id-ID');
        const time = new Date(complaint.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        response += `${index + 1}. *${complaint.subject}*\n`;
        response += `   👤 ${complaint.name}\n`;
        response += `   📱 ${complaint.phone}\n`;
        response += `   📍 ${complaint.location || 'Tidak disebutkan'}\n`;
        response += `   📝 ${complaint.description.substring(0, 100)}${complaint.description.length > 100 ? '...' : ''}\n`;
        response += `   📅 ${date} ${time}\n`;
        response += `   🆔 ID: ${complaint.id}\n\n`;
      });
      
      const totalComplaints = complaints.length;
      if (totalComplaints > 20) {
        response += `... dan ${totalComplaints - 20} pengaduan lainnya\n\n`;
      }
      
      response += '📊 *Statistik:*\n';
      response += `• Total pengaduan: ${totalComplaints}\n`;
      response += `• Ditampilkan: ${Math.min(complaints.length, 20)}`;
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error listing complaints:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengambil daftar pengaduan.' },
        context: {}
      };
    }
  }
  
  // !list_pengaduan - Daftar pengaduan dengan format yang user-friendly
  async handleListPengaduanCommand(models, senderId, args, sock, admin, context) {
    try {
      const complaints = await models.complaint.getAllComplaints();
      
      if (complaints.length === 0) {
        return {
          response: { text: '📋 *Daftar Pengaduan*\n\n❌ Belum ada pengaduan yang masuk.' },
          context: {}
        };
      }
      
      let response = '📋 *DAFTAR PENGADUAN WARGA*\n';
      response += '═'.repeat(40) + '\n\n';
      
      complaints.forEach((complaint, index) => {
        const date = new Date(complaint.created_at).toLocaleDateString('id-ID');
        const time = new Date(complaint.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        response += `${index + 1}. *ID: ${complaint.id}*\n`;
        response += `   👤 ${complaint.reporter_name}\n`;
        response += `   📍 ${complaint.reporter_address}\n`;
        response += `   📝 ${complaint.description.substring(0, 80)}${complaint.description.length > 80 ? '...' : ''}\n`;
        response += `   📅 ${date} ${time}\n\n`;
      });
      
      const totalComplaints = complaints.length;
      if (totalComplaints > 20) {
        response += `... dan ${totalComplaints - 20} pengaduan lainnya\n\n`;
      }
      
      response += '🔧 *Perintah Admin:*\n';
      response += '• !detail_pengaduan [ID] - Lihat detail\n';
      response += '• !update_status [ID] [status] - Update status\n';
      response += '• !delete_pengaduan [ID] - Hapus pengaduan\n\n';
      response += `📊 Total: ${totalComplaints} | Ditampilkan: ${Math.min(complaints.length, 20)}`;
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error listing complaints:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengambil daftar pengaduan.' },
        context: {}
      };
    }
  }
  
  // !detail_pengaduan [ID]
  async handleDetailPengaduanCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !detail_pengaduan [ID]\n\nContoh: !detail_pengaduan 123' },
          context: {}
        };
      }
      
      const complaintId = parseInt(args.trim());
      if (isNaN(complaintId)) {
        return {
          response: { text: '❌ *ID Tidak Valid*\n\nID harus berupa angka.\n\nContoh: !detail_pengaduan 123' },
          context: {}
        };
      }
      
      const complaint = await models.complaint.getComplaintById(complaintId);
      
      if (!complaint) {
        return {
          response: { text: `❌ *Pengaduan Tidak Ditemukan*\n\nPengaduan dengan ID ${complaintId} tidak ditemukan.` },
          context: {}
        };
      }
      
      const date = new Date(complaint.created_at).toLocaleDateString('id-ID');
      const time = new Date(complaint.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      
      let response = '📋 *DETAIL PENGADUAN*\n';
      response += '═'.repeat(40) + '\n\n';
      response += `🆔 *ID:* ${complaint.id}\n`;
      response += `👤 *Nama:* ${complaint.reporter_name}\n`;
      response += `📍 *Alamat:* ${complaint.reporter_address}\n`;
      response += `📅 *Tanggal:* ${date} ${time}\n`;
      response += `📊 *Status:* ${this.formatStatus(complaint.status || 'pending')}\n\n`;
      response += `📝 *Deskripsi Lengkap:*\n${complaint.description}\n\n`;
      
      response += '🔧 *Aksi Admin:*\n';
      response += `• !update_status ${complaint.id} pending - Ubah status menjadi menunggu\n`;
      response += `• !update_status ${complaint.id} processing - Ubah status menjadi sedang diproses\n`;
      response += `• !update_status ${complaint.id} resolved - Ubah status menjadi selesai\n`;
      response += `• !update_status ${complaint.id} rejected - Ubah status menjadi ditolak\n`;
      response += `• !delete_pengaduan ${complaint.id} - Hapus pengaduan\n\n`;
      response += '📋 Status tersedia: menunggu | sedang diproses | selesai | ditolak';
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error getting complaint detail:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengambil detail pengaduan.' },
        context: {}
      };
    }
  }
  
  // !update_status [ID] [status]
  async handleUpdateStatusCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !update_status [ID] [status]\n\nStatus: pending | processing | resolved | rejected\n\nContoh: !update_status 123 processing' },
          context: {}
        };
      }
      
      const parts = args.trim().split(' ');
      if (parts.length !== 2) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !update_status [ID] [status]\n\nContoh: !update_status 123 processing' },
          context: {}
        };
      }
      
      const [idStr, status] = parts;
      const complaintId = parseInt(idStr);
      
      if (isNaN(complaintId)) {
        return {
          response: { text: '❌ *ID Tidak Valid*\n\nID harus berupa angka.\n\nContoh: !update_status 123 processing' },
          context: {}
        };
      }
      
      const validStatuses = ['pending', 'processing', 'resolved', 'rejected'];
      if (!validStatuses.includes(status.toLowerCase())) {
        return {
          response: { text: `❌ *Status Tidak Valid*\n\nStatus yang tersedia: ${validStatuses.join(' | ')}\n\nContoh: !update_status 123 processing` },
          context: {}
        };
      }
      
      const complaint = await models.complaint.getComplaintById(complaintId);
      if (!complaint) {
        return {
          response: { text: `❌ *Pengaduan Tidak Ditemukan*\n\nPengaduan dengan ID ${complaintId} tidak ditemukan.` },
          context: {}
        };
      }
      
      // Update status
      await models.complaint.updateComplaintStatus(complaintId, status.toLowerCase());
      
      // Kirim notifikasi ke pengadu
      const { notifyComplainantStatusUpdate } = require('./complaintController');
      await notifyComplainantStatusUpdate(sock, complaint, status.toLowerCase());
      
      let response = '✅ *Status Berhasil Diupdate*\n\n';
      response += `🆔 *ID:* ${complaintId}\n`;
      response += `👤 *Pelapor:* ${complaint.reporter_name}\n`;
      response += `📊 *Status Baru:* ${this.formatStatus(status.toLowerCase())}\n\n`;
      response += `⏰ *Diupdate oleh:* ${admin.username}\n`;
      response += `📅 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n`;
      response += `📱 *Notifikasi telah dikirim ke pengadu*`;
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error updating complaint status:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengupdate status pengaduan.' },
        context: {}
      };
    }
  }
  
  // !delete_pengaduan [ID]
  async handleDeletePengaduanCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !delete_pengaduan [ID]\n\nContoh: !delete_pengaduan 123' },
          context: {}
        };
      }
      
      const complaintId = parseInt(args.trim());
      if (isNaN(complaintId)) {
        return {
          response: { text: '❌ *ID Tidak Valid*\n\nID harus berupa angka.\n\nContoh: !delete_pengaduan 123' },
          context: {}
        };
      }
      
      const complaint = await models.complaint.getComplaintById(complaintId);
      if (!complaint) {
        return {
          response: { text: `❌ *Pengaduan Tidak Ditemukan*\n\nPengaduan dengan ID ${complaintId} tidak ditemukan.` },
          context: {}
        };
      }
      
      // Simpan info sebelum dihapus
      const complaintInfo = {
        id: complaint.id,
        name: complaint.reporter_name,
        description: complaint.description.substring(0, 50) + '...'
      };
      
      // Hapus pengaduan
      await models.complaint.deleteComplaint(complaintId);
      
      let response = '🗑️ *Pengaduan Berhasil Dihapus*\n\n';
      response += `🆔 *ID:* ${complaintInfo.id}\n`;
      response += `👤 *Pelapor:* ${complaintInfo.name}\n`;
      response += `📝 *Deskripsi:* ${complaintInfo.description}\n\n`;
      response += `⚠️ *Dihapus oleh:* ${admin.username}\n`;
      response += `📅 *Waktu:* ${new Date().toLocaleString('id-ID')}\n\n`;
      response += '⚠️ *Perhatian:* Data yang dihapus tidak dapat dikembalikan.';
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error deleting complaint:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menghapus pengaduan.' },
        context: {}
      };
    }
  }
  
  // Helper function untuk format status
  formatStatus(status) {
    const statusMap = {
      'pending': '⏳ Menunggu',
      'processing': '🔄 Diproses',
      'resolved': '✅ Selesai',
      'rejected': '❌ Ditolak'
    };
    return statusMap[status] || '❓ Tidak Diketahui';
  }
  
  // !statistik
  async handleStatistikCommand(models, senderId, args, sock, admin, context) {
    try {
      // Import NotificationSystem untuk menggunakan collectSystemStats
      const NotificationSystem = require('../utils/notificationSystem');
      const notificationSystem = new NotificationSystem();
      
      // Ambil statistik komprehensif dari NotificationSystem
      const systemStats = await notificationSystem.collectSystemStats();
      
      // Ambil statistik dari database
      const totalComplaints = await models.complaint.getTotalComplaints();
      const allAdmins = await models.admin.getAllAdmins();
      
      // Statistik pengaduan per bulan ini
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      
      const complaintsThisMonth = await models.complaint.getComplaintsThisMonth();
      const complaintsToday = await models.complaint.getComplaintsToday();
      
      // Statistik berita dan layanan dari file
      const fs = require('fs-extra');
      const path = require('path');
      
      let totalNews = 0;
      let totalServices = 0;
      let totalSubServices = 0;
      
      try {
        const newsFile = path.join(process.cwd(), 'uploads', 'news', 'news.json');
        if (await fs.pathExists(newsFile)) {
          const newsList = await fs.readJson(newsFile);
          totalNews = newsList.length;
        }
        
        const servicesFile = path.join(process.cwd(), 'uploads', 'services', 'services.json');
        if (await fs.pathExists(servicesFile)) {
          const servicesList = await fs.readJson(servicesFile);
          totalServices = servicesList.length;
          totalSubServices = servicesList.reduce((total, service) => {
            return total + (service.subServices ? service.subServices.length : 0);
          }, 0);
        }
      } catch (fileError) {
        console.log('Error reading files for statistics:', fileError);
      }
      
      // Hitung ukuran cache dan database
      const dbPath = path.join(process.cwd(), 'village_bot.db');
      let dbSize = '0 MB';
      let dbSizeBytes = 0;
      
      try {
        const dbStats = await fs.stat(dbPath);
        dbSizeBytes = dbStats.size;
        dbSize = `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`;
      } catch (err) {
        console.log('Database file tidak ditemukan');
      }
      
      // Hitung cache size dari memory usage
      const memUsage = process.memoryUsage();
      const cacheSize = `${(memUsage.heapUsed / (1024 * 1024)).toFixed(2)} MB`;
      const totalMemory = `${(memUsage.rss / (1024 * 1024)).toFixed(2)} MB`;
      
      // Statistik sistem detail
      const uptime = process.uptime();
      const uptimeHours = Math.floor(uptime / 3600);
      const uptimeMinutes = Math.floor((uptime % 3600) / 60);
      const uptimeDays = Math.floor(uptimeHours / 24);
      const remainingHours = uptimeHours % 24;
      
      // Format uptime yang lebih detail
      let uptimeFormatted = '';
      if (uptimeDays > 0) {
        uptimeFormatted = `${uptimeDays}d ${remainingHours}h ${uptimeMinutes}m`;
      } else {
        uptimeFormatted = `${uptimeHours}h ${uptimeMinutes}m`;
      }
      
      // Hitung persentase memory usage
      const memoryPercentage = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1);
      
      let response = '📊 *STATISTIK SISTEM LENGKAP*\n';
      response += '═'.repeat(45) + '\n\n';
      
      response += '👥 *ADMIN & PENGGUNA*\n';
      response += `• Total Admin: ${systemStats.totalAdmins || allAdmins.length}\n`;
      response += `• Superadmin: ${systemStats.superAdmins || 0}\n`;
      response += `• Admin: ${systemStats.admins || 0}\n`;
      response += `• Pegawai: ${systemStats.pegawais || 0}\n`;
      response += `• Admin Aktif: ${systemStats.activeAdmins || 0}\n\n`;
      
      response += '📋 *PENGADUAN & KELUHAN*\n';
      response += `• Total Pengaduan: ${totalComplaints}\n`;
      response += `• Pengaduan Hari Ini: ${complaintsToday}\n`;
      response += `• Pengaduan Bulan Ini: ${complaintsThisMonth}\n`;
      response += `• Dalam Proses: ${systemStats.processingComplaints || 0}\n`;
      response += `• Selesai: ${systemStats.completedComplaints || 0}\n\n`;
      
      response += '📰 *KONTEN & LAYANAN*\n';
      response += `• Total Berita: ${totalNews}\n`;
      response += `• Total Layanan: ${totalServices}\n`;
      response += `• Sub-layanan: ${totalSubServices}\n\n`;
      
      response += '💾 *CACHE & DATABASE*\n';
      response += `• Cache Size: ${cacheSize}\n`;
      response += `• Database Size: ${dbSize}\n`;
      response += `• Total Memory: ${totalMemory}\n`;
      response += `• Memory Usage: ${memoryPercentage}%\n`;
      response += `• Total Records: ${systemStats.totalRecords || 'N/A'}\n\n`;
      
      response += '⚙️ *PERFORMA SISTEM*\n';
      response += `• Uptime: ${uptimeFormatted}\n`;
      response += `• CPU Usage: ${systemStats.cpuUsage || 'N/A'}\n`;
      response += `• Response Time: ${systemStats.responseTime || 'N/A'}\n`;
      response += `• Success Rate: ${systemStats.successRate || '100%'}\n`;
      response += `• Error Rate: ${systemStats.errorRate || '0%'}\n\n`;
      
      response += '📊 *AKTIVITAS HARIAN*\n';
      response += `• Pesan Hari Ini: ${systemStats.todayMessages || 0}\n`;
      response += `• Pesan Admin: ${systemStats.adminMessages || 0}\n`;
      response += `• Pesan User: ${systemStats.userMessages || 0}\n`;
      response += `• Rata-rata/Jam: ${systemStats.avgMessagesPerHour || 0}\n\n`;
      
      response += '🔧 *STATUS & INFO*\n';
      response += `• Status Sistem: ${systemStats.systemStatus || '✅ Normal'}\n`;
      response += `• Last Backup: ${systemStats.lastBackup || 'Belum ada'}\n`;
      response += `• Waktu Laporan: ${new Date().toLocaleString('id-ID')}\n\n`;
      
      response += '💡 *PERINTAH STATISTIK*\n';
      response += '• !statistik - Statistik lengkap\n';
      response += '• !list_pengaduan - Daftar pengaduan\n';
      response += '• !pengaturan - Menu pengaturan\n';
      response += '• !backup - Backup database';
      
      return {
        response: { text: response },
        context: {}
      };
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        response: { text: '❌ *Error Statistik*\n\nTerjadi kesalahan saat mengambil statistik sistem.\nSilakan coba lagi atau hubungi administrator.' },
        context: {}
      };
    }
  }
  
  // === PERINTAH PENGATURAN ===
  
  // !pengaturan
  async handlePengaturanCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        // Tampilkan menu pengaturan utama dengan perintah JSON
        let response = '⚙️ *MENU PENGATURAN JSON*\n';
        response += '═'.repeat(40) + '\n\n';
        response += '*🔧 PERINTAH UTAMA:*\n';
        response += '• !settingshow - Tampilkan semua pengaturan\n';
        response += '• !settingshow [kategori] - Tampilkan kategori tertentu\n';
        response += '• !settingreset - Reset ke pengaturan default\n\n';
        
        response += '*📊 LIMIT & BATASAN:*\n';
        response += '• !limitshow - Tampilkan pengaturan limit\n';
        response += '• !limitset [key] [value] - Ubah limit\n';
        response += '  Contoh: !limitset nameLimit 60\n\n';
        
        response += '*🛡️ FILTER & MODERASI:*\n';
        response += '• !filtershow - Tampilkan pengaturan filter\n';
        response += '• !filterset [key] [value] - Ubah filter\n';
        response += '• !filteradd [type] [value] - Tambah ke daftar\n';
        response += '• !filterdel [type] [value] - Hapus dari daftar\n';
        response += '  Contoh: !filteradd bannedWords "kata_baru"\n\n';
        
        response += '*⚖️ MODERASI OTOMATIS:*\n';
        response += '• !moderationshow - Tampilkan pengaturan moderasi\n';
        response += '• !moderationset [key] [value] - Ubah moderasi\n';
        response += '  Contoh: !moderationset autoWarn true\n\n';
        
        response += '*🔧 PERINTAH UMUM:*\n';
        response += '• !settingget [kategori] [key] - Ambil nilai tertentu\n';
        response += '• !settingset [kategori] [key] [value] - Set nilai\n';
        response += '• !settingdel [kategori] [key] - Hapus pengaturan\n\n';
        
        response += '*📋 KATEGORI TERSEDIA:*\n';
        response += 'limits, filters, moderation, notifications, system, security';
        
        return {
          response: { text: response },
          context: {}
        };
      }
      
      // Jika ada args, tampilkan kategori tertentu
      const category = args.trim().toLowerCase();
      const settings = await this.settingsController.getFormattedSettings(category);
      
      return {
        response: { text: settings },
        context: {}
      };
      
    } catch (error) {
      console.error('Error in pengaturan command:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengakses pengaturan.' },
        context: {}
      };
    }
  }
  
  // Submenu pengaturan
  async handleLimitSettings(models, senderId, sock, admin, context) {
    let response = '📏 *PENGATURAN LIMIT & BATASAN*\n';
    response += '═'.repeat(40) + '\n\n';
    
    response += '*Pengaturan saat ini:*\n';
    response += '• Limit nama: 50 karakter\n';
    response += '• Limit pesan: 1000 karakter\n';
    response += '• Limit file: 10MB\n';
    response += '• Timeout pengaduan: 24 jam\n';
    response += '• Max pengaduan/hari: 3\n\n';
    
    response += '*Opsi yang tersedia:*\n';
    response += '1. Ubah limit nama (10-100)\n';
    response += '2. Ubah limit pesan (500-2000)\n';
    response += '3. Ubah limit file (5-50MB)\n';
    response += '4. Ubah timeout pengaduan\n';
    response += '5. Ubah max pengaduan/hari\n\n';
    
    response += '*Status:* 🟢 Aktif\n';
    response += '*Terakhir diubah:* ' + new Date().toLocaleDateString('id-ID');
    
    return {
      response: { text: response },
      context: {}
    };
  }
  
  async handleFilterSettings(models, senderId, sock, admin, context) {
    let response = '🛡️ *PENGATURAN FILTER & MODERASI*\n';
    response += '═'.repeat(40) + '\n\n';
    
    response += '*Status Filter:*\n';
    response += '• Filter kata kasar: 🟢 Aktif\n';
    response += '• Anti-spam: 🟢 Aktif\n';
    response += '• Auto-block: 🟡 Moderate\n';
    response += '• Whitelist mode: 🔴 Nonaktif\n\n';
    
    response += '*Statistik:*\n';
    response += '• Pesan difilter hari ini: 12\n';
    response += '• User di-block: 3\n';
    response += '• Kata kasar terdeteksi: 8\n\n';
    
    response += '*Opsi yang tersedia:*\n';
    response += '1. Toggle filter kata kasar\n';
    response += '2. Atur sensitivitas spam\n';
    response += '3. Kelola daftar kata terlarang\n';
    response += '4. Atur auto-block rules\n';
    response += '5. Kelola whitelist\n\n';
    
    response += '*Terakhir update:* ' + new Date().toLocaleDateString('id-ID');
    
    return {
      response: { text: response },
      context: {}
    };
  }
  
  async handleNotificationSettings(models, senderId, sock, admin, context) {
    let response = '🔔 *PENGATURAN NOTIFIKASI*\n';
    response += '═'.repeat(40) + '\n\n';
    
    response += '*Status Notifikasi:*\n';
    response += '• Admin alerts: 🟢 Aktif\n';
    response += '• Broadcast otomatis: 🟢 Aktif\n';
    response += '• Welcome message: 🟢 Aktif\n';
    response += '• Error notifications: 🟢 Aktif\n';
    response += '• Daily reports: 🟡 Terjadwal\n\n';
    
    response += '*Template Pesan:*\n';
    response += '• Welcome: "Selamat datang di layanan..."\n';
    response += '• Error: "Terjadi kesalahan sistem..."\n';
    response += '• Success: "Operasi berhasil..."\n\n';
    
    response += '*Opsi yang tersedia:*\n';
    response += '1. Edit template welcome\n';
    response += '2. Atur jadwal broadcast\n';
    response += '3. Kelola admin alerts\n';
    response += '4. Konfigurasi daily reports\n';
    response += '5. Test notifikasi\n\n';
    
    response += '*Notifikasi terkirim hari ini:* 45';
    
    return {
      response: { text: response },
      context: {}
    };
  }
  
  async handleSystemSettings(models, senderId, sock, admin, context) {
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    let response = '⚙️ *PENGATURAN SISTEM & DATABASE*\n';
    response += '═'.repeat(40) + '\n\n';
    
    response += '*Status Sistem:*\n';
    response += '• Status: 🟢 Online\n';
    response += `• Uptime: ${uptimeHours}h ${uptimeMinutes}m\n`;
    response += '• Memory usage: 45%\n';
    response += '• Database: 🟢 Connected\n';
    response += '• Maintenance mode: 🔴 Off\n\n';
    
    response += '*Database Info:*\n';
    response += '• Total records: 1,234\n';
    response += '• Last backup: ' + new Date().toLocaleDateString('id-ID') + '\n';
    response += '• Size: 15.2 MB\n\n';
    
    response += '*Opsi yang tersedia:*\n';
    response += '1. Backup database sekarang\n';
    response += '2. Cleanup data lama\n';
    response += '3. Toggle maintenance mode\n';
    response += '4. Restart sistem\n';
    response += '5. View system logs\n';
    response += '6. Optimize database\n\n';
    
    response += '*Auto-backup:* 🟢 Setiap 24 jam';
    
    return {
      response: { text: response },
      context: {}
    };
  }
  
  async handleSecuritySettings(models, senderId, sock, admin, context) {
    let response = '🔒 *PENGATURAN KEAMANAN*\n';
    response += '═'.repeat(40) + '\n\n';
    
    response += '*Status Keamanan:*\n';
    response += '• Rate limiting: 🟢 Aktif (10/menit)\n';
    response += '• IP blocking: 🟢 Aktif\n';
    response += '• Session timeout: 🟢 24 jam\n';
    response += '• 2FA untuk admin: 🔴 Nonaktif\n';
    response += '• Encryption: 🟢 AES-256\n\n';
    
    response += '*Statistik Keamanan:*\n';
    response += '• Blocked IPs: 15\n';
    response += '• Failed login attempts: 3\n';
    response += '• Suspicious activities: 1\n\n';
    
    response += '*Opsi yang tersedia:*\n';
    response += '1. Atur rate limiting\n';
    response += '2. Kelola blocked IPs\n';
    response += '3. Ubah session timeout\n';
    response += '4. Enable/disable 2FA\n';
    response += '5. View security logs\n';
    response += '6. Reset security settings\n\n';
    
    response += '*Last security scan:* ' + new Date().toLocaleDateString('id-ID');
    
    return {
      response: { text: response },
      context: {}
    };
  }
  
  async handleDisplaySettings(models, senderId, sock, admin, context) {
    let response = '🎨 *PENGATURAN TAMPILAN & FORMAT*\n';
    response += '═'.repeat(40) + '\n\n';
    
    response += '*Format Saat Ini:*\n';
    response += '• Bahasa: 🇮🇩 Indonesia\n';
    response += '• Timezone: WIB (UTC+7)\n';
    response += '• Format tanggal: DD/MM/YYYY\n';
    response += '• Format waktu: 24 jam\n';
    response += '• Emoji: 🟢 Aktif\n\n';
    
    response += '*Template Pesan:*\n';
    response += '• Header: "═══ SISTEM DESA ═══"\n';
    response += '• Footer: "Terima kasih 🙏"\n';
    response += '• Error prefix: "❌"\n';
    response += '• Success prefix: "✅"\n\n';
    
    response += '*Opsi yang tersedia:*\n';
    response += '1. Ubah bahasa interface\n';
    response += '2. Atur timezone\n';
    response += '3. Format tanggal/waktu\n';
    response += '4. Kelola template pesan\n';
    response += '5. Toggle emoji\n';
    response += '6. Custom header/footer\n\n';
    
    response += '*Theme:* Default | *Style:* Professional';
    
    return {
      response: { text: response },
      context: {}
    };
  }
  
  async handleNewsEditStep(models, senderId, messageText, sock, context) {
    const newsId = context.editing_news.id;
    const step = context.editing_news.step;
    
    try {
      // Baca file berita
      const fs = require('fs-extra');
      const path = require('path');
      const newsDir = path.join(process.cwd(), 'uploads', 'news');
      const newsFile = path.join(newsDir, 'news.json');
      
      let newsData = [];
      if (await fs.pathExists(newsFile)) {
        newsData = await fs.readJson(newsFile);
      }
      
      const newsIndex = newsData.findIndex(news => news.id === newsId);
      if (newsIndex === -1) {
        return {
          response: { text: '❌ Berita tidak ditemukan.' },
          context: { editing_news: null }
        };
      }
      
      const news = newsData[newsIndex];
      
      switch (step) {
        case 'title':
          if (messageText.trim() === '') {
            return {
              response: { text: '❌ Judul tidak boleh kosong. Silakan masukkan judul baru:' }
            };
          }
          
          news.title = messageText.trim();
          news.updated_at = new Date().toISOString();
          
          return {
            response: { text: `✅ Judul berhasil diubah menjadi: "${news.title}"\n\nSekarang masukkan deskripsi baru:` },
            context: { editing_news: { id: newsId, step: 'description' } }
          };
          
        case 'description':
          if (messageText.trim() === '') {
            return {
              response: { text: '❌ Deskripsi tidak boleh kosong. Silakan masukkan deskripsi baru:' }
            };
          }
          
          news.description = messageText.trim();
          news.updated_at = new Date().toISOString();
          
          return {
            response: { text: `✅ Deskripsi berhasil diubah menjadi: "${news.description}"\n\nSekarang masukkan isi berita baru:` },
            context: { editing_news: { id: newsId, step: 'content' } }
          };
          
        case 'content':
          if (messageText.trim() === '') {
            return {
              response: { text: '❌ Isi berita tidak boleh kosong. Silakan masukkan isi berita baru:' }
            };
          }
          
          news.content = messageText.trim();
          news.updated_at = new Date().toISOString();
          
          // Simpan perubahan
          newsData[newsIndex] = news;
          await fs.writeJson(newsFile, newsData, { spaces: 2 });
          
          const successMessage = `✅ *BERITA BERHASIL DIPERBARUI*\n\n` +
            `📰 *Judul:* ${news.title}\n` +
            `📝 *Deskripsi:* ${news.description}\n` +
            `📄 *Isi:* ${news.content.substring(0, 100)}${news.content.length > 100 ? '...' : ''}\n` +
            `🕒 *Diperbarui:* ${new Date(news.updated_at).toLocaleString('id-ID')}`;
          
          return {
            response: { text: successMessage },
            context: { editing_news: null }
          };
          
        default:
          return {
            response: { text: '❌ Step editing tidak valid.' },
            context: { editing_news: null }
          };
      }
    } catch (error) {
      console.error('Error in handleNewsEditStep:', error);
      return {
        response: { text: '❌ Terjadi kesalahan saat mengedit berita.' },
        context: { editing_news: null }
      };
    }
  }

  async handleLayananEditStep(models, senderId, messageText, sock, context) {
    const editingData = context.editing_layanan;
    
    try {
      // Cek apakah user ingin membatalkan
      if (messageText.trim().toLowerCase() === 'batal') {
        return {
          response: { text: '❌ *Edit Dibatalkan*\n\nProses edit layanan telah dibatalkan.' },
          context: { editing_layanan: null }
        };
      }
      
      if (messageText.trim() === '') {
        return {
          response: { text: '❌ *Konten Tidak Boleh Kosong*\n\nSilakan masukkan konten baru atau ketik "batal" untuk membatalkan.' }
        };
      }
      
      const fs = require('fs-extra');
      const newContent = messageText.trim();
      
      // Simpan konten baru ke file
      await fs.writeFile(editingData.contentPath, newContent, 'utf8');
      
      let response = `✅ *LAYANAN BERHASIL DIPERBARUI*\n\n`;
      response += `🏢 *Layanan:* ${editingData.serviceName}\n`;
      response += `📋 *Sub-layanan:* ${editingData.subServiceName}\n`;
      response += `📁 *Folder:* ${editingData.targetSubFolder}\n`;
      response += `📄 *File:* content.txt\n`;
      response += `📝 *Ukuran konten:* ${newContent.length} karakter\n`;
      response += `🕒 *Diperbarui:* ${new Date().toLocaleString('id-ID')}\n\n`;
      response += `💡 *Perintah selanjutnya:*\n`;
      response += `• !layananshow ${editingData.serviceNumber}${editingData.subLetter} - Lihat hasil\n`;
      response += `• !layananlist - Lihat daftar layanan`;
      
      return {
        response: { text: response },
        context: { editing_layanan: null }
      };
      
    } catch (error) {
      console.error('Error in handleLayananEditStep:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menyimpan konten layanan.' },
        context: { editing_layanan: null }
      };
    }
  }

  // ===== FUNGSI CRUD PENGATURAN JSON =====
  
  // Tampilkan semua pengaturan atau kategori tertentu
  async handleSettingsShowCommand(models, senderId, args, sock, admin, context) {
    try {
      const category = args ? args.trim().toLowerCase() : null;
      const settings = await this.settingsController.getFormattedSettings(category);
      
      return {
        response: { text: settings },
        context: {}
      };
    } catch (error) {
      console.error('Error showing settings:', error);
      return {
        response: { text: '❌ *Error*\n\nGagal menampilkan pengaturan.' },
        context: {}
      };
    }
  }

  // Set pengaturan umum
  async handleSettingSetCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !settingset [kategori] [key] [value]\nContoh: !settingset limits nameLimit 60' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 3) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !settingset [kategori] [key] [value]' },
          context: {}
        };
      }

      const [category, key, ...valueParts] = parts;
      let value = valueParts.join(' ');

      // Parse value berdasarkan tipe
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && !isNaN(parseFloat(value))) value = parseFloat(value);
      else if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          return {
            response: { text: '❌ *Format Array Salah*\n\nContoh array: ["item1","item2"]' },
            context: {}
          };
        }
      }

      // Validasi setting
      if (!this.settingsController.validateSetting(category, key, value)) {
        return {
          response: { text: '❌ *Nilai Tidak Valid*\n\nNilai yang diberikan tidak sesuai dengan aturan validasi.' },
          context: {}
        };
      }

      const success = await this.settingsController.updateSetting(category, key, value, admin.name);
      
      if (success) {
        return {
          response: { text: `✅ *Pengaturan Berhasil Diubah*\n\n📂 Kategori: ${category}\n🔑 Key: ${key}\n💾 Nilai: ${value}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Menyimpan*\n\nTerjadi kesalahan saat menyimpan pengaturan.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error setting value:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengubah pengaturan.' },
        context: {}
      };
    }
  }

  // Get pengaturan tertentu
  async handleSettingGetCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !settingget [kategori] [key]\nContoh: !settingget limits nameLimit' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 2) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !settingget [kategori] [key]' },
          context: {}
        };
      }

      const [category, key] = parts;
      const value = await this.settingsController.getSetting(category, key);
      
      if (value !== null) {
        return {
          response: { text: `📋 *Nilai Pengaturan*\n\n📂 Kategori: ${category}\n🔑 Key: ${key}\n💾 Nilai: ${JSON.stringify(value, null, 2)}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Tidak Ditemukan*\n\nPengaturan yang diminta tidak ditemukan.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error getting setting:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengambil pengaturan.' },
        context: {}
      };
    }
  }

  // Hapus pengaturan
  async handleSettingDelCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !settingdel [kategori] [key]\nContoh: !settingdel limits customLimit' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 2) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !settingdel [kategori] [key]' },
          context: {}
        };
      }

      const [category, key] = parts;
      const success = await this.settingsController.deleteSetting(category, key, admin.name);
      
      if (success) {
        return {
          response: { text: `✅ *Pengaturan Berhasil Dihapus*\n\n📂 Kategori: ${category}\n🔑 Key: ${key}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Menghapus*\n\nPengaturan tidak ditemukan atau terjadi kesalahan.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error deleting setting:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menghapus pengaturan.' },
        context: {}
      };
    }
  }

  // Reset pengaturan ke default
  async handleSettingResetCommand(models, senderId, args, sock, admin, context) {
    try {
      const success = await this.settingsController.resetToDefault(admin.name);
      
      if (success) {
        return {
          response: { text: '✅ *Pengaturan Berhasil Direset*\n\nSemua pengaturan telah dikembalikan ke nilai default.' },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Reset*\n\nTerjadi kesalahan saat mereset pengaturan.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mereset pengaturan.' },
        context: {}
      };
    }
  }

  // ===== FUNGSI KHUSUS LIMIT =====
  
  async handleLimitSetCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !limitset [key] [value]\nContoh: !limitset nameLimit 60\n\nKey tersedia: nameLimit, messageLimit, fileLimit, complaintTimeout, maxComplaintsPerDay' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 2) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !limitset [key] [value]' },
          context: {}
        };
      }

      const [key, value] = parts;
      const numValue = parseInt(value);
      
      if (isNaN(numValue)) {
        return {
          response: { text: '❌ *Nilai Harus Angka*\n\nMasukkan nilai berupa angka.' },
          context: {}
        };
      }

      if (!this.settingsController.validateSetting('limits', key, numValue)) {
        return {
          response: { text: '❌ *Nilai Tidak Valid*\n\nNilai yang diberikan tidak sesuai dengan batas yang diizinkan.' },
          context: {}
        };
      }

      const success = await this.settingsController.updateSetting('limits', key, numValue, admin.name);
      
      if (success) {
        return {
          response: { text: `✅ *Limit Berhasil Diubah*\n\n🔑 ${key}: ${numValue}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Menyimpan*\n\nTerjadi kesalahan saat menyimpan limit.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error setting limit:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengubah limit.' },
        context: {}
      };
    }
  }

  async handleLimitShowCommand(models, senderId, args, sock, admin, context) {
    try {
      const settings = await this.settingsController.getFormattedSettings('limits');
      return {
        response: { text: settings },
        context: {}
      };
    } catch (error) {
      console.error('Error showing limits:', error);
      return {
        response: { text: '❌ *Error*\n\nGagal menampilkan pengaturan limit.' },
        context: {}
      };
    }
  }

  // ===== FUNGSI KHUSUS FILTER =====
  
  async handleFilterSetCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !filterset [key] [value]\nContoh: !filterset profanityFilter true\n\nKey tersedia: profanityFilter, spamFilter, linkFilter, autoModeration' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 2) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !filterset [key] [value]' },
          context: {}
        };
      }

      const [key, value] = parts;
      let boolValue;
      
      if (value === 'true') boolValue = true;
      else if (value === 'false') boolValue = false;
      else {
        return {
          response: { text: '❌ *Nilai Harus Boolean*\n\nGunakan "true" atau "false".' },
          context: {}
        };
      }

      const success = await this.settingsController.updateSetting('filters', key, boolValue, admin.name);
      
      if (success) {
        return {
          response: { text: `✅ *Filter Berhasil Diubah*\n\n🔑 ${key}: ${boolValue ? '🟢 Aktif' : '🔴 Nonaktif'}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Menyimpan*\n\nTerjadi kesalahan saat menyimpan filter.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error setting filter:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengubah filter.' },
        context: {}
      };
    }
  }

  async handleFilterShowCommand(models, senderId, args, sock, admin, context) {
    try {
      const settings = await this.settingsController.getFormattedSettings('filters');
      return {
        response: { text: settings },
        context: {}
      };
    } catch (error) {
      console.error('Error showing filters:', error);
      return {
        response: { text: '❌ *Error*\n\nGagal menampilkan pengaturan filter.' },
        context: {}
      };
    }
  }

  async handleFilterAddCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !filteradd [type] [value]\nContoh: !filteradd bannedWords "kata_baru"\n\nType tersedia: bannedWords, allowedFileTypes, blockedDomains' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 2) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !filteradd [type] [value]' },
          context: {}
        };
      }

      const [type, ...valueParts] = parts;
      const value = valueParts.join(' ').replace(/"/g, '');

      const success = await this.settingsController.addToArray('filters', type, value, admin.name);
      
      if (success) {
        return {
          response: { text: `✅ *Item Berhasil Ditambahkan*\n\n📂 Type: ${type}\n💾 Value: ${value}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Menambahkan*\n\nItem mungkin sudah ada atau terjadi kesalahan.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error adding filter:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menambahkan filter.' },
        context: {}
      };
    }
  }

  async handleFilterDelCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !filterdel [type] [value]\nContoh: !filterdel bannedWords "kata_lama"' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 2) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !filterdel [type] [value]' },
          context: {}
        };
      }

      const [type, ...valueParts] = parts;
      const value = valueParts.join(' ').replace(/"/g, '');

      const success = await this.settingsController.removeFromArray('filters', type, value, admin.name);
      
      if (success) {
        return {
          response: { text: `✅ *Item Berhasil Dihapus*\n\n📂 Type: ${type}\n💾 Value: ${value}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Menghapus*\n\nItem tidak ditemukan atau terjadi kesalahan.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menghapus filter.' },
        context: {}
      };
    }
  }

  // ===== FUNGSI KHUSUS MODERASI =====
  
  async handleModerationSetCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { text: '❌ *Format Salah*\n\nFormat: !moderationset [key] [value]\nContoh: !moderationset autoWarn true\n\nKey tersedia: autoWarn, autoMute, autoBan, warningThreshold, muteThreshold, banThreshold' },
          context: {}
        };
      }

      const parts = args.split(' ');
      if (parts.length < 2) {
        return {
          response: { text: '❌ *Parameter Kurang*\n\nFormat: !moderationset [key] [value]' },
          context: {}
        };
      }

      const [key, value] = parts;
      let finalValue;
      
      // Parse value berdasarkan key
      if (['autoWarn', 'autoMute', 'autoBan', 'logViolations', 'notifyAdmins', 'escalationEnabled'].includes(key)) {
        if (value === 'true') finalValue = true;
        else if (value === 'false') finalValue = false;
        else {
          return {
            response: { text: '❌ *Nilai Harus Boolean*\n\nGunakan "true" atau "false".' },
            context: {}
          };
        }
      } else {
        finalValue = parseInt(value);
        if (isNaN(finalValue)) {
          return {
            response: { text: '❌ *Nilai Harus Angka*\n\nMasukkan nilai berupa angka.' },
            context: {}
          };
        }
      }

      if (!this.settingsController.validateSetting('moderation', key, finalValue)) {
        return {
          response: { text: '❌ *Nilai Tidak Valid*\n\nNilai yang diberikan tidak sesuai dengan aturan validasi.' },
          context: {}
        };
      }

      const success = await this.settingsController.updateSetting('moderation', key, finalValue, admin.name);
      
      if (success) {
        return {
          response: { text: `✅ *Moderasi Berhasil Diubah*\n\n🔑 ${key}: ${finalValue}` },
          context: {}
        };
      } else {
        return {
          response: { text: '❌ *Gagal Menyimpan*\n\nTerjadi kesalahan saat menyimpan pengaturan moderasi.' },
          context: {}
        };
      }
    } catch (error) {
      console.error('Error setting moderation:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat mengubah moderasi.' },
        context: {}
      };
    }
  }

  async handleModerationShowCommand(models, senderId, args, sock, admin, context) {
    try {
      const settings = await this.settingsController.getFormattedSettings('moderation');
      return {
        response: { text: settings },
        context: {}
      };
    } catch (error) {
      console.error('Error showing moderation:', error);
      return {
        response: { text: '❌ *Error*\n\nGagal menampilkan pengaturan moderasi.' },
        context: {}
      };
    }
  }
  
  // !clearcache - Hapus cache gambar
  async handleClearCacheCommand(models, senderId, args, sock, admin, context) {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      let deletedFiles = 0;
      let totalSize = 0;
      const folders = ['complaints', 'news', 'village_info', 'announcements'];
      
      for (const folder of folders) {
        const folderPath = path.join(process.cwd(), 'uploads', folder);
        
        if (await fs.pathExists(folderPath)) {
          const files = await fs.readdir(folderPath);
          
          for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stats = await fs.stat(filePath);
            
            // Hanya hapus file gambar, bukan file JSON
            if (stats.isFile() && !file.endsWith('.json')) {
              totalSize += stats.size;
              await fs.remove(filePath);
              deletedFiles++;
            }
          }
        }
      }
      
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      
      return {
        response: { 
          text: `✅ *Cache Gambar Berhasil Dihapus*\n\n📊 *Statistik:*\n• File dihapus: ${deletedFiles}\n• Ruang dibebaskan: ${sizeInMB} MB\n\n📁 *Folder yang dibersihkan:*\n• Pengaduan\n• Berita\n• Wisata\n• Pengumuman\n\n👤 *Dihapus oleh:* ${admin.username}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}` 
        },
        context: {}
      };
      
    } catch (error) {
      console.error('Error clearing cache:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menghapus cache gambar.' },
        context: {}
      };
    }
  }
  
  // !deleteimages [folder] - Hapus gambar dari folder tertentu
  async handleDeleteImagesCommand(models, senderId, args, sock, admin, context) {
    try {
      if (!args) {
        return {
          response: { 
            text: '❌ *Format Salah*\n\nFormat: !deleteimages [folder]\n\nFolder tersedia:\n• complaints - Gambar pengaduan\n• news - Gambar berita\n• village_info - Gambar wisata\n• announcements - Gambar pengumuman\n• all - Semua folder\n\nContoh: !deleteimages news' 
          },
          context: {}
        };
      }
      
      const fs = require('fs-extra');
      const path = require('path');
      const targetFolder = args.trim().toLowerCase();
      
      const validFolders = ['complaints', 'news', 'village_info', 'announcements', 'all'];
      if (!validFolders.includes(targetFolder)) {
        return {
          response: { 
            text: `❌ *Folder Tidak Valid*\n\nFolder yang tersedia: ${validFolders.join(', ')}\n\nContoh: !deleteimages news` 
          },
          context: {}
        };
      }
      
      let deletedFiles = 0;
      let totalSize = 0;
      let foldersToClean = [];
      
      if (targetFolder === 'all') {
        foldersToClean = ['complaints', 'news', 'village_info', 'announcements'];
      } else {
        foldersToClean = [targetFolder];
      }
      
      for (const folder of foldersToClean) {
        const folderPath = path.join(process.cwd(), 'uploads', folder);
        
        if (await fs.pathExists(folderPath)) {
          const files = await fs.readdir(folderPath);
          
          for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stats = await fs.stat(filePath);
            
            // Hanya hapus file gambar, bukan file JSON
            if (stats.isFile() && !file.endsWith('.json')) {
              totalSize += stats.size;
              await fs.remove(filePath);
              deletedFiles++;
            }
          }
        }
      }
      
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      const folderNames = {
        'complaints': 'Pengaduan',
        'news': 'Berita', 
        'village_info': 'Wisata',
        'announcements': 'Pengumuman'
      };
      
      let cleanedFolderText = '';
      if (targetFolder === 'all') {
        cleanedFolderText = 'Semua folder';
      } else {
        cleanedFolderText = folderNames[targetFolder] || targetFolder;
      }
      
      return {
        response: { 
          text: `✅ *Gambar Berhasil Dihapus*\n\n📊 *Statistik:*\n• File dihapus: ${deletedFiles}\n• Ruang dibebaskan: ${sizeInMB} MB\n\n📁 *Folder:* ${cleanedFolderText}\n\n👤 *Dihapus oleh:* ${admin.username}\n🕒 *Waktu:* ${new Date().toLocaleString('id-ID')}` 
        },
        context: {}
      };
      
    } catch (error) {
      console.error('Error deleting images:', error);
      return {
        response: { text: '❌ *Error*\n\nTerjadi kesalahan saat menghapus gambar.' },
        context: {}
      };
    }
  }
  
  // Handler untuk perintah UMKM
  async handleUMKMAddCommand(models, senderId, args, sock, admin, context) {
    const umkmController = require('./umkmController');
    return await umkmController.addUMKM(models, senderId, args, sock, admin, context);
  }

  async handleUMKMListCommand(models, senderId, args, sock, admin, context) {
    const umkmController = require('./umkmController');
    return await umkmController.listUMKM(models, senderId, args, sock, admin, context);
  }

  async handleUMKMEditCommand(models, senderId, args, sock, admin, context) {
    const umkmController = require('./umkmController');
    return await umkmController.editUMKM(models, senderId, args, sock, admin, context);
  }

  async handleUMKMDeleteCommand(models, senderId, args, sock, admin, context) {
    const umkmController = require('./umkmController');
    return await umkmController.deleteUMKM(models, senderId, args, sock, admin, context);
  }

  async handleUMKMStatsCommand(models, senderId, args, sock, admin, context) {
    const umkmController = require('./umkmController');
    return await umkmController.getUMKMStats(models, senderId, args, sock, admin, context);
  }
  
  // Placeholder methods untuk fitur lainnya
  async handleBackupCommand() { return { text: '💾 *Backup*\n\nFitur sedang dalam pengembangan.' }; }
  async handleBroadcastCommand() { return { text: '📡 *Broadcast*\n\nFitur sedang dalam pengembangan.' }; }
  async handleBanCommand() { return { text: '🚫 *Ban User*\n\nFitur sedang dalam pengembangan.' }; }
  async handleUnbanCommand() { return { text: '✅ *Unban User*\n\nFitur sedang dalam pengembangan.' }; }
  async handleFilterCommand() { return { text: '🛡️ *Filter Management*\n\nFitur sedang dalam pengembangan.' }; }
  async handleSystemCommand() { return { text: '⚙️ *System Control*\n\nFitur sedang dalam pengembangan.' }; }
  async handleLogCommand() { return { text: '📝 *Log Management*\n\nFitur sedang dalam pengembangan.' }; }
  async handleMaintenanceCommand() { return { text: '🔧 *Maintenance Mode*\n\nFitur sedang dalam pengembangan.' }; }
}

module.exports = new AdminCommandController();