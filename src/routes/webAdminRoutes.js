/**
 * Routes untuk manajemen Admin
 * CRUD operations untuk admins
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { connectSQLite } = require('../config/sqlite');

// Get all admins
router.get('/', (req, res) => {
  try {
    const db = connectSQLite();
    const { page = 1, limit = 10, is_active, role } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (is_active !== undefined) {
      whereClause += ' AND is_active = ?';
      params.push(is_active);
    }
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM admins ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;
    
    // Get admins (exclude password)
    const adminsQuery = `
      SELECT 
        id, username, phone_number, role, is_active, 
        created_at, last_login
      FROM admins 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const admins = db.prepare(adminsQuery).all(...params, limit, offset);
    
    res.json({
      success: true,
      data: {
        admins,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
      error: error.message
    });
  }
});

// Get single admin by ID
router.get('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const adminId = req.params.id;
    
    const admin = db.prepare(`
      SELECT 
        id, username, phone_number, role, is_active, 
        created_at, last_login
      FROM admins 
      WHERE id = ?
    `).get(adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Error fetching admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin',
      error: error.message
    });
  }
});

// Create new admin
router.post('/', async (req, res) => {
  try {
    const db = connectSQLite();
    const { username, password, phone_number, role } = req.body;
    
    if (!username || !password || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and phone_number are required'
      });
    }
    
    // Check if username or phone already exists
    const existingAdmin = db.prepare(`
      SELECT * FROM admins 
      WHERE username = ? OR phone_number = ?
    `).get(username, phone_number);
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Username or phone number already exists'
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const result = db.prepare(`
      INSERT INTO admins (username, password, phone_number, role)
      VALUES (?, ?, ?, ?)
    `).run(username, hashedPassword, phone_number, role || 'editor');
    
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: result.lastInsertRowid,
        username,
        phone_number,
        role: role || 'editor'
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
      error: error.message
    });
  }
});

// Update admin
router.put('/:id', async (req, res) => {
  try {
    const db = connectSQLite();
    const adminId = req.params.id;
    const { username, password, phone_number, role, is_active } = req.body;
    
    const existingAdmin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!existingAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Check if new username or phone conflicts with other admins
    if (username && username !== existingAdmin.username) {
      const usernameExists = db.prepare('SELECT * FROM admins WHERE username = ? AND id != ?').get(username, adminId);
      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
    }
    
    if (phone_number && phone_number !== existingAdmin.phone_number) {
      const phoneExists = db.prepare('SELECT * FROM admins WHERE phone_number = ? AND id != ?').get(phone_number, adminId);
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already exists'
        });
      }
    }
    
    let hashedPassword = existingAdmin.password;
    if (password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    }
    
    const result = db.prepare(`
      UPDATE admins SET
        username = ?, password = ?, phone_number = ?, role = ?, is_active = ?
      WHERE id = ?
    `).run(
      username || existingAdmin.username,
      hashedPassword,
      phone_number || existingAdmin.phone_number,
      role || existingAdmin.role,
      is_active !== undefined ? is_active : existingAdmin.is_active,
      adminId
    );
    
    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: { id: adminId, changes: result.changes }
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin',
      error: error.message
    });
  }
});

// Delete admin (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const adminId = req.params.id;
    
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Check if this is the last active admin
    const activeAdminsCount = db.prepare('SELECT COUNT(*) as count FROM admins WHERE is_active = 1').get().count;
    if (activeAdminsCount <= 1 && admin.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last active admin'
      });
    }
    
    db.prepare('UPDATE admins SET is_active = 0 WHERE id = ?').run(adminId);
    
    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
      error: error.message
    });
  }
});

// Activate admin
router.patch('/:id/activate', (req, res) => {
  try {
    const db = connectSQLite();
    const adminId = req.params.id;
    
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    db.prepare('UPDATE admins SET is_active = 1 WHERE id = ?').run(adminId);
    
    res.json({
      success: true,
      message: 'Admin activated successfully'
    });
  } catch (error) {
    console.error('Error activating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate admin',
      error: error.message
    });
  }
});

// Change admin password
router.patch('/:id/change-password', async (req, res) => {
  try {
    const db = connectSQLite();
    const adminId = req.params.id;
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, admin.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);
    
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashedNewPassword, adminId);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
});

// Get admin statistics
router.get('/meta/stats', (req, res) => {
  try {
    const db = connectSQLite();
    
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM admins').get().count,
      active: db.prepare('SELECT COUNT(*) as count FROM admins WHERE is_active = 1').get().count,
      inactive: db.prepare('SELECT COUNT(*) as count FROM admins WHERE is_active = 0').get().count,
      by_role: db.prepare(`
        SELECT role, COUNT(*) as count 
        FROM admins 
        WHERE is_active = 1 
        GROUP BY role
      `).all()
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats',
      error: error.message
    });
  }
});

module.exports = router;