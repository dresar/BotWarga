/**
 * Template generator untuk konten menu dalam format yang formal dan terstruktur
 */

/**
 * Membuat template konten menu dalam format teks formal
 * @param {string} title - Judul layanan
 * @param {Object} options - Opsi tambahan untuk konten
 * @returns {string} - Konten teks terformat
 */
const createMenuContentTemplate = (title, options = {}) => {
  const {
    description = 'Deskripsi layanan ini akan ditampilkan di sini.',
    requirements = [
      'KTP asli dan fotokopi',
      'Kartu Keluarga asli dan fotokopi',
      'Surat pengantar dari RT/RW',
      'Formulir permohonan yang telah diisi',
      'Bukti pembayaran pajak/retribusi (jika diperlukan)'
    ],
    procedures = [
      'Mengajukan permohonan ke kantor desa/kelurahan',
      'Melengkapi berkas persyaratan',
      'Verifikasi berkas oleh petugas',
      'Pembayaran biaya administrasi (jika ada)',
      'Proses pembuatan dokumen',
      'Pengambilan dokumen sesuai jadwal yang ditentukan'
    ],
    processingTime = '3-5 hari kerja',
    fees = 'Sesuai dengan ketentuan yang berlaku',
    legalBasis = [
      'Undang-Undang Nomor 24 Tahun 2013 tentang Administrasi Kependudukan',
      'Peraturan Daerah Nomor XX Tahun 20XX'
    ],
    contact = {
      person: 'Petugas Pelayanan',
      phone: '08123456789',
      email: 'pelayanan@desa.id',
      hours: 'Senin-Jumat, 08.00-15.00 WIB'
    },
    notes = 'Harap membawa dokumen asli untuk keperluan verifikasi.'
  } = options;

  let content = `# ${title}\n\n`;

  // Deskripsi
  content += `## Deskripsi\n\n${description}\n\n`;

  // Persyaratan
  content += '## Persyaratan\n\n';
  requirements.forEach((req, index) => {
    content += `${index + 1}. ${req}\n`;
  });
  content += '\n';

  // Prosedur
  content += '## Prosedur\n\n';
  procedures.forEach((proc, index) => {
    content += `${index + 1}. ${proc}\n`;
  });
  content += '\n';

  // Waktu Pemrosesan
  content += `## Waktu Pemrosesan\n\n${processingTime}\n\n`;

  // Biaya
  content += `## Biaya\n\n${fees}\n\n`;

  // Dasar Hukum
  content += '## Dasar Hukum\n\n';
  legalBasis.forEach((law, index) => {
    content += `${index + 1}. ${law}\n`;
  });
  content += '\n';

  // Kontak
  content += '## Kontak\n\n';
  content += `Nama: ${contact.person}\n`;
  content += `Telepon: ${contact.phone}\n`;
  content += `Email: ${contact.email}\n`;
  content += `Jam Layanan: ${contact.hours}\n\n`;

  // Catatan
  content += `## Catatan\n\n${notes}`;

  return content;
};

/**
 * Membuat template konten menu untuk berbagai jenis layanan
 */
const templates = {
  // Template untuk layanan Administrasi Kependudukan
  kependudukan: {
    ktp: createMenuContentTemplate('Pembuatan KTP', {
      description: 'Layanan pembuatan Kartu Tanda Penduduk (KTP) bagi warga yang telah berusia 17 tahun atau lebih.',
      requirements: [
        'Surat pengantar dari RT/RW',
        'Kartu Keluarga asli dan fotokopi',
        'Akta kelahiran asli dan fotokopi',
        'Pas foto berwarna ukuran 3x4 sebanyak 2 lembar',
        'Surat keterangan pindah dari daerah asal (untuk pendatang baru)'
      ],
      processingTime: '7-14 hari kerja',
      fees: 'Gratis untuk pembuatan pertama kali, Rp50.000 untuk penggantian karena hilang/rusak',
      contact: {
        person: 'Petugas Dukcapil',
        phone: '08123456789',
        email: 'dukcapil@desa.id',
        hours: 'Senin-Jumat, 08.00-15.00 WIB'
      }
    }),
    kk: createMenuContentTemplate('Pembuatan Kartu Keluarga', {
      description: 'Layanan pembuatan Kartu Keluarga (KK) baru atau perubahan data pada Kartu Keluarga yang sudah ada.',
      requirements: [
        'Surat pengantar dari RT/RW',
        'KTP asli dan fotokopi semua anggota keluarga',
        'Akta kelahiran asli dan fotokopi semua anggota keluarga',
        'Akta perkawinan/perceraian (jika ada)',
        'Surat keterangan pindah dari daerah asal (untuk pendatang baru)'
      ],
      processingTime: '7-14 hari kerja',
      fees: 'Gratis untuk pembuatan pertama kali, Rp100.000 untuk penggantian karena hilang/rusak',
      legalBasis: [
        'Undang-Undang Nomor 24 Tahun 2013 tentang Administrasi Kependudukan',
        'Peraturan Menteri Dalam Negeri Nomor 108 Tahun 2019 tentang Peraturan Pelaksanaan PP Nomor 40 Tahun 2019'
      ]
    }),
    aktaKelahiran: createMenuContentTemplate('Pembuatan Akta Kelahiran', {
      description: 'Layanan pembuatan Akta Kelahiran untuk mencatatkan kelahiran anak secara resmi.',
      requirements: [
        'Surat keterangan lahir dari dokter/bidan/rumah sakit',
        'KTP orang tua',
        'Kartu Keluarga orang tua',
        'Akta nikah/perkawinan orang tua',
        'Surat pernyataan saksi kelahiran'
      ],
      processingTime: '14 hari kerja',
      fees: 'Gratis untuk pendaftaran dalam waktu 60 hari sejak kelahiran',
      notes: 'Pendaftaran melebihi 60 hari sejak kelahiran akan dikenakan denda administratif.'
    })
  },
  
  // Template untuk layanan Perizinan
  perizinan: {
    izinUsaha: createMenuContentTemplate('Izin Usaha Mikro dan Kecil', {
      description: 'Layanan penerbitan Izin Usaha Mikro dan Kecil (IUMK) untuk usaha skala mikro dan kecil.',
      requirements: [
        'KTP pemilik usaha',
        'Kartu Keluarga pemilik usaha',
        'Pas foto berwarna ukuran 4x6 sebanyak 2 lembar',
        'Surat pengantar dari RT/RW',
        'Surat pernyataan kesanggupan mematuhi peraturan',
        'Bukti kepemilikan/sewa tempat usaha',
        'Foto lokasi usaha'
      ],
      processingTime: '3-5 hari kerja',
      fees: 'Rp100.000 - Rp250.000 (tergantung jenis usaha)',
      legalBasis: [
        'Peraturan Presiden Nomor 98 Tahun 2014 tentang Perizinan Usaha Mikro dan Kecil',
        'Peraturan Menteri Dalam Negeri Nomor 83 Tahun 2014 tentang Pedoman Pemberian IUMK'
      ]
    }),
    izinBangunan: createMenuContentTemplate('Izin Mendirikan Bangunan', {
      description: 'Layanan penerbitan Izin Mendirikan Bangunan (IMB) untuk konstruksi bangunan baru atau renovasi.',
      requirements: [
        'KTP pemohon',
        'Bukti kepemilikan tanah (sertifikat/letter C/girik)',
        'Bukti pembayaran PBB tahun terakhir',
        'Gambar rencana bangunan (minimal 3 rangkap)',
        'Surat pernyataan tidak keberatan dari tetangga',
        'Surat kuasa (jika diwakilkan)'
      ],
      processingTime: '14-30 hari kerja',
      fees: 'Berdasarkan luas bangunan dan koefisien wilayah',
      notes: 'Bangunan dengan luas lebih dari 100m² memerlukan rekomendasi dari Dinas Tata Ruang.'
    })
  },
  
  // Template untuk layanan Pertanahan
  pertanahan: {
    sertifikatTanah: createMenuContentTemplate('Pengurusan Sertifikat Tanah', {
      description: 'Layanan pengurusan sertifikat tanah untuk menjamin kepastian hukum atas kepemilikan tanah.',
      requirements: [
        'KTP pemohon',
        'Bukti kepemilikan tanah (letter C/girik/akta jual beli)',
        'Bukti pembayaran PBB 5 tahun terakhir',
        'Surat pernyataan tidak sengketa',
        'Surat keterangan dari desa/kelurahan',
        'Peta bidang tanah'
      ],
      processingTime: '3-6 bulan',
      fees: 'Rp500.000 - Rp2.000.000 (tergantung luas tanah)',
      legalBasis: [
        'Undang-Undang Nomor 5 Tahun 1960 tentang Peraturan Dasar Pokok-Pokok Agraria',
        'Peraturan Pemerintah Nomor 24 Tahun 1997 tentang Pendaftaran Tanah'
      ],
      notes: 'Proses dapat lebih cepat melalui program PTSL (Pendaftaran Tanah Sistematis Lengkap) jika tersedia di wilayah Anda.'
    })
  }
};

/**
 * Membuat konten menu dummy berdasarkan kategori dan jenis layanan
 * @param {string} category - Kategori layanan (kependudukan, perizinan, pertanahan, dll)
 * @param {string} service - Jenis layanan dalam kategori
 * @returns {string} - Konten teks terformat
 */
const createDummyContent = (category, service) => {
  if (templates[category] && templates[category][service]) {
    return templates[category][service];
  }
  
  // Jika template spesifik tidak ditemukan, gunakan template default
  return createMenuContentTemplate(`Layanan ${service}`);
};

module.exports = {
  createMenuContentTemplate,
  createDummyContent,
  templates
};