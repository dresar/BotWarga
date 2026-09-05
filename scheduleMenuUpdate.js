/**
 * Scheduler untuk menjalankan update menu content secara otomatis
 * Dapat dijalankan sebagai cron job atau background service
 */

const cron = require('node-cron');
const { runUpdate } = require('./updateMenuContent');
const fs = require('fs-extra');
const path = require('path');

// Konfigurasi
const LOG_FILE = path.join(__dirname, 'logs', 'menu-update.log');
const CONFIG = {
  // Jadwal update (setiap 30 menit)
  schedule: '*/30 * * * *',
  // Atau gunakan salah satu dari opsi berikut:
  // '0 */6 * * *'    // Setiap 6 jam
  // '0 8,20 * * *'   // Setiap jam 8 pagi dan 8 malam
  // '0 0 * * *'      // Setiap tengah malam
  
  timezone: 'Asia/Jakarta',
  enableLogging: true
};

/**
 * Fungsi untuk menulis log
 */
const writeLog = async (message, type = 'INFO') => {
  if (!CONFIG.enableLogging) return;
  
  try {
    await fs.ensureDir(path.dirname(LOG_FILE));
    const timestamp = new Date().toLocaleString('id-ID', {
      timeZone: CONFIG.timezone
    });
    const logEntry = `[${timestamp}] [${type}] ${message}\n`;
    
    await fs.appendFile(LOG_FILE, logEntry);
    console.log(`${type}: ${message}`);
  } catch (error) {
    console.error('Error writing log:', error.message);
  }
};

/**
 * Fungsi untuk menjalankan update dengan error handling
 */
const executeUpdate = async () => {
  try {
    await writeLog('Memulai scheduled update menu content');
    
    // Jalankan update
    await runUpdate();
    
    await writeLog('Scheduled update berhasil diselesaikan', 'SUCCESS');
    
  } catch (error) {
    await writeLog(`Scheduled update gagal: ${error.message}`, 'ERROR');
    
    // Optional: Kirim notifikasi error ke admin
    // await sendErrorNotification(error);
  }
};

/**
 * Fungsi untuk menjalankan update manual
 */
const runManualUpdate = async () => {
  console.log('🔄 Menjalankan update manual...');
  await executeUpdate();
};

/**
 * Fungsi untuk memulai scheduler
 */
const startScheduler = () => {
  console.log('🚀 Memulai Menu Content Scheduler...');
  console.log(`📅 Jadwal: ${CONFIG.schedule}`);
  console.log(`🌏 Timezone: ${CONFIG.timezone}`);
  console.log(`📝 Logging: ${CONFIG.enableLogging ? 'Enabled' : 'Disabled'}`);
  
  // Buat scheduled task
  const task = cron.schedule(CONFIG.schedule, executeUpdate, {
    scheduled: false,
    timezone: CONFIG.timezone
  });
  
  // Mulai scheduler
  task.start();
  
  writeLog('Menu Content Scheduler dimulai');
  console.log('✅ Scheduler aktif! Tekan Ctrl+C untuk menghentikan.');
  
  // Jalankan update pertama kali
  setTimeout(executeUpdate, 5000); // Delay 5 detik
  
  return task;
};

/**
 * Fungsi untuk menghentikan scheduler
 */
const stopScheduler = (task) => {
  if (task) {
    task.stop();
    writeLog('Menu Content Scheduler dihentikan');
    console.log('🛑 Scheduler dihentikan.');
  }
};

/**
 * Fungsi untuk melihat status scheduler
 */
const getSchedulerStatus = () => {
  return {
    schedule: CONFIG.schedule,
    timezone: CONFIG.timezone,
    logging: CONFIG.enableLogging,
    logFile: LOG_FILE,
    nextRun: cron.validate(CONFIG.schedule) ? 'Valid schedule' : 'Invalid schedule'
  };
};

/**
 * Fungsi untuk membaca log terbaru
 */
const getRecentLogs = async (lines = 50) => {
  try {
    if (!await fs.pathExists(LOG_FILE)) {
      return 'Log file belum ada.';
    }
    
    const logContent = await fs.readFile(LOG_FILE, 'utf8');
    const logLines = logContent.trim().split('\n');
    
    return logLines.slice(-lines).join('\n');
  } catch (error) {
    return `Error membaca log: ${error.message}`;
  }
};

/**
 * Fungsi untuk membersihkan log lama
 */
const cleanOldLogs = async (daysToKeep = 30) => {
  try {
    if (!await fs.pathExists(LOG_FILE)) {
      return;
    }
    
    const stats = await fs.stat(LOG_FILE);
    const fileAge = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
    
    if (fileAge > daysToKeep) {
      // Backup log lama
      const backupFile = LOG_FILE.replace('.log', `-backup-${Date.now()}.log`);
      await fs.move(LOG_FILE, backupFile);
      
      await writeLog(`Log lama dibackup ke: ${backupFile}`);
    }
  } catch (error) {
    console.error('Error cleaning old logs:', error.message);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Menerima signal shutdown...');
  writeLog('Scheduler dihentikan oleh user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Menerima signal terminate...');
  writeLog('Scheduler dihentikan oleh sistem');
  process.exit(0);
});

// Jalankan jika file dipanggil langsung
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--manual') || args.includes('-m')) {
    // Jalankan update manual
    runManualUpdate();
  } else if (args.includes('--status') || args.includes('-s')) {
    // Tampilkan status
    console.log('📊 Status Scheduler:');
    console.log(JSON.stringify(getSchedulerStatus(), null, 2));
  } else if (args.includes('--logs') || args.includes('-l')) {
    // Tampilkan log terbaru
    getRecentLogs().then(logs => {
      console.log('📝 Log Terbaru:');
      console.log(logs);
    });
  } else {
    // Mulai scheduler
    startScheduler();
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runManualUpdate,
  getSchedulerStatus,
  getRecentLogs,
  cleanOldLogs,
  executeUpdate
};