/**
 * Controller untuk API yang mengontrol semua database SQLite
 */

const { connectSQLite } = require('../config/sqlite');
const SQLiteMenu = require('../models/SQLiteMenu');
const SQLiteChat = require('../models/SQLiteChat');
const SQLiteMenuContent = require('../models/SQLiteMenuContent');
const JSONAdmin = require('../models/JSONAdmin');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Fungsi untuk mendapatkan koneksi database
const getConnection = () => {
  try {
    return connectSQLite();
  } catch (error) {
    console.error('Error connecting to SQLite database:', error.message);
    throw error;
  }
};

// Fungsi untuk mendapatkan info database
const getDatabaseInfo = async (req, res) => {
  try {
    const db = getConnection();
    
    // Dapatkan daftar tabel
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    
    // Dapatkan jumlah baris untuk setiap tabel
    const tableInfo = [];
    for (const table of tables) {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      tableInfo.push({
        name: table.name,
        rows: count.count
      });
    }
    
    // Dapatkan info database
    const dbInfo = {
      type: 'SQLite',
      version: db.pragma('user_version'),
      tables: tableInfo
    };
    
    res.json({ success: true, info: dbInfo });
  } catch (error) {
    console.error('Error getting database info:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fungsi untuk mendapatkan semua data dari tabel
const getAllData = async (req, res) => {
  try {
    const { table } = req.params;
    let data = [];
    const db = getConnection();
    const menuModel = new SQLiteMenu(db);
    const chatModel = new SQLiteChat(db);
    const menuContentModel = new SQLiteMenuContent(db);
    const adminModel = new JSONAdmin();
    
    switch (table) {
      case 'menus':
        data = await menuModel.getAllMenus();
        break;
      case 'sub_menus':
        data = await menuModel.getAllSubMenus();
        break;
      case 'menu_contents':
        data = db.prepare('SELECT * FROM menu_contents').all();
        break;
      case 'village_info':
        data = await chatModel.getVillageInfo();
        break;
      case 'chat_memory':
        data = await chatModel.getAllChatMemory();
        break;
      case 'complaints':
        data = await chatModel.getAllComplaints();
        break;

      case 'admins':
        data = await adminModel.getAllAdmins();
        break;
      case 'menu_edit_history':
        data = db.prepare('SELECT * FROM menu_edit_history').all();
        break;
      default:
        return res.status(404).json({ success: false, message: 'Tabel tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error(`Error getting data from ${req.params.table}:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fungsi untuk mendapatkan data berdasarkan ID
const getDataById = async (req, res) => {
  try {
    const { table, id } = req.params;
    let data = null;
    const db = getConnection();
    const menuModel = new SQLiteMenu(db);
    const chatModel = new SQLiteChat(db);
    const menuContentModel = new SQLiteMenuContent(db);
    const adminModel = new JSONAdmin();
    
    switch (table) {
      case 'menus':
        data = await menuModel.getMenuById(id);
        break;
      case 'sub_menus':
        data = await menuModel.getSubMenuById(id);
        break;
      case 'menu_contents':
        data = db.prepare('SELECT * FROM menu_contents WHERE id = ?').get(id);
        break;
      case 'village_info':
        data = await chatModel.getVillageInfoById(id);
        break;
      case 'chat_memory':
        data = await chatModel.getChatMemoryById(id);
        break;
      case 'complaints':
        data = await chatModel.getComplaintById(id);
        break;

      case 'admins':
        data = await adminModel.getAdminById(id);
        break;
      default:
        return res.status(404).json({ success: false, message: 'Tabel tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    if (!data) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    res.json({ success: true, data });
  } catch (error) {
    console.error(`Error getting data from ${req.params.table}:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fungsi untuk menambahkan data
const addData = async (req, res) => {
  try {
    const { table } = req.params;
    const data = req.body;
    let result = null;
    const db = getConnection();
    const menuModel = new SQLiteMenu(db);
    const chatModel = new SQLiteChat(db);
    const menuContentModel = new SQLiteMenuContent(db);
    const adminModel = new JSONAdmin();
    
    switch (table) {
      case 'menus':
        result = await menuModel.addMenu(data);
        break;
      case 'sub_menus':
        result = await menuModel.addSubMenu(data);
        break;
      case 'menu_contents':
        result = await menuContentModel.addMenuContent(data);
        break;
      case 'village_info':
        result = await chatModel.addVillageInfo(data);
        break;
      case 'chat_memory':
        result = await chatModel.addChatMemory(data);
        break;
      case 'complaints':
        result = await chatModel.addComplaint(data);
        break;

      case 'admins':
        result = await adminModel.addAdmin(data);
        break;
      default:
        return res.status(404).json({ success: false, message: 'Tabel tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    res.json({ success: true, message: 'Data berhasil ditambahkan', data: result });
  } catch (error) {
    console.error(`Error adding data to ${req.params.table}:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fungsi untuk memperbarui data
const updateData = async (req, res) => {
  try {
    const { table, id } = req.params;
    const data = req.body;
    let result = null;
    const db = getConnection();
    const menuModel = new SQLiteMenu(db);
    const chatModel = new SQLiteChat(db);
    const menuContentModel = new SQLiteMenuContent(db);
    const adminModel = new JSONAdmin();
    
    switch (table) {
      case 'menus':
        result = await menuModel.updateMenu(id, data);
        break;
      case 'sub_menus':
        result = await menuModel.updateSubMenu(id, data);
        break;
      case 'menu_contents':
        result = await menuContentModel.updateMenuContent(id, data);
        break;
      case 'village_info':
        result = await chatModel.updateVillageInfo(id, data);
        break;
      case 'chat_memory':
        result = await chatModel.updateChatMemory(id, data);
        break;
      case 'complaints':
        result = await chatModel.updateComplaint(id, data);
        break;

      case 'admins':
        result = await adminModel.updateAdmin(id, data);
        break;
      default:
        return res.status(404).json({ success: false, message: 'Tabel tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    res.json({ success: true, message: 'Data berhasil diperbarui', data: result });
  } catch (error) {
    console.error(`Error updating data in ${req.params.table}:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fungsi untuk menghapus data
const deleteData = async (req, res) => {
  try {
    const { table, id } = req.params;
    let result = null;
    const db = getConnection();
    const menuModel = new SQLiteMenu(db);
    const chatModel = new SQLiteChat(db);
    const menuContentModel = new SQLiteMenuContent(db);
    const adminModel = new JSONAdmin();
    
    switch (table) {
      case 'menus':
        result = await menuModel.deleteMenu(id);
        break;
      case 'sub_menus':
        result = await menuModel.deleteSubMenu(id);
        break;
      case 'menu_contents':
        result = await menuContentModel.deleteMenuContent(id);
        break;
      case 'village_info':
        result = await chatModel.deleteVillageInfo(id);
        break;
      case 'chat_memory':
        result = await chatModel.deleteChatMemory(id);
        break;
      case 'complaints':
        result = await chatModel.deleteComplaint(id);
        break;

      case 'admins':
        result = await adminModel.deleteAdmin(id);
        break;
      default:
        return res.status(404).json({ success: false, message: 'Tabel tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Data tidak ditemukan - Dibuat oleh Mahasiswa UMSU' });
    }
    
    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (error) {
    console.error(`Error deleting data from ${req.params.table}:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fungsi untuk upload file
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah - Dibuat oleh Mahasiswa UMSU' });
    }
    
    const filePath = req.file.path.replace(/\\/g, '/');
    const fileUrl = `/${filePath}`;
    
    res.json({ success: true, message: 'File berhasil diunggah', file: { path: filePath, url: fileUrl } });
  } catch (error) {
    console.error('Error uploading file:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDatabaseInfo,
  getAllData,
  getDataById,
  addData,
  updateData,
  deleteData,
  uploadFile
};