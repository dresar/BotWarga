const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const WebsiteDatabase = require('../database/websiteDb');
const router = express.Router();

// Initialize database
const websiteDb = new WebsiteDatabase();
websiteDb.init().catch(console.error);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Middleware untuk autentikasi
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const session = await websiteDb.getSessionByToken(token);
        
        if (!session) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        req.user = {
            id: decoded.userId,
            username: session.username,
            email: session.email,
            role: session.role
        };
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// Middleware untuk log aktivitas
const logActivity = (action, description) => {
    return async (req, res, next) => {
        if (req.user) {
            try {
                await websiteDb.logActivity(
                    req.user.id,
                    action,
                    description,
                    req.ip,
                    req.get('User-Agent')
                );
            } catch (error) {
                console.error('Error logging activity:', error);
            }
        }
        next();
    };
};

// === AUTH ROUTES ===

// Register
router.post('/auth/register', async (req, res) => {
    try {
        const { username, email, password, full_name } = req.body;

        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user already exists
        const existingUser = await websiteDb.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const existingEmail = await websiteDb.getUserByEmail(email);
        if (existingEmail) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const userId = await websiteDb.createUser({
            username,
            email,
            password_hash: passwordHash,
            full_name,
            role: 'user'
        });

        // Log activity
        await websiteDb.logActivity(
            userId,
            'REGISTER',
            'User registered successfully',
            req.ip,
            req.get('User-Agent')
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: userId,
                username,
                email,
                fullName: full_name,
                role: 'user'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Get user from database
        const user = await websiteDb.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate tokens
        const sessionToken = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
            { userId: user.id, type: 'refresh' },
            JWT_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
        );

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Save session to database
        await websiteDb.createSession(user.id, sessionToken, refreshToken, expiresAt.toISOString());
        
        // Update last login
        await websiteDb.updateLastLogin(user.id);
        
        // Log activity
        await websiteDb.logActivity(
            user.id,
            'LOGIN',
            'User logged in successfully',
            req.ip,
            req.get('User-Agent')
        );

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role
            },
            token: sessionToken,
            refreshToken: refreshToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout
router.post('/auth/logout', authenticateToken, logActivity('LOGOUT', 'User logged out'), async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            await websiteDb.invalidateSession(token);
        }

        res.json({ success: true, message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Refresh token
router.post('/auth/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const user = await websiteDb.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Generate new access token
        const newSessionToken = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            token: newSessionToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// Verify token
router.get('/auth/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

// === USER ROUTES ===

// Get current user profile
router.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await websiteDb.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                lastLogin: user.last_login,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
router.put('/user/profile', authenticateToken, logActivity('UPDATE_PROFILE', 'Updated user profile'), async (req, res) => {
    try {
        const { full_name, email } = req.body;
        
        if (!full_name && !email) {
            return res.status(400).json({ error: 'At least one field is required' });
        }

        // Check if email already exists (if updating email)
        if (email) {
            const existingUser = await websiteDb.getUserByEmail(email);
            if (existingUser && existingUser.id !== req.user.id) {
                return res.status(409).json({ error: 'Email already exists' });
            }
        }

        // Update user
        const updateData = {};
        if (full_name) updateData.full_name = full_name;
        if (email) updateData.email = email;

        await websiteDb.updateUser(req.user.id, updateData);

        // Get updated user
        const updatedUser = await websiteDb.getUserById(req.user.id);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                fullName: updatedUser.full_name,
                role: updatedUser.role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user activity history
router.get('/user/activity', authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const activities = await websiteDb.getUserActivity(req.user.id, limit);

        res.json({
            success: true,
            activities: activities
        });
    } catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Change password
router.post('/user/change-password', authenticateToken, logActivity('CHANGE_PASSWORD', 'Changed password'), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }

        // Get current user
        const user = await websiteDb.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await websiteDb.updateUser(req.user.id, { password_hash: newPasswordHash });

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new user (admin only)
router.post('/user/create', authenticateToken, logActivity('CREATE_USER', 'Created new user'), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { username, email, password, fullName, role = 'user' } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password required' });
        }

        const newUser = await websiteDb.createUser({
            username,
            email,
            password,
            fullName,
            role
        });

        res.json({
            success: true,
            message: 'User created successfully',
            user: newUser
        });

    } catch (error) {
        console.error('Create user error:', error);
        if (error.code === 'SQLITE_CONSTRAINT') {
            res.status(400).json({ error: 'Username or email already exists' });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

// === DASHBOARD ROUTES ===

// Get dashboard data
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        // This is a placeholder for dashboard statistics
        // You can expand this based on your specific needs
        const stats = {
            totalUsers: 0,
            activeUsers: 0,
            totalActivities: 0,
            recentActivities: []
        };

        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// === ADMIN ROUTES ===

// Get all users (admin only)
router.get('/admin/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // This would need to be implemented in the database class
        res.json({
            success: true,
            users: []
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get system logs (admin only)
router.get('/admin/logs', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // This would need to be implemented in the database class
        res.json({
            success: true,
            logs: []
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
router.use((error, req, res, next) => {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;