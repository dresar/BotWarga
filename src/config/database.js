/**
 * Konfigurasi database untuk MongoDB dan SQLite
 */

const mongoose = require('mongoose');
const { connectSQLite } = require('./sqlite');

// Konfigurasi MongoDB
const connectMongoDB = async () => {
  try {
    // Gunakan URI MongoDB dari environment variable atau default ke localhost
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/botdesapulosarok';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    return false;
  }
};



// Konfigurasi SQLite
const connectDB = async () => {
  try {
    return connectSQLite();
  } catch (error) {
    console.error('SQLite connection error:', error.message);
    throw error;
  }
};

module.exports = {
  connectMongoDB,
  connectDB,
  connectSQLite
};