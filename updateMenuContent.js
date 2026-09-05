/**
 * Script untuk mengupdate file txt di folder UMKM dan Cari Berita
 * berdasarkan data terbaru dari database
 */

const fs = require('fs-extra');
const path = require('path');
const { connectSQLite } = require('./src/config/sqlite');
const SQLiteUMKM = require('./src/models/SQLiteUMKM');

// Konfigurasi path folder
const UMKM_FOLDER = path.join(__dirname, 'uploads', 'menus', '5-Informasi_UMKM');
const BERITA_FOLDER = path.join(__dirname, 'uploads', 'menus', '6-Cari_Berita');
const NEWS_JSON_PATH = path.join(__dirname, 'uploads', 'news', 'news.json');

/**
 * Fungsi untuk mengambil data UMKM dari database SQLite
 */
const getUMKMFromDatabase = () => {
  try {
    const db = connectSQLite();
    const umkmModel = new SQLiteUMKM(db);
    
    // Ambil semua UMKM aktif
    const allUMKM = umkmModel.getAllUMKM('aktif');
    
    // Ambil statistik UMKM
    const stats = umkmModel.getUMKMStats();
    
    // Ambil daftar kategori
    const categories = umkmModel.getKategoriList();
    
    return {
      umkm: allUMKM,
      stats: stats,
      categories: categories
    };
  } catch (error) {
    console.error('Error mengambil data UMKM dari database:', error.message);
    return { umkm: [], stats: { total_umkm: 0, per_kategori: [] }, categories: [] };
  }
};

/**
 * Fungsi untuk mengambil data berita dari database SQLite
 */
const getNewsFromDatabase = () => {
  try {
    const db = connectSQLite();
    
    // Cek apakah tabel news ada
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='news'").get();
    
    if (tableExists) {
      // Ambil berita dari database SQLite
      const latestNews = db.prepare('SELECT * FROM news WHERE is_published = 1 ORDER BY created_at DESC LIMIT 10').all();
      const categories = db.prepare('SELECT DISTINCT category FROM news WHERE is_published = 1 ORDER BY category').all();
      const featuredNews = db.prepare('SELECT * FROM news WHERE is_published = 1 AND is_featured = 1 ORDER BY created_at DESC LIMIT 5').all();
      
      return {
        news: latestNews,
        categories: categories.map(cat => cat.category),
        featured: featuredNews
      };
    } else {
      // Fallback ke file JSON jika tabel tidak ada
      return getNewsFromJSON();
    }
  } catch (error) {
    console.error('Error mengambil data berita dari database:', error.message);
    // Fallback ke file JSON
    return getNewsFromJSON();
  }
};

/**
 * Fungsi fallback untuk mengambil data berita dari file JSON
 */
const getNewsFromJSON = () => {
  try {
    if (fs.existsSync(NEWS_JSON_PATH)) {
      const newsData = fs.readJsonSync(NEWS_JSON_PATH);
      const sortedNews = newsData.sort((a, b) => new Date(b.date) - new Date(a.date));
      const categories = [...new Set(newsData.map(news => news.category))];
      
      return {
        news: sortedNews.slice(0, 10),
        categories: categories,
        featured: sortedNews.slice(0, 3)
      };
    }
    return { news: [], categories: [], featured: [] };
  } catch (error) {
    console.error('Error membaca file news.json:', error.message);
    return { news: [], categories: [], featured: [] };
  }
};

/**
 * Fungsi untuk format data UMKM menjadi string
 */
const formatUMKMList = (umkmData) => {
  if (!umkmData.umkm || umkmData.umkm.length === 0) {
    return '📭 Belum ada UMKM yang terdaftar\n\n💡 Untuk mendaftarkan UMKM, hubungi admin desa.\n📞 Admin: 0812-3456-7890';
  }

  // Kelompokkan UMKM berdasarkan kategori
  const kategoris = {};
  umkmData.umkm.forEach(umkm => {
    const kategori = umkm.kategori || 'lainnya';
    if (!kategoris[kategori]) {
      kategoris[kategori] = [];
    }
    kategoris[kategori].push(umkm);
  });

  let result = '';
  const kategoriIcons = {
    'kuliner': '🍽️',
    'retail': '🛍️', 
    'jasa': '🔧',
    'pertanian': '🌾',
    'fashion': '👕',
    'lainnya': '📦'
  };

  Object.keys(kategoris).forEach(kategori => {
    const icon = kategoriIcons[kategori] || '📦';
    result += `\n${icon} ${kategori.toUpperCase()}\n`;
    result += '─'.repeat(20) + '\n';
    
    kategoris[kategori].forEach((umkm, index) => {
      result += `\n${index + 1}. ${umkm.nama}\n`;
      if (umkm.deskripsi) {
        result += `   📝 ${umkm.deskripsi}\n`;
      }
      if (umkm.alamat) {
        result += `   📍 ${umkm.alamat}\n`;
      }
      if (umkm.kontak_telepon || umkm.kontak_whatsapp) {
        const kontak = umkm.kontak_whatsapp || umkm.kontak_telepon;
        result += `   📞 ${kontak}\n`;
      }
      if (umkm.jam_operasional) {
        result += `   🕒 ${umkm.jam_operasional}\n`;
      }
      result += '\n';
    });
  });

  return result;
};

/**
 * Fungsi untuk format daftar kategori UMKM
 */
const formatUMKMCategories = (umkmData) => {
  if (!umkmData.categories || umkmData.categories.length === 0) {
    return 'Belum ada kategori UMKM yang tersedia.';
  }

  let result = '';
  const kategoriIcons = {
    'kuliner': '🍽️',
    'retail': '🛍️', 
    'jasa': '🔧',
    'pertanian': '🌾',
    'fashion': '👕',
    'lainnya': '📦'
  };

  umkmData.categories.forEach(cat => {
    const icon = kategoriIcons[cat.kategori] || '📦';
    result += `${icon} ${cat.kategori.toUpperCase()} (${cat.jumlah} UMKM)\n`;
  });

  return result;
};

/**
 * Fungsi untuk format berita terbaru
 */
const formatLatestNews = (newsData) => {
  if (!newsData.news || newsData.news.length === 0) {
    return '📭 Belum ada berita yang dipublikasi\n\n💡 Berita akan ditampilkan setelah admin mempublikasikan.';
  }

  let result = `🗞️ ${newsData.news.length} BERITA TERBARU\n\n`;
  
  newsData.news.forEach((news, index) => {
    const date = news.published_at || news.created_at || news.date;
    const formattedDate = new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    result += `${index + 1}️⃣ ${news.title}\n`;
    result += `📅 ${formattedDate}\n`;
    result += `👤 Penulis: ${news.author}\n`;
    result += `🏷️ Kategori: ${news.category}\n`;
    
    if (news.summary) {
      result += `📝 ${news.summary}\n`;
    } else if (news.content) {
      const shortContent = news.content.length > 100 ? 
        news.content.substring(0, 100) + '...' : news.content;
      result += `📝 ${shortContent}\n`;
    }
    
    if (news.view_count) {
      result += `👁️ Dilihat: ${news.view_count} kali\n`;
    }
    
    if (news.is_featured) {
      result += `⭐ Berita Unggulan\n`;
    }
    
    result += '\n';
  });

  return result;
};

/**
 * Fungsi untuk format kategori berita
 */
const formatNewsCategories = (newsData) => {
  if (!newsData.categories || newsData.categories.length === 0) {
    return 'Belum ada kategori berita yang tersedia.';
  }

  let result = '📂 KATEGORI BERITA TERSEDIA:\n\n';
  
  const categoryIcons = {
    'infrastruktur': '🏗️',
    'kesehatan': '🏥',
    'ekonomi': '💼',
    'pendidikan': '📚',
    'sosial': '🤝',
    'lingkungan': '🌱',
    'budaya': '🎭',
    'pertanian': '🌾',
    'teknologi': '💻',
    'olahraga': '⚽'
  };

  newsData.categories.forEach(category => {
    const icon = categoryIcons[category] || '📰';
    result += `${icon} ${category.toUpperCase()}\n`;
  });

  return result;
};

/**
 * Fungsi untuk update file content.txt
 */
const updateContentFile = async (filePath, newContent) => {
  try {
    await fs.ensureFile(filePath);
    await fs.writeFile(filePath, newContent, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
};

/**
 * Fungsi untuk update semua file UMKM
 */
const updateUMKMFiles = async () => {
  console.log('🔄 Mengupdate file UMKM...');
  
  const umkmData = getUMKMFromDatabase();
  
  // Update 5A-Daftar_UMKM
  const daftarUMKMPath = path.join(UMKM_FOLDER, '5A-Daftar_UMKM', 'content.txt');
  const daftarUMKMTemplate = `🏪 DAFTAR UMKM DESA PULOSAROK
═══════════════════════════════

📋 Berikut adalah daftar UMKM yang terdaftar di Desa Pulosarok:

${formatUMKMList(umkmData)}

🔍 Cara menggunakan fitur UMKM:
• Ketik "daftar umkm" untuk melihat semua UMKM
• Ketik "umkm [kategori]" untuk filter berdasarkan kategori
• Ketik "cari umkm [nama]" untuk pencarian spesifik
• Ketik "kategori umkm" untuk melihat daftar kategori

📊 Kategori UMKM yang tersedia:
🍽️ Kuliner - Warung, restoran, katering
🛍️ Retail - Toko kelontong, fashion
🔧 Jasa - Bengkel, salon, laundry
🌾 Pertanian - Produk olahan hasil tani
🎨 Fashion - Pakaian, aksesoris

💡 Informasi yang ditampilkan:
• Nama UMKM
• Deskripsi produk/layanan
• Alamat lokasi
• Kontak telepon/WhatsApp
• Email (jika tersedia)
• Jam operasional
• Media sosial (jika tersedia)

📞 Untuk informasi lebih lanjut:
Hubungi langsung UMKM yang bersangkutan atau admin desa.

🏛️ Desa Pulosarok
Mendukung pengembangan UMKM lokal`;
  
  await updateContentFile(daftarUMKMPath, daftarUMKMTemplate);
  
  // Update 5B-Kategori_UMKM
  const kategoriUMKMPath = path.join(UMKM_FOLDER, '5B-Kategori_UMKM', 'content.txt');
  const kategoriUMKMTemplate = `📂 KATEGORI UMKM DESA PULOSAROK
═══════════════════════════════════

📊 STATISTIK UMKM:
• Total UMKM Aktif: ${umkmData.stats.total_umkm}

📋 DAFTAR KATEGORI:

${formatUMKMCategories(umkmData)}

🔍 Cara mencari UMKM berdasarkan kategori:
• Ketik "umkm kuliner" untuk UMKM kuliner
• Ketik "umkm retail" untuk toko dan retail
• Ketik "umkm jasa" untuk layanan jasa
• Ketik "umkm pertanian" untuk produk pertanian
• Ketik "umkm fashion" untuk fashion dan aksesoris

💡 Tips:
• Gunakan nama kategori yang tepat
• Kategori tidak case-sensitive
• Bisa juga ketik "daftar umkm" untuk melihat semua

📞 Bantuan:
Hubungi admin desa jika mengalami kesulitan

🏛️ Desa Pulosarok
Mendukung UMKM lokal berkualitas`;
  
  await updateContentFile(kategoriUMKMPath, kategoriUMKMTemplate);
  
  // Update file lainnya dengan format serupa
  const lokasi_umkm_path = path.join(UMKM_FOLDER, '5C-Lokasi_UMKM', 'content.txt');
  const lokasi_umkm_template = `📍 LOKASI UMKM DESA PULOSAROK
═══════════════════════════════════

🗺️ PETA SEBARAN UMKM:

${formatUMKMList(umkmData)}

🧭 Cara mencari lokasi UMKM:
• Lihat alamat lengkap di daftar di atas
• Hubungi langsung UMKM untuk petunjuk arah
• Gunakan aplikasi maps dengan alamat yang tertera

📱 Fitur lokasi:
• Alamat lengkap dengan RT/RW
• Koordinat GPS (jika tersedia)
• Landmark terdekat
• Akses transportasi

💡 Tips navigasi:
• Simpan nomor kontak UMKM
• Konfirmasi jam operasional sebelum berkunjung
• Tanyakan patokan jalan jika kesulitan

🏛️ Desa Pulosarok
Memudahkan akses ke UMKM lokal`;
  
  await updateContentFile(lokasi_umkm_path, lokasi_umkm_template);
  
  const kontak_umkm_path = path.join(UMKM_FOLDER, '5D-Kontak_UMKM', 'content.txt');
  const kontak_umkm_template = `📞 KONTAK UMKM DESA PULOSAROK
═══════════════════════════════════

📋 DAFTAR KONTAK UMKM:

${formatUMKMList(umkmData)}

📱 Cara menghubungi UMKM:
• Telepon langsung ke nomor yang tertera
• WhatsApp untuk komunikasi cepat
• Email untuk komunikasi formal
• Kunjungi media sosial untuk update produk

⏰ Etika menghubungi:
• Perhatikan jam operasional
• Gunakan bahasa yang sopan
• Sebutkan tujuan dengan jelas
• Konfirmasi ketersediaan produk/layanan

💼 Informasi yang bisa ditanyakan:
• Ketersediaan produk/layanan
• Harga dan promo
• Cara pemesanan
• Metode pembayaran
• Pengiriman/delivery

🏛️ Desa Pulosarok
Memfasilitasi komunikasi dengan UMKM lokal`;
  
  await updateContentFile(kontak_umkm_path, kontak_umkm_template);
  
  console.log('✅ Semua file UMKM berhasil diupdate');
};

/**
 * Fungsi untuk update semua file Berita
 */
const updateBeritaFiles = async () => {
  console.log('🔄 Mengupdate file Berita...');
  
  const newsData = getNewsFromDatabase();
  
  // Update 6A-Berita_Terbaru
  const beritaTerbaruPath = path.join(BERITA_FOLDER, '6A-Berita_Terbaru', 'content.txt');
  const beritaTerbaruTemplate = `📰 BERITA TERBARU DESA PULOSAROK
═══════════════════════════════════════

${formatLatestNews(newsData)}

🔍 Cara mengakses berita:
• Menu ini menampilkan 10 berita terbaru
• Berita diurutkan berdasarkan tanggal publikasi
• Gunakan "cari_berita(kata_kunci)" untuk pencarian
• Pilih menu "6B" untuk filter berdasarkan kategori

📱 Fitur berita:
• Update otomatis dari database
• Informasi lengkap penulis dan tanggal
• Kategori untuk memudahkan pencarian
• Statistik jumlah pembaca

💡 Tips:
• Bookmark berita penting
• Bagikan informasi berguna ke warga lain
• Hubungi admin untuk usulan berita

🏛️ Desa Pulosarok
Informasi terkini untuk warga`;
  
  await updateContentFile(beritaTerbaruPath, beritaTerbaruTemplate);
  
  // Update 6B-Berita_Kategori
  const beritaKategoriPath = path.join(BERITA_FOLDER, '6B-Berita_Kategori', 'content.txt');
  const beritaKategoriTemplate = `📂 KATEGORI BERITA DESA PULOSAROK
═══════════════════════════════════════

${formatNewsCategories(newsData)}

🔍 Cara menggunakan kategori:
• Ketik "cari_berita(kategori)" untuk filter
• Contoh: cari_berita(infrastruktur)
• Contoh: cari_berita(kesehatan)
• Contoh: cari_berita(ekonomi)

📊 Jenis berita per kategori:
🏗️ INFRASTRUKTUR - Pembangunan, jalan, fasilitas
🏥 KESEHATAN - Posyandu, puskesmas, program kesehatan
💼 EKONOMI - UMKM, pelatihan, bantuan modal
📚 PENDIDIKAN - Sekolah, beasiswa, pelatihan
🤝 SOSIAL - Bantuan, gotong royong, kegiatan warga
🌱 LINGKUNGAN - Kebersihan, penghijauan, sampah
🎭 BUDAYA - Festival, tradisi, seni
🌾 PERTANIAN - Panen, pupuk, teknologi pertanian

💡 Tips pencarian:
• Gunakan kata kunci yang spesifik
• Kombinasikan dengan tanggal jika perlu
• Cek berita terbaru di menu "6A"

🏛️ Desa Pulosarok
Berita terkategorisasi untuk kemudahan akses`;
  
  await updateContentFile(beritaKategoriPath, beritaKategoriTemplate);
  
  // Update 6D-Arsip_Berita
  const arsipBeritaPath = path.join(BERITA_FOLDER, '6D-Arsip_Berita', 'content.txt');
  const arsipBeritaTemplate = `📚 ARSIP BERITA DESA PULOSAROK
═══════════════════════════════════════

🗃️ SISTEM ARSIP BERITA:

Total berita tersimpan: ${newsData.news.length} berita
Kategori tersedia: ${newsData.categories.length} kategori

📋 CARA MENGAKSES ARSIP:

1️⃣ PENCARIAN BERDASARKAN KATA KUNCI
   • Gunakan: cari_berita(kata_kunci)
   • Contoh: cari_berita(pembangunan)
   • Pencarian di judul dan isi berita

2️⃣ FILTER BERDASARKAN KATEGORI
   • Gunakan: cari_berita(nama_kategori)
   • Lihat daftar kategori di menu "6B"

3️⃣ BERITA TERBARU
   • Akses menu "6A - Berita Terbaru"
   • Menampilkan 10 berita terbaru

📊 STATISTIK ARSIP:
${formatNewsCategories(newsData)}

🔍 TIPS PENCARIAN EFEKTIF:
• Gunakan kata kunci spesifik
• Coba variasi kata jika tidak menemukan
• Periksa ejaan kata kunci
• Gunakan kategori untuk mempersempit pencarian

📱 FITUR ARSIP:
• Database terintegrasi real-time
• Pencarian cepat dan akurat
• Hasil terurut berdasarkan relevansi
• Akses mudah melalui WhatsApp

💡 BANTUAN:
Jika kesulitan mencari berita tertentu:
• Hubungi admin desa
• Coba kata kunci alternatif
• Periksa menu kategori berita

🏛️ Desa Pulosarok
Arsip berita lengkap dan mudah diakses`;
  
  await updateContentFile(arsipBeritaPath, arsipBeritaTemplate);
  
  console.log('✅ Semua file Berita berhasil diupdate');
};

/**
 * Fungsi utama untuk menjalankan update
 */
const runUpdate = async () => {
  console.log('🚀 Memulai update konten menu...');
  console.log('⏰ Waktu:', new Date().toLocaleString('id-ID'));
  
  try {
    // Update file UMKM
    await updateUMKMFiles();
    
    // Update file Berita
    await updateBeritaFiles();
    
    console.log('\n✅ Update konten menu selesai!');
    console.log('📊 Summary:');
    console.log('   - Folder UMKM: 4 file diupdate');
    console.log('   - Folder Berita: 3 file diupdate');
    console.log('   - Total: 7 file berhasil diupdate');
    
  } catch (error) {
    console.error('❌ Error saat update:', error.message);
    process.exit(1);
  }
};

// Jalankan jika file dipanggil langsung
if (require.main === module) {
  runUpdate();
}

module.exports = {
  runUpdate,
  updateUMKMFiles,
  updateBeritaFiles,
  getUMKMFromDatabase,
  getNewsFromDatabase
};