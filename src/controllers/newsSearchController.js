const fs = require('fs');
const path = require('path');

/**
 * Simple Machine Learning News Search Controller
 * Menggunakan TF-IDF dan cosine similarity untuk pencarian berita
 */
class NewsSearchController {
    constructor() {
        this.newsData = [];
        this.vocabulary = new Set();
        this.loadNewsData();
    }

    /**
     * Load news data from JSON file
     */
    loadNewsData() {
        try {
            const newsPath = path.join(__dirname, '../../uploads/news/news.json');
            if (fs.existsSync(newsPath)) {
                const data = fs.readFileSync(newsPath, 'utf8');
                this.newsData = JSON.parse(data);
            } else {
                // Create sample news data if file doesn't exist
                this.createSampleNewsData();
            }
            this.buildVocabulary();
        } catch (error) {
            console.error('Error loading news data:', error);
            this.createSampleNewsData();
        }
    }

    /**
     * Create sample news data
     */
    createSampleNewsData() {
        this.newsData = [
            {
                id: 1,
                title: "Pembangunan Jalan Desa Pulosarok Tahap 2",
                content: "Pemerintah desa melanjutkan pembangunan infrastruktur jalan dengan anggaran dari dana desa. Proyek ini diharapkan dapat meningkatkan akses transportasi warga.",
                category: "infrastruktur",
                date: "2024-01-15",
                author: "Admin Desa"
            },
            {
                id: 2,
                title: "Program Vaksinasi COVID-19 Dosis Booster",
                content: "Puskesmas setempat mengadakan program vaksinasi booster untuk seluruh warga desa. Kegiatan dilaksanakan di balai desa setiap hari Senin dan Kamis.",
                category: "kesehatan",
                date: "2024-01-10",
                author: "Puskesmas Pulosarok"
            },
            {
                id: 3,
                title: "Pelatihan UMKM Digital Marketing",
                content: "Dinas Koperasi mengadakan pelatihan digital marketing untuk pelaku UMKM di desa. Pelatihan mencakup penggunaan media sosial dan e-commerce.",
                category: "ekonomi",
                date: "2024-01-08",
                author: "Dinas Koperasi"
            },
            {
                id: 4,
                title: "Gotong Royong Pembersihan Lingkungan",
                content: "Warga desa mengadakan kegiatan gotong royong pembersihan lingkungan setiap minggu pertama. Kegiatan ini untuk menjaga kebersihan dan kesehatan lingkungan.",
                category: "lingkungan",
                date: "2024-01-05",
                author: "RT/RW Setempat"
            },
            {
                id: 5,
                title: "Bantuan Sosial untuk Keluarga Kurang Mampu",
                content: "Pemerintah desa menyalurkan bantuan sosial berupa sembako untuk keluarga kurang mampu. Program ini rutin dilaksanakan setiap bulan.",
                category: "sosial",
                date: "2024-01-03",
                author: "Admin Desa"
            }
        ];
        this.saveNewsData();
    }

    /**
     * Save news data to JSON file
     */
    saveNewsData() {
        try {
            const newsPath = path.join(__dirname, '../../uploads/news/news.json');
            const newsDir = path.dirname(newsPath);
            if (!fs.existsSync(newsDir)) {
                fs.mkdirSync(newsDir, { recursive: true });
            }
            fs.writeFileSync(newsPath, JSON.stringify(this.newsData, null, 2));
        } catch (error) {
            console.error('Error saving news data:', error);
        }
    }

    /**
     * Build vocabulary from all news content
     */
    buildVocabulary() {
        this.vocabulary.clear();
        this.newsData.forEach(news => {
            const words = this.tokenize(news.title + ' ' + news.content);
            words.forEach(word => this.vocabulary.add(word));
        });
    }

    /**
     * Tokenize text into words
     */
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }

    /**
     * Calculate TF-IDF for a document
     */
    calculateTFIDF(document) {
        const words = this.tokenize(document);
        const wordCount = {};
        const tfidf = {};

        // Calculate term frequency
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Calculate TF-IDF
        Object.keys(wordCount).forEach(word => {
            const tf = wordCount[word] / words.length;
            const df = this.newsData.filter(news => 
                this.tokenize(news.title + ' ' + news.content).includes(word)
            ).length;
            const idf = Math.log(this.newsData.length / (df + 1));
            tfidf[word] = tf * idf;
        });

        return tfidf;
    }

    /**
     * Calculate cosine similarity between two TF-IDF vectors
     */
    cosineSimilarity(vector1, vector2) {
        const words = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        words.forEach(word => {
            const v1 = vector1[word] || 0;
            const v2 = vector2[word] || 0;
            dotProduct += v1 * v2;
            norm1 += v1 * v1;
            norm2 += v2 * v2;
        });

        if (norm1 === 0 || norm2 === 0) return 0;
        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    /**
     * Search news with ML-based relevance scoring
     */
    searchNews(query, limit = 5) {
        if (!query || query.trim().length === 0) {
            return this.newsData.slice(0, limit).map(news => ({
                ...news,
                relevanceScore: 0
            }));
        }

        const queryTFIDF = this.calculateTFIDF(query);
        const results = [];

        this.newsData.forEach(news => {
            const newsTFIDF = this.calculateTFIDF(news.title + ' ' + news.content);
            const similarity = this.cosineSimilarity(queryTFIDF, newsTFIDF);
            
            results.push({
                ...news,
                relevanceScore: similarity
            });
        });

        // Sort by relevance score (descending)
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        return results.slice(0, limit);
    }

    /**
     * Get news by category
     */
    getNewsByCategory(category, limit = 5) {
        const filtered = this.newsData.filter(news => 
            news.category && news.category.toLowerCase() === category.toLowerCase()
        );
        return filtered.slice(0, limit);
    }

    /**
     * Get latest news
     */
    getLatestNews(limit = 5) {
        const sorted = [...this.newsData].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        return sorted.slice(0, limit);
    }

    /**
     * Format search results for WhatsApp display
     */
    formatSearchResults(results, query = '') {
        if (results.length === 0) {
            return `🔍 *HASIL PENCARIAN BERITA*\n\nTidak ditemukan berita yang relevan dengan kata kunci: "${query}"\n\nSilakan coba dengan kata kunci lain.\n\n${'─'.repeat(35)}\n_Dibuat oleh Mahasiswa UMSU_`;
        }

        let message = `🔍 *HASIL PENCARIAN BERITA*\n`;
        if (query) {
            message += `Kata kunci: "${query}"\n`;
        }
        message += `\n`;

        results.forEach((news, index) => {
            const relevancePercent = Math.round((news.relevanceScore || 0) * 100);
            message += `${index + 1}. *${news.title || 'Judul tidak tersedia'}*\n`;
            message += `📅 ${news.date || 'Tanggal tidak tersedia'} | 👤 ${news.author || 'Penulis tidak tersedia'}\n`;
            message += `🏷️ ${(news.category || 'umum').toUpperCase()}`;
            if (news.relevanceScore && news.relevanceScore > 0) {
                message += ` | 📊 ${relevancePercent}% relevan`;
            }
            message += `\n${(news.content || 'Konten tidak tersedia').substring(0, 150)}...\n\n`;
        });

        message += `💡 *Tips:* Gunakan kata kunci yang lebih spesifik untuk hasil yang lebih akurat.\n\n${'─'.repeat(35)}\n_Dibuat oleh Mahasiswa UMSU_`;
        return message;
    }

    /**
     * Get available categories
     */
    getCategories() {
        const categories = [...new Set(this.newsData.map(news => news.category).filter(cat => cat))];
        return categories.sort();
    }

    /**
     * Handle news search commands from WhatsApp users
     */
    handleNewsCommand(messageText) {
        try {
            const text = messageText.toLowerCase().trim();
            
            // Perintah untuk melihat semua berita terbaru
            if (text === 'berita' || text === 'berita terbaru' || text === 'daftar berita') {
                const latestNews = this.getLatestNews(5);
                return {
                    text: this.formatSearchResults(latestNews, '')
                };
            }
            
            // Perintah untuk melihat kategori berita
            if (text === 'kategori berita' || text === 'kategori') {
                const categories = this.getCategories();
                let response = '🗂️ *KATEGORI BERITA TERSEDIA*\n\n';
                categories.forEach((category, index) => {
                    const count = this.newsData.filter(news => news.category === category).length;
                    response += `${index + 1}. ${(category || 'umum').toUpperCase()} (${count} berita)\n`;
                });
                response += '\n💡 Ketik "berita [kategori]" untuk melihat berita berdasarkan kategori\n';
                response += 'Contoh: "berita infrastruktur"\n\n';
                response += '─'.repeat(35) + '\n_Dibuat oleh Mahasiswa UMSU_';
                return { text: response };
            }
            
            // Perintah pencarian berdasarkan kategori
            if (text.startsWith('berita ')) {
                const category = text.replace('berita ', '').trim();
                const categoryNews = this.getNewsByCategory(category, 5);
                
                if (categoryNews.length === 0) {
                    return {
                        text: `🔍 *PENCARIAN BERITA KATEGORI*\n\n❌ Tidak ditemukan berita dengan kategori "${category}"\n\n📂 Kategori tersedia: ${this.getCategories().join(', ')}\n\n${'─'.repeat(35)}\n_Dibuat oleh Mahasiswa UMSU_`
                    };
                }
                
                return {
                    text: this.formatSearchResults(categoryNews, `kategori: ${category}`)
                };
            }
            
            // Perintah pencarian berdasarkan kata kunci
            if (text.startsWith('cari berita ')) {
                const query = text.replace('cari berita ', '').trim();
                const searchResults = this.searchNews(query, 5);
                return {
                    text: this.formatSearchResults(searchResults, query)
                };
            }
            
            // Default: tampilkan bantuan
            return {
                text: '🔍 *PENCARIAN BERITA DESA PULOSAROK*\n\n' +
                      '📝 *Perintah yang tersedia:*\n' +
                      '• "berita" - Lihat berita terbaru\n' +
                      '• "kategori berita" - Lihat daftar kategori\n' +
                      '• "berita [kategori]" - Filter berdasarkan kategori\n' +
                      '• "cari berita [kata kunci]" - Pencarian dengan ML\n\n' +
                      '💡 Contoh: "cari berita pembangunan" atau "berita kesehatan"\n\n' +
                      '─'.repeat(35) + '\n' +
                      '_Dibuat oleh Mahasiswa UMSU_'
            };
            
        } catch (error) {
            console.error('Error handling news command:', error.message);
            return {
                text: '❌ *Terjadi kesalahan*\n\n' +
                      '🔄 Silakan coba lagi atau hubungi admin.\n\n' +
                      '─'.repeat(35) + '\n' +
                      '_Dibuat oleh Mahasiswa UMSU_'
            };
        }
    }
}

module.exports = NewsSearchController;