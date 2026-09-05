const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Konfigurasi database
const dbConfig = {
    mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/botwa',
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
};

// Koneksi ke MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(dbConfig.mongoURI, dbConfig.options);
        console.log('MongoDB Connected...');
        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message);
        // Keluar dari proses dengan kegagalan
        process.exit(1);
    }
};

// Inisialisasi koneksi database
let dbInstance = null;

// Mendapatkan instance database yang sudah terkoneksi
const getDBInstance = async () => {
    if (!dbInstance) {
        dbInstance = await connectDB();
    }
    return dbInstance;
};

module.exports = {
    connectDB,
    getDBInstance,
    mongoose
};