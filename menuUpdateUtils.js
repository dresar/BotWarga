/**
 * Utilitas untuk mengelola dan memvalidasi update menu content
 * Menyediakan fungsi helper dan validasi untuk sistem update
 */

const fs = require('fs-extra');
const path = require('path');
const { connectSQLite } = require('./src/config/sqlite');

// Konfigurasi path
const BASE_PATH = __dirname;
const UPLOADS_PATH = path.join(BASE_PATH, 'uploads');
const MENUS_PATH = path.join(UPLOADS_PATH, 'menus');
const UMKM_FOLDER = path.join(MENUS_PATH, '5-Informasi_UMKM');
const BERITA_FOLDER = path.join(MENUS_PATH, '6-Cari_Berita');

/**
 * Fungsi untuk memvalidasi struktur folder
 */
const validateFolderStructure = async () => {
  const results = {
    valid: true,
    errors: [],
    warnings: [],
    folders: {
      umkm: {},
      berita: {}
    }
  };

  try {
    // Validasi folder UMKM
    const umkmSubfolders = [
      '5A-Daftar_UMKM',
      '5B-Kategori_UMKM', 
      '5C-Lokasi_UMKM',
      '5D-Kontak_UMKM'
    ];

    for (const subfolder of umkmSubfolders) {
      const folderPath = path.join(UMKM_FOLDER, subfolder);
      const contentPath = path.join(folderPath, 'content.txt');
      
      if (!await fs.pathExists(folderPath)) {
        results.errors.push(`Folder tidak ditemukan: ${folderPath}`);
        results.valid = false;
      } else {
        results.folders.umkm[subfolder] = {
          exists: true,
          contentFile: await fs.pathExists(contentPath)
        };
        
        if (!await fs.pathExists(contentPath)) {
          results.warnings.push(`File content.txt tidak ditemukan: ${contentPath}`);
        }
      }
    }

    // Validasi folder Berita
    const beritaSubfolders = [
      '6A-Berita_Terbaru',
      '6B-Berita_Kategori',
      '6C-Cari_Berita',
      '6D-Arsip_Berita'
    ];

    for (const subfolder of beritaSubfolders) {
      const folderPath = path.join(BERITA_FOLDER, subfolder);
      const contentPath = path.join(folderPath, 'content.txt');
      
      if (!await fs.pathExists(folderPath)) {
        results.errors.push(`Folder tidak ditemukan: ${folderPath}`);
        results.valid = false;
      } else {
        results.folders.berita[subfolder] = {
          exists: true,
          contentFile: await fs.pathExists(contentPath)
        };
        
        if (!await fs.pathExists(contentPath)) {
          results.warnings.push(`File content.txt tidak ditemukan: ${contentPath}`);
        }
      }
    }

  } catch (error) {
    results.errors.push(`Error validasi struktur: ${error.message}`);
    results.valid = false;
  }

  return results;
};

/**
 * Fungsi untuk memvalidasi koneksi database
 */
const validateDatabaseConnection = () => {
  const results = {
    valid: true,
    errors: [],
    tables: {}
  };

  try {
    const db = connectSQLite();
    
    // Cek tabel yang diperlukan
    const requiredTables = ['umkm', 'news', 'menu_contents'];
    
    for (const tableName of requiredTables) {
      try {
        const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
        results.tables[tableName] = {
          exists: tableInfo.length > 0,
          columns: tableInfo.map(col => col.name)
        };
        
        if (tableInfo.length === 0) {
          results.errors.push(`Tabel '${tableName}' tidak ditemukan`);
        }
      } catch (error) {
        results.tables[tableName] = {
          exists: false,
          error: error.message
        };
        results.errors.push(`Error mengakses tabel '${tableName}': ${error.message}`);
      }
    }
    
    // Cek apakah ada error
    if (results.errors.length > 0) {
      results.valid = false;
    }
    
  } catch (error) {
    results.errors.push(`Error koneksi database: ${error.message}`);
    results.valid = false;
  }

  return results;
};

/**
 * Fungsi untuk backup file content sebelum update
 */
const backupContentFiles = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(BASE_PATH, 'backups', `menu-content-${timestamp}`);
  
  try {
    await fs.ensureDir(backupDir);
    
    // Backup folder UMKM
    const umkmBackupDir = path.join(backupDir, '5-Informasi_UMKM');
    await fs.copy(UMKM_FOLDER, umkmBackupDir);
    
    // Backup folder Berita
    const beritaBackupDir = path.join(backupDir, '6-Cari_Berita');
    await fs.copy(BERITA_FOLDER, beritaBackupDir);
    
    console.log(`✅ Backup berhasil dibuat: ${backupDir}`);
    return backupDir;
    
  } catch (error) {
    console.error(`❌ Error backup: ${error.message}`);
    throw error;
  }
};

/**
 * Fungsi untuk restore dari backup
 */
const restoreFromBackup = async (backupPath) => {
  try {
    if (!await fs.pathExists(backupPath)) {
      throw new Error(`Backup path tidak ditemukan: ${backupPath}`);
    }
    
    // Restore folder UMKM
    const umkmBackupPath = path.join(backupPath, '5-Informasi_UMKM');
    if (await fs.pathExists(umkmBackupPath)) {
      await fs.copy(umkmBackupPath, UMKM_FOLDER);
      console.log('✅ Folder UMKM berhasil direstore');
    }
    
    // Restore folder Berita
    const beritaBackupPath = path.join(backupPath, '6-Cari_Berita');
    if (await fs.pathExists(beritaBackupPath)) {
      await fs.copy(beritaBackupPath, BERITA_FOLDER);
      console.log('✅ Folder Berita berhasil direstore');
    }
    
    console.log(`✅ Restore dari backup berhasil: ${backupPath}`);
    
  } catch (error) {
    console.error(`❌ Error restore: ${error.message}`);
    throw error;
  }
};

/**
 * Fungsi untuk membersihkan backup lama
 */
const cleanOldBackups = async (daysToKeep = 7) => {
  const backupsDir = path.join(BASE_PATH, 'backups');
  
  try {
    if (!await fs.pathExists(backupsDir)) {
      return;
    }
    
    const items = await fs.readdir(backupsDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedCount = 0;
    
    for (const item of items) {
      const itemPath = path.join(backupsDir, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory() && stats.mtime < cutoffDate) {
        await fs.remove(itemPath);
        deletedCount++;
        console.log(`🗑️ Backup lama dihapus: ${item}`);
      }
    }
    
    console.log(`✅ Pembersihan backup selesai. ${deletedCount} backup lama dihapus.`);
    
  } catch (error) {
    console.error(`❌ Error membersihkan backup: ${error.message}`);
  }
};

/**
 * Fungsi untuk mendapatkan statistik file content
 */
const getContentStats = async () => {
  const stats = {
    umkm: {},
    berita: {},
    total: {
      files: 0,
      totalSize: 0,
      lastModified: null
    }
  };

  try {
    // Statistik folder UMKM
    const umkmSubfolders = ['5A-Daftar_UMKM', '5B-Kategori_UMKM', '5C-Lokasi_UMKM', '5D-Kontak_UMKM'];
    
    for (const subfolder of umkmSubfolders) {
      const contentPath = path.join(UMKM_FOLDER, subfolder, 'content.txt');
      
      if (await fs.pathExists(contentPath)) {
        const fileStats = await fs.stat(contentPath);
        stats.umkm[subfolder] = {
          size: fileStats.size,
          lastModified: fileStats.mtime,
          readable: true
        };
        
        stats.total.files++;
        stats.total.totalSize += fileStats.size;
        
        if (!stats.total.lastModified || fileStats.mtime > stats.total.lastModified) {
          stats.total.lastModified = fileStats.mtime;
        }
      } else {
        stats.umkm[subfolder] = {
          size: 0,
          lastModified: null,
          readable: false
        };
      }
    }

    // Statistik folder Berita
    const beritaSubfolders = ['6A-Berita_Terbaru', '6B-Berita_Kategori', '6C-Cari_Berita', '6D-Arsip_Berita'];
    
    for (const subfolder of beritaSubfolders) {
      const contentPath = path.join(BERITA_FOLDER, subfolder, 'content.txt');
      
      if (await fs.pathExists(contentPath)) {
        const fileStats = await fs.stat(contentPath);
        stats.berita[subfolder] = {
          size: fileStats.size,
          lastModified: fileStats.mtime,
          readable: true
        };
        
        stats.total.files++;
        stats.total.totalSize += fileStats.size;
        
        if (!stats.total.lastModified || fileStats.mtime > stats.total.lastModified) {
          stats.total.lastModified = fileStats.mtime;
        }
      } else {
        stats.berita[subfolder] = {
          size: 0,
          lastModified: null,
          readable: false
        };
      }
    }

  } catch (error) {
    console.error(`Error mendapatkan statistik: ${error.message}`);
  }

  return stats;
};

/**
 * Fungsi untuk validasi lengkap sistem
 */
const validateSystem = async () => {
  console.log('🔍 Memulai validasi sistem...');
  
  const results = {
    timestamp: new Date().toISOString(),
    overall: true,
    checks: {}
  };

  // Validasi struktur folder
  console.log('📁 Validasi struktur folder...');
  results.checks.folderStructure = await validateFolderStructure();
  if (!results.checks.folderStructure.valid) {
    results.overall = false;
  }

  // Validasi database
  console.log('🗄️ Validasi koneksi database...');
  results.checks.database = validateDatabaseConnection();
  if (!results.checks.database.valid) {
    results.overall = false;
  }

  // Statistik file
  console.log('📊 Mengumpulkan statistik file...');
  results.checks.fileStats = await getContentStats();

  // Tampilkan hasil
  console.log('\n📋 HASIL VALIDASI:');
  console.log(`Status keseluruhan: ${results.overall ? '✅ VALID' : '❌ INVALID'}`);
  
  if (results.checks.folderStructure.errors.length > 0) {
    console.log('\n❌ Error struktur folder:');
    results.checks.folderStructure.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  if (results.checks.folderStructure.warnings.length > 0) {
    console.log('\n⚠️ Warning struktur folder:');
    results.checks.folderStructure.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (results.checks.database.errors.length > 0) {
    console.log('\n❌ Error database:');
    results.checks.database.errors.forEach(error => console.log(`   - ${error}`));
  }
  
  console.log(`\n📊 Statistik file:`);
  console.log(`   - Total file: ${results.checks.fileStats.total.files}`);
  console.log(`   - Total ukuran: ${(results.checks.fileStats.total.totalSize / 1024).toFixed(2)} KB`);
  if (results.checks.fileStats.total.lastModified) {
    console.log(`   - Terakhir dimodifikasi: ${results.checks.fileStats.total.lastModified.toLocaleString('id-ID')}`);
  }

  return results;
};

/**
 * Fungsi untuk membuat laporan sistem
 */
const generateSystemReport = async () => {
  const validation = await validateSystem();
  const reportPath = path.join(BASE_PATH, 'logs', `system-report-${Date.now()}.json`);
  
  try {
    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeJson(reportPath, validation, { spaces: 2 });
    
    console.log(`\n📄 Laporan sistem disimpan: ${reportPath}`);
    return reportPath;
    
  } catch (error) {
    console.error(`Error menyimpan laporan: ${error.message}`);
    throw error;
  }
};

// Jalankan jika file dipanggil langsung
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate') || args.includes('-v')) {
    validateSystem();
  } else if (args.includes('--backup') || args.includes('-b')) {
    backupContentFiles();
  } else if (args.includes('--stats') || args.includes('-s')) {
    getContentStats().then(stats => {
      console.log('📊 Statistik File Content:');
      console.log(JSON.stringify(stats, null, 2));
    });
  } else if (args.includes('--report') || args.includes('-r')) {
    generateSystemReport();
  } else if (args.includes('--clean-backups')) {
    const days = parseInt(args[args.indexOf('--clean-backups') + 1]) || 7;
    cleanOldBackups(days);
  } else {
    console.log('🛠️ Menu Update Utils');
    console.log('\nPenggunaan:');
    console.log('  --validate, -v     : Validasi sistem lengkap');
    console.log('  --backup, -b       : Backup file content');
    console.log('  --stats, -s        : Tampilkan statistik file');
    console.log('  --report, -r       : Generate laporan sistem');
    console.log('  --clean-backups N  : Bersihkan backup lebih dari N hari');
  }
}

module.exports = {
  validateFolderStructure,
  validateDatabaseConnection,
  backupContentFiles,
  restoreFromBackup,
  cleanOldBackups,
  getContentStats,
  validateSystem,
  generateSystemReport
};