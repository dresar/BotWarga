/**
 * Routes untuk Authentication
 * Login, logout, dan session management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { connectSQLite } = require('../config/sqlite');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Middleware untuk verifikasi token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// Login
router.post('/login', async (req, res) => {
  try {
    const db = connectSQLite();
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }
    
    // Find admin by username
    const admin = db.prepare(`
      SELECT * FROM admins 
      WHERE username = ? AND is_active = 1
    `).get(username);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }
    
    // Update last login
    db.prepare(`
      UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).run(admin.id);
    
    // Generate JWT token
    const tokenPayload = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      phone_number: admin.phone_number
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          phone_number: admin.phone_number,
          last_login: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// Verify token and get current user
router.get('/me', authenticateToken, (req, res) => {
  try {
    const db = connectSQLite();
    
    // Get fresh admin data
    const admin = db.prepare(`
      SELECT id, username, phone_number, role, is_active, created_at, last_login
      FROM admins 
      WHERE id = ? AND is_active = 1
    `).get(req.user.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found or inactive'
      });
    }
    
    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
      error: error.message
    });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const db = connectSQLite();
    
    // Verify admin is still active
    const admin = db.prepare(`
      SELECT id, username, role, phone_number
      FROM admins 
      WHERE id = ? AND is_active = 1
    `).get(req.user.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found or inactive'
      });
    }
    
    // Generate new token
    const tokenPayload = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      phone_number: admin.phone_number
    };
    
    const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more sophisticated setup, you might want to blacklist the token
  // For now, we'll just return success and let the client handle token removal
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Change password (authenticated)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const db = connectSQLite();
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // Get current admin data
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.user.id);
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
    
    // Update password
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashedNewPassword, req.user.id);
    
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

// Check if system has any admin (for initial setup)
router.get('/setup/check', (req, res) => {
  try {
    const db = connectSQLite();
    
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins WHERE is_active = 1').get().count;
    
    res.json({
      success: true,
      data: {
        has_admin: adminCount > 0,
        admin_count: adminCount
      }
    });
  } catch (error) {
    console.error('Error checking admin setup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check admin setup',
      error: error.message
    });
  }
});

// Create first admin (only if no admin exists)
router.post('/setup/first-admin', async (req, res) => {
  try {
    const db = connectSQLite();
    const { username, password, phone_number } = req.body;
    
    if (!username || !password || !phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and phone_number are required'
      });
    }
    
    // Check if any admin already exists
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
    if (adminCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists. Use regular admin creation.'
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create first admin with 'admin' role
    const result = db.prepare(`
      INSERT INTO admins (username, password, phone_number, role)
      VALUES (?, ?, ?, 'admin')
    `).run(username, hashedPassword, phone_number);
    
    res.status(201).json({
      success: true,
      message: 'First admin created successfully',
      data: {
        id: result.lastInsertRowid,
        username,
        phone_number,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Error creating first admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create first admin',
      error: error.message
    });
  }
});

// Export middleware for use in other routes
module.exports = router;