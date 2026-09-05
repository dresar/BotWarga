#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script untuk cleanup cache sebelum PM2 restart
 * Batasan cache: 5GB
 * Optimasi untuk VPS 4 core 8GB RAM
 */

class CacheManager {
  constructor() {
    this.maxCacheSize = 5 * 1024 * 1024 * 1024; // 5GB dalam bytes
    this.cacheDirectories = [
      './session',
      './uploads',
      './logs',
      './temp',
      './node_modules/.cache'
    ];
    this.logFile = './logs/cache-cleanup.log';
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    
    console.log(message);
    
    // Ensure logs directory exists
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logMessage);
  }

  getDirectorySize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        
        if (file.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      this.log(`Error reading directory ${dirPath}: ${error.message}`);
    }
    
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanupOldFiles(dirPath, maxAge = 7) {
    if (!fs.existsSync(dirPath)) return 0;
    
    let cleanedSize = 0;
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds
    const now = Date.now();
    
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        
        if (file.isFile()) {
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtime.getTime();
          
          if (fileAge > maxAgeMs) {
            cleanedSize += stats.size;
            fs.unlinkSync(filePath);
            this.log(`Deleted old file: ${filePath} (${this.formatBytes(stats.size)})`);
          }
        } else if (file.isDirectory()) {
          cleanedSize += this.cleanupOldFiles(filePath, maxAge);
        }
      }
    } catch (error) {
      this.log(`Error cleaning directory ${dirPath}: ${error.message}`);
    }
    
    return cleanedSize;
  }

  cleanupTempFiles() {
    const tempDirs = ['./temp', './uploads/temp'];
    let totalCleaned = 0;
    
    for (const tempDir of tempDirs) {
      if (fs.existsSync(tempDir)) {
        try {
          const files = fs.readdirSync(tempDir);
          for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            totalCleaned += stats.size;
            fs.unlinkSync(filePath);
          }
          this.log(`Cleaned temp directory: ${tempDir}`);
        } catch (error) {
          this.log(`Error cleaning temp directory ${tempDir}: ${error.message}`);
        }
      }
    }
    
    return totalCleaned;
  }

  cleanupLogs() {
    // Keep only last 30 days of logs
    const logDir = './logs';
    return this.cleanupOldFiles(logDir, 30);
  }

  optimizeDatabase() {
    try {
      // SQLite VACUUM untuk optimize database
      const dbFiles = [
        './database.db',
        './data/chat.db',
        './database/bot.db',
        './database/village_system.db'
      ];
      
      for (const dbFile of dbFiles) {
        if (fs.existsSync(dbFile)) {
          this.log(`Optimizing database: ${dbFile}`);
          execSync(`sqlite3 "${dbFile}" "VACUUM;"`, { stdio: 'pipe' });
        }
      }
    } catch (error) {
      this.log(`Database optimization error: ${error.message}`);
    }
  }

  clearNodeModulesCache() {
    try {
      const cacheDir = './node_modules/.cache';
      if (fs.existsSync(cacheDir)) {
        execSync(`rm -rf "${cacheDir}"`, { stdio: 'pipe' });
        this.log('Cleared node_modules cache');
      }
    } catch (error) {
      this.log(`Error clearing node_modules cache: ${error.message}`);
    }
  }

  async cleanup() {
    this.log('🧹 Starting cache cleanup process...');
    
    // Calculate total cache size
    let totalCacheSize = 0;
    for (const dir of this.cacheDirectories) {
      const size = this.getDirectorySize(dir);
      totalCacheSize += size;
      this.log(`${dir}: ${this.formatBytes(size)}`);
    }
    
    this.log(`Total cache size: ${this.formatBytes(totalCacheSize)}`);
    this.log(`Max allowed cache: ${this.formatBytes(this.maxCacheSize)}`);
    
    let totalCleaned = 0;
    
    // Always cleanup temp files
    totalCleaned += this.cleanupTempFiles();
    
    // Cleanup old logs
    totalCleaned += this.cleanupLogs();
    
    // If cache exceeds limit, perform aggressive cleanup
    if (totalCacheSize > this.maxCacheSize) {
      this.log('⚠️  Cache size exceeds 5GB limit. Performing aggressive cleanup...');
      
      // Cleanup old session files (keep last 3 days)
      totalCleaned += this.cleanupOldFiles('./session', 3);
      
      // Cleanup old uploads (keep last 30 days)
      totalCleaned += this.cleanupOldFiles('./uploads', 30);
      
      // Clear node modules cache
      this.clearNodeModulesCache();
    }
    
    // Optimize databases
    this.optimizeDatabase();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
      this.log('Forced garbage collection');
    }
    
    this.log(`✅ Cleanup completed. Freed: ${this.formatBytes(totalCleaned)}`);
    
    // Final cache size check
    let finalCacheSize = 0;
    for (const dir of this.cacheDirectories) {
      finalCacheSize += this.getDirectorySize(dir);
    }
    
    this.log(`Final cache size: ${this.formatBytes(finalCacheSize)}`);
    
    return {
      initialSize: totalCacheSize,
      finalSize: finalCacheSize,
      cleaned: totalCleaned
    };
  }
}

// Run cleanup if called directly
if (require.main === module) {
  const cacheManager = new CacheManager();
  
  cacheManager.cleanup()
    .then((result) => {
      console.log('Cache cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cache cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = CacheManager;