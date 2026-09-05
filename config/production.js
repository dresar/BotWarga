/**
 * Production Configuration
 * Optimasi untuk VPS 4 core 8GB RAM dengan cache limit 5GB
 */

module.exports = {
  // Environment
  NODE_ENV: 'production',
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0',
    keepAliveTimeout: 65000,
    headersTimeout: 66000
  },
  
  // Database Configuration - Optimized for production
  database: {
    sqlite: {
      // Connection pool settings
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000
      },
      
      // SQLite optimization settings
      pragma: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: -64000, // 64MB cache
        temp_store: 'MEMORY',
        mmap_size: 268435456, // 256MB
        optimize: true
      },
      
      // Auto vacuum and maintenance
      maintenance: {
        autoVacuum: true,
        vacuumInterval: '0 2 * * *', // Daily at 2 AM
        analyzeInterval: '0 3 * * 0', // Weekly on Sunday at 3 AM
        checkpointInterval: '*/30 * * * *' // Every 30 minutes
      }
    }
  },
  
  // Memory Management
  memory: {
    // Node.js heap settings
    maxOldSpaceSize: 1536, // 1.5GB per instance
    maxSemiSpaceSize: 128,  // 128MB
    
    // Garbage collection settings
    gc: {
      interval: 300000, // Force GC every 5 minutes
      threshold: 0.8    // Trigger GC at 80% memory usage
    },
    
    // Cache settings
    cache: {
      maxSize: 5368709120, // 5GB in bytes
      ttl: 3600000,        // 1 hour TTL
      checkPeriod: 300000  // Check every 5 minutes
    }
  },
  
  // WhatsApp Bot Configuration
  whatsapp: {
    // Session management
    session: {
      maxSessions: 100,
      sessionTimeout: 1800000, // 30 minutes
      cleanupInterval: 600000   // 10 minutes
    },
    
    // Message handling
    messages: {
      maxQueueSize: 1000,
      processingTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 5000
    },
    
    // Rate limiting
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      skipSuccessfulRequests: true
    }
  },
  
  // Logging Configuration
  logging: {
    level: 'info',
    format: 'combined',
    
    // File logging
    files: {
      error: './logs/error.log',
      combined: './logs/combined.log',
      access: './logs/access.log'
    },
    
    // Log rotation
    rotation: {
      maxSize: '100MB',
      maxFiles: 10,
      datePattern: 'YYYY-MM-DD'
    },
    
    // Performance logging
    performance: {
      enabled: true,
      slowQueryThreshold: 1000, // 1 second
      memoryCheckInterval: 60000 // 1 minute
    }
  },
  
  // Security Configuration
  security: {
    // Rate limiting
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000 // limit each IP to 1000 requests per windowMs
    },
    
    // CORS
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    },
    
    // Helmet security headers
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:']
        }
      }
    }
  },
  
  // Performance Optimization
  performance: {
    // Compression
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024
    },
    
    // Clustering
    cluster: {
      enabled: true,
      workers: 3, // 3 workers for 4 core system
      respawn: true,
      maxRestarts: 10
    },
    
    // Connection pooling
    connectionPool: {
      maxConnections: 100,
      idleTimeout: 30000,
      acquireTimeout: 60000
    }
  },
  
  // Monitoring Configuration
  monitoring: {
    // Health checks
    healthCheck: {
      enabled: true,
      interval: 30000, // 30 seconds
      timeout: 5000,   // 5 seconds
      retries: 3
    },
    
    // Metrics collection
    metrics: {
      enabled: true,
      interval: 60000, // 1 minute
      retention: 86400000 // 24 hours
    },
    
    // Alerts
    alerts: {
      memory: {
        warning: 0.8,  // 80%
        critical: 0.9  // 90%
      },
      cpu: {
        warning: 0.7,  // 70%
        critical: 0.9  // 90%
      },
      disk: {
        warning: 0.8,  // 80%
        critical: 0.95 // 95%
      }
    }
  },
  
  // Backup Configuration
  backup: {
    enabled: true,
    schedule: '0 1 * * *', // Daily at 1 AM
    retention: 7, // Keep 7 days
    
    targets: [
      './database.db',
      './data/chat.db',
      './database/bot.db',
      './database/village_system.db',
      './uploads',
      './logs'
    ],
    
    destination: './backups',
    compression: true
  },
  
  // Cache Configuration
  cache: {
    // Redis-like in-memory cache
    memory: {
      maxSize: 1073741824, // 1GB
      ttl: 3600,           // 1 hour
      checkPeriod: 600     // 10 minutes
    },
    
    // File cache
    file: {
      maxSize: 2147483648, // 2GB
      ttl: 86400,          // 24 hours
      cleanupInterval: 3600 // 1 hour
    }
  },
  
  // Error Handling
  errorHandling: {
    // Graceful shutdown
    gracefulShutdown: {
      timeout: 30000, // 30 seconds
      forceExit: true
    },
    
    // Error reporting
    reporting: {
      enabled: true,
      logErrors: true,
      notifyOnCritical: true
    }
  }
};