const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Database path
const DB_PATH = path.join(__dirname, '../../database/website.sqlite');

// Encryption key for sensitive data
const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

class WebsiteDatabase {
    constructor() {
        this.db = null;
    }

    // Initialize database connection
    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Error opening website database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to website SQLite database.');
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // Create necessary tables
    async createTables() {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'user',
                is_active BOOLEAN DEFAULT 1,
                last_login DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createActivityHistoryTable = `
            CREATE TABLE IF NOT EXISTS activity_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                action VARCHAR(100) NOT NULL,
                description TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        const createSessionsTable = `
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT UNIQUE NOT NULL,
                refresh_token TEXT UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(createUsersTable);
                this.db.run(createActivityHistoryTable);
                this.db.run(createSessionsTable, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Website database tables created successfully.');
                        this.createDefaultAdmin().then(resolve).catch(reject);
                    }
                });
            });
        });
    }

    // Create default admin user
    async createDefaultAdmin() {
        return new Promise((resolve, reject) => {
            // Check if admin user already exists by username or email
            this.db.get('SELECT COUNT(*) as count FROM users WHERE username = "admin" OR email = "admin@website.local"', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    const defaultPassword = 'admin123';
                    bcrypt.hash(defaultPassword, 10, (err, hash) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const insertAdmin = `
                            INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role)
                            VALUES (?, ?, ?, ?, ?)
                        `;

                        this.db.run(insertAdmin, [
                            'admin',
                            'admin@website.local',
                            hash,
                            'Administrator',
                            'admin'
                        ], (err) => {
                            if (err) {
                                console.log('Admin user might already exist, continuing...');
                                resolve();
                            } else {
                                console.log('Default admin user created (username: admin, password: admin123)');
                                resolve();
                            }
                        });
                    });
                } else {
                    console.log('Admin user already exists, skipping creation.');
                    resolve();
                }
            });
        });
    }

    // Encrypt sensitive data
    encrypt(text) {
        const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    // Decrypt sensitive data
    decrypt(encryptedText) {
        const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    // User management methods
    async createUser(userData) {
        const { username, email, password, fullName, role = 'user' } = userData;
        
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) {
                    reject(err);
                    return;
                }

                const insertUser = `
                    INSERT INTO users (username, email, password_hash, full_name, role)
                    VALUES (?, ?, ?, ?, ?)
                `;

                this.db.run(insertUser, [username, email, hash, fullName, role], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, username, email, fullName, role });
                    }
                });
            });
        });
    }

    async getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE username = ? AND is_active = 1';
            this.db.get(query, [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async getUserById(id) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE id = ? AND is_active = 1';
            this.db.get(query, [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async updateLastLogin(userId) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
            this.db.run(query, [userId], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Activity logging
    async logActivity(userId, action, description, ipAddress, userAgent) {
        return new Promise((resolve, reject) => {
            const insertActivity = `
                INSERT INTO activity_history (user_id, action, description, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            `;

            this.db.run(insertActivity, [userId, action, description, ipAddress, userAgent], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getUserActivity(userId, limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM activity_history 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            
            this.db.all(query, [userId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Session management
    async createSession(userId, sessionToken, refreshToken, expiresAt) {
        return new Promise((resolve, reject) => {
            const insertSession = `
                INSERT INTO sessions (user_id, session_token, refresh_token, expires_at)
                VALUES (?, ?, ?, ?)
            `;

            this.db.run(insertSession, [userId, sessionToken, refreshToken, expiresAt], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async getSessionByToken(sessionToken) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT s.*, u.username, u.email, u.role 
                FROM sessions s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.session_token = ? AND s.is_active = 1 AND s.expires_at > CURRENT_TIMESTAMP
            `;
            
            this.db.get(query, [sessionToken], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async invalidateSession(sessionToken) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE sessions SET is_active = 0 WHERE session_token = ?';
            this.db.run(query, [sessionToken], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing website database:', err.message);
                } else {
                    console.log('Website database connection closed.');
                }
            });
        }
    }
}

// Initialize website database function
async function initWebsiteDatabase() {
    try {
        const websiteDb = new WebsiteDatabase();
        await websiteDb.init();
        
        // Create default admin user if not exists
        const adminExists = await websiteDb.getUserByUsername('admin');
        if (!adminExists) {
            const adminPassword = await bcrypt.hash('admin123', 12);
            await websiteDb.createUser({
                username: 'admin',
                email: 'admin@example.com',
                password_hash: adminPassword,
                full_name: 'Administrator',
                role: 'admin'
            });
            console.log('✅ Default admin user created (username: admin, password: admin123)');
        }
        
        console.log('✅ Website database initialized successfully');
        return websiteDb;
    } catch (error) {
        console.error('❌ Failed to initialize website database:', error);
        throw error;
    }
}

module.exports = WebsiteDatabase;
module.exports.initWebsiteDatabase = initWebsiteDatabase;