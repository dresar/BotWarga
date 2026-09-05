#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const CacheManager = require('./cleanup-cache');

/**
 * Production Monitor untuk Bot WhatsApp
 * - Monitoring cache size (max 5GB)
 * - Auto restart jika memory tinggi
 * - Health check sistem
 * - Optimasi untuk VPS 4 core 8GB RAM
 */

class ProductionMonitor {
  constructor() {
    this.maxCacheSize = 5 * 1024 * 1024 * 1024; // 5GB
    this.maxMemoryPerInstance = 1.5 * 1024 * 1024 * 1024; // 1.5GB per instance
    this.logFile = './logs/production-monitor.log';
    this.cacheManager = new CacheManager();
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}\n`;
    
    console.log(`[${level}] ${message}`);
    
    // Ensure logs directory exists
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logMessage);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async getPM2Status() {
    try {
      const output = execSync('pm2 jlist', { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (error) {
      this.log(`Error getting PM2 status: ${error.message}`, 'ERROR');
      return [];
    }
  }

  async getSystemStats() {
    try {
      // Get memory usage
      const memInfo = execSync('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', { encoding: 'utf8' });
      const memLines = memInfo.split('\n').filter(line => line.includes('='));
      
      let totalMemory = 0;
      let freeMemory = 0;
      
      memLines.forEach(line => {
        if (line.includes('TotalVisibleMemorySize')) {
          totalMemory = parseInt(line.split('=')[1]) * 1024; // Convert KB to bytes
        }
        if (line.includes('FreePhysicalMemory')) {
          freeMemory = parseInt(line.split('=')[1]) * 1024; // Convert KB to bytes
        }
      });
      
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      // Get CPU usage (simplified)
      const cpuInfo = execSync('wmic cpu get loadpercentage /value', { encoding: 'utf8' });
      const cpuLine = cpuInfo.split('\n').find(line => line.includes('LoadPercentage'));
      const cpuUsage = cpuLine ? parseInt(cpuLine.split('=')[1]) : 0;
      
      return {
        memory: {
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
          usagePercent: memoryUsagePercent
        },
        cpu: {
          usagePercent: cpuUsage
        }
      };
    } catch (error) {
      this.log(`Error getting system stats: ${error.message}`, 'ERROR');
      return null;
    }
  }

  async checkCacheSize() {
    const cacheDirectories = [
      './session',
      './uploads',
      './logs',
      './temp',
      './node_modules/.cache'
    ];
    
    let totalCacheSize = 0;
    for (const dir of cacheDirectories) {
      totalCacheSize += this.cacheManager.getDirectorySize(dir);
    }
    
    const cacheUsagePercent = (totalCacheSize / this.maxCacheSize) * 100;
    
    this.log(`Cache size: ${this.formatBytes(totalCacheSize)} (${cacheUsagePercent.toFixed(1)}% of 5GB limit)`);
    
    if (totalCacheSize > this.maxCacheSize) {
      this.log('⚠️  Cache size exceeds 5GB limit. Triggering cleanup...', 'WARN');
      await this.cacheManager.cleanup();
      return true; // Cleanup performed
    }
    
    return false;
  }

  async checkMemoryUsage() {
    const pm2Processes = await this.getPM2Status();
    let restartNeeded = false;
    
    for (const process of pm2Processes) {
      if (process.name === 'bot-whatsapp-production') {
        const memoryUsage = process.monit.memory;
        const memoryMB = memoryUsage / (1024 * 1024);
        
        this.log(`Process ${process.pm_id}: Memory usage ${memoryMB.toFixed(2)}MB`);
        
        if (memoryUsage > this.maxMemoryPerInstance) {
          this.log(`⚠️  Process ${process.pm_id} memory usage (${memoryMB.toFixed(2)}MB) exceeds limit (1500MB)`, 'WARN');
          restartNeeded = true;
        }
      }
    }
    
    return restartNeeded;
  }

  async restartApplication() {
    try {
      this.log('🔄 Restarting application...', 'INFO');
      
      // Cleanup cache before restart
      await this.cacheManager.cleanup();
      
      // Graceful restart
      execSync('pm2 reload ecosystem.config.js --env production', { stdio: 'pipe' });
      
      this.log('✅ Application restarted successfully', 'INFO');
      return true;
    } catch (error) {
      this.log(`❌ Failed to restart application: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async healthCheck() {
    try {
      // Check if PM2 processes are running
      const pm2Processes = await this.getPM2Status();
      const botProcesses = pm2Processes.filter(p => p.name === 'bot-whatsapp-production');
      
      if (botProcesses.length === 0) {
        this.log('❌ No bot processes running. Starting application...', 'ERROR');
        execSync('pm2 start ecosystem.config.js --env production', { stdio: 'pipe' });
        return false;
      }
      
      // Check if processes are healthy
      const unhealthyProcesses = botProcesses.filter(p => p.pm2_env.status !== 'online');
      
      if (unhealthyProcesses.length > 0) {
        this.log(`⚠️  ${unhealthyProcesses.length} unhealthy processes detected`, 'WARN');
        await this.restartApplication();
        return false;
      }
      
      this.log(`✅ Health check passed. ${botProcesses.length} processes running`);
      return true;
    } catch (error) {
      this.log(`❌ Health check failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async generateReport() {
    const systemStats = await this.getSystemStats();
    const pm2Processes = await this.getPM2Status();
    const botProcesses = pm2Processes.filter(p => p.name === 'bot-whatsapp-production');
    
    const report = {
      timestamp: new Date().toISOString(),
      system: systemStats,
      processes: {
        total: botProcesses.length,
        running: botProcesses.filter(p => p.pm2_env.status === 'online').length,
        memory: botProcesses.reduce((sum, p) => sum + p.monit.memory, 0),
        cpu: botProcesses.reduce((sum, p) => sum + p.monit.cpu, 0)
      },
      cache: {
        size: this.cacheManager.getDirectorySize('./session') + 
              this.cacheManager.getDirectorySize('./uploads') + 
              this.cacheManager.getDirectorySize('./logs') + 
              this.cacheManager.getDirectorySize('./temp'),
        limit: this.maxCacheSize
      }
    };
    
    // Save report
    const reportFile = `./logs/production-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    return report;
  }

  async monitor() {
    this.log('🚀 Starting production monitoring...');
    
    const runCheck = async () => {
      try {
        this.log('🔍 Running system check...');
        
        // Health check
        const isHealthy = await this.healthCheck();
        
        // Check cache size
        const cacheCleanupPerformed = await this.checkCacheSize();
        
        // Check memory usage
        const memoryRestartNeeded = await this.checkMemoryUsage();
        
        // Get system stats
        const systemStats = await this.getSystemStats();
        if (systemStats) {
          this.log(`System Memory: ${this.formatBytes(systemStats.memory.used)}/${this.formatBytes(systemStats.memory.total)} (${systemStats.memory.usagePercent.toFixed(1)}%)`);
          this.log(`System CPU: ${systemStats.cpu.usagePercent}%`);
          
          // Auto restart if system memory > 90%
          if (systemStats.memory.usagePercent > 90) {
            this.log('⚠️  System memory usage > 90%. Triggering restart...', 'WARN');
            await this.restartApplication();
          }
        }
        
        // Restart if needed
        if (memoryRestartNeeded && !cacheCleanupPerformed) {
          await this.restartApplication();
        }
        
        // Generate daily report
        const now = new Date();
        if (now.getHours() === 2 && now.getMinutes() < 5) { // 2 AM daily report
          await this.generateReport();
        }
        
        this.log('✅ System check completed');
        
      } catch (error) {
        this.log(`❌ Monitor check failed: ${error.message}`, 'ERROR');
      }
    };
    
    // Run initial check
    await runCheck();
    
    // Schedule periodic checks
    setInterval(runCheck, this.checkInterval);
    
    this.log(`📊 Production monitor active. Checking every ${this.checkInterval / 1000 / 60} minutes`);
  }

  async stop() {
    this.log('🛑 Stopping production monitor...');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Run monitor if called directly
if (require.main === module) {
  const monitor = new ProductionMonitor();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--report')) {
    monitor.generateReport()
      .then((report) => {
        console.log('📊 Production Report:');
        console.log(JSON.stringify(report, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Failed to generate report:', error);
        process.exit(1);
      });
  } else if (args.includes('--health')) {
    monitor.healthCheck()
      .then((isHealthy) => {
        console.log(isHealthy ? '✅ System is healthy' : '❌ System has issues');
        process.exit(isHealthy ? 0 : 1);
      })
      .catch((error) => {
        console.error('❌ Health check failed:', error);
        process.exit(1);
      });
  } else {
    monitor.monitor().catch((error) => {
      console.error('❌ Monitor failed to start:', error);
      process.exit(1);
    });
  }
}

module.exports = ProductionMonitor;