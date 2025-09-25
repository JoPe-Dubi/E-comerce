#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const SecuritySystem = require('../security');
const config = require('../config/environment');

/**
 * Script de configuração para ambiente de produção
 * Configura SSL, variáveis de ambiente e validações de segurança
 */
class ProductionSetup {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..');
        this.envFile = path.join(this.projectRoot, '.env.production');
        this.sslDir = path.join(this.projectRoot, 'ssl');
        this.configDir = path.join(this.projectRoot, 'config');
    }

    /**
     * Executar configuração completa
     */
    async run() {
        console.log('🚀 Configurando ambiente de produção...\n');

        try {
            await this.checkPrerequisites();
            await this.createDirectories();
            await this.generateSecrets();
            await this.createProductionEnv();
            await this.setupSSL();
            await this.validateConfiguration();
            await this.createStartupScript();
            
            console.log('\n✅ Configuração de produção concluída com sucesso!');
            console.log('\n📋 Próximos passos:');
            console.log('1. Revise o arquivo .env.production');
            console.log('2. Configure seu domínio e DNS');
            console.log('3. Execute: npm run start:production');
            
        } catch (error) {
            console.error('\n❌ Erro durante configuração:', error.message);
            process.exit(1);
        }
    }

    /**
     * Verificar pré-requisitos
     */
    async checkPrerequisites() {
        console.log('🔍 Verificando pré-requisitos...');
        
        // Verificar Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        
        if (majorVersion < 16) {
            throw new Error(`Node.js 16+ é necessário. Versão atual: ${nodeVersion}`);
        }
        
        // Verificar se é ambiente de produção
        if (process.env.NODE_ENV !== 'production') {
            console.log('⚠️ NODE_ENV não está definido como "production"');
        }
        
        console.log('✅ Pré-requisitos verificados');
    }

    /**
     * Criar diretórios necessários
     */
    async createDirectories() {
        console.log('📁 Criando diretórios...');
        
        const directories = [
            this.sslDir,
            path.join(this.projectRoot, 'logs'),
            path.join(this.projectRoot, 'uploads'),
            path.join(this.projectRoot, 'backups'),
            path.join(this.projectRoot, 'tmp')
        ];
        
        for (const dir of directories) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`  ✅ ${path.relative(this.projectRoot, dir)}`);
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    /**
     * Gerar segredos e chaves
     */
    async generateSecrets() {
        console.log('🔐 Gerando segredos...');
        
        this.secrets = {
            JWT_SECRET: this.generateSecret(64),
            JWT_REFRESH_SECRET: this.generateSecret(64),
            SESSION_SECRET: this.generateSecret(32),
            ENCRYPTION_KEY: this.generateSecret(32),
            WEBHOOK_SECRET: this.generateSecret(32),
            API_KEY: this.generateSecret(48)
        };
        
        console.log('✅ Segredos gerados');
    }

    /**
     * Gerar segredo aleatório
     */
    generateSecret(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Criar arquivo .env.production
     */
    async createProductionEnv() {
        console.log('📝 Criando .env.production...');
        
        const envContent = this.generateEnvContent();
        
        try {
            // Verificar se arquivo já existe
            await fs.access(this.envFile);
            console.log('⚠️ Arquivo .env.production já existe');
            
            // Criar backup
            const backupFile = `${this.envFile}.backup.${Date.now()}`;
            await fs.copyFile(this.envFile, backupFile);
            console.log(`📋 Backup criado: ${path.basename(backupFile)}`);
        } catch (error) {
            // Arquivo não existe, tudo bem
        }
        
        await fs.writeFile(this.envFile, envContent);
        console.log('✅ Arquivo .env.production criado');
    }

    /**
     * Gerar conteúdo do arquivo .env
     */
    generateEnvContent() {
        return `# Configuração de Produção
# Gerado automaticamente em ${new Date().toISOString()}

# Ambiente
NODE_ENV=production
PORT=3000
HTTPS_PORT=3443

# Domínio e URLs
DOMAIN=seu-dominio.com
BASE_URL=https://seu-dominio.com
ALLOWED_ORIGINS=https://seu-dominio.com

# Banco de Dados
DATABASE_URL=./data/production.db
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_TIMEOUT=30000

# Segurança - JWT
JWT_SECRET=${this.secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${this.secrets.JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Segurança - Sessões
SESSION_SECRET=${this.secrets.SESSION_SECRET}
SESSION_MAX_AGE=86400000

# Segurança - Criptografia
ENCRYPTION_KEY=${this.secrets.ENCRYPTION_KEY}

# SSL/TLS
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
SSL_CA_PATH=./ssl/ca-bundle.crt
FORCE_HTTPS=true
HSTS_MAX_AGE=31536000

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_SUCCESSFUL=true

# CORS
CORS_ORIGIN=https://seu-dominio.com
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Monitoramento
METRICS_ENABLED=true
ALERTS_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# E-mail (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@exemplo.com
SMTP_PASS=sua-senha-de-app
EMAIL_FROM=noreply@seu-dominio.com

# Pagamentos (Stripe)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=${this.secrets.WEBHOOK_SECRET}

# Upload de Arquivos
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,application/pdf
UPLOAD_DEST=./uploads

# Cache
CACHE_TTL=3600
REDIS_URL=redis://localhost:6379

# API Externa
API_KEY=${this.secrets.API_KEY}
WEBHOOK_SECRET=${this.secrets.WEBHOOK_SECRET}

# Performance
CLUSTER_WORKERS=0
COMPRESSION_ENABLED=true
STATIC_CACHE_MAX_AGE=31536000

# Backup
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION=7

# Desenvolvimento (desabilitado em produção)
DEBUG=false
MOCK_PAYMENTS=false
SKIP_SSL_VERIFICATION=false
`;
    }

    /**
     * Configurar SSL
     */
    async setupSSL() {
        console.log('🔒 Configurando SSL...');
        
        try {
            const securitySystem = new SecuritySystem();
            await securitySystem.initialize();
            
            const sslStatus = await securitySystem.checkCertificates();
            
            if (!sslStatus.exists) {
                console.log('📋 Certificados SSL não encontrados');
                console.log('💡 Opções para obter certificados SSL:');
                console.log('  1. Let\'s Encrypt (gratuito, automático)');
                console.log('  2. Certificado comercial');
                console.log('  3. Certificado auto-assinado (apenas desenvolvimento)');
                
                // Para desenvolvimento, gerar certificado auto-assinado
                if (process.env.NODE_ENV !== 'production') {
                    console.log('🔧 Gerando certificado auto-assinado para desenvolvimento...');
                    await securitySystem.sslManager.generateSelfSignedCertificate();
                    console.log('✅ Certificado auto-assinado gerado');
                }
            } else {
                console.log('✅ Certificados SSL encontrados');
                
                if (sslStatus.needsRenewal) {
                    console.log('⚠️ Certificado precisa ser renovado');
                }
            }
            
        } catch (error) {
            console.log('⚠️ Erro ao configurar SSL:', error.message);
            console.log('💡 Configure os certificados SSL manualmente');
        }
    }

    /**
     * Validar configuração
     */
    async validateConfiguration() {
        console.log('✅ Validando configuração...');
        
        try {
            // Carregar configuração de produção
            process.env.NODE_ENV = 'production';
            const prodConfig = config.get();
            
            // Validações básicas
            const validations = [
                { key: 'server.httpsPort', value: prodConfig.server?.httpsPort },
                { key: 'security.jwt.secret', value: prodConfig.security?.jwt?.secret },
                { key: 'database.url', value: prodConfig.database?.url },
                { key: 'security.ssl.keyPath', value: prodConfig.security?.ssl?.keyPath }
            ];
            
            for (const validation of validations) {
                if (!validation.value) {
                    console.log(`⚠️ Configuração ausente: ${validation.key}`);
                } else {
                    console.log(`✅ ${validation.key}`);
                }
            }
            
        } catch (error) {
            console.log('⚠️ Erro na validação:', error.message);
        }
    }

    /**
     * Criar script de inicialização
     */
    async createStartupScript() {
        console.log('📜 Criando script de inicialização...');
        
        const startupScript = `#!/usr/bin/env node

// Script de inicialização para produção
const SecuritySystem = require('./security');
const MonitoringSystem = require('./monitoring');
const app = require('./app');

async function startProduction() {
    try {
        console.log('🚀 Iniciando aplicação em modo produção...');
        
        // Inicializar sistema de segurança
        const security = new SecuritySystem();
        await security.initialize();
        
        // Configurar middlewares de segurança
        security.configureMiddlewares(app);
        
        // Inicializar monitoramento
        const monitoring = new MonitoringSystem();
        await monitoring.initialize();
        monitoring.configureMiddlewares(app);
        
        // Iniciar servidores
        await security.startServers(app);
        
        // Iniciar monitoramento
        await monitoring.start();
        
        console.log('✅ Aplicação iniciada com sucesso!');
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            console.log('🛑 Recebido SIGTERM, finalizando...');
            await monitoring.stop();
            await security.cleanup();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Erro ao iniciar aplicação:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    startProduction();
}

module.exports = { startProduction };
`;
        
        const scriptPath = path.join(this.projectRoot, 'start-production.js');
        await fs.writeFile(scriptPath, startupScript);
        
        // Tornar executável (Unix)
        if (process.platform !== 'win32') {
            await fs.chmod(scriptPath, '755');
        }
        
        console.log('✅ Script de inicialização criado');
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const setup = new ProductionSetup();
    setup.run().catch(console.error);
}

module.exports = ProductionSetup;