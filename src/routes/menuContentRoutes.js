/**
 * Routes untuk mengelola konten menu dengan SQLite
 */

const express = require('express');
const router = express.Router();
const { getMenuContentFromFile, saveMenuContent, convertAllTxtToJson, createNewMenuContent, createSampleMenuContent } = require('../controllers/menuContentController');
const { loginAdmin, getAllAdmins, addAdmin, updateAdmin, deleteAdmin } = require('../controllers/adminController');

// Middleware untuk autentikasi admin
const authenticateAdmin = async (req, res, next) => {
  try {
    const { username, password } = req.headers;
    
    if (!username || !password) {
      return res.status(401).json({ success: false, message: 'Username dan password diperlukan' });
    }
    
    const result = await loginAdmin(username, password);
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    req.admin = result.admin;
    next();
  } catch (error) {
    console.error('Error authenticating admin:', error.message);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan saat autentikasi' });
  }
};

// Route untuk mendapatkan konten menu
router.get('/content/:menuId/:subMenuId', authenticateAdmin, async (req, res) => {
  try {
    const { menuId, subMenuId } = req.params;
    
    const result = await getMenuContentFromFile(parseInt(menuId), parseInt(subMenuId));
    
    res.json({ success: true, content: result });
  } catch (error) {
    console.error('Error getting menu content:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk menyimpan konten menu
router.post('/content', authenticateAdmin, async (req, res) => {
  try {
    const { menu_id, sub_menu_id, content_json } = req.body;
    
    if (!menu_id || !sub_menu_id || !content_json) {
      return res.status(400).json({ success: false, message: 'menu_id, sub_menu_id, dan content_json diperlukan' });
    }
    
    const result = await saveMenuContent({
      menu_id: parseInt(menu_id),
      sub_menu_id: parseInt(sub_menu_id),
      content_json
    }, req.admin.id);
    
    res.json({ success: true, content: result });
  } catch (error) {
    console.error('Error saving menu content:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk mengkonversi semua file txt ke JSON
router.post('/convert-all', authenticateAdmin, async (req, res) => {
  try {
    const results = await convertAllTxtToJson();
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error converting all txt to JSON:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk membuat konten dummy untuk semua menu
router.post('/create-dummy-content', authenticateAdmin, async (req, res) => {
  try {
    const { createAllDummyContent } = require('../utils/createDummyMenuContent');
    const results = await createAllDummyContent();
    
    res.json({ success: true, message: 'Konten dummy berhasil dibuat', results });
  } catch (error) {
    console.error('Error creating dummy content:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk membuat konten menu sampel baru
router.post('/create-sample', authenticateAdmin, async (req, res) => {
  try {
    const { menu_id, sub_menu_id, menu_name, sub_menu_name } = req.body;
    
    if (!menu_id || !sub_menu_id || !menu_name || !sub_menu_name) {
      return res.status(400).json({ 
        success: false, 
        message: 'menu_id, sub_menu_id, menu_name, dan sub_menu_name diperlukan' 
      });
    }
    
    const result = await createNewMenuContent(
      parseInt(menu_id),
      parseInt(sub_menu_id),
      menu_name,
      sub_menu_name
    );
    
    res.json({ success: true, content: result });
  } catch (error) {
    console.error('Error creating sample menu content:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk mendapatkan semua admin
router.get('/admins', authenticateAdmin, async (req, res) => {
  try {
    const result = await getAllAdmins();
    
    res.json(result);
  } catch (error) {
    console.error('Error getting all admins:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk menambahkan admin baru
router.post('/admins', authenticateAdmin, async (req, res) => {
  try {
    const { username, password, phone_number, role } = req.body;
    
    if (!username || !password || !phone_number) {
      return res.status(400).json({ success: false, message: 'Username, password, dan phone_number diperlukan' });
    }
    
    const result = await addAdmin({
      username,
      password,
      phone_number,
      role
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error adding admin:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk mengupdate admin
router.put('/admins/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, phone_number, role, is_active } = req.body;
    
    if (!username || !phone_number) {
      return res.status(400).json({ success: false, message: 'Username dan phone_number diperlukan' });
    }
    
    const result = await updateAdmin(parseInt(id), {
      username,
      password,
      phone_number,
      role,
      is_active
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error updating admin:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route untuk menghapus admin
router.delete('/admins/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await deleteAdmin(parseInt(id));
    
    res.json(result);
  } catch (error) {
    console.error('Error deleting admin:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;