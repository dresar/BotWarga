/**
 * Routes untuk manajemen Menu dan Sub-Menu
 * CRUD operations untuk menu dan sub-menu
 */

const express = require('express');
const router = express.Router();
const { connectSQLite } = require('../config/sqlite');

// Get all menus with sub-menus
router.get('/', (req, res) => {
  try {
    const db = connectSQLite();
    
    // Get all menus
    const menus = db.prepare(`
      SELECT * FROM menus 
      WHERE is_active = 1 
      ORDER BY order_num ASC
    `).all();
    
    // Get sub-menus for each menu
    const menusWithSubMenus = menus.map(menu => {
      const subMenus = db.prepare(`
        SELECT * FROM sub_menus 
        WHERE menu_id = ? AND is_active = 1 
        ORDER BY order_num ASC
      `).all(menu.id);
      
      return {
        ...menu,
        sub_menus: subMenus
      };
    });
    
    res.json({
      success: true,
      data: menusWithSubMenus
    });
  } catch (error) {
    console.error('Error fetching menus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menus',
      error: error.message
    });
  }
});

// Get single menu by ID
router.get('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const menuId = req.params.id;
    
    const menu = db.prepare(`
      SELECT * FROM menus WHERE id = ? AND is_active = 1
    `).get(menuId);
    
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    const subMenus = db.prepare(`
      SELECT * FROM sub_menus 
      WHERE menu_id = ? AND is_active = 1 
      ORDER BY order_num ASC
    `).all(menuId);
    
    res.json({
      success: true,
      data: {
        ...menu,
        sub_menus: subMenus
      }
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu',
      error: error.message
    });
  }
});

// Create new menu
router.post('/', (req, res) => {
  try {
    const db = connectSQLite();
    const { name, description, order_num, access_level } = req.body;
    
    if (!name || !order_num) {
      return res.status(400).json({
        success: false,
        message: 'Name and order_num are required'
      });
    }
    
    const result = db.prepare(`
      INSERT INTO menus (name, description, order_num, access_level)
      VALUES (?, ?, ?, ?)
    `).run(name, description || null, order_num, access_level || 'public');
    
    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      data: {
        id: result.lastInsertRowid,
        name,
        description,
        order_num,
        access_level: access_level || 'public'
      }
    });
  } catch (error) {
    console.error('Error creating menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create menu',
      error: error.message
    });
  }
});

// Update menu
router.put('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const menuId = req.params.id;
    const { name, description, order_num, access_level, is_active } = req.body;
    
    const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    const result = db.prepare(`
      UPDATE menus 
      SET name = ?, description = ?, order_num = ?, access_level = ?, is_active = ?
      WHERE id = ?
    `).run(
      name || menu.name,
      description !== undefined ? description : menu.description,
      order_num || menu.order_num,
      access_level || menu.access_level,
      is_active !== undefined ? is_active : menu.is_active,
      menuId
    );
    
    res.json({
      success: true,
      message: 'Menu updated successfully',
      data: { id: menuId, changes: result.changes }
    });
  } catch (error) {
    console.error('Error updating menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu',
      error: error.message
    });
  }
});

// Delete menu (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const menuId = req.params.id;
    
    const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    // Soft delete menu and its sub-menus
    db.prepare('UPDATE menus SET is_active = 0 WHERE id = ?').run(menuId);
    db.prepare('UPDATE sub_menus SET is_active = 0 WHERE menu_id = ?').run(menuId);
    
    res.json({
      success: true,
      message: 'Menu deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu',
      error: error.message
    });
  }
});

// Get sub-menus for a specific menu
router.get('/:menuId/sub-menus', (req, res) => {
  try {
    const db = connectSQLite();
    const menuId = req.params.menuId;
    
    const subMenus = db.prepare(`
      SELECT * FROM sub_menus 
      WHERE menu_id = ? AND is_active = 1 
      ORDER BY order_num ASC
    `).all(menuId);
    
    res.json({
      success: true,
      data: subMenus
    });
  } catch (error) {
    console.error('Error fetching sub-menus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-menus',
      error: error.message
    });
  }
});

// Create new sub-menu
router.post('/:menuId/sub-menus', (req, res) => {
  try {
    const db = connectSQLite();
    const menuId = req.params.menuId;
    const { name, description, order_num } = req.body;
    
    if (!name || !order_num) {
      return res.status(400).json({
        success: false,
        message: 'Name and order_num are required'
      });
    }
    
    // Check if menu exists
    const menu = db.prepare('SELECT * FROM menus WHERE id = ? AND is_active = 1').get(menuId);
    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }
    
    const result = db.prepare(`
      INSERT INTO sub_menus (menu_id, name, description, order_num)
      VALUES (?, ?, ?, ?)
    `).run(menuId, name, description || null, order_num);
    
    res.status(201).json({
      success: true,
      message: 'Sub-menu created successfully',
      data: {
        id: result.lastInsertRowid,
        menu_id: menuId,
        name,
        description,
        order_num
      }
    });
  } catch (error) {
    console.error('Error creating sub-menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sub-menu',
      error: error.message
    });
  }
});

// Update sub-menu
router.put('/:menuId/sub-menus/:subMenuId', (req, res) => {
  try {
    const db = connectSQLite();
    const { menuId, subMenuId } = req.params;
    const { name, description, order_num, is_active } = req.body;
    
    const subMenu = db.prepare(`
      SELECT * FROM sub_menus 
      WHERE id = ? AND menu_id = ?
    `).get(subMenuId, menuId);
    
    if (!subMenu) {
      return res.status(404).json({
        success: false,
        message: 'Sub-menu not found'
      });
    }
    
    const result = db.prepare(`
      UPDATE sub_menus 
      SET name = ?, description = ?, order_num = ?, is_active = ?
      WHERE id = ? AND menu_id = ?
    `).run(
      name || subMenu.name,
      description !== undefined ? description : subMenu.description,
      order_num || subMenu.order_num,
      is_active !== undefined ? is_active : subMenu.is_active,
      subMenuId,
      menuId
    );
    
    res.json({
      success: true,
      message: 'Sub-menu updated successfully',
      data: { id: subMenuId, changes: result.changes }
    });
  } catch (error) {
    console.error('Error updating sub-menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sub-menu',
      error: error.message
    });
  }
});

// Delete sub-menu (soft delete)
router.delete('/:menuId/sub-menus/:subMenuId', (req, res) => {
  try {
    const db = connectSQLite();
    const { menuId, subMenuId } = req.params;
    
    const subMenu = db.prepare(`
      SELECT * FROM sub_menus 
      WHERE id = ? AND menu_id = ?
    `).get(subMenuId, menuId);
    
    if (!subMenu) {
      return res.status(404).json({
        success: false,
        message: 'Sub-menu not found'
      });
    }
    
    db.prepare('UPDATE sub_menus SET is_active = 0 WHERE id = ?').run(subMenuId);
    
    res.json({
      success: true,
      message: 'Sub-menu deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting sub-menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-menu',
      error: error.message
    });
  }
});

module.exports = router;