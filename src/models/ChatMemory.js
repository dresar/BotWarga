/**
 * Model untuk menyimpan riwayat chat (sistem memori)
 */

const mongoose = require('mongoose');

const chatMemorySchema = new mongoose.Schema({
  // ID pengguna WhatsApp (nomor telepon)
  userId: {
    type: String,
    required: true,
    index: true
  },
  // Riwayat percakapan
  conversations: [{
    // Pesan dari pengguna
    userMessage: {
      type: String,
      required: true
    },
    // Pesan dari bot
    botResponse: {
      type: String,
      required: true
    },
    // Waktu percakapan
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  // Status menu saat ini
  currentMenu: {
    type: Number,
    default: null
  },
  // Status sub-menu saat ini
  currentSubMenu: {
    type: Number,
    default: null
  },
  // Konteks percakapan saat ini
  context: {
    type: Object,
    default: {}
  },
  // Waktu terakhir interaksi
  lastInteraction: {
    type: Date,
    default: Date.now
  }
});

// Indeks untuk pencarian cepat
chatMemorySchema.index({ userId: 1 });

module.exports = mongoose.model('ChatMemory', chatMemorySchema);