const fs = require('fs');
const path = require('path');

// Fungsi untuk mencari semua file content.txt
function findContentFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findContentFiles(filePath, fileList);
        } else if (file === 'content.txt') {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Fungsi untuk menambahkan note UMSU
function addUmsuNote(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Cek apakah sudah ada note UMSU
        if (content.includes('Dibuat oleh Mahasiswa UMSU')) {
            console.log(`✅ ${filePath} - Sudah ada note UMSU`);
            return;
        }
        
        // Tambahkan note di akhir file
        const umsuNote = '\n\n---\n📝 *Dibuat oleh Mahasiswa UMSU*\n🎓 Program KKN 2025\n🏫 Universitas Muhammadiyah Sumatera Utara';
        content += umsuNote;
        
        // Tulis kembali file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${filePath} - Note UMSU berhasil ditambahkan`);
        
    } catch (error) {
        console.error(`❌ Error pada ${filePath}:`, error.message);
    }
}

// Main function
function main() {
    const menusDir = path.join(__dirname, 'uploads', 'menus');
    
    console.log('🚀 Memulai penambahan note UMSU pada semua file content.txt...');
    console.log(`📁 Direktori: ${menusDir}`);
    console.log('═'.repeat(60));
    
    // Cari semua file content.txt
    const contentFiles = findContentFiles(menusDir);
    
    if (contentFiles.length === 0) {
        console.log('❌ Tidak ditemukan file content.txt');
        return;
    }
    
    console.log(`📋 Ditemukan ${contentFiles.length} file content.txt`);
    console.log('═'.repeat(60));
    
    // Proses setiap file
    contentFiles.forEach((filePath, index) => {
        console.log(`\n${index + 1}/${contentFiles.length} - Processing: ${path.relative(menusDir, filePath)}`);
        addUmsuNote(filePath);
    });
    
    console.log('\n═'.repeat(60));
    console.log('🎉 Proses selesai! Semua file telah diperbarui dengan note UMSU.');
    console.log('\n📝 Note yang ditambahkan:');
    console.log('   📝 *Dibuat oleh Mahasiswa UMSU*');
    console.log('   🎓 Program KKN 2025');
    console.log('   🏫 Universitas Muhammadiyah Sumatera Utara');
}

// Jalankan script
if (require.main === module) {
    main();
}

module.exports = { findContentFiles, addUmsuNote };