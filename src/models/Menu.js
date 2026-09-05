/**
 * Model untuk menyimpan menu dan sub-menu
 */

const mongoose = require('mongoose');

// Schema untuk sub-menu
const subMenuSchema = new mongoose.Schema({
  // ID sub-menu (1, 2, 3, ...)
  id: {
    type: Number,
    required: true
  },
  // Nama sub-menu
  name: {
    type: String,
    required: true
  },
  // Deskripsi sub-menu
  description: {
    type: String,
    default: ''
  },
  // Konten yang akan ditampilkan ketika sub-menu dipilih
  content: {
    type: String,
    required: true
  },
  // Apakah sub-menu aktif
  isActive: {
    type: Boolean,
    default: true
  }
});

// Schema untuk menu utama
const menuSchema = new mongoose.Schema({
  // ID menu (1-10)
  id: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 10
  },
  // Nama menu
  name: {
    type: String,
    required: true
  },
  // Deskripsi menu
  description: {
    type: String,
    default: ''
  },
  // Sub-menu yang terkait dengan menu ini
  subMenus: [subMenuSchema],
  // Apakah menu aktif
  isActive: {
    type: Boolean,
    default: true
  },
  // Urutan tampilan menu
  order: {
    type: Number,
    default: 0
  }
});

// Indeks untuk pencarian cepat
menuSchema.index({ id: 1 });

module.exports = mongoose.model('Menu', menuSchema);