/**
 * BotDesapulosarok - Aplikasi Layanan Informasi Desa Pulosarok
 * Aplikasi berbasis SQLite dengan sistem menu numerik dan 30+ fitur layanan desa
 * Terintegrasi dengan WhatsApp menggunakan Baileys
 */

require('dotenv').config();
const { connectToWhatsApp } = require('./src/config/whatsapp');
const { formatMenuMessage, formatSubMenuMessage, getSubMenuContent, readMenuStructure } = require('./src/controllers/admin');
const { formatComplaintForm, processComplaintSubmission, saveComplaintMedia } = require('./src/controllers/complaintController');
const adminCommandController = require('./src/controllers/adminCommandController');
const { initSQLiteDatabase } = require('./src/database/initSQLiteDb');
const SQLiteUser = require('./src/models/SQLiteUser');
const SQLiteMenu = require('./src/models/SQLiteMenu');
const SQLiteChat = require('./src/models/SQLiteChat');
const SQLiteMenuContent = require('./src/models/SQLiteMenuContent');
const JSONAdmin = require('./src/models/JSONAdmin');
const SQLiteUMKM = require('./src/models/SQLiteUMKM');
const NewsSearchController = require('./src/controllers/newsSearchController');

// Variabel untuk menyimpan instance database dan model
let db = null;
let models = null;

// Fungsi untuk menangani pesan WhatsApp
const handleMessage = async (models, msg, sock) => {
  try {
    // Dapatkan ID pengirim
    const senderId = msg.key.remoteJid.split('@')[0];
    
    // Inisialisasi user model
    const userModel = new SQLiteUser(models.chat.db);
    
    // Cek apakah pengirim adalah admin
    const isAdmin = await models.admin.getAdminByPhoneNumber(senderId);
    
    // Cek dan kelola user (welcome untuk user baru)
    const user = userModel.getOrCreateUser(senderId);
    
    // Dapatkan isi pesan
    const messageContent = msg.message.conversation || 
                          (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || 
                          (msg.message.imageMessage && msg.message.imageMessage.caption) || 
                          (msg.message.videoMessage && msg.message.videoMessage.caption) || 
                          '';
    
    // Cek limit harian hanya untuk user biasa (bukan admin)
    if (!isAdmin) {
      const dailyLimit = userModel.checkDailyLimit(senderId, 50, false);
      if (!dailyLimit.withinLimit) {
        const welcomeMessage = `🎉 *Selamat Datang di Layanan Digital Desa Pulosarok!*\n\n👋 Halo! Terima kasih telah menggunakan layanan WhatsApp Bot kami.\n\n🏛️ *Layanan yang Tersedia:*\n• Administrasi Kependudukan\n• Perizinan\n• Informasi Kesehatan\n• Informasi Desa\n• Pengaduan Masyarakat\n• Aduan Layanan\n\n📱 *Cara Penggunaan:*\n• Ketik *menu* untuk melihat daftar layanan\n• Ketik *reset* untuk kembali ke menu utama\n• Gunakan kode menu (contoh: 1A, 2B) untuk akses cepat\n\n⚡ *Limit Harian:* ${dailyLimit.remaining} interaksi tersisa hari ini\n\n💡 *Tips:* Gunakan kata kunci yang jelas untuk mendapatkan informasi yang tepat\n\n_Sistem ini dibuat oleh anak UMSU untuk melayani masyarakat dengan lebih baik_\n\n---\nKetik *menu* untuk memulai 👇`;
        return { text: welcomeMessage };
      }
    }
    
    // Dapatkan chat memory
    let chatMemory = await models.chat.getChatMemoryByUserId(senderId)[0];
    let context = chatMemory ? JSON.parse(chatMemory.context || '{}') : {};

    // Normalisasi pesan singkat
    const cleanedMessage = (messageContent || '').trim();

    // ADMIN COMMANDS - Deteksi semua perintah admin dengan awalan !
    if (cleanedMessage.startsWith('!')) {
      const result = await adminCommandController.handleAdminCommand(
        models, 
        senderId, 
        cleanedMessage, 
        sock, 
        context
      );
      
      // Update context jika ada perubahan
      if (result.context) {
        Object.assign(context, result.context);
      }
      
      // Simpan chat memory
      await saveChatMemory(models.chat, senderId, messageContent, result.response, context);
      
      return result.response;
    }

    // Cek apakah pesan adalah ID angka (navigasi user)
    if (/^\d+$/.test(cleanedMessage)) {
      const menuId = parseInt(cleanedMessage);
      return await handleUserMenuNavigation(models, senderId, menuId, sock, context);
    }
    
    // Cek apakah pesan adalah ID submenu (contoh: 1A, 2B)
    if (/^\d+[A-Za-z]$/.test(cleanedMessage)) {
      const match = cleanedMessage.match(/^(\d+)([A-Za-z])$/);
      if (match) {
        const menuId = parseInt(match[1]);
        const subMenuLetter = match[2].toUpperCase();
        return await handleUserSubMenuNavigation(models, senderId, menuId, subMenuLetter, sock, context);
      }
    }

    // 1) DUKUNG Akses langsung ke sub-menu dengan format 1A, 2B, dst, meski belum pilih menu
    const earlySubMenuPattern = /^(\d+)([A-Z])$/i;
    const earlyMatch = cleanedMessage.match(earlySubMenuPattern);
    if (earlyMatch) {
      const menuId = parseInt(earlyMatch[1]);
      const subMenuLetter = earlyMatch[2].toUpperCase();

      // Ambil konten sub menu langsung
      const response = await getSubMenuContent(models.menuContent, menuId, subMenuLetter);

      // Set context agar navigasi kembali berfungsi
      context.menu_id = menuId;
      context.sub_menu_id = `${menuId}${subMenuLetter}`;

      // Simpan chat memory
      await saveChatMemory(models.chat, senderId, messageContent, response, context);

      return response;
    }
    
    // Cek apakah pesan adalah perintah reset
    if (cleanedMessage.toLowerCase() === 'reset' || cleanedMessage.toLowerCase() === 'menu') {
      // Reset context
      context = {};
      await saveChatMemory(models.chat, senderId, messageContent, 'Menu utama ditampilkan', context);
      
      // Tampilkan menu utama
      return await formatMenuMessage(models.menu);
    }
    
    // Cek apakah ada context form pengaduan
    if (context.complaint_form) {
      // Proses pengaduan
      const result = await processComplaintSubmission(models.complaint, msg, sock, models.admin);
      
      // Reset context setelah pengaduan selesai
      if (result.reset) {
        context = {};
      } else {
        context = { ...context, ...result.context };
      }
      
      // Simpan chat memory
      await saveChatMemory(models.chat, senderId, messageContent, result.response, context);
      
      return { text: result.response };
    }
    
    // Cek apakah sedang dalam proses edit berita
    if (context.editing_news) {
      const result = await adminCommandController.handleNewsEditStep(models, senderId, messageContent, sock, context);
      
      // Update context
      if (result.context) {
        Object.assign(context, result.context);
      }
      
      // Simpan chat memory
      await saveChatMemory(models.chat, senderId, messageContent, result.response, context);
      
      return result.response;
    }
    
    // Cek apakah sedang dalam proses edit layanan
    if (context.editing_layanan) {
      const result = await adminCommandController.handleLayananEditStep(models, senderId, messageContent, sock, context);
      
      // Update context
      if (result.context) {
        Object.assign(context, result.context);
      }
      
      // Simpan chat memory
      await saveChatMemory(models.chat, senderId, messageContent, result.response, context);
      
      return result.response;
    }
    
    // Cek apakah ada context menu
    if (context.menu_id) {
      // Jika ada sub_menu_id, berarti user sedang melihat konten sub-menu
      if (context.sub_menu_id) {
        // Cek apakah pesan adalah perintah kembali
        if (cleanedMessage.toLowerCase() === 'kembali' || cleanedMessage === '0') {
          // Hapus sub_menu_id dari context
          delete context.sub_menu_id;
          
          // Tampilkan sub-menu
          const response = await formatSubMenuMessage(models.menu, context.menu_id);
          
          // Simpan chat memory
          await saveChatMemory(models.chat, senderId, messageContent, response, context);
          
          return response;
        }

        // Jika user mengetik angka 1..N saat berada di tampilan konten, anggap sebagai pindah ke menu utama tersebut
        const possibleMainMenu = parseInt(cleanedMessage);
        if (!isNaN(possibleMainMenu) && possibleMainMenu > 0) {
          const menusFS = await readMenuStructure();
          const targetMenu = menusFS.find(m => m.id === possibleMainMenu);
          if (targetMenu) {
            // Pindah ke menu utama yang baru dan bersihkan sub_menu_id lama
            context.menu_id = targetMenu.id;
            delete context.sub_menu_id;

            const response = await formatSubMenuMessage(models.menu, targetMenu.id);
            await saveChatMemory(models.chat, senderId, messageContent, response, context);
            return response;
          }
        }

        // Dukung input huruf saja (A, B, C, ...) untuk berpindah konten sub-menu pada menu aktif saat ini
        if (/^[A-Za-z]$/.test(cleanedMessage)) {
          const letterOnly = cleanedMessage.toUpperCase();
          const activeMenuId = parseInt(context.menu_id);
          const response = await getSubMenuContent(models.menuContent, activeMenuId, letterOnly);
          context.sub_menu_id = `${activeMenuId}${letterOnly}`;
          await saveChatMemory(models.chat, senderId, messageContent, response, context);
          return response;
        }
        
        // Jika bukan perintah kembali, tampilkan pesan bantuan
        const response = 'Ketik kembali atau 0 untuk kembali ke menu sebelumnya, atau ketik menu untuk kembali ke menu utama.';
        
        // Simpan chat memory
        await saveChatMemory(models.chat, senderId, messageContent, response, context);
        
        return response;
      }
      
      // Jika tidak ada sub_menu_id, berarti user sedang melihat sub-menu
      // Cek apakah pesan adalah perintah kembali
      if (cleanedMessage.toLowerCase() === 'kembali' || cleanedMessage === '0') {
        // Hapus menu_id dari context
        delete context.menu_id;
        
        // Tampilkan menu utama
        const response = await formatMenuMessage(models.menu);
        
        // Simpan chat memory
        await saveChatMemory(models.chat, senderId, messageContent, response, context);
        
        return response;
      }

      // Validasi input tidak valid di awal (seperti 2AB, 12A, ABC123, dll)
      if (/^\d{2,}[A-Z]|^\d+[A-Z]{2,}|^[A-Z]{2,}\d*$/i.test(cleanedMessage)) {
        console.log(`Input tidak valid: ${cleanedMessage}, kembali ke menu utama`);
        // Reset context dan kembali ke menu utama
        const newContext = { user_id: senderId };
        const response = `Input "${cleanedMessage}" tidak valid.\n\n` + await formatMenuMessage(models.menu);
        await saveChatMemory(models.chat, senderId, messageContent, response, newContext);
        return response;
      }

      // Navigasi cepat ke menu utama lain dengan mengetik angka (mis. 2 untuk Menu 2) saat berada di daftar sub-menu
      const maybeMenuId = parseInt(cleanedMessage);
      if (!isNaN(maybeMenuId) && maybeMenuId > 0) {
        const menusFS = await readMenuStructure();
        const targetMenu = menusFS.find(m => m.id === maybeMenuId);
        // Jika angka yang diketik adalah ID menu utama yang berbeda dari menu aktif, pindahkan ke menu tersebut
        if (targetMenu && maybeMenuId !== parseInt(context.menu_id)) {
          context.menu_id = targetMenu.id;
          // Pastikan sub_menu_id lama memang tidak ada di state daftar sub-menu, tapi bersihkan untuk aman
          delete context.sub_menu_id;

          const response = await formatSubMenuMessage(models.menu, targetMenu.id);
          await saveChatMemory(models.chat, senderId, messageContent, response, context);
          return response;
        }
      }
      
      // Cek apakah pesan adalah ID sub-menu (format: 1A, 1B, 2A, dll)
      // Pastikan input hanya berisi 1 digit dan 1 huruf, tidak lebih
      const subMenuPattern = /^(\d)([A-Z])$/i;
      const subMenuMatch = cleanedMessage.match(subMenuPattern);
      
      // Validasi input tidak valid (seperti 2AB, 12A, dll)
      if (/^\d{2,}[A-Z]|^\d+[A-Z]{2,}$/i.test(cleanedMessage)) {
        console.log(`Input tidak valid: ${cleanedMessage}, kembali ke menu utama`);
        // Reset context dan kembali ke menu utama
        const newContext = { user_id: senderId };
        const response = await formatMenuMessage(models.menu);
        await saveChatMemory(models.chat, senderId, messageContent, response, newContext);
        return response;
      }
      
      // Konversi ke uppercase jika ada match untuk konsistensi
      if (subMenuMatch) {
        subMenuMatch[2] = subMenuMatch[2].toUpperCase();
        console.log(`Mendeteksi ID sub-menu: ${subMenuMatch[1]}${subMenuMatch[2]}`);
      }

      // Dukung input huruf saja (A, B, C, ...) untuk memilih sub-menu pada menu aktif saat ini
      if (!subMenuMatch && /^[A-Za-z]$/.test(cleanedMessage)) {
        const letterOnly = cleanedMessage.toUpperCase();
        const currentMenuId = parseInt(context.menu_id);
        console.log(`Memilih sub-menu dengan huruf saja: ${currentMenuId}${letterOnly}`);
        const response = await getSubMenuContent(models.menuContent, currentMenuId, letterOnly);
        context.sub_menu_id = `${currentMenuId}${letterOnly}`;
        await saveChatMemory(models.chat, senderId, messageContent, response, context);
        return response;
      }
      
      if (subMenuMatch) {
        const menuId = parseInt(subMenuMatch[1]);
        const subMenuLetter = subMenuMatch[2];
        
        console.log(`Mencoba mengakses sub-menu: ${menuId}${subMenuLetter}, context menu_id: ${context.menu_id}`);
        
        // Perbolehkan akses sub-menu meski menuId berbeda dengan context
        if (menuId > 0) {
          if (menuId !== parseInt(context.menu_id)) {
            context.menu_id = menuId;
            console.log(`Memperbarui context.menu_id menjadi ${menuId}`);
          }
          
          // Dapatkan konten sub-menu langsung dengan ID yang dikirim pengguna
          const subMenuId = `${menuId}${subMenuLetter}`;
          console.log(`Mengakses konten sub-menu dengan ID: ${subMenuId}`);
          
          // Dapatkan konten sub-menu
          const response = await getSubMenuContent(models.menuContent, menuId, subMenuLetter);
          
          // Tambahkan sub_menu_id ke context
          context.sub_menu_id = subMenuId;
          
          // Simpan chat memory
          await saveChatMemory(models.chat, senderId, messageContent, response, context);
          
          // Log untuk debugging
          console.log(`Mengakses sub-menu dengan format baru: ${subMenuId}, menu_id: ${context.menu_id}, sub_menu_id: ${context.sub_menu_id}`);
          
          return response;
        }
      }
      
      // Cek apakah pesan adalah nomor sub-menu (format lama: 1, 2, 3)
      const subMenuNumber = parseInt(cleanedMessage);
      if (!isNaN(subMenuNumber) && subMenuNumber > 0) {
        // Ambil sub-menu dari struktur filesystem agar konsisten (termasuk virtual 4E/4F/4G)
        const menusFS = await readMenuStructure();
        const current = menusFS.find(m => m.id === parseInt(context.menu_id));
        if (current) {
          const subMenus = current.subMenus || [];
          if (subMenuNumber <= subMenus.length) {
            const subMenu = subMenus[subMenuNumber - 1];
            const letter = String(subMenu.letter || '').toUpperCase();
            // Tambahkan sub_menu_id ke context
            context.sub_menu_id = `${current.id}${letter}`;
            // Dapatkan konten sub-menu
            const response = await getSubMenuContent(models.menuContent, current.id, letter);
            // Simpan chat memory
            await saveChatMemory(models.chat, senderId, messageContent, response, context);
            // Log untuk debugging
            console.log(`Mengakses sub-menu (numeric) -> ${context.sub_menu_id}`);
            return response;
          }
        }
      }
      
      // Jika input tidak valid atau tidak dikenali, kembali ke menu utama
      console.log(`Input tidak dikenali: ${cleanedMessage}, kembali ke menu utama`);
      const newContext = { user_id: senderId };
      const response = `Input "${cleanedMessage}" tidak valid.\n\n` + await formatMenuMessage(models.menu);
      
      // Simpan chat memory dengan context baru
      await saveChatMemory(models.chat, senderId, messageContent, response, newContext);
      
      return response;
    }
    
    // Jika tidak ada context, cek apakah pesan adalah nomor menu
    const menuNumber = parseInt(cleanedMessage);
    if (!isNaN(menuNumber) && menuNumber > 0) {
      // Dapatkan menu berdasarkan nomor dari filesystem agar selalu 6 menu utama
      const menusFS = await readMenuStructure();
      
      // Cek apakah nomor menu valid
      if (menuNumber <= menusFS.length) {
        const menu = menusFS[menuNumber - 1];
        
        // Tambahkan menu_id ke context dan pastikan sub_menu_id lama dibersihkan
        context.menu_id = menu.id;
        delete context.sub_menu_id;
        
        // Tampilkan sub-menu
        const response = await formatSubMenuMessage(models.menu, menu.id);
        
        // Simpan chat memory
        await saveChatMemory(models.chat, senderId, messageContent, response, context);
        
        return response;
      }
    }
    
    // Cek apakah pesan dimulai dengan 'pengaduan' (format baru)
    if (cleanedMessage.toLowerCase().startsWith('pengaduan')) {
      // Proses pengaduan langsung
      const result = await processComplaintSubmission(models.complaint, msg, sock, models.admin);
      
      // Simpan chat memory
      await saveChatMemory(models.chat, senderId, messageContent, result.response, {});
      
      return { text: result.response };
    }
    
    // Cek apakah pesan adalah kata kunci pengaduan lama (untuk backward compatibility)
    if (cleanedMessage.toLowerCase().includes('keluhan') || 
        cleanedMessage.toLowerCase().includes('lapor')) {
      
      // Set context untuk form pengaduan
      context.complaint_form = {
        step: 'form',
        data: {}
      };
      
      // Tampilkan form pengaduan
      const response = formatComplaintForm();
      
      // Simpan chat memory
      await saveChatMemory(models.chat, senderId, messageContent, response.text, context);
      
      return response;
    }
    
    // Cek apakah pesan adalah perintah UMKM
    const umkmKeywords = ['daftar umkm', 'list umkm', 'kategori umkm', 'kategori', 'umkm'];
    const isUMKMCommand = umkmKeywords.some(keyword => 
      cleanedMessage.toLowerCase().includes(keyword) || 
      cleanedMessage.toLowerCase().startsWith('umkm ') ||
      cleanedMessage.toLowerCase().startsWith('cari umkm')
    );
    
    if (isUMKMCommand) {
      try {
        const { handleUMKMCommand } = require('./src/controllers/umkmController');
        const response = await handleUMKMCommand(cleanedMessage, senderId);
        
        // Simpan chat memory
        await saveChatMemory(models.chat, senderId, messageContent, response.text, context);
        
        return response;
      } catch (umkmError) {
        console.error('Error handling UMKM command:', umkmError.message);
        const errorResponse = {
          text: '❌ *Terjadi kesalahan saat memproses perintah UMKM*\n\n' +
                '🔄 Silakan coba lagi atau ketik "menu" untuk kembali ke menu utama.\n\n' +
                '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
        };
        
        await saveChatMemory(models.chat, senderId, messageContent, errorResponse.text, context);
        return errorResponse;
      }
    }
    
    // Cek apakah pesan adalah perintah pencarian berita
    const newsKeywords = ['berita', 'cari berita', 'kategori berita', 'berita terbaru', 'daftar berita'];
    const isNewsCommand = newsKeywords.some(keyword => 
      cleanedMessage.toLowerCase().includes(keyword) || 
      cleanedMessage.toLowerCase().startsWith('berita ') ||
      cleanedMessage.toLowerCase().startsWith('cari berita')
    );
    
    if (isNewsCommand) {
      try {
        const newsSearchController = new NewsSearchController();
        const response = newsSearchController.handleNewsCommand(cleanedMessage);
        
        // Simpan chat memory
        await saveChatMemory(models.chat, senderId, messageContent, response.text, context);
        
        return response;
      } catch (newsError) {
        console.error('Error handling news command:', newsError.message);
        const errorResponse = {
          text: '❌ *Terjadi kesalahan saat memproses perintah berita*\n\n' +
                '🔄 Silakan coba lagi atau ketik "menu" untuk kembali ke menu utama.'
        };
        
        await saveChatMemory(models.chat, senderId, messageContent, errorResponse.text, context);
        return errorResponse;
      }
    }
    
    // Jika tidak ada yang cocok, tampilkan pesan bantuan dan menu utama
    const invalidInputMessage = `❌ *Input Tidak Dikenali*\n\nMaaf, pesan "${cleanedMessage}" tidak dapat diproses.\n\n🔍 *Saran:*\n• Ketik *menu* untuk melihat daftar layanan\n• Gunakan kode menu (contoh: 1A, 2B)\n• Ketik *reset* untuk kembali ke awal\n• Gunakan kata kunci: pengaduan, layanan, info\n\n📋 *Menu Layanan:*\n\n`;
    
    const menuResponse = await formatMenuMessage(models.menu);
    const fullResponse = invalidInputMessage + menuResponse.text;
    
    await saveChatMemory(models.chat, senderId, messageContent, fullResponse, context);
    return { text: fullResponse };
  } catch (error) {
    console.error('Error dalam handleMessage:', error.message);
    return { text: 'Maaf, terjadi kesalahan. Silakan coba lagi.' };
  }
};

// Fungsi untuk menyimpan chat memory
const saveChatMemory = async (chatModel, userId, message, response, context) => {
  try {
    const respText = typeof response === 'string' ? response : (response && response.text) ? response.text : '';
    await chatModel.addChatMemory({
      user_id: userId,
      context: JSON.stringify({
        ...(context || {}),
        lastMessage: message,
        lastResponse: respText
      })
    });
  } catch (err) {
    console.error('Gagal menyimpan chat memory:', err.message);
  }
};

// Fungsi untuk menangani navigasi menu user dengan ID
const handleUserMenuNavigation = async (models, senderId, menuId, sock, context) => {
  try {
    // Menu ID 0 = kembali ke menu utama
    if (menuId === 0) {
      const menuResponse = await formatMenuMessage(models.menu);
      context = {}; // Reset context
      await saveChatMemory(models.chat, senderId, '0', menuResponse, context);
      return menuResponse;
    }
    
    // Validasi menu ID (1-6)
    if (menuId < 1 || menuId > 6) {
      const menuResponse = await formatMenuMessage(models.menu);
      const errorMsg = `❌ *ID Menu Tidak Valid*\n\nID menu harus antara 1-6.\n\n${menuResponse.text}`;
      await saveChatMemory(models.chat, senderId, menuId.toString(), { text: errorMsg }, {});
      return { text: errorMsg };
    }
    
    // Tampilkan submenu berdasarkan ID
    const subMenuResponse = await formatSubMenuMessage(models.menu, menuId);
    context.current_menu = menuId;
    await saveChatMemory(models.chat, senderId, menuId.toString(), subMenuResponse, context);
    return subMenuResponse;
    
  } catch (error) {
    console.error('Error handling user menu navigation:', error.message);
    const menuResponse = await formatMenuMessage(models.menu);
    return menuResponse;
  }
};

// Fungsi untuk menangani navigasi submenu user dengan ID
const handleUserSubMenuNavigation = async (models, senderId, menuId, subMenuLetter, sock, context) => {
  try {
    // Validasi menu ID (1-6)
    if (menuId < 1 || menuId > 6) {
      const menuResponse = await formatMenuMessage(models.menu);
      const errorMsg = `❌ *ID Menu Tidak Valid*\n\nID menu harus antara 1-6.\n\n${menuResponse.text}`;
      await saveChatMemory(models.chat, senderId, `${menuId}${subMenuLetter}`, { text: errorMsg }, {});
      return { text: errorMsg };
    }
    
    // Dapatkan konten submenu
    const subMenuContent = await getSubMenuContent(models.menuContent, menuId, subMenuLetter);
    context.current_menu = menuId;
    context.current_submenu = subMenuLetter;
    await saveChatMemory(models.chat, senderId, `${menuId}${subMenuLetter}`, subMenuContent, context);
    return subMenuContent;
    
  } catch (error) {
    console.error('Error handling user submenu navigation:', error.message);
    const menuResponse = await formatMenuMessage(models.menu);
    return menuResponse;
  }
};

// Fungsi untuk menangani perintah !admin
const handleAdminCommand = async (models, senderId, sock, context) => {
  try {
    // Cek apakah nomor WhatsApp adalah admin
    const adminModel = models.admin;
    const admin = await adminModel.getAdminByPhoneNumber(senderId);
    
    if (!admin || !admin.is_active) {
      return {
        text: '❌ *Akses Ditolak*\n\nAnda tidak memiliki akses admin atau akun admin tidak aktif.\n\n📞 Hubungi super admin untuk mendapatkan akses.'
      };
    }
    
    // Set mode admin dalam context
    context.admin_mode = true;
    context.admin_id = admin.id;
    context.admin_role = admin.role;
    
    // Tampilkan menu admin
    const adminMenuText = formatAdminMenu(admin);
    
    // Simpan context admin
    await saveChatMemory(models.chat, senderId, '!admin', adminMenuText, context);
    
    return { text: adminMenuText };
  } catch (error) {
    console.error('Error handling admin command:', error.message);
    return { text: 'Terjadi kesalahan saat mengakses menu admin.' };
  }
};

// Fungsi untuk memformat menu admin
const formatAdminMenu = (admin) => {
  let menu = `🔐 *MENU ADMIN DESA PULOSAROK* 🔐\n`;
  menu += `═`.repeat(40) + '\n\n';
  menu += `👤 *Admin:* ${admin.username}\n`;
  menu += `📱 *Role:* ${admin.role.toUpperCase()}\n`;
  menu += `📞 *Phone:* ${admin.phone_number}\n\n`;
  
  menu += `🎯 *PERINTAH ADMIN UTAMA:*\n`;
  menu += `• Ketik *!admin* - Akses menu admin\n`;
  menu += `• Ketik *!menu* - Kembali ke menu publik\n`;
  menu += `• Ketik *!reset* - Reset semua sesi\n\n`;
  
  menu += `📋 *MENU ADMIN:*\n\n`;
  
  menu += `1️⃣ *Kelola Konten Menu*\n`;
  menu += `   • Edit konten layanan\n`;
  menu += `   • Update informasi desa\n`;
  menu += `   • Kelola file dan dokumen\n\n`;
  
  menu += `2️⃣ *Kelola Pengaduan*\n`;
  menu += `   • Lihat pengaduan masuk\n`;
  menu += `   • Respon pengaduan\n`;
  menu += `   • Status pengaduan\n\n`;
  
  menu += `3️⃣ *Kelola Admin*\n`;
  menu += `   • Tambah admin baru\n`;
  menu += `   • Edit data admin\n`;
  menu += `   • Kelola hak akses\n\n`;
  
  menu += `4️⃣ *Statistik & Laporan*\n`;
  menu += `   • Statistik penggunaan\n`;
  menu += `   • Laporan pengaduan\n`;
  menu += `   • Data pengguna aktif\n\n`;
  
  menu += `5️⃣ *Pengaturan Sistem*\n`;
  menu += `   • Backup database\n`;
  menu += `   • Pengaturan bot\n`;
  menu += `   • Maintenance mode\n\n`;
  
  menu += `0️⃣ *Keluar dari Admin*\n\n`;
  
  menu += `─`.repeat(40) + '\n';
  menu += `💡 *PANDUAN PENGGUNAAN:*\n\n`;
  
  menu += `🔹 *Navigasi Menu:*\n`;
  menu += `   • Ketik angka menu (1-5) untuk masuk submenu\n`;
  menu += `   • Ketik 0 untuk keluar dari mode admin\n`;
  menu += `   • Ketik !admin kapan saja untuk kembali ke menu ini\n\n`;
  
  menu += `🔹 *Perintah Khusus:*\n`;
  menu += `   • !admin = Akses menu admin (dari mana saja)\n`;
  menu += `   • !menu = Kembali ke layanan publik\n`;
  menu += `   • !reset = Reset semua sesi dan context\n\n`;
  
  menu += `🔹 *Tips Penggunaan:*\n`;
  menu += `   • Semua perintah admin dimulai dengan tanda !\n`;
  menu += `   • Gunakan angka untuk navigasi dalam menu\n`;
  menu += `   • Selalu ketik 0 untuk kembali ke menu sebelumnya\n\n`;
  
  menu += `⚠️ *PERINGATAN KEAMANAN:*\n`;
  menu += `• Jangan bagikan akses admin kepada orang lain\n`;
  menu += `• Selalu logout setelah selesai menggunakan\n`;
  menu += `• Gunakan fitur admin dengan bijak dan bertanggung jawab\n\n`;
  
  menu += `_🏛️ Sistem Admin - Desa Pulosarok_\n`;
  menu += `_Versi 2.0 - Enhanced Admin Interface_\n`;
  menu += `_Dibuat oleh Mahasiswa UMSU_`;
  
  return menu;
};

// Fungsi untuk menangani navigasi menu admin
const handleAdminMenu = async (models, senderId, message, sock, context) => {
  try {
    const cleanedMessage = message.trim();
    
    // Keluar dari mode admin
    if (cleanedMessage === '0' || cleanedMessage.toLowerCase() === 'keluar') {
      delete context.admin_mode;
      delete context.admin_id;
      delete context.admin_role;
      
      const response = '✅ *Keluar dari Mode Admin*\n\nAnda telah keluar dari mode admin.\n\nKetik *menu* untuk kembali ke layanan publik atau *!admin* untuk masuk kembali ke mode admin.';
      await saveChatMemory(models.chat, senderId, message, response, context);
      return { text: response };
    }
    
    // Menu 1: Kelola Konten Menu
    if (cleanedMessage === '1') {
      context.admin_submenu = 'content';
      const response = `📝 *KELOLA KONTEN MENU*\n\n` +
        `Pilih menu yang ingin diedit:\n\n` +
        `1A. Administrasi Kependudukan\n` +
        `2A. Perizinan\n` +
        `3A. Kesehatan\n` +
        `4A. Informasi Desa\n` +
        `5A. Pengaduan\n` +
        `6A. Aduan Layanan\n\n` +
        `Ketik kode menu (contoh: 1A) atau ketik 0 untuk kembali.`;
      
      await saveChatMemory(models.chat, senderId, message, response, context);
      return { text: response };
    }
    
    // Menu 2: Kelola Pengaduan
    if (cleanedMessage === '2') {
      context.admin_submenu = 'complaints';
      const response = `📋 *KELOLA PENGADUAN*\n\n` +
        `1. Lihat Pengaduan Baru\n` +
        `2. Lihat Semua Pengaduan\n` +
        `3. Pengaduan Selesai\n` +
        `4. Statistik Pengaduan\n\n` +
        `Ketik nomor pilihan atau 0 untuk kembali.`;
      
      await saveChatMemory(models.chat, senderId, message, response, context);
      return { text: response };
    }
    
    // Menu 3: Kelola Admin
    if (cleanedMessage === '3') {
      context.admin_submenu = 'admin_management';
      const response = `👥 *KELOLA ADMIN*\n\n` +
        `1. Lihat Semua Admin\n` +
        `2. Tambah Admin Baru\n` +
        `3. Edit Admin\n` +
        `4. Nonaktifkan Admin\n\n` +
        `Ketik nomor pilihan atau 0 untuk kembali.`;
      
      await saveChatMemory(models.chat, senderId, message, response, context);
      return { text: response };
    }
    
    // Menu 4: Statistik & Laporan
    if (cleanedMessage === '4') {
      context.admin_submenu = 'statistics';
      const response = `📊 *STATISTIK & LAPORAN*\n\n` +
        `1. Statistik Pengguna Harian\n` +
        `2. Statistik Menu Populer\n` +
        `3. Laporan Pengaduan Bulanan\n` +
        `4. Export Data\n\n` +
        `Ketik nomor pilihan atau 0 untuk kembali.`;
      
      await saveChatMemory(models.chat, senderId, message, response, context);
      return { text: response };
    }
    
    // Menu 5: Pengaturan Sistem
    if (cleanedMessage === '5') {
      context.admin_submenu = 'settings';
      const response = `⚙️ *PENGATURAN SISTEM*\n\n` +
        `1. Backup Database\n` +
        `2. Pengaturan Bot\n` +
        `3. Maintenance Mode\n` +
        `4. Log Sistem\n\n` +
        `Ketik nomor pilihan atau 0 untuk kembali.`;
      
      await saveChatMemory(models.chat, senderId, message, response, context);
      return { text: response };
    }
    
    // Handle submenu navigation
    if (context.admin_submenu) {
      return await handleAdminSubmenu(models, senderId, message, sock, context);
    }
    
    // Pesan tidak dikenali dalam mode admin
    const admin = await models.admin.getAdminByPhoneNumber(senderId);
    let response = `❌ *Perintah Tidak Dikenali: "${message}"*\n\n`;
    response += `🔍 *Perintah yang tersedia:*\n`;
    response += `• Ketik angka 1-5 untuk memilih menu\n`;
    response += `• Ketik 0 untuk keluar dari mode admin\n`;
    response += `• Ketik !admin untuk refresh menu admin\n`;
    response += `• Ketik !menu untuk kembali ke layanan publik\n`;
    response += `• Ketik !reset untuk reset semua sesi\n\n`;
    response += `─`.repeat(40) + '\n\n';
    response += formatAdminMenu(admin);
    
    await saveChatMemory(models.chat, senderId, message, response, context);
    return { text: response };
  } catch (error) {
    console.error('Error handling admin menu:', error.message);
    return { text: 'Terjadi kesalahan dalam menu admin.\n\nDibuat oleh Mahasiswa UMSU' };
  }
};

// Fungsi untuk menangani submenu admin
const handleAdminSubmenu = async (models, senderId, message, sock, context) => {
  try {
    const cleanedMessage = message.trim();
    
    // Kembali ke menu admin utama
    if (cleanedMessage === '0') {
      delete context.admin_submenu;
      const admin = await models.admin.getAdminByPhoneNumber(senderId);
      const response = formatAdminMenu(admin);
      await saveChatMemory(models.chat, senderId, message, response, context);
      return { text: response };
    }
    
    // Handle berdasarkan submenu aktif
    switch (context.admin_submenu) {
      case 'content':
        return await handleContentManagement(models, senderId, message, context);
      case 'complaints':
        return await handleComplaintManagement(models, senderId, message, context);
      case 'admin_management':
        return await handleAdminManagement(models, senderId, message, context);
      case 'statistics':
        return await handleStatistics(models, senderId, message, context);
      case 'settings':
        return await handleSettings(models, senderId, message, context);
      default:
        return { text: 'Submenu tidak dikenali.\n\nDibuat oleh Mahasiswa UMSU' };
    }
  } catch (error) {
    console.error('Error handling admin submenu:', error.message);
    return { text: 'Terjadi kesalahan dalam submenu admin.\n\nDibuat oleh Mahasiswa UMSU' };
  }
};

// Placeholder functions untuk submenu admin
const handleContentManagement = async (models, senderId, message, context) => {
  const response = `🚧 *KELOLA KONTEN MENU*\n\n` +
    `Fitur ini sedang dalam pengembangan dan akan segera tersedia.\n\n` +
    `📋 *Fitur yang akan tersedia:*\n` +
    `• Edit konten layanan administrasi\n` +
    `• Update informasi desa\n` +
    `• Kelola file dan dokumen\n` +
    `• Upload gambar dan media\n\n` +
    `💡 *Navigasi:*\n` +
    `• Ketik 0 untuk kembali ke menu admin\n` +
    `• Ketik !admin untuk refresh menu admin\n` +
    `• Ketik !menu untuk kembali ke layanan publik`;
  
  await saveChatMemory(models.chat, senderId, message, response, context);
  return { text: response };
};

const handleComplaintManagement = async (models, senderId, message, context) => {
  const response = `📋 *KELOLA PENGADUAN*\n\n` +
    `Fitur ini sedang dalam pengembangan dan akan segera tersedia.\n\n` +
    `📋 *Fitur yang akan tersedia:*\n` +
    `• Lihat pengaduan masuk\n` +
    `• Respon pengaduan warga\n` +
    `• Update status pengaduan\n` +
    `• Statistik pengaduan\n\n` +
    `💡 *Navigasi:*\n` +
    `• Ketik 0 untuk kembali ke menu admin\n` +
    `• Ketik !admin untuk refresh menu admin\n` +
    `• Ketik !menu untuk kembali ke layanan publik`;
  
  await saveChatMemory(models.chat, senderId, message, response, context);
  return { text: response };
};

const handleAdminManagement = async (models, senderId, message, context) => {
  const response = `👥 *KELOLA ADMIN*\n\n` +
    `Fitur ini sedang dalam pengembangan dan akan segera tersedia.\n\n` +
    `📋 *Fitur yang akan tersedia:*\n` +
    `• Lihat semua admin\n` +
    `• Tambah admin baru\n` +
    `• Edit data admin\n` +
    `• Kelola hak akses\n\n` +
    `💡 *Navigasi:*\n` +
    `• Ketik 0 untuk kembali ke menu admin\n` +
    `• Ketik !admin untuk refresh menu admin\n` +
    `• Ketik !menu untuk kembali ke layanan publik`;
  
  await saveChatMemory(models.chat, senderId, message, response, context);
  return { text: response };
};

const handleStatistics = async (models, senderId, message, context) => {
  const response = `📊 *STATISTIK & LAPORAN*\n\n` +
    `Fitur ini sedang dalam pengembangan dan akan segera tersedia.\n\n` +
    `📋 *Fitur yang akan tersedia:*\n` +
    `• Statistik pengguna harian\n` +
    `• Statistik menu populer\n` +
    `• Laporan pengaduan bulanan\n` +
    `• Export data sistem\n\n` +
    `💡 *Navigasi:*\n` +
    `• Ketik 0 untuk kembali ke menu admin\n` +
    `• Ketik !admin untuk refresh menu admin\n` +
    `• Ketik !menu untuk kembali ke layanan publik`;
  
  await saveChatMemory(models.chat, senderId, message, response, context);
  return { text: response };
};

const handleSettings = async (models, senderId, message, context) => {
  const response = `⚙️ *PENGATURAN SISTEM*\n\n` +
    `Fitur ini sedang dalam pengembangan dan akan segera tersedia.\n\n` +
    `📋 *Fitur yang akan tersedia:*\n` +
    `• Backup database\n` +
    `• Pengaturan bot WhatsApp\n` +
    `• Mode maintenance\n` +
    `• Log sistem\n\n` +
    `💡 *Navigasi:*\n` +
    `• Ketik 0 untuk kembali ke menu admin\n` +
    `• Ketik !admin untuk refresh menu admin\n` +
    `• Ketik !menu untuk kembali ke layanan publik`;
  
  await saveChatMemory(models.chat, senderId, message, response, context);
  return { text: response };
};



// Fungsi placeholder telah dipindahkan ke atas

// Fungsi untuk menjalankan bot
const startBot = async () => {
  try {
    // Inisialisasi database SQLite
    if (!db) {
      console.log('Initializing SQLite database...');
      const { initDatabaseAndTables } = require('./src/database/initSQLiteDb');
      db = initDatabaseAndTables();
      console.log('SQLite database initialized successfully');
      
      // Inisialisasi model
      models = {
        menu: new SQLiteMenu(db),
        chat: new SQLiteChat(db),
        complaint: new SQLiteChat(db), // Menggunakan SQLiteChat karena complaint dikelola di sana
        menuContent: new SQLiteMenuContent(db),
        admin: new JSONAdmin(),
        umkm: new SQLiteUMKM(db)
      };
    }
    
    // Hubungkan ke WhatsApp
    console.log('Connecting to WhatsApp...');
    const sock = await connectToWhatsApp(async (sock, msg) => {
      if (msg.key.fromMe) return; // Abaikan pesan dari diri sendiri
      
      if (msg.message) {
        try {
          // Dapatkan respons dari controller
          const response = await handleMessage(models, msg, sock);
          
          // Kirim respons
          if (response) {
            // Pastikan respons dalam format yang benar untuk WhatsApp
            let messageContent;
            
            if (typeof response === 'string') {
              messageContent = { text: response };
            } else if (response.text) {
              messageContent = { text: response.text };
            } else if (typeof response === 'object') {
              // Jika respons adalah objek tapi tidak memiliki properti text, pastikan ada properti yang valid
              messageContent = { text: JSON.stringify(response) };
            } else {
              // Fallback jika respons tidak dalam format yang diharapkan
              messageContent = { text: 'Respons tidak valid\n\nDibuat oleh Mahasiswa UMSU' };
            }
            
            await sock.sendMessage(msg.key.remoteJid, messageContent);
          }
        } catch (error) {
          console.error('Error processing message:', error.message);
          await sock.sendMessage(msg.key.remoteJid, {
            text: 'Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi nanti.\n\nDibuat oleh Mahasiswa UMSU'
          });
        }
      }
    });
    
    return sock;
  } catch (error) {
    console.error('Error starting bot:', error.message);
    throw error;
  }
};

// Jalankan bot dan setup interval cleanup
(async () => {
  try {
    const bot = await startBot();
    if (bot) {
      console.log('Bot WhatsApp berhasil dimulai');
    } else {
      console.error('Gagal memulai bot WhatsApp');
    }

    // Jadwalkan pembersihan chat memory yang tidak aktif setiap 5 menit
    setInterval(async () => {
      const { cleanupInactiveMemory } = require('./src/controllers/admin');
      await cleanupInactiveMemory(0.0833); // 5 menit = 0.0833 jam
    }, 5 * 60 * 1000);
  } catch (error) {
    console.error('Error saat memulai bot WhatsApp:', error.message);
  }
})();

module.exports = {
  startBot
};