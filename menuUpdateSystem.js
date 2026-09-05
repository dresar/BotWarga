/**
 * Sistem Update Menu Content Otomatis Terintegrasi
 * Menggabungkan update manual dan scheduler dalam satu file utama
 * Dengan deteksi perubahan database untuk efisiensi
 */

const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { connectSQLite } = require('./src/config/sqlite');
const { runUpdate } = require('./updateMenuContent');
const { validateSystem } = require('./menuUpdateUtils');

// Konfigurasi
const CONFIG = {
  // Check setiap 5 menit
  schedule: '*/5 * * * *',
  timezone: 'Asia/Jakarta',
  enableLogging: true,
  enableNotifications: true,
  hashFile: path.join(__dirname, 'logs', 'database-hash.json')
};

const LOG_FILE = path.join(__dirname, 'logs', 'menu-update.log');

/**
 * Fungsi untuk menulis log dengan timestamp
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
    
    if (CONFIG.enableNotifications) {
      console.log(`${type}: ${message}`);
    }
  } catch (error) {
    console.error('Error writing log:', error.message);
  }
};

/**
 * Fungsi untuk menampilkan notifikasi update
 */
const showUpdateNotification = (filesUpdated) => {
  if (!CONFIG.enableNotifications) return;
  
  console.log('\n' + '='.repeat(50));
  console.log('🔄 MENU CONTENT UPDATE COMPLETED');
  console.log('='.repeat(50));
  console.log(`⏰ Waktu: ${new Date().toLocaleString('id-ID')}`);
  console.log(`📁 File diupdate: ${filesUpdated} file`);
  console.log(`✅ Status: Berhasil`);
  console.log('='.repeat(50) + '\n');
};

/**
 * Fungsi untuk menghitung hash database untuk deteksi perubahan
 */
const calculateDatabaseHash = () => {
  try {
    const db = connectSQLite();
    
    // Ambil data terbaru dari tabel yang relevan
    const umkmData = db.prepare('SELECT * FROM umkm ORDER BY id').all();
    
    let newsData = [];
    try {
      // Cek apakah tabel news ada
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='news'").get();
      if (tableExists) {
        newsData = db.prepare('SELECT * FROM news ORDER BY id').all();
      }
    } catch (error) {
      // Tabel news tidak ada, gunakan array kosong
    }
    
    // Gabungkan data dan buat hash
    const combinedData = JSON.stringify({ umkm: umkmData, news: newsData });
    return crypto.createHash('md5').update(combinedData).digest('hex');
    
  } catch (error) {
    console.error('Error calculating database hash:', error.message);
    return null;
  }
};

/**
 * Fungsi untuk menyimpan hash database
 */
const saveCurrentHash = async (hash) => {
  try {
    await fs.ensureDir(path.dirname(CONFIG.hashFile));
    const hashData = {
      hash: hash,
      timestamp: new Date().toISOString(),
      lastUpdate: new Date().toLocaleString('id-ID')
    };
    await fs.writeJson(CONFIG.hashFile, hashData, { spaces: 2 });
  } catch (error) {
    console.error('Error saving hash:', error.message);
  }
};

/**
 * Fungsi untuk membaca hash database yang tersimpan
 */
const getStoredHash = async () => {
  try {
    if (await fs.pathExists(CONFIG.hashFile)) {
      const hashData = await fs.readJson(CONFIG.hashFile);
      return hashData.hash;
    }
    return null;
  } catch (error) {
    console.error('Error reading stored hash:', error.message);
    return null;
  }
};

/**
 * Fungsi untuk mengecek apakah ada perubahan dalam database
 */
const hasDataChanged = async () => {
  const currentHash = calculateDatabaseHash();
  const storedHash = await getStoredHash();
  
  if (!currentHash) {
    await writeLog('Gagal menghitung hash database', 'ERROR');
    return false;
  }
  
  if (!storedHash) {
    // Pertama kali dijalankan, simpan hash dan lakukan update
    await saveCurrentHash(currentHash);
    await writeLog('Hash database pertama kali disimpan', 'INFO');
    return true;
  }
  
  const changed = currentHash !== storedHash;
  
  if (changed) {
    await writeLog(`Perubahan database terdeteksi (${storedHash.substring(0,8)} -> ${currentHash.substring(0,8)})`, 'INFO');
    await saveCurrentHash(currentHash);
  } else {
    await writeLog('Tidak ada perubahan database', 'DEBUG');
  }
  
  return changed;
};

/**
 * Fungsi untuk menjalankan update dengan deteksi perubahan
 */
const executeSmartUpdate = async () => {
  try {
    await writeLog('Memulai pengecekan perubahan database');
    
    // Cek apakah ada perubahan
    const dataChanged = await hasDataChanged();
    
    if (!dataChanged) {
      await writeLog('Tidak ada perubahan, skip update', 'INFO');
      return { updated: false, reason: 'No changes detected' };
    }
    
    await writeLog('Perubahan terdeteksi, memulai update file content');
    
    // Jalankan update
    await runUpdate();
    
    await writeLog('Update file content berhasil diselesaikan', 'SUCCESS');
    showUpdateNotification(7); // 4 UMKM + 3 Berita files
    
    return { updated: true, reason: 'Database changes detected' };
    
  } catch (error) {
    await writeLog(`Error saat update: ${error.message}`, 'ERROR');
    throw error;
  }
};

/**
 * Fungsi untuk menjalankan update manual (force update)
 */
const runManualUpdate = async () => {
  console.log('🔄 Menjalankan update manual (force update)...');
  
  try {
    await writeLog('Memulai manual update (force)');
    
    // Force update tanpa cek perubahan
    await runUpdate();
    
    // Update hash setelah manual update
    const currentHash = calculateDatabaseHash();
    if (currentHash) {
      await saveCurrentHash(currentHash);
    }
    
    await writeLog('Manual update berhasil diselesaikan', 'SUCCESS');
    showUpdateNotification(7);
    
    console.log('✅ Manual update selesai!');
    
  } catch (error) {
    await writeLog(`Manual update gagal: ${error.message}`, 'ERROR');
    console.error('❌ Manual update gagal:', error.message);
    throw error;
  }
};

/**
 * Fungsi untuk memulai scheduler otomatis
 */
const startScheduler = () => {
  console.log('🚀 Memulai Menu Content Scheduler Terintegrasi...');
  console.log(`📅 Jadwal check: ${CONFIG.schedule} (setiap 5 menit)`);
  console.log(`🌏 Timezone: ${CONFIG.timezone}`);
  console.log(`📝 Logging: ${CONFIG.enableLogging ? 'Enabled' : 'Disabled'}`);
  console.log(`🔔 Notifikasi: ${CONFIG.enableNotifications ? 'Enabled' : 'Disabled'}`);
  console.log(`🔍 Smart Detection: Enabled (hanya update jika ada perubahan)`);
  
  // Buat scheduled task
  const task = cron.schedule(CONFIG.schedule, async () => {
    await executeSmartUpdate();
  }, {
    scheduled: false,
    timezone: CONFIG.timezone
  });
  
  // Mulai scheduler
  task.start();
  
  writeLog('Menu Content Scheduler dimulai dengan smart detection');
  console.log('✅ Scheduler aktif! Tekan Ctrl+C untuk menghentikan.');
  console.log('💡 Sistem akan mengecek perubahan database setiap 5 menit');
  
  // Jalankan pengecekan pertama setelah 10 detik
  setTimeout(async () => {
    console.log('🔍 Menjalankan pengecekan pertama...');
    await executeSmartUpdate();
  }, 10000);
  
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
 * Fungsi untuk melihat status sistem
 */
const getSystemStatus = async () => {
  const storedHash = await getStoredHash();
  const currentHash = calculateDatabaseHash();
  
  return {
    schedule: CONFIG.schedule,
    timezone: CONFIG.timezone,
    logging: CONFIG.enableLogging,
    notifications: CONFIG.enableNotifications,
    logFile: LOG_FILE,
    hashFile: CONFIG.hashFile,
    lastHash: storedHash ? storedHash.substring(0, 8) + '...' : 'None',
    currentHash: currentHash ? currentHash.substring(0, 8) + '...' : 'Error',
    hasChanges: currentHash && storedHash ? currentHash !== storedHash : 'Unknown',
    nextCheck: 'Every 5 minutes'
  };
};

/**
 * Fungsi untuk validasi sistem lengkap
 */
const runSystemValidation = async () => {
  console.log('🔍 Menjalankan validasi sistem lengkap...');
  
  try {
    const validation = await validateSystem();
    
    if (validation.overall) {
      console.log('✅ Sistem valid dan siap digunakan');
    } else {
      console.log('❌ Sistem memiliki masalah yang perlu diperbaiki');
    }
    
    return validation;
    
  } catch (error) {
    console.error('❌ Error validasi sistem:', error.message);
    throw error;
  }
};

/**
 * Fungsi untuk backup konten
 */
const runBackup = async () => {
  console.log('💾 Menjalankan backup konten...');
  
  try {
    const { backupContentFiles } = require('./menuUpdateUtils');
    const backupPath = await backupContentFiles();
    
    console.log(`✅ Backup berhasil dibuat: ${backupPath}`);
    return backupPath;
    
  } catch (error) {
    console.error('❌ Error backup:', error.message);
    throw error;
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Menerima signal shutdown...');
  writeLog('Sistem dihentikan oleh user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Menerima signal terminate...');
  writeLog('Sistem dihentikan oleh sistem');
  process.exit(0);
});

// Main execution logic
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--manual') || args.includes('-m')) {
    // Update manual
    runManualUpdate().catch(error => {
      console.error('Fatal error:', error.message);
      process.exit(1);
    });
    
  } else if (args.includes('--schedule') || args.includes('-s')) {
    // Mulai scheduler
    startScheduler();
    
  } else if (args.includes('--status')) {
    // Tampilkan status
    getSystemStatus().then(status => {
      console.log('📊 Status Sistem:');
      console.log(JSON.stringify(status, null, 2));
    });
    
  } else if (args.includes('--validate') || args.includes('-v')) {
    // Validasi sistem
    runSystemValidation().catch(error => {
      console.error('Fatal error:', error.message);
      process.exit(1);
    });
    
  } else if (args.includes('--backup') || args.includes('-b')) {
    // Backup konten
    runBackup().catch(error => {
      console.error('Fatal error:', error.message);
      process.exit(1);
    });
    
  } else if (args.includes('--check')) {
    // Check perubahan tanpa update
    hasDataChanged().then(changed => {
      console.log(`🔍 Perubahan database: ${changed ? 'YA' : 'TIDAK'}`);
    });
    
  } else {
    // Default: tampilkan help
    console.log('🛠️ Sistem Update Menu Content Otomatis');
    console.log('\nPenggunaan:');
    console.log('  node menuUpdateSystem.js --manual     : Update manual (force)');
    console.log('  node menuUpdateSystem.js --schedule   : Mulai scheduler otomatis');
    console.log('  node menuUpdateSystem.js --status     : Tampilkan status sistem');
    console.log('  node menuUpdateSystem.js --validate   : Validasi sistem');
    console.log('  node menuUpdateSystem.js --backup     : Backup konten');
    console.log('  node menuUpdateSystem.js --check      : Check perubahan database');
    console.log('\nNPM Scripts:');
    console.log('  npm run update-menu        : Update manual');
    console.log('  npm run schedule-update    : Scheduler otomatis');
    console.log('  npm run validate-system    : Validasi sistem');
    console.log('  npm run backup-content     : Backup konten');
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runManualUpdate,
  executeSmartUpdate,
  getSystemStatus,
  runSystemValidation,
  runBackup,
  hasDataChanged
};