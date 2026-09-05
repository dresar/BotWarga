/**
 * Routes untuk manajemen News dan Berita
 * CRUD operations untuk news dan berita
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
    const uploadDir = path.join(__dirname, '../../uploads/news');
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

// Inisialisasi tabel news jika belum ada
const initNewsTable = () => {
  try {
    const db = connectSQLite();
    db.exec(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        image_path TEXT,
        author TEXT DEFAULT 'Admin',
        category TEXT DEFAULT 'general',
        tags TEXT,
        is_published INTEGER DEFAULT 0,
        is_featured INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('News table initialized');
  } catch (error) {
    console.error('Error initializing news table:', error);
  }
};

// Inisialisasi tabel saat module dimuat
initNewsTable();

// Get all news with pagination and filters
router.get('/', (req, res) => {
  try {
    const db = connectSQLite();
    const {
      page = 1,
      limit = 10,
      category,
      is_published,
      is_featured,
      search
    } = req.query;
    
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    let params = [];
    
    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }
    
    if (is_published !== undefined) {
      whereClause += ' AND is_published = ?';
      params.push(is_published);
    }
    
    if (is_featured !== undefined) {
      whereClause += ' AND is_featured = ?';
      params.push(is_featured);
    }
    
    if (search) {
      whereClause += ' AND (title LIKE ? OR content LIKE ? OR summary LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM news ${whereClause}`;
    const totalResult = db.prepare(countQuery).get(...params);
    const total = totalResult.total;
    
    // Get news with pagination
    const newsQuery = `
      SELECT * FROM news 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const news = db.prepare(newsQuery).all(...params, limit, offset);
    
    res.json({
      success: true,
      data: {
        news,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total,
          total_pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error.message
    });
  }
});

// Get single news by ID
router.get('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const newsId = req.params.id;
    
    const news = db.prepare('SELECT * FROM news WHERE id = ?').get(newsId);
    
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }
    
    // Increment view count
    db.prepare('UPDATE news SET view_count = view_count + 1 WHERE id = ?').run(newsId);
    news.view_count += 1;
    
    res.json({
      success: true,
      data: news
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news',
      error: error.message
    });
  }
});

// Create new news
router.post('/', upload.single('image'), (req, res) => {
  try {
    const db = connectSQLite();
    const {
      title,
      content,
      summary,
      author,
      category,
      tags,
      is_published,
      is_featured
    } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }
    
    const imagePath = req.file ? `/uploads/news/${req.file.filename}` : null;
    const publishedAt = is_published === '1' ? new Date().toISOString() : null;
    
    const result = db.prepare(`
      INSERT INTO news (
        title, content, summary, image_path, author, category, tags,
        is_published, is_featured, published_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      content,
      summary || null,
      imagePath,
      author || 'Admin',
      category || 'general',
      tags || null,
      is_published === '1' ? 1 : 0,
      is_featured === '1' ? 1 : 0,
      publishedAt
    );
    
    res.status(201).json({
      success: true,
      message: 'News created successfully',
      data: {
        id: result.lastInsertRowid,
        title,
        image_path: imagePath
      }
    });
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create news',
      error: error.message
    });
  }
});

// Update news
router.put('/:id', upload.single('image'), (req, res) => {
  try {
    const db = connectSQLite();
    const newsId = req.params.id;
    const {
      title,
      content,
      summary,
      author,
      category,
      tags,
      is_published,
      is_featured
    } = req.body;
    
    const existingNews = db.prepare('SELECT * FROM news WHERE id = ?').get(newsId);
    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }
    
    let imagePath = existingNews.image_path;
    if (req.file) {
      // Delete old image if exists
      if (existingNews.image_path) {
        const oldImagePath = path.join(__dirname, '../..', existingNews.image_path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = `/uploads/news/${req.file.filename}`;
    }
    
    const wasPublished = existingNews.is_published;
    const isNowPublished = is_published === '1';
    let publishedAt = existingNews.published_at;
    
    // Set published_at if publishing for the first time
    if (!wasPublished && isNowPublished) {
      publishedAt = new Date().toISOString();
    } else if (!isNowPublished) {
      publishedAt = null;
    }
    
    const result = db.prepare(`
      UPDATE news SET
        title = ?, content = ?, summary = ?, image_path = ?, author = ?,
        category = ?, tags = ?, is_published = ?, is_featured = ?,
        published_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || existingNews.title,
      content || existingNews.content,
      summary !== undefined ? summary : existingNews.summary,
      imagePath,
      author || existingNews.author,
      category || existingNews.category,
      tags !== undefined ? tags : existingNews.tags,
      isNowPublished ? 1 : 0,
      is_featured === '1' ? 1 : 0,
      publishedAt,
      newsId
    );
    
    res.json({
      success: true,
      message: 'News updated successfully',
      data: { id: newsId, changes: result.changes }
    });
  } catch (error) {
    console.error('Error updating news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update news',
      error: error.message
    });
  }
});

// Delete news
router.delete('/:id', (req, res) => {
  try {
    const db = connectSQLite();
    const newsId = req.params.id;
    
    const news = db.prepare('SELECT * FROM news WHERE id = ?').get(newsId);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }
    
    // Delete image file if exists
    if (news.image_path) {
      const imagePath = path.join(__dirname, '../..', news.image_path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    db.prepare('DELETE FROM news WHERE id = ?').run(newsId);
    
    res.json({
      success: true,
      message: 'News deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete news',
      error: error.message
    });
  }
});

// Get news categories
router.get('/meta/categories', (req, res) => {
  try {
    const db = connectSQLite();
    
    const categories = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM news 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
    `).all();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get news statistics
router.get('/meta/stats', (req, res) => {
  try {
    const db = connectSQLite();
    
    const stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM news').get().count,
      published: db.prepare('SELECT COUNT(*) as count FROM news WHERE is_published = 1').get().count,
      draft: db.prepare('SELECT COUNT(*) as count FROM news WHERE is_published = 0').get().count,
      featured: db.prepare('SELECT COUNT(*) as count FROM news WHERE is_featured = 1').get().count,
      total_views: db.prepare('SELECT SUM(view_count) as total FROM news').get().total || 0
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