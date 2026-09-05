/**
 * Script untuk menguji validasi input ID prompt
 */

const { handleMessage } = require('../controllers/whatsappSQLiteController');
const { initDatabaseAndTables } = require('../database/initSQLiteDb');
const SQLiteMenu = require('../models/SQLiteMenu');
const SQLiteChat = require('../models/SQLiteChat');
const SQLiteMenuContent = require('../models/SQLiteMenuContent');
const SQLiteAdmin = require('../models/SQLiteAdmin');

// Inisialisasi database dan model
const db = initDatabaseAndTables();
const models = {
  menu: new SQLiteMenu(db),
  chat: new SQLiteChat(db),
  complaint: new SQLiteChat(db),
  menuContent: new SQLiteMenuContent(db),
  admin: new SQLiteAdmin(db)
};

// Mock message object
const createMockMessage = (text, senderId = '6281234567890') => ({
  key: {
    remoteJid: `${senderId}@s.whatsapp.net`,
    fromMe: false
  },
  message: {
    conversation: text
  }
});

// Mock sock object
const mockSock = {
  sendMessage: async (jid, content) => {
    console.log(`\n[RESPONSE to ${jid}]:`);
    console.log(content.text);
    console.log('=' + '='.repeat(50));
  }
};

// Test cases
const testCases = [
  { input: '2AB', description: 'Input tidak valid: 2AB (2 huruf)' },
  { input: '12A', description: 'Input tidak valid: 12A (2 digit)' },
  { input: 'ABC', description: 'Input tidak valid: ABC (3 huruf)' },
  { input: '2A', description: 'Input valid: 2A' },
  { input: '1B', description: 'Input valid: 1B' },
  { input: 'A', description: 'Input valid: A (huruf saja)' },
  { input: '2', description: 'Input valid: 2 (angka menu)' },
  { input: 'XYZ123', description: 'Input tidak valid: XYZ123' }
];

const runTests = async () => {
  console.log('='.repeat(60));
  console.log('TESTING INPUT VALIDATION');
  console.log('='.repeat(60));
  
  // Set context untuk simulasi user sedang di menu 2
  const testUserId = '6281234567890';
  const initialContext = {
    menu_id: 2,
    current_menu: 'Menu 2'
  };
  
  // Simpan context awal
  const chatMemory = {
    user_id: testUserId,
    context: JSON.stringify(initialContext)
  };
  
  try {
    await models.chat.addChatMemory(chatMemory);
    console.log('[SETUP] Context awal disimpan untuk user:', testUserId);
  } catch (error) {
    console.log('[SETUP] Error menyimpan context:', error.message);
  }
  
  for (const testCase of testCases) {
    console.log(`\n[TEST] ${testCase.description}`);
    console.log(`[INPUT] "${testCase.input}"`);
    
    try {
      const mockMsg = createMockMessage(testCase.input, testUserId);
      await handleMessage(models, mockMsg, mockSock);
    } catch (error) {
      console.log(`[ERROR] ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TESTING COMPLETED');
  console.log('='.repeat(60));
};

// Jalankan test
runTests().catch(console.error);