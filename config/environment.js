const path = require('path');
const fs = require('fs');

class EnvironmentManager {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.config = null;
        this.secrets = new Map();
        
        // Carregar configurações
        this.loadConfiguration();
        this.loadSecrets();
        this.validateConfiguration();
    }

    // Carregar configurações baseadas no ambiente
    loadConfiguration() {
        try {
            // Configurações base
            const baseConfig = this.loadConfigFile('base.js');
            
            // Configurações específicas do ambiente
            const envConfig = this.loadConfigFile(`${this.environment}.js`);
            
            // Configurações locais (opcional, não versionado)
            const localConfig = this.loadConfigFile('local.js', false);
            
            // Mesclar configurações
            this.config = this.mergeConfigurations(baseConfig, envConfig, localConfig);
            
            // Aplicar variáveis de ambiente
            this.applyEnvironmentVariables();
            
            console.log(`✅ Configurações carregadas para ambiente: ${this.environment}`);
        } catch (error) {
            console.error('❌ Erro ao carregar configurações:', error);
            throw error;
        }
    }

    // Carregar arquivo de configuração
    loadConfigFile(filename, required = true) {
        const configPath = path.join(__dirname, filename);
        
        try {
            if (fs.existsSync(configPath)) {
                // Limpar cache do require para recarregar
                delete require.cache[require.resolve(configPath)];
                return require(configPath);
            } else if (required) {
                throw new Error(`Arquivo de configuração obrigatório não encontrado: ${filename}`);
            }
            return {};
        } catch (error) {
            if (required) {
                throw error;
            }
            return {};
        }
    }

    // Mesclar configurações
    mergeConfigurations(...configs) {
        return configs.reduce((merged, config) => {
            return this.deepMerge(merged, config || {});
        }, {});
    }

    // Merge profundo de objetos
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(source[key]) && this.isObject(target[key])) {
                    result[key] = this.deepMerge(target[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    // Verificar se é objeto
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    // Aplicar variáveis de ambiente
    applyEnvironmentVariables() {
        // Mapeamento de variáveis de ambiente para configurações
        const envMappings = {
            // Servidor
            'PORT': 'server.port',
            'HOST': 'server.host',
            'HTTP_PORT': 'server.httpPort',
            
            // SSL
            'SSL_KEY_PATH': 'server.ssl.keyPath',
            'SSL_CERT_PATH': 'server.ssl.certPath',
            'SSL_CA_PATH': 'server.ssl.caPath',
            
            // Banco de dados
            'DB_PATH': 'database.path',
            'DB_BACKUP_PATH': 'database.options.backup.path',
            
            // Autenticação
            'JWT_SECRET': 'auth.jwt.secret',
            'JWT_EXPIRES_IN': 'auth.jwt.expiresIn',
            'JWT_REFRESH_EXPIRES_IN': 'auth.jwt.refreshExpiresIn',
            'JWT_ISSUER': 'auth.jwt.issuer',
            'JWT_AUDIENCE': 'auth.jwt.audience',
            'SESSION_SECRET': 'auth.session.secret',
            'BCRYPT_ROUNDS': 'auth.bcrypt.rounds',
            
            // CORS
            'CORS_ORIGIN': 'cors.origin',
            
            // Rate Limiting
            'RATE_LIMIT_WINDOW': 'auth.rateLimit.windowMs',
            'RATE_LIMIT_MAX': 'auth.rateLimit.max',
            'RATE_LIMIT_AUTH_MAX': 'auth.rateLimit.auth.max',
            
            // Logging
            'LOG_LEVEL': 'logging.level',
            'LOG_ENDPOINT': 'logging.remote.endpoint',
            'LOG_API_KEY': 'logging.remote.apiKey',
            
            // Email/SMTP
            'SMTP_HOST': 'email.smtp.host',
            'SMTP_PORT': 'email.smtp.port',
            'SMTP_USER': 'email.smtp.auth.user',
            'SMTP_PASS': 'email.smtp.auth.pass',
            'SMTP_SECURE': 'email.smtp.secure',
            'EMAIL_FROM': 'email.defaults.from',
            
            // Alertas
            'ALERT_EMAIL_ENABLED': 'monitoring.metrics.alerts.channels.email.enabled',
            'ALERT_EMAIL_TO': 'monitoring.metrics.alerts.channels.email.to',
            'ALERT_EMAIL_FROM': 'monitoring.metrics.alerts.channels.email.from',
            'ALERT_WEBHOOK_ENABLED': 'monitoring.metrics.alerts.channels.webhook.enabled',
            'ALERT_WEBHOOK_URL': 'monitoring.metrics.alerts.channels.webhook.url',
            'ALERT_WEBHOOK_SECRET': 'monitoring.metrics.alerts.channels.webhook.secret',
            
            // Cache/Redis
            'REDIS_ENABLED': 'cache.redis.enabled',
            'REDIS_HOST': 'cache.redis.host',
            'REDIS_PORT': 'cache.redis.port',
            'REDIS_PASSWORD': 'cache.redis.password',
            'REDIS_DB': 'cache.redis.db',
            
            // Upload/Storage
            'MAX_FILE_SIZE': 'upload.maxFileSize',
            'STORAGE_TYPE': 'upload.storage.type',
            'S3_BUCKET': 'upload.storage.s3.bucket',
            'S3_REGION': 'upload.storage.s3.region',
            'S3_ACCESS_KEY_ID': 'upload.storage.s3.accessKeyId',
            'S3_SECRET_ACCESS_KEY': 'upload.storage.s3.secretAccessKey',
            
            // Pagamentos
            'PAYMENT_PROVIDER': 'payment.provider',
            'STRIPE_PUBLIC_KEY': 'payment.stripe.publicKey',
            'STRIPE_SECRET_KEY': 'payment.stripe.secretKey',
            'STRIPE_WEBHOOK_SECRET': 'payment.stripe.webhookSecret',
            
            // Performance
            'CLUSTER_ENABLED': 'performance.cluster.enabled',
            'CLUSTER_WORKERS': 'performance.cluster.workers',
            
            // App
            'APP_VERSION': 'app.version',
            'APP_URL': 'app.url'
        };
        
        // Aplicar mapeamentos
        Object.entries(envMappings).forEach(([envVar, configPath]) => {
            const envValue = process.env[envVar];
            if (envValue !== undefined) {
                this.setNestedProperty(this.config, configPath, this.parseEnvValue(envValue));
            }
        });
        
        // Processar arrays (ex: CORS_ORIGIN)
        if (process.env.CORS_ORIGIN) {
            this.setNestedProperty(this.config, 'cors.origin', process.env.CORS_ORIGIN.split(','));
        }
        
        if (process.env.SSL_DOMAINS) {
            this.setNestedProperty(this.config, 'server.ssl.domains', process.env.SSL_DOMAINS.split(','));
        }
    }

    // Definir propriedade aninhada
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || !this.isObject(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    // Parsear valor de variável de ambiente
    parseEnvValue(value) {
        // Boolean
        if (value === 'true') return true;
        if (value === 'false') return false;
        
        // Number
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
        
        // String
        return value;
    }

    // Carregar secrets de arquivos ou variáveis de ambiente
    loadSecrets() {
        const secretsPath = path.join(__dirname, 'secrets.json');
        
        try {
            if (fs.existsSync(secretsPath)) {
                const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
                Object.entries(secrets).forEach(([key, value]) => {
                    this.secrets.set(key, value);
                });
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar secrets:', error.message);
        }
        
        // Carregar secrets de variáveis de ambiente
        const secretEnvVars = [
            'JWT_SECRET',
            'SESSION_SECRET',
            'SMTP_PASS',
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'S3_SECRET_ACCESS_KEY',
            'REDIS_PASSWORD',
            'ALERT_WEBHOOK_SECRET'
        ];
        
        secretEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                this.secrets.set(envVar, process.env[envVar]);
            }
        });
    }

    // Validar configurações
    validateConfiguration() {
        const errors = [];
        const warnings = [];
        
        // Validações obrigatórias por ambiente
        const requiredConfigs = {
            production: [
                'auth.jwt.secret',
                'auth.session.secret',
                'auth.bcrypt.rounds'
            ],
            development: [
                'auth.jwt.secret',
                'auth.session.secret'
            ],
            test: [
                'auth.jwt.secret'
            ]
        };
        
        const required = requiredConfigs[this.environment] || [];
        
        required.forEach(configPath => {
            if (!this.getNestedProperty(this.config, configPath)) {
                errors.push(`Configuração obrigatória não definida: ${configPath}`);
            }
        });
        
        // Validações específicas
        this.validateSecuritySettings(errors, warnings);
        this.validateDatabaseSettings(errors, warnings);
        this.validateEmailSettings(warnings);
        this.validateSSLSettings(warnings);
        
        // Reportar problemas
        if (errors.length > 0) {
            console.error('❌ Erros de configuração:', errors);
            throw new Error('Configuração inválida');
        }
        
        if (warnings.length > 0) {
            console.warn('⚠️ Avisos de configuração:', warnings);
        }
    }

    // Validar configurações de segurança
    validateSecuritySettings(errors, warnings) {
        // JWT Secret
        const jwtSecret = this.get('auth.jwt.secret');
        if (jwtSecret && jwtSecret.length < 32) {
            warnings.push('JWT secret deve ter pelo menos 32 caracteres');
        }
        
        // Session Secret
        const sessionSecret = this.get('auth.session.secret');
        if (sessionSecret && sessionSecret.length < 32) {
            warnings.push('Session secret deve ter pelo menos 32 caracteres');
        }
        
        // BCrypt rounds
        const bcryptRounds = this.get('auth.bcrypt.rounds');
        if (bcryptRounds && (bcryptRounds < 10 || bcryptRounds > 15)) {
            warnings.push('BCrypt rounds recomendado entre 10-15');
        }
        
        // HTTPS em produção
        if (this.environment === 'production' && !this.get('server.ssl.enabled')) {
            warnings.push('HTTPS deve ser habilitado em produção');
        }
    }

    // Validar configurações de banco de dados
    validateDatabaseSettings(errors, warnings) {
        const dbPath = this.get('database.path');
        if (!dbPath) {
            errors.push('Caminho do banco de dados não definido');
            return;
        }
        
        // Verificar se diretório existe
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            try {
                fs.mkdirSync(dbDir, { recursive: true });
            } catch (error) {
                errors.push(`Não foi possível criar diretório do banco: ${dbDir}`);
            }
        }
    }

    // Validar configurações de email
    validateEmailSettings(warnings) {
        if (this.get('email.enabled')) {
            const requiredEmailSettings = [
                'email.smtp.host',
                'email.smtp.auth.user',
                'email.smtp.auth.pass'
            ];
            
            const missingEmailSettings = requiredEmailSettings.filter(setting => 
                !this.get(setting)
            );
            
            if (missingEmailSettings.length > 0) {
                warnings.push(`Configurações de email incompletas: ${missingEmailSettings.join(', ')}`);
            }
        }
    }

    // Validar configurações SSL
    validateSSLSettings(warnings) {
        if (this.get('server.ssl.enabled')) {
            const sslFiles = [
                this.get('server.ssl.keyPath'),
                this.get('server.ssl.certPath')
            ];
            
            const missingFiles = sslFiles.filter(filePath => {
                return filePath && !fs.existsSync(filePath);
            });
            
            if (missingFiles.length > 0) {
                warnings.push(`Arquivos SSL não encontrados: ${missingFiles.join(', ')}`);
            }
        }
    }

    // Obter propriedade aninhada
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : null;
        }, obj);
    }

    // Obter configuração
    get(path, defaultValue = null) {
        const value = this.getNestedProperty(this.config, path);
        return value !== null ? value : defaultValue;
    }

    // Obter secret
    getSecret(key) {
        return this.secrets.get(key);
    }

    // Verificar se é ambiente de desenvolvimento
    isDevelopment() {
        return this.environment === 'development';
    }

    // Verificar se é ambiente de produção
    isProduction() {
        return this.environment === 'production';
    }

    // Verificar se é ambiente de teste
    isTest() {
        return this.environment === 'test';
    }

    // Obter todas as configurações
    getAll() {
        return { ...this.config };
    }

    // Obter configurações sanitizadas (sem secrets)
    getSanitized() {
        const sanitized = JSON.parse(JSON.stringify(this.config));
        
        // Remover campos sensíveis
        const sensitiveFields = [
            'auth.jwt.secret',
            'auth.session.secret',
            'email.smtp.auth.pass',
            'payment.stripe.secretKey',
            'payment.stripe.webhookSecret',
            'upload.storage.s3.secretAccessKey',
            'cache.redis.password'
        ];
        
        sensitiveFields.forEach(field => {
            const keys = field.split('.');
            let current = sanitized;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (current[keys[i]]) {
                    current = current[keys[i]];
                } else {
                    break;
                }
            }
            
            if (current && current[keys[keys.length - 1]]) {
                current[keys[keys.length - 1]] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    // Recarregar configurações
    reload() {
        console.log('🔄 Recarregando configurações...');
        this.loadConfiguration();
        this.loadSecrets();
        this.validateConfiguration();
        console.log('✅ Configurações recarregadas');
    }

    // Obter informações do ambiente
    getEnvironmentInfo() {
        return {
            environment: this.environment,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            pid: process.pid,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            loadedAt: new Date().toISOString()
        };
    }

    // Exportar configurações para arquivo
    exportConfig(filePath, includeSecrets = false) {
        const config = includeSecrets ? this.getAll() : this.getSanitized();
        
        try {
            fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
            console.log(`✅ Configurações exportadas para: ${filePath}`);
        } catch (error) {
            console.error('❌ Erro ao exportar configurações:', error);
            throw error;
        }
    }
}

// Instância singleton
let environmentManager = null;

function getEnvironmentManager() {
    if (!environmentManager) {
        environmentManager = new EnvironmentManager();
    }
    return environmentManager;
}

module.exports = {
    EnvironmentManager,
    getEnvironmentManager,
    
    // Funções de conveniência
    get: (path, defaultValue) => getEnvironmentManager().get(path, defaultValue),
    getSecret: (key) => getEnvironmentManager().getSecret(key),
    isDevelopment: () => getEnvironmentManager().isDevelopment(),
    isProduction: () => getEnvironmentManager().isProduction(),
    isTest: () => getEnvironmentManager().isTest(),
    getAll: () => getEnvironmentManager().getAll(),
    getSanitized: () => getEnvironmentManager().getSanitized(),
    reload: () => getEnvironmentManager().reload()
};