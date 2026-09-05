/**
 * Routes untuk manajemen Informasi Desa
 * CRUD operations untuk village_info
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { connectSQLite } = require('../config/sqlite');

// Setup multer untuk upload gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/village_info');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all village info
router.get('/', (req, res) => {
  try {
    const db = connectSQLite();
    const { page = 1, limit = 10, is_active } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (is_active !== undefined) {
      whereClause += ' AND is_active = ?';
      params.push(is_active);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM village_info ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;
    
    // Get village info with pagination
    const villageInfoQuery = `
      SELECT * FROM village_info 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const villageInfo = db.prepare(villageInfoQuery).all(...params, limit, offset);
    
    res.json({
      success: true,
      data: {
        village_info: villageInfo,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching village info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch village info',
      error: error.message
    });
  }
});

// Get single village info by ID
router.get('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const infoId = req.params.id;
    
    const villageInfo = db.prepare('SELECT * FROM village_info WHERE id = ?').get(infoId);
    
    if (!villageInfo) {
      return res.status(404).json({
        success: false,
        message: 'Village info not found'
      });
    }
    
    res.json({
      success: true,
      data: villageInfo
    });
  } catch (error) {
    console.error('Error fetching village info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch village info',
      error: error.message
    });
  }
});

// Create new village info
router.post('/', upload.single('image'), (req, res) => {
  try {
    const db = connectSQLite();
    const { title, content, is_active } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }
    
    const imagePath = req.file ? `/uploads/village_info/${req.file.filename}` : null;
    
    const result = db.prepare(`
      INSERT INTO village_info (title, content, image_path, is_active)
      VALUES (?, ?, ?, ?)
    `).run(
      title,
      content,
      imagePath,
      is_active === '1' ? 1 : 1 // Default to active
    );
    
    res.status(201).json({
      success: true,
      message: 'Village info created successfully',
      data: {
        id: result.lastInsertRowid,
        title,
        image_path: imagePath
      }
    });
  } catch (error) {
    console.error('Error creating village info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create village info',
      error: error.message
    });
  }
});

// Update village info
router.put('/:id', upload.single('image'), (req, res) => {
  try {
    const db = connectSQLite();
    const infoId = req.params.id;
    const { title, content, is_active } = req.body;
    
    const existingInfo = db.prepare('SELECT * FROM village_info WHERE id = ?').get(infoId);
    if (!existingInfo) {
      return res.status(404).json({
        success: false,
        message: 'Village info not found'
      });
    }
    
    let imagePath = existingInfo.image_path;
    if (req.file) {
      // Delete old image if exists
      if (existingInfo.image_path) {
        const oldImagePath = path.join(__dirname, '../..', existingInfo.image_path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = `/uploads/village_info/${req.file.filename}`;
    }
    
    const result = db.prepare(`
      UPDATE village_info SET
        title = ?, content = ?, image_path = ?, is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existingInfo.title,
      content || existingInfo.content,
      imagePath,
      is_active !== undefined ? (is_active === '1' ? 1 : 0) : existingInfo.is_active,
      infoId
    );
    
    res.json({
      success: true,
      message: 'Village info updated successfully',
      data: { id: infoId, changes: result.changes }
    });
  } catch (error) {
    console.error('Error updating village info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update village info',
      error: error.message
    });
  }
});

// Delete village info
router.delete('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const infoId = req.params.id;
    
    const villageInfo = db.prepare('SELECT * FROM village_info WHERE id = ?').get(infoId);
    if (!villageInfo) {
      return res.status(404).json({
        success: false,
        message: 'Village info not found'
      });
    }
    
    // Delete image file if exists
    if (villageInfo.image_path) {
      const imagePath = path.join(__dirname, '../..', villageInfo.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    db.prepare('DELETE FROM village_info WHERE id = ?').run(infoId);
    
    res.json({
      success: true,
      message: 'Village info deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting village info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete village info',
      error: error.message
    });
  }
});

// Soft delete village info (set is_active to 0)
router.patch('/:id/deactivate', (req, res) => {
  try {
    const db = connectSQLite();
    const infoId = req.params.id;
    
    const villageInfo = db.prepare('SELECT * FROM village_info WHERE id = ?').get(infoId);
    if (!villageInfo) {
      return res.status(404).json({
        success: false,
        message: 'Village info not found'
      });
    }
    
    db.prepare(`
      UPDATE village_info SET 
        is_active = 0, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(infoId);
    
    res.json({
      success: true,
      message: 'Village info deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating village info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate village info',
      error: error.message
    });
  }
});

// Activate village info (set is_active to 1)
router.patch('/:id/activate', (req, res) => {
  try {
    const db = connectSQLite();
    const infoId = req.params.id;
    
    const villageInfo = db.prepare('SELECT * FROM village_info WHERE id = ?').get(infoId);
    if (!villageInfo) {
      return res.status(404).json({
        success: false,
        message: 'Village info not found'
      });
    }
    
    db.prepare(`
      UPDATE village_info SET 
        is_active = 1, 
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(infoId);
    
    res.json({
      success: true,
      message: 'Village info activated successfully'
    });
  } catch (error) {
    console.error('Error activating village info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate village info',
      error: error.message
    });
  }
});

// Get village info statistics
router.get('/meta/stats', (req, res) => {
  try {
    const db = connectSQLite();
    
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM village_info').get().count,
      active: db.prepare('SELECT COUNT(*) as count FROM village_info WHERE is_active = 1').get().count,
      inactive: db.prepare('SELECT COUNT(*) as count FROM village_info WHERE is_active = 0').get().count
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

module.exports = router;