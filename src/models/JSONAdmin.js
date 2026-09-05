/**
 * Model untuk mengelola admin menggunakan JSON database
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

class JSONAdmin {
  constructor() {
    this.adminFilePath = path.join(__dirname, '../database/admins.json');
    this.loadAdmins();
  }

  // Memuat data admin dari file JSON
  loadAdmins() {
    try {
      const data = fs.readFileSync(this.adminFilePath, 'utf8');
      this.data = JSON.parse(data);
    } catch (error) {
      console.error('Error loading admin data:', error.message);
      this.data = { admins: [], roles: {}, permissions: {} };
    }
  }

  // Menyimpan data admin ke file JSON
  saveAdmins() {
    try {
      fs.writeFileSync(this.adminFilePath, JSON.stringify(this.data, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving admin data:', error.message);
      return false;
    }
  }

  // Mendapatkan semua admin
  getAllAdmins() {
    return this.data.admins.map(admin => {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });
  }

  // Mendapatkan admin berdasarkan ID
  getAdminById(id) {
    const admin = this.data.admins.find(admin => admin.id === parseInt(id));
    if (admin) {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    }
    return null;
  }

  // Mendapatkan admin berdasarkan username
  getAdminByUsername(username) {
    const admin = this.data.admins.find(admin => admin.username === username);
    if (admin) {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    }
    return null;
  }

  // Mendapatkan admin berdasarkan nomor telepon
  getAdminByPhoneNumber(phoneNumber) {
    const admin = this.data.admins.find(admin => admin.phone_number === phoneNumber);
    if (admin) {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    }
    return null;
  }

  // Menambah admin baru
  async addAdmin(adminData) {
    try {
      // Validasi username unik
      const existingUsername = this.data.admins.find(admin => admin.username === adminData.username);
      if (existingUsername) {
        throw new Error('Username sudah digunakan');
      }

      // Validasi phone_number unik
      const existingPhone = this.data.admins.find(admin => admin.phone_number === adminData.phone_number);
      if (existingPhone) {
        throw new Error('Nomor telepon sudah digunakan');
      }

      // Generate ID baru
      const newId = this.data.admins.length > 0 
        ? Math.max(...this.data.admins.map(a => a.id)) + 1 
        : 1;

      // Hash password
      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      const newAdmin = {
        id: newId,
        username: adminData.username,
        password: hashedPassword,
        phone_number: adminData.phone_number,
        role: adminData.role || 'pegawai',
        is_active: adminData.is_active !== undefined ? adminData.is_active : true,
        created_at: new Date().toISOString(),
        last_login: null
      };

      this.data.admins.push(newAdmin);
      this.saveAdmins();

      const { password, ...adminWithoutPassword } = newAdmin;
      return adminWithoutPassword;
    } catch (error) {
      console.error('Error adding admin:', error.message);
      throw error;
    }
  }

  // Mengupdate admin
  async updateAdmin(id, adminData) {
    try {
      const adminIndex = this.data.admins.findIndex(admin => admin.id === parseInt(id));
      if (adminIndex === -1) {
        throw new Error('Admin not found');
      }

      const existingAdmin = this.data.admins[adminIndex];
      const updatedAdmin = { ...existingAdmin };

      // Update fields yang diberikan
      if (adminData.username) updatedAdmin.username = adminData.username;
      if (adminData.phone_number) updatedAdmin.phone_number = adminData.phone_number;
      if (adminData.role) updatedAdmin.role = adminData.role;
      if (adminData.is_active !== undefined) updatedAdmin.is_active = adminData.is_active;

      // Hash password baru jika diberikan
      if (adminData.password) {
        updatedAdmin.password = await bcrypt.hash(adminData.password, 10);
      }

      this.data.admins[adminIndex] = updatedAdmin;
      this.saveAdmins();

      const { password, ...adminWithoutPassword } = updatedAdmin;
      return adminWithoutPassword;
    } catch (error) {
      console.error('Error updating admin:', error.message);
      throw error;
    }
  }

  // Menghapus admin
  deleteAdmin(id) {
    try {
      const adminIndex = this.data.admins.findIndex(admin => admin.id === parseInt(id));
      if (adminIndex === -1) {
        throw new Error('Admin not found');
      }

      this.data.admins.splice(adminIndex, 1);
      this.saveAdmins();
      return true;
    } catch (error) {
      console.error('Error deleting admin:', error.message);
      throw error;
    }
  }

  // Verifikasi login
  async verifyLogin(username, password) {
    try {
      const admin = this.data.admins.find(admin => admin.username === username);
      if (!admin || !admin.is_active) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        return null;
      }

      // Update last login
      admin.last_login = new Date().toISOString();
      this.saveAdmins();

      const { password: _, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    } catch (error) {
      console.error('Error verifying login:', error.message);
      return null;
    }
  }

  // Mendapatkan role dan permissions
  getRoles() {
    return this.data.roles;
  }

  // Mendapatkan permissions untuk role tertentu
  getRolePermissions(role) {
    return this.data.roles[role] ? this.data.roles[role].permissions : [];
  }

  // Mengecek apakah admin memiliki permission tertentu
  hasPermission(adminId, resource, action = 'read') {
    const admin = this.getAdminById(adminId);
    if (!admin || !admin.is_active) {
      return false;
    }

    const rolePermissions = this.getRolePermissions(admin.role);
    if (!rolePermissions || !Array.isArray(rolePermissions)) return false;

    // Mapping resource dan action ke permission yang sesuai
    const permissionMap = {
      'umkm': {
        'read': 'umkm_view',
        'write': 'umkm_management',
        'delete': 'umkm_management'
      },
      'berita': {
        'read': 'news_view',
        'write': 'news_management',
        'delete': 'news_management'
      },
      'admin': {
        'read': 'user_management',
        'write': 'admin_management',
        'delete': 'admin_management'
      },
      'complaint': {
        'read': 'complaint_management',
        'write': 'complaint_management',
        'delete': 'complaint_management'
      }
    };

    const requiredPermission = permissionMap[resource] && permissionMap[resource][action];
    if (!requiredPermission) return false;

    return rolePermissions.includes(requiredPermission);
  }

  // Mendapatkan admin berdasarkan role
  getAdminsByRole(role) {
    return this.data.admins.filter(admin => 
      admin.role === role
    ).map(admin => {
      const { password, ...adminWithoutPassword } = admin;
      return adminWithoutPassword;
    });
  }

  // Mendapatkan admin dengan role superadmin untuk notifikasi
  getSuperAdmins() {
    return this.data.admins
      .filter(admin => admin.role === 'superadmin' && admin.is_active)
      .map(admin => {
        const { password, ...adminWithoutPassword } = admin;
        return adminWithoutPassword;
      });
  }

  // Mendapatkan semua permissions yang tersedia
  getAllPermissions() {
    return this.data.permissions;
  }
}

module.exports = JSONAdmin;