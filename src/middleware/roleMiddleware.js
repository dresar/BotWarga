/**
 * Middleware untuk role-based access control
 */

const JSONAdmin = require('../models/JSONAdmin');

class RoleMiddleware {
  constructor() {
    this.adminModel = new JSONAdmin();
  }

  /**
   * Middleware untuk memeriksa apakah user memiliki akses ke resource tertentu
   * @param {string} resource - Resource yang ingin diakses (umkm, berita, admin, dll)
   * @param {string} action - Action yang ingin dilakukan (read, write, delete)
   */
  checkAccess(resource, action = 'read') {
    return async (req, res, next) => {
      try {
        const { adminId } = req.body || req.query || req.params;
        
        if (!adminId) {
          return res.status(401).json({
            success: false,
            message: 'Admin ID diperlukan untuk akses'
          });
        }

        const admin = this.adminModel.getAdminById(adminId);
        
        if (!admin) {
          return res.status(401).json({
            success: false,
            message: 'Admin tidak ditemukan'
          });
        }

        if (!admin.is_active) {
          return res.status(401).json({
            success: false,
            message: 'Admin tidak aktif'
          });
        }

        // Cek permission berdasarkan role
        const hasPermission = this.adminModel.hasPermission(adminId, resource, action);
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `Anda tidak memiliki akses ${action} untuk ${resource}`
          });
        }

        // Tambahkan info admin ke request untuk digunakan di controller
        req.admin = admin;
        next();
      } catch (error) {
        console.error('Error in role middleware:', error);
        return res.status(500).json({
          success: false,
          message: 'Error saat memeriksa akses'
        });
      }
    };
  }

  /**
   * Middleware khusus untuk memeriksa role minimum
   * @param {string} minRole - Role minimum yang diperlukan (pegawai, admin, superadmin)
   */
  requireRole(minRole) {
    const roleHierarchy = {
      'pegawai': 1,
      'admin': 2,
      'superadmin': 3
    };

    return async (req, res, next) => {
      try {
        const { adminId } = req.body || req.query || req.params;
        
        if (!adminId) {
          return res.status(401).json({
            success: false,
            message: 'Admin ID diperlukan'
          });
        }

        const admin = this.adminModel.getAdminById(adminId);
        
        if (!admin || !admin.is_active) {
          return res.status(401).json({
            success: false,
            message: 'Admin tidak valid atau tidak aktif'
          });
        }

        const userRoleLevel = roleHierarchy[admin.role] || 0;
        const requiredRoleLevel = roleHierarchy[minRole] || 0;

        if (userRoleLevel < requiredRoleLevel) {
          return res.status(403).json({
            success: false,
            message: `Akses ditolak. Role minimum: ${minRole}`
          });
        }

        req.admin = admin;
        next();
      } catch (error) {
        console.error('Error in role requirement middleware:', error);
        return res.status(500).json({
          success: false,
          message: 'Error saat memeriksa role'
        });
      }
    };
  }
}

module.exports = new RoleMiddleware();