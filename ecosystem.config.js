module.exports = {
  apps: [{
    name: 'bot-whatsapp-production',
    script: 'index.js',
    instances: 3, // Menggunakan 3 instance untuk 4 core (sisakan 1 core untuk sistem)
    exec_mode: 'cluster',
    
    // Memory Management - Optimasi untuk 8GB RAM
    max_memory_restart: '1500MB', // Restart jika memory > 1.5GB per instance
    node_args: '--max-old-space-size=1536', // Limit heap size Node.js
    
    // Environment
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging - Optimasi untuk production
    log_file: './logs/pm2-combined.log',
    out_file: './logs/pm2-out.log',
    error_file: './logs/pm2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto Restart Configuration
    autorestart: true,
    watch: false, // Disable watch di production untuk performa
    max_restarts: 10,
    min_uptime: '10s',
    
    // Performance Optimization
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // Cache & Memory Optimization
    cron_restart: '0 2 * * *', // Restart harian jam 2 pagi untuk clear cache
    
    // Health Check
    health_check_grace_period: 3000,
    
    // Advanced Settings untuk WhatsApp Bot
    increment_var: 'PORT',
    
    // Script untuk cleanup cache sebelum restart
    pre_reload: './scripts/cleanup-cache.js'
  }],
  
  // Deploy configuration (opsional)
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'git@github.com:repo.git',
      path: '/var/www/production',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};