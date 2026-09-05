/**
 * Routes untuk API yang mengontrol semua database SQLite
 */

const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiSQLiteController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { table } = req.params;
    const uploadDir = path.join(process.cwd(), 'uploads', table);
    
    // Pastikan direktori ada
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = new Date().getTime();
    const originalExt = path.extname(file.originalname);
    cb(null, `${timestamp}_${Math.floor(Math.random() * 1000)}${originalExt}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit 5MB
  fileFilter: function (req, file, cb) {
    // Hanya izinkan gambar
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Hanya file gambar yang diizinkan'), false);
    }
    cb(null, true);
  }
});

// Endpoint untuk mendapatkan info database
router.get('/info', apiController.getDatabaseInfo);

// Endpoint untuk mendapatkan semua data dari tabel
router.get('/:table', apiController.getAllData);

// Endpoint untuk mendapatkan data berdasarkan ID
router.get('/:table/:id', apiController.getDataById);

// Endpoint untuk menambahkan data baru
router.post('/:table', apiController.addData);

// Endpoint untuk mengupdate data
router.put('/:table/:id', apiController.updateData);

// Endpoint untuk menghapus data
router.delete('/:table/:id', apiController.deleteData);

// Endpoint untuk upload gambar
router.post('/upload/:table', upload.single('image'), apiController.uploadFile);

module.exports = router;