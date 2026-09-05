/**
 * Model untuk menyimpan percakapan WhatsApp
 */

const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // ID pengguna WhatsApp (nomor telepon)
  sender: {
    type: String,
    required: true,
    index: true
  },
  // Pesan yang dikirim
  message: {
    type: String,
    required: true
  },
  // Tipe pesan (text, image, video, dll)
  messageType: {
    type: String,
    default: 'text'
  },
  // Waktu pesan dikirim
  timestamp: {
    type: Date,
    default: Date.now
  },
  // Status percakapan (aktif/tidak)
  isActive: {
    type: Boolean,
    default: true
  },
  // Konteks percakapan (untuk sistem memori)
  context: {
    type: Object,
    default: {}
  }
});

// Indeks untuk pencarian cepat
chatSchema.index({ sender: 1, timestamp: -1 });

module.exports = mongoose.model('Chat', chatSchema);