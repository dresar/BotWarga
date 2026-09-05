# 🚀 Production Deployment Guide

## Bot WhatsApp Desa Pulosarok - Production Mode

Panduan lengkap untuk menjalankan Bot WhatsApp dalam mode production dengan optimasi untuk VPS 4 core 8GB RAM dan cache limit 5GB.

## 📋 Spesifikasi Sistem

- **CPU**: 4 Core
- **RAM**: 8GB
- **Storage**: 250GB
- **Cache Limit**: 5GB
- **OS**: Windows/Linux

## 🛠️ Prerequisites

1. **Node.js** (v16 atau lebih tinggi)
2. **PM2** (sudah terinstall)
3. **SQLite3** (untuk database optimization)

## 📦 Instalasi

```bash
# Clone repository
git clone <repository-url>
cd BOTWA

# Install dependencies
npm install

# Install PM2 globally (jika belum)
npm install -g pm2
```

## 🚀 Quick Start Production

### 1. Setup Production Environment

```bash
# Setup lengkap production (cleanup + start + monitoring)
npm run prod:setup
```

### 2. Manual Setup

```bash
# 1. Cleanup cache terlebih dahulu
npm run prod:cleanup

# 2. Start aplikasi dengan PM2
npm run prod:start

# 3. Start monitoring (opsional, di terminal terpisah)
npm run prod:watch
```

## 📊 Monitoring & Management

### Status & Monitoring

```bash
# Lihat status PM2
npm run prod:status

# Monitor real-time
npm run prod:monitor

# Lihat logs
npm run prod:logs

# Health check
npm run prod:health

# Generate report
npm run prod:report
```

### Restart & Maintenance

```bash
# Graceful restart (zero downtime)
npm run prod:restart

# Stop aplikasi
npm run prod:stop

# Hapus dari PM2
npm run prod:delete

# Manual cache cleanup
npm run prod:cleanup
```

## ⚙️ Konfigurasi Production

### 1. Ecosystem Configuration (`ecosystem.config.js`)

- **3 Instance**: Menggunakan 3 worker untuk 4 core system
- **Memory Limit**: 1.5GB per instance
- **Auto Restart**: Restart otomatis jika crash
- **Cron Restart**: Restart harian jam 2 pagi
- **Logging**: Centralized logging

### 2. Cache Management

- **Limit**: 5GB total cache
- **Auto Cleanup**: Otomatis ketika melebihi limit
- **Smart Detection**: Hanya cleanup jika diperlukan
- **Scheduled Cleanup**: Harian jam 2 pagi

### 3. Memory Optimization

- **Heap Size**: 1.5GB per instance
- **Garbage Collection**: Otomatis setiap 5 menit
- **Memory Monitoring**: Real-time monitoring
- **Auto Restart**: Jika memory > 1.5GB

## 📁 Struktur File Production

```
BOTWA/
├── ecosystem.config.js          # PM2 configuration
├── config/
│   └── production.js            # Production settings
├── scripts/
│   ├── cleanup-cache.js         # Cache management
│   └── production-monitor.js    # System monitoring
├── logs/
│   ├── pm2-combined.log        # PM2 logs
│   ├── pm2-out.log             # Output logs
│   ├── pm2-error.log           # Error logs
│   ├── cache-cleanup.log       # Cache cleanup logs
│   └── production-monitor.log  # Monitor logs
└── README-Production.md         # This file
```

## 🔧 Optimasi Sistem

### 1. Database Optimization

- **WAL Mode**: Write-Ahead Logging untuk performa
- **Cache Size**: 64MB cache per database
- **Auto Vacuum**: Otomatis setiap hari
- **Memory Mapping**: 256MB untuk performa

### 2. Memory Management

- **Instance Limit**: 1.5GB per instance
- **System Limit**: Auto restart jika system memory > 90%
- **Cache Limit**: 5GB total cache
- **GC Optimization**: Force garbage collection

### 3. Performance Monitoring

- **Health Check**: Setiap 30 detik
- **Memory Check**: Setiap 5 menit
- **Cache Check**: Setiap 5 menit
- **System Stats**: Real-time monitoring

## 📊 Monitoring Dashboard

### PM2 Monit

```bash
npm run prod:monitor
```

Menampilkan:
- CPU usage per instance
- Memory usage per instance
- Restart count
- Uptime
- Logs real-time

### Production Monitor

```bash
npm run prod:watch
```

Menampilkan:
- System memory usage
- Cache size monitoring
- Auto cleanup triggers
- Health check results

## 🚨 Alert & Notifications

### Automatic Actions

1. **Memory > 90%**: Auto restart aplikasi
2. **Cache > 5GB**: Auto cleanup cache
3. **Process Crash**: Auto restart dengan PM2
4. **Unhealthy Process**: Auto restart

### Log Locations

- **PM2 Logs**: `./logs/pm2-*.log`
- **Cache Logs**: `./logs/cache-cleanup.log`
- **Monitor Logs**: `./logs/production-monitor.log`
- **Application Logs**: `./logs/combined.log`

## 🔄 Backup & Recovery

### Automatic Backup

- **Schedule**: Harian jam 1 pagi
- **Retention**: 7 hari
- **Target**: Database, uploads, logs
- **Location**: `./backups/`

### Manual Backup

```bash
# Backup konten menu
npm run backup-content

# Manual database backup
sqlite3 database.db ".backup backup-$(date +%Y%m%d).db"
```

## 🐛 Troubleshooting

### Common Issues

1. **High Memory Usage**
   ```bash
   npm run prod:cleanup
   npm run prod:restart
   ```

2. **Cache Full**
   ```bash
   npm run prod:cleanup
   ```

3. **Process Not Responding**
   ```bash
   npm run prod:health
   npm run prod:restart
   ```

4. **Database Lock**
   ```bash
   npm run prod:stop
   # Wait 10 seconds
   npm run prod:start
   ```

### Log Analysis

```bash
# Error logs
tail -f logs/pm2-error.log

# Application logs
tail -f logs/combined.log

# Monitor logs
tail -f logs/production-monitor.log
```

## 📈 Performance Tuning

### For Higher Traffic

1. **Increase Instances**:
   ```javascript
   // ecosystem.config.js
   instances: 4, // Use all 4 cores
   ```

2. **Increase Memory Limit**:
   ```javascript
   max_memory_restart: '2000MB',
   ```

3. **Optimize Cache**:
   ```javascript
   // Reduce cache size for more instances
   maxCacheSize: 3 * 1024 * 1024 * 1024, // 3GB
   ```

### For Lower Resource Usage

1. **Reduce Instances**:
   ```javascript
   instances: 2,
   ```

2. **Lower Memory Limit**:
   ```javascript
   max_memory_restart: '1000MB',
   ```

## 🔒 Security

### Production Security

- **Environment Variables**: Gunakan `.env` untuk secrets
- **Rate Limiting**: Built-in rate limiting
- **Input Validation**: Semua input divalidasi
- **SQL Injection**: Protected dengan prepared statements

### Recommended `.env`

```env
NODE_ENV=production
PORT=3000
DB_PATH=./database.db
LOG_LEVEL=info
MAX_CACHE_SIZE=5368709120
```

## 📞 Support

Jika mengalami masalah:

1. Check logs: `npm run prod:logs`
2. Health check: `npm run prod:health`
3. Generate report: `npm run prod:report`
4. Restart: `npm run prod:restart`

## 🎯 Best Practices

1. **Regular Monitoring**: Jalankan `npm run prod:watch`
2. **Daily Reports**: Check `npm run prod:report`
3. **Weekly Cleanup**: Manual `npm run prod:cleanup`
4. **Monthly Review**: Analyze logs dan performance
5. **Backup Verification**: Test restore backup secara berkala

---

**🚀 Bot WhatsApp Desa Pulosarok - Production Ready!**

Dengan konfigurasi ini, bot siap menangani traffic tinggi dengan optimasi memory dan cache yang efisien untuk VPS 4 core 8GB RAM.