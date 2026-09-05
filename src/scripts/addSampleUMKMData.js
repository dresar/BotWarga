const path = require('path');
const { initSQLiteDatabase } = require('../database/initSQLiteDb');
const SQLiteUMKM = require('../models/SQLiteUMKM');

/**
 * Script untuk menambahkan data sample UMKM ke database
 */
async function addSampleUMKMData() {
    try {
        console.log('Menginisialisasi database...');
        const db = await initSQLiteDatabase();
        const umkmModel = new SQLiteUMKM(db);

        console.log('Menambahkan data sample UMKM...');

        const sampleData = [
            {
                nama: "Warung Makan Bu Sari",
                deskripsi: "Warung makan tradisional dengan menu masakan Jawa yang lezat dan harga terjangkau. Menyediakan nasi gudeg, soto ayam, dan berbagai lauk pauk.",
                kategori: "kuliner",
                alamat: "Jl. Raya Pulosarok No. 15, RT 02/RW 01",
                kontak_telepon: "081234567890",
                kontak_whatsapp: "6281234567890",
                kontak_email: "warungbusari@gmail.com",
                jam_operasional: "06:00 - 21:00 WIB",
                website: "",
                media_sosial: "@warungbusari_pulosarok",
                latitude: -7.7956,
                longitude: 110.3695,
                foto_path: "",
                status: "aktif",
                is_active: 1
            },
            {
                nama: "Toko Kelontong Pak Budi",
                deskripsi: "Toko kelontong lengkap menyediakan kebutuhan sehari-hari, sembako, dan perlengkapan rumah tangga dengan harga bersaing.",
                kategori: "retail",
                alamat: "Jl. Mawar No. 8, RT 01/RW 02",
                kontak_telepon: "081987654321",
                kontak_whatsapp: "6281987654321",
                kontak_email: "tokopakbudi@yahoo.com",
                jam_operasional: "05:30 - 22:00 WIB",
                website: "",
                media_sosial: "@toko_pakbudi",
                latitude: -7.7960,
                longitude: 110.3700,
                foto_path: "",
                status: "aktif",
                is_active: 1
            },
            {
                nama: "Bengkel Motor Jaya",
                deskripsi: "Bengkel motor profesional dengan teknisi berpengalaman. Melayani service rutin, perbaikan mesin, dan ganti spare part.",
                kategori: "jasa",
                alamat: "Jl. Melati No. 22, RT 03/RW 01",
                kontak_telepon: "082345678901",
                kontak_whatsapp: "6282345678901",
                kontak_email: "bengkeljaya@gmail.com",
                jam_operasional: "08:00 - 17:00 WIB (Senin-Sabtu)",
                website: "",
                media_sosial: "@bengkel_jaya_pulosarok",
                latitude: -7.7965,
                longitude: 110.3690,
                foto_path: "",
                status: "aktif",
                is_active: 1
            },
            {
                nama: "Salon Cantik Indah",
                deskripsi: "Salon kecantikan untuk wanita dengan layanan potong rambut, creambath, facial, dan perawatan kuku. Harga terjangkau dengan hasil memuaskan.",
                kategori: "jasa",
                alamat: "Jl. Anggrek No. 5, RT 02/RW 03",
                kontak_telepon: "083456789012",
                kontak_whatsapp: "6283456789012",
                kontak_email: "salonindah@gmail.com",
                jam_operasional: "09:00 - 18:00 WIB (Selasa-Minggu)",
                website: "",
                media_sosial: "@salon_cantik_indah",
                latitude: -7.7970,
                longitude: 110.3685,
                foto_path: "",
                status: "aktif",
                is_active: 1
            },
            {
                nama: "Tani Organik Pulosarok",
                deskripsi: "Usaha pertanian organik yang menyediakan sayuran segar tanpa pestisida. Melayani pemesanan sayuran untuk kebutuhan rumah tangga dan warung.",
                kategori: "pertanian",
                alamat: "Jl. Sawah Indah No. 12, RT 04/RW 02",
                kontak_telepon: "084567890123",
                kontak_whatsapp: "6284567890123",
                kontak_email: "taniorganik@gmail.com",
                jam_operasional: "05:00 - 17:00 WIB",
                website: "",
                media_sosial: "@tani_organik_pulosarok",
                latitude: -7.7975,
                longitude: 110.3680,
                foto_path: "",
                status: "aktif",
                is_active: 1
            },
            {
                nama: "Konveksi Busana Elegan",
                deskripsi: "Jasa konveksi dan jahit pakaian custom. Menerima pesanan seragam, baju pesta, dan pakaian casual dengan kualitas terbaik.",
                kategori: "fashion",
                alamat: "Jl. Dahlia No. 18, RT 01/RW 03",
                kontak_telepon: "085678901234",
                kontak_whatsapp: "6285678901234",
                kontak_email: "konveksielegan@gmail.com",
                jam_operasional: "08:00 - 16:00 WIB (Senin-Sabtu)",
                website: "",
                media_sosial: "@konveksi_busana_elegan",
                latitude: -7.7980,
                longitude: 110.3675,
                foto_path: "",
                status: "aktif",
                is_active: 1
            },
            {
                nama: "Kafe Kopi Nusantara",
                deskripsi: "Kafe dengan konsep tradisional modern, menyajikan kopi lokal berkualitas dan berbagai camilan. Tempat yang nyaman untuk berkumpul dan bekerja.",
                kategori: "kuliner",
                alamat: "Jl. Kenanga No. 7, RT 03/RW 02",
                kontak_telepon: "086789012345",
                kontak_whatsapp: "6286789012345",
                kontak_email: "kafekopinusantara@gmail.com",
                jam_operasional: "07:00 - 23:00 WIB",
                website: "www.kafekopinusantara.com",
                media_sosial: "@kafe_kopi_nusantara",
                latitude: -7.7985,
                longitude: 110.3670,
                foto_path: "",
                status: "aktif",
                is_active: 1
            },
            {
                nama: "Laundry Express 24 Jam",
                deskripsi: "Layanan laundry kiloan dan satuan dengan sistem express. Buka 24 jam untuk kemudahan pelanggan dengan kualitas pencucian terbaik.",
                kategori: "jasa",
                alamat: "Jl. Flamboyan No. 25, RT 04/RW 01",
                kontak_telepon: "087890123456",
                kontak_whatsapp: "6287890123456",
                kontak_email: "laundryexpress24@gmail.com",
                jam_operasional: "24 Jam",
                website: "",
                media_sosial: "@laundry_express_24jam",
                latitude: -7.7990,
                longitude: 110.3665,
                foto_path: "",
                status: "aktif",
                is_active: 1
            }
        ];

        for (const umkmData of sampleData) {
            try {
                const result = umkmModel.addUMKM(umkmData);
                console.log(`✅ UMKM "${umkmData.nama}" berhasil ditambahkan dengan ID: ${result.id}`);
            } catch (error) {
                console.error(`❌ Gagal menambahkan UMKM "${umkmData.nama}":`, error.message);
            }
        }

        console.log('\n📊 Ringkasan data UMKM yang ditambahkan:');
        const allUMKM = umkmModel.getAllUMKM();
        const categories = {};
        
        allUMKM.forEach(umkm => {
            categories[umkm.kategori] = (categories[umkm.kategori] || 0) + 1;
        });

        console.log(`Total UMKM: ${allUMKM.length}`);
        console.log('Kategori:');
        Object.entries(categories).forEach(([kategori, jumlah]) => {
            console.log(`  - ${kategori}: ${jumlah} UMKM`);
        });

        console.log('\n✅ Proses selesai!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Jalankan script jika dipanggil langsung
if (require.main === module) {
    addSampleUMKMData();
}

module.exports = addSampleUMKMData;