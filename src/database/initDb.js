/**
 * Inisialisasi database dan data default untuk bot WhatsApp
 */

const { initSQLiteDatabase } = require('./initSQLiteDb');

// Fungsi utama untuk inisialisasi database
const initDatabase = async () => {
  try {
    // Inisialisasi database SQLite
    const db = initSQLiteDatabase();
    return true;
  } catch (error) {
    console.error('Error initializing database:', error.message);
    return false;
  }
};

/**
 * Menginisialisasi data menu default jika belum ada
 */
async function initializeDefaultMenus() {
  try {
    // Cek apakah menu sudah ada
    const menuCount = await Menu.countDocuments();
    
    if (menuCount === 0) {
      console.log('Menginisialisasi data menu default...');
      
      // Menu utama
      const mainMenus = [
        {
          menuId: '1',
          name: 'Administrasi Kependudukan',
          description: 'Layanan administrasi kependudukan seperti KTP, KK, dll.',
          content: 'Silahkan pilih layanan Administrasi Kependudukan yang Anda butuhkan:',
          isActive: true,
          order: 1,
          parentId: null
        },
        {
          menuId: '2',
          name: 'Perizinan',
          description: 'Layanan perizinan untuk usaha, keramaian, dll.',
          content: 'Silahkan pilih layanan Perizinan yang Anda butuhkan:',
          isActive: true,
          order: 2,
          parentId: null
        },
        {
          menuId: '3',
          name: 'Pertanahan',
          description: 'Layanan pertanahan seperti surat tanah, jual beli, dll.',
          content: 'Silahkan pilih layanan Pertanahan yang Anda butuhkan:',
          isActive: true,
          order: 3,
          parentId: null
        },
        {
          menuId: '4',
          name: 'Kesejahteraan Sosial',
          description: 'Layanan kesejahteraan sosial seperti SKTM, bantuan sosial, dll.',
          content: 'Silahkan pilih layanan Kesejahteraan Sosial yang Anda butuhkan:',
          isActive: true,
          order: 4,
          parentId: null
        },
        {
          menuId: '5',
          name: 'Kesehatan',
          description: 'Layanan kesehatan seperti posyandu, penyuluhan, dll.',
          content: 'Silahkan pilih layanan Kesehatan yang Anda butuhkan:',
          isActive: true,
          order: 5,
          parentId: null
        },
        {
          menuId: '0',
          name: 'Informasi Desa',
          description: 'Informasi umum tentang Desa Pulosarok',
          content: 'Desa Pulosarok adalah desa yang terletak di Kecamatan X, Kabupaten Y. Desa ini memiliki luas wilayah sekitar Z hektar dengan jumlah penduduk sekitar N jiwa. Desa Pulosarok memiliki potensi di bidang pertanian, peternakan, dan pariwisata.',
          isActive: true,
          order: 0,
          parentId: null
        },
      ];
      
      // Sub menu untuk Administrasi Kependudukan
      const adminSubMenus = [
        {
          menuId: '1.1',
          name: 'Pembuatan KTP Elektronik',
          description: 'Layanan pembuatan KTP Elektronik bagi warga desa',
          content: 'Untuk pembuatan KTP Elektronik, silahkan siapkan dokumen berikut:\n- Fotokopi KK\n- Surat Pengantar RT/RW\n- Foto 3x4 (2 lembar)\n\nProsedur:\n1. Ambil formulir di kantor desa\n2. Isi formulir dan lampirkan persyaratan\n3. Serahkan ke petugas\n4. Tunggu proses verifikasi\n5. Ambil KTP sesuai jadwal\n\nBiaya: Gratis\nWaktu Pelayanan: 14 hari kerja',
          isActive: true,
          order: 1,
          parentId: '1'
        },
        {
          menuId: '1.2',
          name: 'Pembuatan Kartu Keluarga',
          description: 'Layanan pembuatan Kartu Keluarga baru atau perubahan data',
          content: 'Untuk pembuatan Kartu Keluarga, silahkan siapkan dokumen berikut:\n- Surat Pengantar RT/RW\n- Fotokopi Buku Nikah\n- Fotokopi KTP anggota keluarga\n\nProsedur:\n1. Ambil formulir di kantor desa\n2. Isi formulir dan lampirkan persyaratan\n3. Serahkan ke petugas\n4. Tunggu proses verifikasi\n5. Ambil KK sesuai jadwal\n\nBiaya: Gratis\nWaktu Pelayanan: 7 hari kerja',
          isActive: true,
          order: 2,
          parentId: '1'
        },
        {
          menuId: '1.3',
          name: 'Surat Keterangan Domisili',
          description: 'Surat keterangan tempat tinggal untuk keperluan administrasi',
          content: 'Untuk pembuatan Surat Keterangan Domisili, silahkan siapkan dokumen berikut:\n- Fotokopi KTP\n- Fotokopi KK\n- Surat Pengantar RT/RW\n\nProsedur:\n1. Ambil formulir di kantor desa\n2. Isi formulir dan lampirkan persyaratan\n3. Serahkan ke petugas\n4. Tunggu proses verifikasi\n5. Ambil surat sesuai jadwal\n\nBiaya: Gratis\nWaktu Pelayanan: 1 hari kerja',
          isActive: true,
          order: 3,
          parentId: '1'
        },
      ];
      
      // Sub menu untuk Perizinan
      const perizinanSubMenus = [
        {
          menuId: '2.1',
          name: 'Surat Izin Usaha Mikro dan Kecil',
          description: 'Surat izin untuk mendirikan usaha mikro dan kecil di wilayah desa',
          content: 'Untuk pembuatan Surat Izin Usaha Mikro dan Kecil, silahkan siapkan dokumen berikut:\n- Fotokopi KTP\n- Fotokopi KK\n- Surat Pengantar RT/RW\n- Foto lokasi usaha\n- Deskripsi usaha\n\nProsedur:\n1. Ambil formulir di kantor desa\n2. Isi formulir dan lampirkan persyaratan\n3. Serahkan ke petugas\n4. Tunggu proses verifikasi\n5. Ambil surat sesuai jadwal\n\nBiaya: Gratis\nWaktu Pelayanan: 3 hari kerja',
          isActive: true,
          order: 1,
          parentId: '2'
        },
        {
          menuId: '2.2',
          name: 'Surat Izin Keramaian',
          description: 'Surat izin untuk mengadakan acara/kegiatan yang melibatkan banyak orang',
          content: 'Untuk pembuatan Surat Izin Keramaian, silahkan siapkan dokumen berikut:\n- Fotokopi KTP penyelenggara\n- Surat Pengantar RT/RW\n- Deskripsi acara\n- Jadwal pelaksanaan\n\nProsedur:\n1. Ambil formulir di kantor desa\n2. Isi formulir dan lampirkan persyaratan\n3. Serahkan ke petugas\n4. Tunggu proses verifikasi\n5. Ambil surat sesuai jadwal\n\nBiaya: Gratis\nWaktu Pelayanan: 3 hari kerja',
          isActive: true,
          order: 2,
          parentId: '2'
        },
      ];
      
      // Gabungkan semua menu
      const allMenus = [...mainMenus, ...adminSubMenus, ...perizinanSubMenus];
      
      // Simpan ke database
      await Menu.insertMany(allMenus);
      
      console.log('Data menu default berhasil diinisialisasi');
    } else {
      console.log('Data menu sudah ada, tidak perlu inisialisasi');
    }
  } catch (error) {
    console.error('Error saat menginisialisasi data menu default:', error);
    throw error;
  }
}

module.exports = { initializeDefaultMenus };