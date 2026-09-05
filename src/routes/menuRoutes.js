/**
 * Routes untuk manajemen menu
 */

const express = require('express');
const router = express.Router();
const { connectSQLite } = require('../config/sqlite');
const SQLiteMenu = require('../models/SQLiteMenu');
const menuImportController = require('../controllers/menuImportController');

// Middleware untuk koneksi database
const withConnection = async (req, res, next) => {
  try {
    req.db = connectSQLite();
    req.menuModel = new SQLiteMenu(req.db);
    next();
  } catch (error) {
    console.error('Error connecting to database:', error.message);
    res.status(500).json({ success: false, message: 'Database connection error' });
  }
};

// Middleware untuk menutup koneksi database
const closeConnection = async (req, res, next) => {
  // SQLite tidak memerlukan penutupan koneksi secara eksplisit
  next();
};

// Mendapatkan semua menu
router.get('/menus', withConnection, async (req, res) => {
  try {
    const menus = await req.menuModel.getAllMenus();
    res.json({ success: true, data: menus });
  } catch (error) {
    console.error('Error getting menus:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Mendapatkan menu berdasarkan ID
router.get('/menus/:id', withConnection, async (req, res) => {
  try {
    const menu = await req.menuModel.getMenuById(req.params.id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }
    res.json({ success: true, data: menu });
  } catch (error) {
    console.error('Error getting menu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Mendapatkan sub-menu berdasarkan menu ID
router.get('/menus/:id/submenus', withConnection, async (req, res) => {
  try {
    const subMenus = await req.menuModel.getSubMenusByMenuId(req.params.id);
    res.json({ success: true, data: subMenus });
  } catch (error) {
    console.error('Error getting submenus:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Mendapatkan sub-menu berdasarkan ID
router.get('/submenus/:id', withConnection, async (req, res) => {
  try {
    const subMenu = await req.menuModel.getSubMenuById(req.params.id);
    if (!subMenu) {
      return res.status(404).json({ success: false, message: 'SubMenu not found' });
    }
    res.json({ success: true, data: subMenu });
  } catch (error) {
    console.error('Error getting submenu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Menambahkan menu baru
router.post('/menus', withConnection, async (req, res) => {
  try {
    const { name, description, order_num, access_level } = req.body;
    
    if (!name || !order_num) {
      return res.status(400).json({ success: false, message: 'Name and order_num are required' });
    }
    
    const newMenu = await req.menuModel.addMenu({
      name,
      description: description || `Layanan ${name}`,
      order_num: parseInt(order_num),
      access_level: access_level || 'public'
    });
    
    res.status(201).json({ success: true, message: 'Menu added successfully', data: newMenu });
  } catch (error) {
    console.error('Error adding menu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Menambahkan sub-menu baru
router.post('/menus/:id/submenus', withConnection, async (req, res) => {
  try {
    const { name, description, order_num } = req.body;
    const menu_id = req.params.id;
    
    if (!name || !order_num) {
      return res.status(400).json({ success: false, message: 'Name and order_num are required' });
    }
    
    // Cek apakah menu utama ada
    const menu = await req.menuModel.getMenuById(menu_id);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }
    
    const newSubMenu = await req.menuModel.addSubMenu({
      menu_id,
      name,
      description: description || '',
      order_num: parseInt(order_num)
    });
    
    res.status(201).json({ success: true, message: 'SubMenu added successfully', data: newSubMenu });
  } catch (error) {
    console.error('Error adding submenu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Mengupdate menu
router.put('/menus/:id', withConnection, async (req, res) => {
  try {
    const { name, description, order_num, access_level, is_active } = req.body;
    const menuId = req.params.id;
    
    // Cek apakah menu ada
    const menu = await req.menuModel.getMenuById(menuId);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (order_num) updateData.order_num = parseInt(order_num);
    if (access_level) updateData.access_level = access_level;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;
    
    await req.menuModel.updateMenu(menuId, updateData);
    
    res.json({ success: true, message: 'Menu updated successfully' });
  } catch (error) {
    console.error('Error updating menu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Mengupdate sub-menu
router.put('/submenus/:id', withConnection, async (req, res) => {
  try {
    const { name, description, order_num, is_active } = req.body;
    const subMenuId = req.params.id;
    
    // Cek apakah sub-menu ada
    const subMenu = await req.menuModel.getSubMenuById(subMenuId);
    if (!subMenu) {
      return res.status(404).json({ success: false, message: 'SubMenu not found' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (order_num) updateData.order_num = parseInt(order_num);
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;
    
    await req.menuModel.updateSubMenu(subMenuId, updateData);
    
    res.json({ success: true, message: 'SubMenu updated successfully' });
  } catch (error) {
    console.error('Error updating submenu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Menghapus menu
router.delete('/menus/:id', withConnection, async (req, res) => {
  try {
    const menuId = req.params.id;
    
    // Cek apakah menu ada
    const menu = await req.menuModel.getMenuById(menuId);
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }
    
    await req.menuModel.deleteMenu(menuId);
    
    res.json({ success: true, message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Menghapus sub-menu
router.delete('/submenus/:id', withConnection, async (req, res) => {
  try {
    const subMenuId = req.params.id;
    
    // Cek apakah sub-menu ada
    const subMenu = await req.menuModel.getSubMenuById(subMenuId);
    if (!subMenu) {
      return res.status(404).json({ success: false, message: 'SubMenu not found' });
    }
    
    await req.menuModel.deleteSubMenu(subMenuId);
    
    res.json({ success: true, message: 'SubMenu deleted successfully' });
  } catch (error) {
    console.error('Error deleting submenu:', error.message);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    await req.connection.end();
  }
});

// Mengimpor menu dari struktur folder ke database
router.post('/menus/import', async (req, res) => {
  try {
    const result = await menuImportController.importMenusFromFolders();
    res.json(result);
  } catch (error) {
    console.error('Error importing menus:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Menghapus data menu duplikat
router.post('/menus/remove-duplicates', async (req, res) => {
  try {
    const result = await menuImportController.removeDuplicateMenus();
    res.json(result);
  } catch (error) {
    console.error('Error removing duplicate menus:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;