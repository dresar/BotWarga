# Sistem Update Menu Content Otomatis

Sistem ini menyediakan solusi lengkap untuk mengupdate file txt di folder UMKM dan Cari Berita secara otomatis berdasarkan data terbaru dari database.

## 📁 File yang Dibuat

### 1. `updateMenuContent.js`
**File utama untuk update konten menu**
- Mengambil data UMKM dari database SQLite
- Mengambil data berita dari database/JSON
- Memformat data menjadi konten yang sesuai
- Mengupdate semua file content.txt di folder target

### 2. `scheduleMenuUpdate.js`
**Scheduler untuk menjalankan update otomatis**
- Menggunakan node-cron untuk penjadwalan
- Dapat dijalankan sebagai background service
- Logging lengkap untuk monitoring
- Graceful shutdown handling

### 3. `menuUpdateUtils.js`
**Utilitas untuk validasi dan maintenance**
- Validasi struktur folder dan database
- Backup dan restore file content
- Statistik dan monitoring sistem
- Pembersihan backup lama

## 🚀 Instalasi

### 1. Install Dependencies
```bash
npm install
```

### 2. Verifikasi Sistem
```bash
npm run validate-system
```

## 📖 Cara Penggunaan

### Update Manual
```bash
# Jalankan update sekali
npm run update-menu

# Atau langsung dengan node
node updateMenuContent.js
```

### Update Otomatis (Scheduler)
```bash
# Mulai scheduler (berjalan terus)
npm run schedule-update

# Dengan opsi manual
node scheduleMenuUpdate.js --manual

# Lihat status scheduler
node scheduleMenuUpdate.js --status

# Lihat log terbaru
node scheduleMenuUpdate.js --logs
```

### Utilitas Sistem
```bash
# Validasi sistem lengkap
npm run validate-system

# Backup file content
npm run backup-content

# Lihat statistik file
node menuUpdateUtils.js --stats

# Generate laporan sistem
node menuUpdateUtils.js --report

# Bersihkan backup lama (lebih dari 7 hari)
node menuUpdateUtils.js --clean-backups 7
```

## ⚙️ Konfigurasi

### Scheduler Configuration
Edit `scheduleMenuUpdate.js` untuk mengubah jadwal:

```javascript
const CONFIG = {
  // Setiap 30 menit
  schedule: '*/30 * * * *',
  
  // Alternatif jadwal:
  // '0 */6 * * *'    // Setiap 6 jam
  // '0 8,20 * * *'   // Jam 8 pagi dan 8 malam
  // '0 0 * * *'      // Setiap tengah malam
  
  timezone: 'Asia/Jakarta',
  enableLogging: true
};
```

### Path Configuration
Jika struktur folder berbeda, edit path di `updateMenuContent.js`:

```javascript
const UMKM_FOLDER = path.join(__dirname, 'uploads', 'menus', '5-Informasi_UMKM');
const BERITA_FOLDER = path.join(__dirname, 'uploads', 'menus', '6-Cari_Berita');
```

## 📂 Struktur Folder yang Diupdate

### Folder UMKM (`5-Informasi_UMKM`)
- `5A-Daftar_UMKM/content.txt` - Daftar lengkap UMKM
- `5B-Kategori_UMKM/content.txt` - Kategori dan statistik UMKM
- `5C-Lokasi_UMKM/content.txt` - Informasi lokasi UMKM
- `5D-Kontak_UMKM/content.txt` - Kontak dan komunikasi UMKM

### Folder Berita (`6-Cari_Berita`)
- `6A-Berita_Terbaru/content.txt` - 10 berita terbaru
- `6B-Berita_Kategori/content.txt` - Kategori berita tersedia
- `6D-Arsip_Berita/content.txt` - Sistem arsip dan pencarian

## 🗄️ Sumber Data

### Data UMKM
- **Database**: Tabel `umkm` di SQLite
- **Model**: `SQLiteUMKM.js`
- **Kolom**: nama, deskripsi, kategori, alamat, kontak, dll.

### Data Berita
- **Primary**: Tabel `news` di SQLite database
- **Fallback**: File `uploads/news/news.json`
- **Kolom**: title, content, category, author, published_at, dll.

## 📊 Fitur Utama

### ✅ Update Otomatis
- Sinkronisasi real-time dengan database
- Format konten yang konsisten
- Penanganan error yang robust

### ✅ Monitoring & Logging
- Log lengkap semua aktivitas
- Statistik file dan database
- Validasi sistem berkala

### ✅ Backup & Recovery
- Backup otomatis sebelum update
- Restore dari backup jika diperlukan
- Pembersihan backup lama

### ✅ Validasi Sistem
- Cek struktur folder
- Validasi koneksi database
- Verifikasi integritas file

## 🔧 Troubleshooting

### Error: Database Connection
```bash
# Cek koneksi database
node menuUpdateUtils.js --validate

# Pastikan file database ada
ls -la src/config/sqlite.js
```

### Error: Folder Not Found
```bash
# Cek struktur folder
node menuUpdateUtils.js --validate

# Buat folder yang hilang
mkdir -p uploads/menus/5-Informasi_UMKM/5A-Daftar_UMKM
```

### Error: Permission Denied
```bash
# Cek permission file
ls -la uploads/menus/

# Set permission jika perlu
chmod -R 755 uploads/menus/
```

### Scheduler Tidak Berjalan
```bash
# Cek status scheduler
node scheduleMenuUpdate.js --status

# Lihat log error
node scheduleMenuUpdate.js --logs

# Test manual update
node scheduleMenuUpdate.js --manual
```

## 📝 Log Files

### Lokasi Log
- **Scheduler**: `logs/menu-update.log`
- **System Report**: `logs/system-report-[timestamp].json`

### Format Log
```
[2024-01-15 10:30:00] [INFO] Memulai scheduled update menu content
[2024-01-15 10:30:05] [SUCCESS] Scheduled update berhasil diselesaikan
```

## 🔄 Maintenance

### Harian
- Monitor log untuk error
- Cek status scheduler

### Mingguan
- Validasi sistem lengkap
- Backup manual jika diperlukan

### Bulanan
- Bersihkan backup lama
- Review dan optimize konfigurasi
- Update dependencies jika ada

## 🆘 Support

Jika mengalami masalah:

1. **Cek log error**:
   ```bash
   node scheduleMenuUpdate.js --logs
   ```

2. **Validasi sistem**:
   ```bash
   npm run validate-system
   ```

3. **Test manual update**:
   ```bash
   npm run update-menu
   ```

4. **Generate laporan**:
   ```bash
   node menuUpdateUtils.js --report
   ```

## 📋 Checklist Deployment

- [ ] Install dependencies (`npm install`)
- [ ] Validasi sistem (`npm run validate-system`)
- [ ] Test manual update (`npm run update-menu`)
- [ ] Setup scheduler (`npm run schedule-update`)
- [ ] Monitor log files
- [ ] Setup backup routine
- [ ] Document custom configuration

---

**Dibuat untuk**: Sistem Bot WhatsApp Desa Pulosarok  
**Versi**: 1.0.0  
**Tanggal**: 2024  
**Maintainer**: Admin Desa Pulosarok