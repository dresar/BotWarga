const fs = require('fs').promises;
const path = require('path');

class SettingsController {
    constructor() {
        this.settingsPath = path.join(__dirname, '../config/botSettings.json');
    }

    // Load settings from JSON file
    async loadSettings() {
        try {
            const data = await fs.readFile(this.settingsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading settings:', error);
            return null;
        }
    }

    // Save settings to JSON file
    async saveSettings(settings) {
        try {
            settings.lastUpdated = new Date().toISOString();
            await fs.writeFile(this.settingsPath, JSON.stringify(settings, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }

    // Get specific setting value
    async getSetting(category, key) {
        try {
            const settings = await this.loadSettings();
            if (!settings || !settings[category]) return null;
            return key ? settings[category][key] : settings[category];
        } catch (error) {
            console.error('Error getting setting:', error);
            return null;
        }
    }

    // Update specific setting
    async updateSetting(category, key, value, updatedBy = 'admin') {
        try {
            const settings = await this.loadSettings();
            if (!settings) return false;

            if (!settings[category]) {
                settings[category] = {};
            }

            settings[category][key] = value;
            settings.updatedBy = updatedBy;
            
            return await this.saveSettings(settings);
        } catch (error) {
            console.error('Error updating setting:', error);
            return false;
        }
    }

    // Update multiple settings in a category
    async updateCategory(category, newValues, updatedBy = 'admin') {
        try {
            const settings = await this.loadSettings();
            if (!settings) return false;

            settings[category] = { ...settings[category], ...newValues };
            settings.updatedBy = updatedBy;
            
            return await this.saveSettings(settings);
        } catch (error) {
            console.error('Error updating category:', error);
            return false;
        }
    }

    // Delete a setting
    async deleteSetting(category, key, updatedBy = 'admin') {
        try {
            const settings = await this.loadSettings();
            if (!settings || !settings[category]) return false;

            delete settings[category][key];
            settings.updatedBy = updatedBy;
            
            return await this.saveSettings(settings);
        } catch (error) {
            console.error('Error deleting setting:', error);
            return false;
        }
    }

    // Add item to array setting
    async addToArray(category, key, value, updatedBy = 'admin') {
        try {
            const settings = await this.loadSettings();
            if (!settings) return false;

            if (!settings[category]) settings[category] = {};
            if (!Array.isArray(settings[category][key])) {
                settings[category][key] = [];
            }

            if (!settings[category][key].includes(value)) {
                settings[category][key].push(value);
                settings.updatedBy = updatedBy;
                return await this.saveSettings(settings);
            }
            return true;
        } catch (error) {
            console.error('Error adding to array:', error);
            return false;
        }
    }

    // Remove item from array setting
    async removeFromArray(category, key, value, updatedBy = 'admin') {
        try {
            const settings = await this.loadSettings();
            if (!settings || !settings[category] || !Array.isArray(settings[category][key])) {
                return false;
            }

            const index = settings[category][key].indexOf(value);
            if (index > -1) {
                settings[category][key].splice(index, 1);
                settings.updatedBy = updatedBy;
                return await this.saveSettings(settings);
            }
            return true;
        } catch (error) {
            console.error('Error removing from array:', error);
            return false;
        }
    }

    // Reset settings to default
    async resetToDefault(updatedBy = 'admin') {
        try {
            const defaultSettings = {
                "limits": {
                    "nameLimit": 50,
                    "messageLimit": 1000,
                    "fileLimit": 10,
                    "complaintTimeout": 24,
                    "maxComplaintsPerDay": 3,
                    "maxMessageLength": 2000,
                    "maxFileSize": 50,
                    "rateLimitPerMinute": 10,
                    "sessionTimeout": 30
                },
                "filters": {
                    "profanityFilter": true,
                    "spamFilter": true,
                    "linkFilter": false,
                    "imageFilter": false,
                    "documentFilter": false,
                    "autoModeration": true,
                    "bannedWords": ["spam", "scam", "fake"],
                    "allowedFileTypes": ["jpg", "jpeg", "png", "pdf", "doc", "docx"],
                    "blockedDomains": ["suspicious-site.com", "malware-site.org"]
                },
                "moderation": {
                    "autoWarn": true,
                    "autoMute": false,
                    "autoBan": false,
                    "warningThreshold": 3,
                    "muteThreshold": 5,
                    "banThreshold": 10,
                    "muteDuration": 60,
                    "logViolations": true,
                    "notifyAdmins": true,
                    "escalationEnabled": true
                },
                "notifications": {
                    "adminNotifications": true,
                    "userNotifications": true,
                    "systemAlerts": true,
                    "maintenanceMode": false,
                    "emergencyMode": false
                },
                "system": {
                    "botName": "Bot Layanan Desa Pulosarok",
                    "version": "2.0.0",
                    "timezone": "Asia/Jakarta",
                    "language": "id",
                    "debugMode": false,
                    "backupEnabled": true,
                    "backupInterval": 24,
                    "logLevel": "info"
                },
                "security": {
                    "adminVerification": true,
                    "twoFactorAuth": false,
                    "sessionSecurity": true,
                    "encryptData": false,
                    "auditLog": true,
                    "ipWhitelist": [],
                    "maxLoginAttempts": 3,
                    "lockoutDuration": 15
                },
                "lastUpdated": new Date().toISOString(),
                "updatedBy": updatedBy
            };

            return await this.saveSettings(defaultSettings);
        } catch (error) {
            console.error('Error resetting to default:', error);
            return false;
        }
    }

    // Validate setting value
    validateSetting(category, key, value) {
        const validations = {
            limits: {
                nameLimit: (v) => Number.isInteger(v) && v > 0 && v <= 100,
                messageLimit: (v) => Number.isInteger(v) && v > 0 && v <= 5000,
                fileLimit: (v) => Number.isInteger(v) && v > 0 && v <= 100,
                complaintTimeout: (v) => Number.isInteger(v) && v > 0 && v <= 168,
                maxComplaintsPerDay: (v) => Number.isInteger(v) && v > 0 && v <= 50,
                maxMessageLength: (v) => Number.isInteger(v) && v > 0 && v <= 10000,
                maxFileSize: (v) => Number.isInteger(v) && v > 0 && v <= 100,
                rateLimitPerMinute: (v) => Number.isInteger(v) && v > 0 && v <= 100,
                sessionTimeout: (v) => Number.isInteger(v) && v > 0 && v <= 1440
            },
            filters: {
                profanityFilter: (v) => typeof v === 'boolean',
                spamFilter: (v) => typeof v === 'boolean',
                linkFilter: (v) => typeof v === 'boolean',
                imageFilter: (v) => typeof v === 'boolean',
                documentFilter: (v) => typeof v === 'boolean',
                autoModeration: (v) => typeof v === 'boolean',
                bannedWords: (v) => Array.isArray(v),
                allowedFileTypes: (v) => Array.isArray(v),
                blockedDomains: (v) => Array.isArray(v)
            },
            moderation: {
                autoWarn: (v) => typeof v === 'boolean',
                autoMute: (v) => typeof v === 'boolean',
                autoBan: (v) => typeof v === 'boolean',
                warningThreshold: (v) => Number.isInteger(v) && v > 0 && v <= 20,
                muteThreshold: (v) => Number.isInteger(v) && v > 0 && v <= 50,
                banThreshold: (v) => Number.isInteger(v) && v > 0 && v <= 100,
                muteDuration: (v) => Number.isInteger(v) && v > 0 && v <= 10080,
                logViolations: (v) => typeof v === 'boolean',
                notifyAdmins: (v) => typeof v === 'boolean',
                escalationEnabled: (v) => typeof v === 'boolean'
            }
        };

        if (validations[category] && validations[category][key]) {
            return validations[category][key](value);
        }
        return true; // Default to valid if no validation rule
    }

    // Get formatted settings for display
    async getFormattedSettings(category = null) {
        try {
            const settings = await this.loadSettings();
            if (!settings) return 'Gagal memuat pengaturan\n\n' + '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_';

            if (category && settings[category]) {
                return this.formatCategory(category, settings[category]);
            }

            let formatted = '🔧 *PENGATURAN BOT DESA PULOSAROK* 🔧\n';
            formatted += '═══════════════════════════════\n\n';

            Object.keys(settings).forEach(cat => {
                if (cat !== 'lastUpdated' && cat !== 'updatedBy') {
                    formatted += this.formatCategory(cat, settings[cat]) + '\n';
                }
            });

            formatted += `\n📅 *Terakhir diubah:* ${new Date(settings.lastUpdated).toLocaleString('id-ID')}`;\n            formatted += `\n👤 *Diubah oleh:* ${settings.updatedBy}`;\n            formatted += '\n\n' + '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_';\n\n            return formatted;
        } catch (error) {
            console.error('Error formatting settings:', error);
            return 'Error dalam memformat pengaturan\n\n' + '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_';
        }
    }

    formatCategory(category, data) {
        const categoryNames = {
            limits: '📊 BATAS & LIMIT',
            filters: '🛡️ FILTER & MODERASI',
            moderation: '⚖️ MODERASI OTOMATIS',
            notifications: '🔔 NOTIFIKASI',
            system: '⚙️ SISTEM',
            security: '🔒 KEAMANAN'
        };

        let formatted = `${categoryNames[category] || category.toUpperCase()}\n`;
        formatted += '─────────────────────────\n';

        Object.entries(data).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                formatted += `• ${key}: [${value.join(', ')}]\n`;
            } else {
                formatted += `• ${key}: ${value}\n`;
            }
        });

        return formatted;
    }
}

module.exports = SettingsController;