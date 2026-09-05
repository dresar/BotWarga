/**
 * Controller untuk menangani pengaduan masyarakat
 */

const path = require('path');
const fs = require('fs-extra');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const JSONAdmin = require('../models/JSONAdmin');

// Fungsi untuk memformat formulir pengaduan
const formatComplaintForm = () => {
  const message = `*FORMULIR PENGADUAN MASYARAKAT*\n\nSilakan isi formulir pengaduan dengan format berikut:\n\npengaduan\nNama: [nama lengkap]\nAlamat: [alamat lengkap]\nAduan: [deskripsi pengaduan]\n\nContoh:\npengaduan\nNama: Budi Santoso\nAlamat: Dusun Krajan RT 02/RW 03 Desa Pulosarok\nAduan: Jalan di depan rumah saya rusak parah dan berlubang, menyebabkan banyak pengendara motor terjatuh\n\nCatatan: Anda juga dapat melampirkan foto dengan mengirimkan gambar dan caption yang sama seperti format di atas.\n\n${'─'.repeat(35)}\n_Dibuat oleh Mahasiswa UMSU_`;
  
  return {
    text: message
  };
};

// Fungsi untuk memproses pengaduan dari pesan
const processComplaintSubmission = async (chatModel, msg, sock, adminModel) => {
  try {
    
    // Dapatkan ID pengirim dan nomor telepon
    const userId = msg.key.remoteJid.split('@')[0];
    const phoneNumber = userId.startsWith('62') ? userId : `62${userId.replace(/^0/, '')}`;
    
    // Dapatkan isi pesan
    const messageContent = msg.message.conversation || 
                          (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || 
                          (msg.message.imageMessage && msg.message.imageMessage.caption) || 
                          (msg.message.videoMessage && msg.message.videoMessage.caption) || 
                          '';
    
    // Ekstrak informasi dari pesan
    const lines = messageContent.split('\n');
    
    // Cari baris yang berisi informasi yang dibutuhkan
    let reporterName = '';
    let reporterAddress = '';
    let description = '';
    
    // Ekstrak informasi dari pesan
    for (const line of lines) {
      if (line.toLowerCase().indexOf('nama:') !== -1) {
        reporterName = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().indexOf('alamat:') !== -1) {
        reporterAddress = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().indexOf('keluhan:') !== -1) {
        description = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().indexOf('aduan:') !== -1) {
        description = line.substring(line.indexOf(':') + 1).trim();
      } else if (line.toLowerCase().indexOf('deskripsi:') !== -1) {
        description = line.substring(line.indexOf(':') + 1).trim();
      }
    }
    
    // Validasi data
    if (!reporterName || !reporterAddress || !description) {
      return {
        response: 'Maaf, formulir pengaduan tidak lengkap. Pastikan Anda mengisi nama, alamat, dan aduan.',
        context: {},
        reset: false
      };
    }
    
    // Simpan media jika ada
    let mediaPath = null;
    if (msg.message.imageMessage || msg.message.videoMessage) {
      mediaPath = await saveComplaintMedia(msg);
    }
    
    // Buat objek keluhan
    const complaint = {
      reporter_name: reporterName,
      reporter_address: reporterAddress,
      description: description,
      photo_path: mediaPath,
      status: 'pending',
      phone_number: phoneNumber
    };
    
    // Tambahkan pengaduan ke database
    const saved = await chatModel.addComplaint(complaint);

    // Kirim notifikasi ke admin jika sock dan adminModel tersedia
    if (sock && adminModel) {
      try {
        await notifyAdminsOfComplaint(sock, { id: saved.id, ...complaint });
      } catch (e) {
        console.error('Failed to notify admins about complaint:', e.message);
      }
    }
    
    return {
      response: `Terima kasih atas pengaduan Anda!\n\nPengaduan Anda telah kami terima dengan detail sebagai berikut:\n\nNama: ${reporterName}\nAlamat: ${reporterAddress}\nDeskripsi: ${description}\nID Pengaduan: ${saved.id}\n\nPengaduan Anda akan segera kami proses. Terima kasih atas partisipasi Anda dalam membangun desa yang lebih baik.`,
      context: {},
      reset: true
    };
  } catch (error) {
    console.error('Error processing complaint submission:', error.message);
    return {
      response: 'Maaf, terjadi kesalahan saat memproses pengaduan Anda. Silakan coba lagi nanti.\n\n' + '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_',
      context: {},
      reset: true
    };
  }
};

// Fungsi untuk mendapatkan daftar pengaduan untuk admin
const getComplaintListForAdmin = async (models) => {
  try {
    const complaints = await models.complaint.getAllComplaints();
    
    if (!complaints || complaints.length === 0) {
      return {
        text: 'Belum ada pengaduan yang disubmit.\n\n' + '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
      };
    }
    
    let message = '*DAFTAR PENGADUAN MASYARAKAT*\n\n';
    
    complaints.forEach((complaint, index) => {
      const date = new Date(complaint.created_at).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      message += `*${index + 1}. Pengaduan #${complaint.id}*\n`;
      message += `   ID: ${complaint.id}\n`;
      message += `   Pelapor: ${complaint.reporter_name}\n`;
      message += `   Tanggal: ${date}\n`;
      message += `   Status: ${formatStatus(complaint.status)}\n\n`;
    });
    
    message += 'Untuk melihat detail pengaduan, ketik *!detail_pengaduan [ID]*\nContoh: *!detail_pengaduan 1*\n\n';
    message += '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_';
    
    return {
      text: message
    };
  } catch (error) {
    console.error('Error getting complaint list for admin:', error.message);
    return {
      text: 'Maaf, terjadi kesalahan saat memuat daftar pengaduan.\n\n' + '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_'
    };
  }
};

// Fungsi untuk mendapatkan detail pengaduan berdasarkan ID untuk admin
const getComplaintDetailForAdmin = async (models, complaintId) => {
  try {
    const complaint = await models.complaint.getComplaintById(complaintId);
    
    if (!complaint) {
      return {
        text: `Pengaduan dengan ID ${complaintId} tidak ditemukan.`
      };
    }
    
    const date = new Date(complaint.created_at).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    let message = '*DETAIL PENGADUAN*\n\n';
    message += `ID: ${complaint.id}\n`;
    message += `Pelapor: ${complaint.reporter_name}\n`;
    message += `Alamat: ${complaint.reporter_address}\n`;
    message += `Tanggal: ${date}\n`;
    message += `Status: ${formatStatus(complaint.status)}\n\n`;
    message += `*Deskripsi Pengaduan:*\n${complaint.description}\n\n`;
    
    if (complaint.photo_path) {
      message += 'Foto terlampir.\n\n';
    }
    
    message += 'Untuk mengubah status pengaduan, ketik:\n';
    message += '*!update_status [ID] [status]*\n';
    message += 'Status: pending, processing, resolved, rejected\n';
    message += 'Contoh: *!update_status 1 processing*';
    
    // Jika ada foto, siapkan untuk dikirim
    if (complaint.photo_path && fs.existsSync(complaint.photo_path)) {
      return {
        text: message,
        media: { path: complaint.photo_path }
      };
    }
    
    return {
      text: message
    };
  } catch (error) {
    console.error('Error getting complaint detail for admin:', error.message);
    return {
      text: 'Maaf, terjadi kesalahan saat memuat detail pengaduan.'
    };
  }
};

// Fungsi untuk mengubah status pengaduan
const updateComplaintStatus = async (models, complaintId, status) => {
  try {
    // Validasi status
    const validStatuses = ['pending', 'processing', 'resolved', 'rejected'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return {
        text: `Status tidak valid. Status yang tersedia: ${validStatuses.join(', ')}`
      };
    }
    
    // Update status pengaduan
    await models.complaint.updateComplaintStatus(complaintId, status.toLowerCase());
    
    return {
      text: `Status pengaduan dengan ID ${complaintId} berhasil diubah menjadi ${formatStatus(status.toLowerCase())}.`
    };
  } catch (error) {
    console.error('Error updating complaint status:', error.message);
    return {
      text: 'Maaf, terjadi kesalahan saat mengubah status pengaduan.'
    };
  }
};

// Fungsi untuk memformat status pengaduan
const formatStatus = (status) => {
  const statusMap = {
    'pending': '⏳ Menunggu',
    'processing': '🔄 Diproses',
    'resolved': '✅ Selesai',
    'rejected': '❌ Ditolak'
  };
  
  return statusMap[status] || status;
};

// Fungsi untuk menyimpan file media (foto pengaduan)
const saveComplaintMedia = async (msg) => {
  try {
    // Cek apakah pesan mengandung media
    if (!msg.message?.imageMessage && !msg.message?.videoMessage) {
      return null;
    }
    
    // Buat direktori untuk menyimpan media jika belum ada
    const mediaDir = path.join(process.cwd(), 'uploads', 'complaints');
    await fs.ensureDir(mediaDir);
    
    // Generate nama file unik
    const timestamp = new Date().getTime();
    const mediaPath = path.join(mediaDir, `complaint_${timestamp}.jpg`);
    
    // Simpan media ke file
    const stream = await downloadContentFromMessage(
      msg.message.imageMessage || msg.message.videoMessage,
      msg.message.imageMessage ? 'image' : 'video'
    );
    
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    
    await fs.writeFile(mediaPath, buffer);
    
    return mediaPath;
  } catch (error) {
    console.error('Error saving complaint media:', error.message);
    return null;
  }
};

// Fungsi untuk menyimpan file media berita
const saveNewsMedia = async (msg) => {
  try {
    // Cek apakah pesan mengandung media
    if (!msg.message?.imageMessage && !msg.message?.videoMessage) {
      return null;
    }
    
    // Buat direktori untuk menyimpan media jika belum ada
    const mediaDir = path.join(process.cwd(), 'uploads', 'news');
    await fs.ensureDir(mediaDir);
    
    // Generate nama file unik
    const timestamp = new Date().getTime();
    const mediaPath = path.join(mediaDir, `news_${timestamp}.jpg`);
    
    // Simpan media ke file
    const stream = await downloadContentFromMessage(
      msg.message.imageMessage || msg.message.videoMessage,
      msg.message.imageMessage ? 'image' : 'video'
    );
    
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    
    await fs.writeFile(mediaPath, buffer);
    
    return mediaPath;
  } catch (error) {
    console.error('Error saving news media:', error.message);
    return null;
  }
};

// Fungsi untuk menyimpan file media wisata
const saveTourismMedia = async (msg) => {
  try {
    // Cek apakah pesan mengandung media
    if (!msg.message?.imageMessage && !msg.message?.videoMessage) {
      return null;
    }
    
    // Buat direktori untuk menyimpan media jika belum ada
    const mediaDir = path.join(process.cwd(), 'uploads', 'village_info');
    await fs.ensureDir(mediaDir);
    
    // Generate nama file unik
    const timestamp = new Date().getTime();
    const mediaPath = path.join(mediaDir, `tourism_${timestamp}.jpg`);
    
    // Simpan media ke file
    const stream = await downloadContentFromMessage(
      msg.message.imageMessage || msg.message.videoMessage,
      msg.message.imageMessage ? 'image' : 'video'
    );
    
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    
    await fs.writeFile(mediaPath, buffer);
    
    return mediaPath;
  } catch (error) {
    console.error('Error saving tourism media:', error.message);
    return null;
  }
};

// Fungsi untuk mengirim notifikasi pengaduan baru ke superadmin menggunakan NotificationSystem
const notifyAdminsOfComplaint = async (sock, complaint) => {
  try {
    const NotificationSystem = require('../utils/notificationSystem');
    const notificationSystem = new NotificationSystem();
    
    // Kirim notifikasi menggunakan sistem notifikasi yang baru
    await notificationSystem.sendSuperAdminNotification(sock, 'new_complaint', complaint);
    
    // Jika ada foto, kirim foto terpisah ke superadmin
    if (complaint.photo_path && fs.existsSync(complaint.photo_path)) {
      const adminModel = new JSONAdmin();
      const superadmins = adminModel.getSuperAdmins();
      
      for (const superadmin of superadmins) {
        if (superadmin.phone_number) {
          const jid = superadmin.phone_number.includes('@') ? 
            superadmin.phone_number : `${superadmin.phone_number}@s.whatsapp.net`;
          
          try {
            await sock.sendMessage(jid, { 
              image: { url: complaint.photo_path }, 
              caption: `📸 *Foto Pengaduan ID: ${complaint.id}*\n\nFoto terlampir untuk pengaduan dari ${complaint.reporter_name}` 
            });
            console.log(`Foto pengaduan berhasil dikirim ke superadmin: ${jid}`);
          } catch (sendErr) {
            console.error(`Gagal mengirim foto ke superadmin ${jid}:`, sendErr.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error sending admin notifications for complaint:', error.message);
  }
};

// Fungsi untuk mengirim notifikasi ke pengadu ketika status berubah
const notifyComplainantStatusUpdate = async (sock, complaint, newStatus) => {
  try {
    if (!complaint.phone_number) {
      console.log('No phone number found for complaint:', complaint.id);
      return;
    }

    const jid = complaint.phone_number.includes('@') ? complaint.phone_number : `${complaint.phone_number}@s.whatsapp.net`;
    
    let statusText = '';
    let message = '';
    
    switch (newStatus) {
      case 'pending':
        statusText = '⏳ Menunggu';
        message = `🔔 *NOTIFIKASI PENGADUAN*\n\n` +
                 `Pengaduan Anda dengan ID *${complaint.id}* telah diterima dan sedang menunggu proses.\n\n` +
                 `📝 *Deskripsi:* ${complaint.description}\n\n` +
                 `📊 *Status:* ${statusText}\n\n` +
                 `Terima kasih atas laporan Anda. Tim kami akan segera menindaklanjuti.`;
        break;
      case 'processing':
        statusText = '🔄 Sedang Diproses';
        message = `🔔 *UPDATE PENGADUAN*\n\n` +
                 `Pengaduan Anda dengan ID *${complaint.id}* sedang dalam proses penanganan.\n\n` +
                 `📝 *Deskripsi:* ${complaint.description}\n\n` +
                 `📊 *Status:* ${statusText}\n\n` +
                 `Tim kami sedang bekerja untuk menyelesaikan masalah Anda.`;
        break;
      case 'resolved':
        statusText = '✅ Selesai';
        message = `🎉 *PENGADUAN SELESAI*\n\n` +
                 `Pengaduan Anda dengan ID *${complaint.id}* telah selesai ditangani.\n\n` +
                 `📝 *Deskripsi:* ${complaint.description}\n\n` +
                 `📊 *Status:* ${statusText}\n\n` +
                 `Terima kasih atas kesabaran Anda. Semoga masalah telah teratasi dengan baik.`;
        break;
      case 'rejected':
        statusText = '❌ Ditolak';
        message = `📋 *PENGADUAN DITOLAK*\n\n` +
                 `Pengaduan Anda dengan ID *${complaint.id}* tidak dapat diproses.\n\n` +
                 `📝 *Deskripsi:* ${complaint.description}\n\n` +
                 `📊 *Status:* ${statusText}\n\n` +
                 `Mohon maaf, pengaduan tidak memenuhi kriteria atau di luar kewenangan kami.`;
        break;
      default:
        return;
    }

    await sock.sendMessage(jid, { text: message });
    console.log(`Notifikasi status '${newStatus}' berhasil dikirim ke ${complaint.phone_number}`);
    
  } catch (error) {
    console.error('Error sending status notification to complainant:', error.message);
  }
};

module.exports = {
  formatComplaintForm,
  processComplaintSubmission,
  getComplaintListForAdmin,
  getComplaintDetailForAdmin,
  updateComplaintStatus,
  saveComplaintMedia,
  saveNewsMedia,
  saveTourismMedia,
  notifyComplainantStatusUpdate,
  notifyAdminsOfComplaint
};