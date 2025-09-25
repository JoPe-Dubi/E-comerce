const path = require('path');

// Configurações de produção
const productionConfig = {
    // Ambiente
    NODE_ENV: 'production',
    
    // Servidor
    server: {
        port: process.env.PORT || 443,
        httpPort: process.env.HTTP_PORT || 80,
        host: process.env.HOST || '0.0.0.0',
        
        // Configurações SSL/TLS
        ssl: {
            enabled: true,
            keyPath: process.env.SSL_KEY_PATH || path.join(__dirname, '../certs/private-key.pem'),
            certPath: process.env.SSL_CERT_PATH || path.join(__dirname, '../certs/certificate.pem'),
            caPath: process.env.SSL_CA_PATH || path.join(__dirname, '../certs/ca-bundle.pem'),
            
            // Configurações avançadas SSL
            secureProtocol: 'TLSv1_2_method',
            ciphers: [
                'ECDHE-RSA-AES128-GCM-SHA256',
                'ECDHE-RSA-AES256-GCM-SHA384',
                'ECDHE-RSA-AES128-SHA256',
                'ECDHE-RSA-AES256-SHA384'
            ].join(':'),
            honorCipherOrder: true,
            secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3
        },
        
        // Timeouts
        timeout: 30000,
        keepAliveTimeout: 5000,
        headersTimeout: 60000,
        
        // Compressão
        compression: {
            enabled: true,
            level: 6,
            threshold: 1024,
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return require('compression').filter(req, res);
            }
        }
    },
    
    // Banco de dados
    database: {
        path: process.env.DB_PATH || path.join(__dirname, '../data/production.db'),
        
        // Pool de conexões
        pool: {
            min: 5,
            max: 20,
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 30000,
            destroyTimeoutMillis: 5000,
            idleTimeoutMillis: 30000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200
        },
        
        // Configurações SQLite para produção
        options: {
            journal_mode: 'WAL',
            synchronous: 'NORMAL',
            cache_size: -64000, // 64MB
            temp_store: 'MEMORY',
            mmap_size: 268435456, // 256MB
            optimize: true,
            
            // Backup automático
            backup: {
                enabled: true,
                interval: '0 2 * * *', // Todo dia às 2h
                retention: 30, // Manter 30 backups
                path: process.env.DB_BACKUP_PATH || path.join(__dirname, '../backups')
            }
        }
    },
    
    // Autenticação e segurança
    auth: {
        jwt: {
            secret: process.env.JWT_SECRET,
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
            algorithm: 'HS256',
            issuer: process.env.JWT_ISSUER || 'compreaqui-api',
            audience: process.env.JWT_AUDIENCE || 'compreaqui-app'
        },
        
        bcrypt: {
            rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
        },
        
        session: {
            secret: process.env.SESSION_SECRET,
            name: 'compreaqui.sid',
            resave: false,
            saveUninitialized: false,
            rolling: true,
            cookie: {
                secure: true, // HTTPS obrigatório
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 horas
                sameSite: 'strict'
            }
        },
        
        // Rate limiting
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutos
            max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
            
            // Rate limiting específico para autenticação
            auth: {
                windowMs: 15 * 60 * 1000, // 15 minutos
                max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5,
                skipSuccessfulRequests: true
            },
            
            // Rate limiting para API
            api: {
                windowMs: 15 * 60 * 1000,
                max: 1000,
                standardHeaders: true,
                legacyHeaders: false
            }
        }
    },
    
    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://compreaqui.com'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
        maxAge: 86400 // 24 horas
    },
    
    // Cabeçalhos de segurança
    security: {
        hsts: {
            enabled: true,
            maxAge: 31536000, // 1 ano
            includeSubDomains: true,
            preload: true
        },
        
        csp: {
            enabled: true,
            reportOnly: false,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "https://api.compreaqui.com"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: true,
                blockAllMixedContent: true
            },
            reportUri: '/api/security/csp-report'
        },
        
        frameOptions: {
            enabled: true,
            action: 'DENY'
        },
        
        contentTypeOptions: {
            enabled: true
        },
        
        xssProtection: {
            enabled: true,
            mode: '1; mode=block'
        },
        
        referrerPolicy: {
            enabled: true,
            policy: 'strict-origin-when-cross-origin'
        },
        
        permissionsPolicy: {
            enabled: true,
            directives: {
                camera: ['none'],
                microphone: ['none'],
                geolocation: ['self'],
                payment: ['self'],
                usb: ['none']
            }
        }
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        
        // Arquivos de log
        files: {
            error: {
                enabled: true,
                path: path.join(__dirname, '../logs/error.log'),
                maxSize: '10m',
                maxFiles: 5
            },
            combined: {
                enabled: true,
                path: path.join(__dirname, '../logs/combined.log'),
                maxSize: '10m',
                maxFiles: 5
            },
            access: {
                enabled: true,
                path: path.join(__dirname, '../logs/access.log'),
                maxSize: '10m',
                maxFiles: 10
            }
        },
        
        // Logging remoto (opcional)
        remote: {
            enabled: process.env.REMOTE_LOGGING === 'true',
            endpoint: process.env.LOG_ENDPOINT,
            apiKey: process.env.LOG_API_KEY
        }
    },
    
    // Monitoramento
    monitoring: {
        enabled: true,
        
        // Métricas
        metrics: {
            enabled: true,
            interval: 60000, // 1 minuto
            retention: 7 * 24 * 60 * 60 * 1000, // 7 dias
            
            // Alertas
            alerts: {
                enabled: true,
                
                // Canais de notificação
                channels: {
                    email: {
                        enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
                        smtp: {
                            host: process.env.SMTP_HOST,
                            port: parseInt(process.env.SMTP_PORT) || 587,
                            secure: process.env.SMTP_SECURE === 'true',
                            auth: {
                                user: process.env.SMTP_USER,
                                pass: process.env.SMTP_PASS
                            }
                        },
                        to: process.env.ALERT_EMAIL_TO,
                        from: process.env.ALERT_EMAIL_FROM
                    },
                    
                    webhook: {
                        enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
                        url: process.env.ALERT_WEBHOOK_URL,
                        secret: process.env.ALERT_WEBHOOK_SECRET
                    }
                },
                
                // Regras de alerta
                rules: [
                    {
                        name: 'high_error_rate',
                        condition: 'error_rate > 5',
                        severity: 'critical',
                        cooldown: 300000 // 5 minutos
                    },
                    {
                        name: 'slow_response_time',
                        condition: 'avg_response_time > 2000',
                        severity: 'warning',
                        cooldown: 600000 // 10 minutos
                    },
                    {
                        name: 'high_memory_usage',
                        condition: 'memory_usage > 80',
                        severity: 'warning',
                        cooldown: 300000
                    },
                    {
                        name: 'database_slow_queries',
                        condition: 'db_slow_queries > 10',
                        severity: 'warning',
                        cooldown: 600000
                    }
                ]
            }
        },
        
        // Health checks
        healthCheck: {
            enabled: true,
            interval: 30000, // 30 segundos
            timeout: 5000,
            
            checks: [
                'database',
                'memory',
                'disk',
                'external_apis'
            ]
        }
    },
    
    // Cache
    cache: {
        enabled: true,
        
        // Cache em memória
        memory: {
            max: 1000,
            ttl: 300000 // 5 minutos
        },
        
        // Redis (se disponível)
        redis: {
            enabled: process.env.REDIS_ENABLED === 'true',
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB) || 0,
            
            // Configurações de conexão
            connectTimeout: 10000,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            
            // Pool de conexões
            family: 4,
            keepAlive: true
        }
    },
    
    // Upload de arquivos
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        
        // Armazenamento
        storage: {
            type: process.env.STORAGE_TYPE || 'local', // local, s3, cloudinary
            
            local: {
                path: path.join(__dirname, '../uploads'),
                publicPath: '/uploads'
            },
            
            s3: {
                bucket: process.env.S3_BUCKET,
                region: process.env.S3_REGION,
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            }
        }
    },
    
    // Email
    email: {
        enabled: true,
        
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            
            // Pool de conexões
            pool: true,
            maxConnections: 5,
            maxMessages: 100
        },
        
        defaults: {
            from: process.env.EMAIL_FROM || 'noreply@compreaqui.com'
        },
        
        templates: {
            path: path.join(__dirname, '../templates/email')
        }
    },
    
    // Pagamentos
    payment: {
        // Configurações do provedor de pagamento
        provider: process.env.PAYMENT_PROVIDER || 'stripe',
        
        stripe: {
            publicKey: process.env.STRIPE_PUBLIC_KEY,
            secretKey: process.env.STRIPE_SECRET_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
        },
        
        // Configurações gerais
        currency: 'BRL',
        
        // Webhook de notificações
        webhook: {
            enabled: true,
            path: '/api/payments/webhook'
        }
    },
    
    // Otimizações de performance
    performance: {
        // Clustering
        cluster: {
            enabled: process.env.CLUSTER_ENABLED === 'true',
            workers: parseInt(process.env.CLUSTER_WORKERS) || require('os').cpus().length
        },
        
        // Compressão de resposta
        compression: {
            enabled: true,
            level: 6,
            threshold: 1024
        },
        
        // Cache de assets estáticos
        staticCache: {
            enabled: true,
            maxAge: 31536000000, // 1 ano
            immutable: true
        }
    },
    
    // Configurações específicas da aplicação
    app: {
        name: 'CompreAqui',
        version: process.env.APP_VERSION || '1.0.0',
        url: process.env.APP_URL || 'https://compreaqui.com',
        
        // Configurações de negócio
        business: {
            currency: 'BRL',
            locale: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            
            // Configurações de produtos
            products: {
                maxImages: 10,
                maxDescriptionLength: 5000,
                categories: {
                    maxDepth: 3
                }
            },
            
            // Configurações de pedidos
            orders: {
                statusTimeout: 24 * 60 * 60 * 1000, // 24 horas
                cancelTimeout: 30 * 60 * 1000 // 30 minutos
            }
        }
    }
};

// Validação de configurações obrigatórias
const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'BCRYPT_ROUNDS'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não definidas:', missingVars);
    process.exit(1);
}

// Validação de certificados SSL
if (productionConfig.server.ssl.enabled) {
    const fs = require('fs');
    const requiredFiles = [
        productionConfig.server.ssl.keyPath,
        productionConfig.server.ssl.certPath
    ];
    
    const missingFiles = requiredFiles.filter(filePath => {
        try {
            fs.accessSync(filePath);
            return false;
        } catch {
            return true;
        }
    });
    
    if (missingFiles.length > 0) {
        console.warn('⚠️ Arquivos SSL não encontrados:', missingFiles);
        console.warn('SSL será desabilitado. Configure os certificados para produção.');
        productionConfig.server.ssl.enabled = false;
    }
}

module.exports = productionConfig;