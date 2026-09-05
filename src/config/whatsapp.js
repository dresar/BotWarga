/**
 * Konfigurasi WhatsApp menggunakan Baileys
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const dns = require('dns');
const https = require('https');
const JSONAdmin = require('../models/JSONAdmin');

// Konfigurasi logger dengan filter untuk mengurangi spam error
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      levelFirst: true,
      translateTime: 'SYS:standard'
    }
  },
  // Filter log untuk mengurangi spam error
  level: process.env.LOG_LEVEL || 'info',
  // Menambahkan custom serializer untuk mengurangi spam error
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err
  }
});

// Variabel untuk melacak error terakhir untuk mengurangi spam log
let lastErrorMessage = '';
let lastErrorTime = 0;
let errorCount = 0;

// Fungsi untuk log error dengan throttling
const logError = (message, error) => {
  const now = Date.now();
  const errorMessage = error ? `${message}: ${error.message}` : message;
  
  // Jika pesan error sama dengan sebelumnya dan dalam 5 detik terakhir
  if (errorMessage === lastErrorMessage && now - lastErrorTime < 5000) {
    errorCount++;
    // Hanya log setiap 5 error yang sama
    if (errorCount % 5 === 0) {
      console.log(`Error yang sama terjadi ${errorCount} kali: ${errorMessage}`);
    }
  } else {
    // Error baru atau sudah lewat 5 detik
    console.log(errorMessage);
    lastErrorMessage = errorMessage;
    errorCount = 1;
  }
  
  lastErrorTime = now;
};

// Path untuk menyimpan sesi
const SESSION_PATH = path.join(process.cwd(), 'session');

// Fungsi untuk memeriksa koneksi internet
const checkInternetConnection = () => {
  return new Promise((resolve) => {
    dns.lookup('web.whatsapp.com', (err) => {
      if (err) {
        logError('Tidak dapat terhubung ke web.whatsapp.com', err);
        resolve(false);
      } else {
        // Double check dengan request HTTPS
        const req = https.get('https://web.whatsapp.com', (res) => {
          resolve(true);
          req.destroy();
        });
        
        req.on('error', (err) => {
          logError('Gagal melakukan request ke web.whatsapp.com', err);
          resolve(false);
        });
        
        // Set timeout untuk request
        req.setTimeout(5000, () => {
          logError('Request timeout ke web.whatsapp.com');
          req.destroy();
          resolve(false);
        });
      }
    });
  });
};

// Fungsi untuk membuat koneksi WhatsApp
const connectToWhatsApp = async (messageHandler) => {
  // Pastikan folder session ada
  if (!fs.existsSync(SESSION_PATH)) {
    fs.mkdirSync(SESSION_PATH, { recursive: true });
  }

  // Menggunakan auth state
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH);

  // Membuat socket WhatsApp
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' })
  });
  
  // Fungsi untuk menangani koneksi dan QR code
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Menampilkan QR code jika tersedia
    if (qr) {
      console.log('QR Code tersedia, silakan scan dengan aplikasi WhatsApp:');
      // Menampilkan QR code dengan format yang lebih kecil di terminal
      const qrcode = require('qrcode-terminal');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)?
        lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut : true;

      logError('Koneksi terputus karena', lastDisconnect?.error || new Error('Alasan tidak diketahui'));

      if (shouldReconnect) {
        // Implementasi exponential backoff untuk retry
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isConnectionError = statusCode === DisconnectReason.connectionClosed || 
                                 statusCode === DisconnectReason.connectionLost ||
                                 lastDisconnect?.error?.message?.includes('WebSocket');
        
        // Jika error koneksi, tunggu lebih lama sebelum mencoba lagi
        if (isConnectionError) {
          const retryDelay = Math.min(30000, (global.retryCount || 0) * 5000 + 5000);
          console.log(`Masalah koneksi terdeteksi. Menunggu ${retryDelay/1000} detik sebelum mencoba lagi...`);
          
          setTimeout(async () => {
            // Periksa koneksi internet sebelum mencoba menghubungkan kembali
            const isConnected = await checkInternetConnection();
            
            if (isConnected) {
              console.log('Koneksi internet tersedia, mencoba menghubungkan kembali...');
              // Buat variabel global untuk melacak jumlah percobaan
              global.retryCount = (global.retryCount || 0) + 1;
              connectToWhatsApp(messageHandler);
            } else {
              console.log('Koneksi internet tidak tersedia, menunggu 30 detik sebelum mencoba lagi...');
              // Reset retry counter jika koneksi internet tidak tersedia
              setTimeout(async () => {
                console.log('Mencoba memeriksa koneksi internet kembali...');
                connectToWhatsApp(messageHandler);
              }, 30000);
            }
          }, retryDelay);
        } else {
          console.log('Mencoba menghubungkan kembali...');
          connectToWhatsApp(messageHandler);
        }
      } else {
        console.log('Koneksi terputus secara permanen, tidak mencoba menghubungkan kembali');
      }
    } else if (connection === 'open') {
      console.log('Koneksi WhatsApp terbuka');
      
      // Kirim notifikasi sistem start ke superadmin menggunakan NotificationSystem
      try {
        const NotificationSystem = require('../utils/notificationSystem');
        const notificationSystem = new NotificationSystem();
        
        // Kirim notifikasi sistem start yang profesional
        await notificationSystem.sendSuperAdminNotification(sock, 'system_start', {});
        
        // Set interval untuk mengirim statistik harian (setiap 24 jam)
        setInterval(async () => {
          try {
            await notificationSystem.sendDailyStats(sock);
          } catch (error) {
            console.error('Error mengirim statistik harian:', error.message);
          }
        }, 24 * 60 * 60 * 1000); // 24 jam
        
      } catch (error) {
        console.error('Error saat mengirim notifikasi sistem:', error.message);
      }
    }
  });

  // Menyimpan kredensial saat diperbarui
  sock.ev.on('creds.update', saveCreds);

  // Menangani pesan masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    if (messages && messages[0] && messageHandler) {
      await messageHandler(sock, messages[0]);
    }
  });

  return sock;
};

// Fungsi untuk mematikan koneksi dengan bersih
const gracefulShutdown = (sock) => {
  if (!sock) return;
  
  console.log('Mematikan koneksi WhatsApp dengan bersih...');
  try {
    // Hapus semua listener untuk mencegah reconnect otomatis
    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');
    sock.ev.removeAllListeners('messages.upsert');
    
    // Tutup koneksi jika ada
    if (typeof sock.close === 'function') {
      sock.close();
    }
    
    console.log('Koneksi WhatsApp berhasil dimatikan');
  } catch (error) {
    logError('Gagal mematikan koneksi WhatsApp', error);
  }
};

// Tangani sinyal untuk shutdown dengan bersih
let currentSocket = null;
process.on('SIGINT', () => {
  console.log('Menerima sinyal SIGINT, menutup aplikasi...');
  gracefulShutdown(currentSocket);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Menerima sinyal SIGTERM, menutup aplikasi...');
  gracefulShutdown(currentSocket);
  process.exit(0);
});

module.exports = {
  connectToWhatsApp: async (messageHandler) => {
    const sock = await connectToWhatsApp(messageHandler);
    currentSocket = sock;
    return sock;
  }
};