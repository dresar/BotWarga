// Profanity Filter untuk Bot WhatsApp
// Filter kata-kata kotor dan tidak pantas

class ProfanityFilter {
  constructor() {
    // Daftar kata-kata yang dilarang (bahasa Indonesia dan Inggris)
    this.bannedWords = [
      // Kata kotor bahasa Indonesia
      'anjing', 'babi', 'bangsat', 'bajingan', 'brengsek', 'kampret', 'kontol', 'memek', 'pepek',
      'ngentot', 'entot', 'jancok', 'jancuk', 'tolol', 'goblok', 'idiot', 'bodoh', 'sialan',
      'setan', 'iblis', 'laknat', 'terkutuk', 'biadab', 'kunyuk', 'monyet', 'kera',
      'tai', 'tahi', 'berak', 'kentut', 'peler', 'titit', 'toket', 'nenen',
      
      // Kata kotor bahasa Inggris
      'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap', 'hell',
      'stupid', 'idiot', 'moron', 'retard', 'gay', 'lesbian', 'whore', 'slut',
      
      // Kata-kata SARA dan diskriminatif
      'kafir', 'kristen', 'islam', 'hindu', 'budha', 'yahudi', 'cina', 'pribumi',
      'aseng', 'inlander', 'negro', 'nigger', 'terrorist', 'teroris',
      
      // Kata-kata politik sensitif
      'pki', 'komunis', 'separatis', 'makar', 'kudeta', 'revolusi'
    ];
    
    // Variasi penulisan dengan angka dan simbol
    this.variations = {
      'a': ['@', '4'],
      'e': ['3'],
      'i': ['1', '!'],
      'o': ['0'],
      's': ['$', '5'],
      't': ['7']
    };
  }
  
  // Normalisasi teks untuk deteksi yang lebih akurat
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Hapus karakter khusus
      .replace(/\s+/g, ' ') // Normalisasi spasi
      .trim();
  }
  
  // Generate variasi kata dengan angka dan simbol
  generateVariations(word) {
    const variations = [word];
    
    for (const [letter, replacements] of Object.entries(this.variations)) {
      const newVariations = [];
      for (const variation of variations) {
        for (const replacement of replacements) {
          newVariations.push(variation.replace(new RegExp(letter, 'g'), replacement));
        }
      }
      variations.push(...newVariations);
    }
    
    return [...new Set(variations)];
  }
  
  // Cek apakah teks mengandung kata kotor
  containsProfanity(text) {
    if (!text || typeof text !== 'string') return false;
    
    const normalizedText = this.normalizeText(text);
    
    for (const word of this.bannedWords) {
      const variations = this.generateVariations(word);
      
      for (const variation of variations) {
        // Cek kata utuh
        const wordRegex = new RegExp(`\\b${variation}\\b`, 'i');
        if (wordRegex.test(normalizedText)) {
          return {
            found: true,
            word: variation,
            original: word
          };
        }
        
        // Cek substring untuk kata yang disamarkan
        if (normalizedText.includes(variation)) {
          return {
            found: true,
            word: variation,
            original: word
          };
        }
      }
    }
    
    return { found: false };
  }
  
  // Filter dan bersihkan teks
  filterText(text) {
    if (!text || typeof text !== 'string') return text;
    
    let filteredText = text;
    const normalizedText = this.normalizeText(text);
    
    for (const word of this.bannedWords) {
      const variations = this.generateVariations(word);
      
      for (const variation of variations) {
        const regex = new RegExp(variation, 'gi');
        filteredText = filteredText.replace(regex, '*'.repeat(variation.length));
      }
    }
    
    return filteredText;
  }
  
  // Validasi input untuk admin
  validateAdminInput(text) {
    const profanityCheck = this.containsProfanity(text);
    
    if (profanityCheck.found) {
      return {
        valid: false,
        error: `Kata tidak pantas terdeteksi: "${profanityCheck.word}". Mohon gunakan bahasa yang sopan.`,
        originalWord: profanityCheck.original
      };
    }
    
    return { valid: true };
  }
  
  // Tambah kata baru ke daftar banned
  addBannedWord(word) {
    if (word && typeof word === 'string') {
      const normalizedWord = word.toLowerCase().trim();
      if (!this.bannedWords.includes(normalizedWord)) {
        this.bannedWords.push(normalizedWord);
        return true;
      }
    }
    return false;
  }
  
  // Hapus kata dari daftar banned
  removeBannedWord(word) {
    if (word && typeof word === 'string') {
      const normalizedWord = word.toLowerCase().trim();
      const index = this.bannedWords.indexOf(normalizedWord);
      if (index > -1) {
        this.bannedWords.splice(index, 1);
        return true;
      }
    }
    return false;
  }
  
  // Get statistik filter
  getStats() {
    return {
      totalBannedWords: this.bannedWords.length,
      categories: {
        indonesian: this.bannedWords.filter(w => ['anjing', 'babi', 'bangsat', 'bajingan'].includes(w)).length,
        english: this.bannedWords.filter(w => ['fuck', 'shit', 'damn', 'bitch'].includes(w)).length,
        sara: this.bannedWords.filter(w => ['kafir', 'kristen', 'islam', 'hindu'].includes(w)).length,
        political: this.bannedWords.filter(w => ['pki', 'komunis', 'separatis'].includes(w)).length
      }
    };
  }
}

// Export singleton instance
const profanityFilter = new ProfanityFilter();
module.exports = profanityFilter;