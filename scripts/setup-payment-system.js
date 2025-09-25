#!/usr/bin/env node

/**
 * Script de configuração do sistema de pagamento
 * Configura banco de dados, variáveis de ambiente e estrutura inicial
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class PaymentSystemSetup {
    constructor() {
        this.projectRoot = process.cwd();
        this.envFile = path.join(this.projectRoot, '.env');
        this.dbPath = path.join(this.projectRoot, 'database');
    }

    async setup() {
        console.log('🚀 Configurando Sistema de Pagamento...\n');

        try {
            await this.createDirectories();
            await this.setupEnvironment();
            await this.setupDatabase();
            await this.createConfigFiles();
            await this.verifySetup();

            console.log('\n✅ Sistema de pagamento configurado com sucesso!');
            console.log('\n📋 Próximos passos:');
            console.log('1. Execute: npm install');
            console.log('2. Configure suas chaves de API nos provedores de pagamento');
            console.log('3. Execute: npm run test:payment para testar o sistema');
            console.log('4. Execute: npm start para iniciar o servidor');

        } catch (error) {
            console.error('\n❌ Erro na configuração:', error.message);
            process.exit(1);
        }
    }

    async createDirectories() {
        console.log('📁 Criando estrutura de diretórios...');

        const directories = [
            'database',
            'logs',
            'uploads',
            'temp',
            'ssl',
            'backups'
        ];

        for (const dir of directories) {
            const dirPath = path.join(this.projectRoot, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
                console.log(`   ✓ Criado: ${dir}/`);
            }
        }
    }

    async setupEnvironment() {
        console.log('\n🔧 Configurando variáveis de ambiente...');

        const envConfig = {
            // Configurações do servidor
            NODE_ENV: 'development',
            PORT: '3000',
            HOST: 'localhost',

            // Configurações do banco de dados
            DB_TYPE: 'sqlite',
            DB_HOST: 'localhost',
            DB_PORT: '3306',
            DB_NAME: 'payment_system',
            DB_USER: 'root',
            DB_PASSWORD: '',
            DB_PATH: './database/payment_system.db',

            // Chaves de segurança
            JWT_SECRET: this.generateSecretKey(),
            ENCRYPTION_KEY: this.generateSecretKey(32),
            WEBHOOK_SECRET: this.generateSecretKey(),

            // Configurações de pagamento
            PAYMENT_TIMEOUT: '300000',
            MAX_PAYMENT_AMOUNT: '100000',
            MIN_PAYMENT_AMOUNT: '1',

            // PIX
            PIX_PROVIDER: 'mock',
            PIX_CLIENT_ID: 'your_pix_client_id',
            PIX_CLIENT_SECRET: 'your_pix_client_secret',
            PIX_CERTIFICATE_PATH: './ssl/pix_certificate.p12',
            PIX_CERTIFICATE_PASSWORD: 'certificate_password',

            // Cartão de Crédito/Débito
            CARD_PROVIDER: 'mock',
            CARD_MERCHANT_ID: 'your_merchant_id',
            CARD_API_KEY: 'your_card_api_key',
            CARD_API_SECRET: 'your_card_api_secret',

            // Boleto
            BOLETO_PROVIDER: 'mock',
            BOLETO_BANK_CODE: '001',
            BOLETO_AGENCY: '1234',
            BOLETO_ACCOUNT: '12345-6',
            BOLETO_WALLET: '17',

            // Configurações de email
            EMAIL_HOST: 'smtp.gmail.com',
            EMAIL_PORT: '587',
            EMAIL_USER: 'seu-email@exemplo.com',
            EMAIL_PASSWORD: 'sua-senha-de-app',

            // Configurações de segurança
            RATE_LIMIT_WINDOW: '900000',
            RATE_LIMIT_MAX: '100',
            PAYMENT_RATE_LIMIT_MAX: '10',
            CORS_ORIGIN: 'http://localhost:3000',

            // Configurações de log
            LOG_LEVEL: 'info',
            LOG_FILE: './logs/payment-system.log',
            LOG_MAX_SIZE: '10m',
            LOG_MAX_FILES: '5',

            // SSL/HTTPS
            SSL_ENABLED: 'false',
            SSL_KEY_PATH: './ssl/private-key.pem',
            SSL_CERT_PATH: './ssl/certificate.pem'
        };

        let envContent = '';
        for (const [key, value] of Object.entries(envConfig)) {
            envContent += `${key}=${value}\n`;
        }

        if (!fs.existsSync(this.envFile)) {
            fs.writeFileSync(this.envFile, envContent);
            console.log('   ✓ Arquivo .env criado');
        } else {
            console.log('   ⚠️  Arquivo .env já existe - não foi sobrescrito');
        }
    }

    async setupDatabase() {
        console.log('\n🗄️  Configurando banco de dados...');

        const sqlSchema = `
-- Tabela de transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    status VARCHAR(50) DEFAULT 'pending',
    customer_data TEXT,
    payment_data TEXT,
    provider_response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    processed_at DATETIME
);

-- Tabela de logs de pagamento
CREATE TABLE IF NOT EXISTS payment_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_data TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES payment_transactions(transaction_id)
);

-- Tabela de webhooks
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id VARCHAR(255),
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    signature VARCHAR(255),
    processed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_transaction_id ON payment_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_transaction_id ON payment_webhooks(transaction_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON payment_webhooks(processed);
`;

        const schemaPath = path.join(this.dbPath, 'schema.sql');
        fs.writeFileSync(schemaPath, sqlSchema);
        console.log('   ✓ Schema do banco de dados criado');
    }

    async createConfigFiles() {
        console.log('\n⚙️  Criando arquivos de configuração...');

        // Configuração do Jest para testes
        const jestConfig = {
            testEnvironment: 'node',
            collectCoverageFrom: [
                'providers/**/*.js',
                'services/**/*.js',
                'middleware/**/*.js',
                'utils/**/*.js',
                '!**/node_modules/**'
            ],
            coverageDirectory: 'coverage',
            coverageReporters: ['text', 'lcov', 'html'],
            testMatch: [
                '**/tests/**/*.test.js',
                '**/tests/**/*.spec.js'
            ],
            setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
        };

        fs.writeFileSync(
            path.join(this.projectRoot, 'jest.config.json'),
            JSON.stringify(jestConfig, null, 2)
        );

        // Configuração do Mocha
        const mochaConfig = {
            require: ['tests/setup.js'],
            timeout: 10000,
            recursive: true,
            reporter: 'spec'
        };

        fs.writeFileSync(
            path.join(this.projectRoot, '.mocharc.json'),
            JSON.stringify(mochaConfig, null, 2)
        );

        // Configuração do NYC (cobertura)
        const nycConfig = {
            include: [
                'providers/**/*.js',
                'services/**/*.js',
                'middleware/**/*.js',
                'utils/**/*.js'
            ],
            exclude: [
                'tests/**',
                'node_modules/**'
            ],
            reporter: ['text', 'html', 'lcov'],
            'report-dir': 'coverage'
        };

        fs.writeFileSync(
            path.join(this.projectRoot, '.nycrc.json'),
            JSON.stringify(nycConfig, null, 2)
        );

        console.log('   ✓ Arquivos de configuração criados');
    }

    async verifySetup() {
        console.log('\n🔍 Verificando configuração...');

        const requiredFiles = [
            'providers/pix-provider.js',
            'providers/card-provider.js',
            'providers/boleto-provider.js',
            'services/payment-service.js',
            'middleware/security-middleware.js',
            'utils/encryption.js',
            'frontend/payment-interface.html',
            'tests/payment-tests.js'
        ];

        let allFilesExist = true;
        for (const file of requiredFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (fs.existsSync(filePath)) {
                console.log(`   ✓ ${file}`);
            } else {
                console.log(`   ❌ ${file} - ARQUIVO FALTANDO`);
                allFilesExist = false;
            }
        }

        if (!allFilesExist) {
            throw new Error('Alguns arquivos do sistema de pagamento estão faltando');
        }
    }

    generateSecretKey(length = 64) {
        return crypto.randomBytes(length).toString('hex');
    }
}

// Executar setup se chamado diretamente
if (require.main === module) {
    const setup = new PaymentSystemSetup();
    setup.setup().catch(console.error);
}

module.exports = PaymentSystemSetup;