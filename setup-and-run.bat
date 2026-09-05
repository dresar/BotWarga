@echo off
chcp 65001 >nul
echo ========================================
echo    BOT WHATSAPP SETUP DAN JALANKAN
echo ========================================
echo.

REM Cek apakah Node.js sudah terinstal
echo [INFO] Memeriksa instalasi Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Node.js belum terinstal!
    echo [INFO] Mengunduh dan menginstal Node.js...
    
    REM Download Node.js LTS (versi 20.x)
    echo [INFO] Mengunduh Node.js LTS...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.10.0/node-v20.10.0-x64.msi' -OutFile 'nodejs-installer.msi'"
    
    if exist "nodejs-installer.msi" (
        echo [INFO] Menginstal Node.js...
        msiexec /i nodejs-installer.msi /quiet /norestart
        echo [INFO] Menunggu instalasi selesai...
        timeout /t 30 /nobreak >nul
        
        REM Hapus installer
        del "nodejs-installer.msi"
        
        REM Refresh environment variables
        echo [INFO] Memperbarui environment variables...
        call refreshenv.cmd 2>nul || (
            echo [INFO] Silakan restart Command Prompt atau komputer untuk menggunakan Node.js
            pause
            exit /b 1
        )
    ) else (
        echo [ERROR] Gagal mengunduh Node.js installer!
        pause
        exit /b 1
    )
) else (
    echo [OK] Node.js sudah terinstal: 
    node --version
)

echo.
echo ========================================
echo        PEMBERSIHAN CACHE
echo ========================================

REM Hapus cache npm
echo [INFO] Membersihkan cache npm...
npm cache clean --force

REM Hapus node_modules jika ada
if exist "node_modules" (
    echo [INFO] Menghapus folder node_modules...
    rmdir /s /q node_modules
)

REM Hapus package-lock.json jika ada
if exist "package-lock.json" (
    echo [INFO] Menghapus package-lock.json...
    del package-lock.json
)

REM Hapus cache WhatsApp session lama (opsional)
echo [INFO] Membersihkan cache session lama...
if exist "session\*.json" (
    echo [WARNING] Ditemukan session lama, akan dihapus untuk QR code baru
    del /q "session\*.json" 2>nul
)

REM Hapus cache aplikasi
if exist "logs\cache-cleanup.log" (
    echo [INFO] Membersihkan log cache...
    del "logs\cache-cleanup.log"
)

echo [OK] Cache berhasil dibersihkan!

echo.
echo ========================================
echo       INSTALASI DEPENDENCIES
echo ========================================

REM Install dependencies
echo [INFO] Menginstal dependencies...
npm install

if %errorlevel% neq 0 (
    echo [ERROR] Gagal menginstal dependencies!
    pause
    exit /b 1
)

echo [OK] Dependencies berhasil diinstal!

echo.
echo ========================================
echo         INSTALASI PM2
echo ========================================

REM Cek apakah PM2 sudah terinstal
echo [INFO] Memeriksa instalasi PM2...
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] PM2 belum terinstal!
    echo [INFO] Menginstal PM2 secara global...
    npm install -g pm2
    
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstal PM2!
        pause
        exit /b 1
    )
    
    echo [OK] PM2 berhasil diinstal!
) else (
    echo [OK] PM2 sudah terinstal: 
    pm2 --version
)

echo.
echo ========================================
echo         UPDATE SISTEM MENU
echo ========================================

REM Jalankan update sistem
echo [INFO] Menjalankan update sistem menu...
npm run update-menu

if %errorlevel% neq 0 (
    echo [WARNING] Update menu gagal, tapi bot tetap bisa dijalankan
)

REM Validasi sistem
echo [INFO] Memvalidasi sistem...
npm run validate-system

echo.
echo ========================================
echo         MENJALANKAN BOT WHATSAPP
echo ========================================

REM Hentikan PM2 yang mungkin sedang berjalan
echo [INFO] Menghentikan instance PM2 yang ada...
pm2 stop whatsapp-bot 2>nul
pm2 delete whatsapp-bot 2>nul

echo [INFO] Memulai bot WhatsApp dengan PM2...
echo [INFO] QR Code akan muncul di log PM2
echo [INFO] Gunakan 'pm2 logs whatsapp-bot' untuk melihat QR Code
echo.
echo ========================================
echo            MEMULAI PM2
echo ========================================
echo.

REM Jalankan bot dengan PM2
pm2 start ecosystem.config.js

if %errorlevel% neq 0 (
    echo [ERROR] Gagal memulai bot dengan PM2!
    echo [INFO] Mencoba menjalankan dengan Node.js biasa...
    node index.js
) else (
    echo [OK] Bot WhatsApp berhasil dimulai dengan PM2!
    echo.
    echo [INFO] Perintah berguna:
    echo   - pm2 logs whatsapp-bot    : Lihat log dan QR code
    echo   - pm2 status              : Status aplikasi
    echo   - pm2 restart whatsapp-bot: Restart bot
    echo   - pm2 stop whatsapp-bot   : Hentikan bot
    echo   - pm2 monit              : Monitor real-time
    echo.
    echo [INFO] Menampilkan log untuk melihat QR Code...
    timeout /t 3 /nobreak >nul
    pm2 logs whatsapp-bot --lines 50
)

echo.
echo ========================================
echo [INFO] Setup selesai!
echo [INFO] Tekan tombol apa saja untuk keluar...
pause >nul