// CompreAqui E-commerce - Sistema de Banco de Dados SQLite Integrado
// Versão: 2.0 - Estrutura Centralizada e Escalável com Connection Pooling

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Configuração do banco
const DB_CONFIG = {
    path: path.join(__dirname, 'compreaqui.db'),
    version: '2.0',
    pragma: {
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: 1000,
        temp_store: 'MEMORY'
    },
    pool: {
        max: 10,        // Máximo de conexões
        min: 2,         // Mínimo de conexões
        idle: 30000,    // Tempo limite para conexões inativas (30s)
        acquire: 60000, // Tempo limite para adquirir conexão (60s)
        evict: 1000     // Intervalo de verificação de conexões inativas (1s)
    }
};

class ConnectionPool {
    constructor(config) {
        this.config = config;
        this.connections = [];
        this.activeConnections = new Set();
        this.waitingQueue = [];
        this.isInitialized = false;
        
        // Estatísticas do pool
        this.stats = {
            created: 0,
            acquired: 0,
            released: 0,
            destroyed: 0,
            timeouts: 0
        };
    }

    async initialize() {
        if (this.isInitialized) return;
        
        // Criar conexões mínimas
        for (let i = 0; i < this.config.pool.min; i++) {
            const connection = await this.createConnection();
            this.connections.push(connection);
        }
        
        // Iniciar limpeza periódica
        this.startEvictionTimer();
        this.isInitialized = true;
        
        console.log(`✅ Pool de conexões inicializado: ${this.connections.length} conexões`);
    }

    async createConnection() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.config.path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    const connection = {
                        db,
                        id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        createdAt: Date.now(),
                        lastUsed: Date.now(),
                        inUse: false
                    };
                    
                    this.stats.created++;
                    resolve(connection);
                }
            });
        });
    }

    async acquire() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.stats.timeouts++;
                reject(new Error('Timeout ao adquirir conexão do pool'));
            }, this.config.pool.acquire);

            const tryAcquire = async () => {
                // Procurar conexão disponível
                const availableConnection = this.connections.find(conn => !conn.inUse);
                
                if (availableConnection) {
                    clearTimeout(timeout);
                    availableConnection.inUse = true;
                    availableConnection.lastUsed = Date.now();
                    this.activeConnections.add(availableConnection);
                    this.stats.acquired++;
                    resolve(availableConnection);
                    return;
                }

                // Se não há conexões disponíveis e pode criar mais
                if (this.connections.length < this.config.pool.max) {
                    try {
                        const newConnection = await this.createConnection();
                        newConnection.inUse = true;
                        newConnection.lastUsed = Date.now();
                        this.connections.push(newConnection);
                        this.activeConnections.add(newConnection);
                        this.stats.acquired++;
                        clearTimeout(timeout);
                        resolve(newConnection);
                        return;
                    } catch (error) {
                        clearTimeout(timeout);
                        reject(error);
                        return;
                    }
                }

                // Adicionar à fila de espera
                this.waitingQueue.push({ resolve, reject, timeout });
            };

            tryAcquire();
        });
    }

    release(connection) {
        if (!connection || !this.activeConnections.has(connection)) {
            return;
        }

        connection.inUse = false;
        connection.lastUsed = Date.now();
        this.activeConnections.delete(connection);
        this.stats.released++;

        // Processar fila de espera
        if (this.waitingQueue.length > 0) {
            const waiting = this.waitingQueue.shift();
            clearTimeout(waiting.timeout);
            
            connection.inUse = true;
            connection.lastUsed = Date.now();
            this.activeConnections.add(connection);
            this.stats.acquired++;
            waiting.resolve(connection);
        }
    }

    startEvictionTimer() {
        setInterval(() => {
            this.evictIdleConnections();
        }, this.config.pool.evict);
    }

    evictIdleConnections() {
        const now = Date.now();
        const idleThreshold = this.config.pool.idle;
        
        // Manter pelo menos o mínimo de conexões
        const connectionsToKeep = Math.max(this.config.pool.min, this.activeConnections.size);
        
        for (let i = this.connections.length - 1; i >= 0; i--) {
            const connection = this.connections[i];
            
            if (this.connections.length <= connectionsToKeep) {
                break;
            }
            
            if (!connection.inUse && (now - connection.lastUsed) > idleThreshold) {
                this.destroyConnection(connection);
                this.connections.splice(i, 1);
            }
        }
    }

    destroyConnection(connection) {
        if (connection.db) {
            connection.db.close();
            this.stats.destroyed++;
        }
    }

    async close() {
        // Fechar todas as conexões
        for (const connection of this.connections) {
            this.destroyConnection(connection);
        }
        
        this.connections = [];
        this.activeConnections.clear();
        this.waitingQueue = [];
        this.isInitialized = false;
        
        console.log('🔒 Pool de conexões fechado');
    }

    getStats() {
        return {
            ...this.stats,
            total: this.connections.length,
            active: this.activeConnections.size,
            idle: this.connections.length - this.activeConnections.size,
            waiting: this.waitingQueue.length
        };
    }
}

class CompreAquiDatabase {
    constructor() {
        this.pool = new ConnectionPool(DB_CONFIG);
        this.isConnected = false;
        this.version = DB_CONFIG.version;
    }

    // ==================== CONEXÃO E INICIALIZAÇÃO ====================

    async connect() {
        try {
            await this.pool.initialize();
            
            // Configurar pragma e inicializar tabelas usando uma conexão do pool
            const connection = await this.pool.acquire();
            try {
                await this.configurePragma(connection.db);
                await this.initializeTables(connection.db);
                await this.createIndexes(connection.db);
                await this.insertInitialData(connection.db);
                
                this.isConnected = true;
                console.log('✅ Banco de dados CompreAqui inicializado com sucesso');
            } finally {
                this.pool.release(connection);
            }
        } catch (error) {
            console.error('❌ Erro ao conectar ao banco:', error.message);
            throw error;
        }
    }

    async configurePragma(db) {
        const pragmas = Object.entries(DB_CONFIG.pragma);
        for (const [key, value] of pragmas) {
            await this.run(`PRAGMA ${key} = ${value}`);
        }
        console.log('⚙️  Configurações PRAGMA aplicadas');
    }

    async initializeTables() {
        const tables = [
            // 1. TABELA DE USUÁRIOS
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin', 'moderator')),
                phone TEXT,
                birth_date DATE,
                gender TEXT CHECK(gender IN ('M', 'F', 'Other')),
                avatar_url TEXT,
                is_active BOOLEAN DEFAULT 1,
                email_verified BOOLEAN DEFAULT 0,
                last_login DATETIME,
                login_attempts INTEGER DEFAULT 0,
                locked_until DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // 2. TABELA DE PERFIS DE USUÁRIO
            `CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                cpf TEXT UNIQUE,
                phone TEXT,
                birth_date DATE,
                cep TEXT,
                street TEXT,
                number TEXT,
                complement TEXT,
                neighborhood TEXT,
                city TEXT,
                state TEXT,
                country TEXT DEFAULT 'Brasil',
                newsletter_opt_in BOOLEAN DEFAULT 0,
                sms_opt_in BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // 3. TABELA DE ENDEREÇOS
            `CREATE TABLE IF NOT EXISTS user_addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT DEFAULT 'home' CHECK(type IN ('home', 'work', 'other')),
                label TEXT,
                street TEXT NOT NULL,
                number TEXT NOT NULL,
                complement TEXT,
                neighborhood TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT NOT NULL,
                zip_code TEXT NOT NULL,
                country TEXT DEFAULT 'Brasil',
                is_default BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`,

            // 4. TABELA DE CATEGORIAS
            `CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                description TEXT,
                parent_id INTEGER,
                image_url TEXT,
                is_active BOOLEAN DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
            )`,

            // 5. TABELA DE PRODUTOS
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                short_description TEXT,
                price DECIMAL(10,2) NOT NULL,
                original_price DECIMAL(10,2),
                cost_price DECIMAL(10,2),
                category_id INTEGER,
                brand TEXT,
                sku TEXT UNIQUE,
                barcode TEXT,
                stock_quantity INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 5,
                max_stock INTEGER DEFAULT 1000,
                weight DECIMAL(8,3),
                dimensions TEXT, -- JSON: {"length": 10, "width": 5, "height": 3}
                rating DECIMAL(3,2) DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                view_count INTEGER DEFAULT 0,
                featured BOOLEAN DEFAULT 0,
                is_digital BOOLEAN DEFAULT 0,
                active BOOLEAN DEFAULT 1,
                meta_title TEXT,
                meta_description TEXT,
                tags TEXT, -- JSON array de tags
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
            )`,

            // 6. TABELA DE IMAGENS DE PRODUTOS
            `CREATE TABLE IF NOT EXISTS product_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                alt_text TEXT,
                is_primary BOOLEAN DEFAULT 0,
                sort_order INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )`,

            // 7. TABELA DE CARRINHO
            `CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_id TEXT,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                price DECIMAL(10,2) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )`,

            // 8. TABELA DE LISTA DE DESEJOS
            `CREATE TABLE IF NOT EXISTS wishlist (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE(user_id, product_id)
            )`,

            // 9. TABELA DE PEDIDOS
            `CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                order_number TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
                subtotal DECIMAL(10,2) NOT NULL,
                shipping_cost DECIMAL(10,2) DEFAULT 0,
                tax_amount DECIMAL(10,2) DEFAULT 0,
                discount_amount DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                currency TEXT DEFAULT 'BRL',
                payment_method TEXT,
                payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partial')),
                payment_id TEXT,
                shipping_address TEXT NOT NULL, -- JSON
                billing_address TEXT, -- JSON
                tracking_code TEXT,
                notes TEXT,
                shipped_at DATETIME,
                delivered_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,

            // 10. TABELA DE ITENS DO PEDIDO
            `CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_name TEXT NOT NULL,
                product_sku TEXT,
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`,

            // 11. TABELA DE AVALIAÇÕES
            `CREATE TABLE IF NOT EXISTS product_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                order_id INTEGER,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                title TEXT,
                comment TEXT,
                is_verified BOOLEAN DEFAULT 0,
                is_approved BOOLEAN DEFAULT 1,
                helpful_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
                UNIQUE(product_id, user_id, order_id)
            )`,

            // 12. TABELA DE CUPONS
            `CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('percentage', 'fixed', 'free_shipping')),
                value DECIMAL(10,2) NOT NULL,
                minimum_amount DECIMAL(10,2) DEFAULT 0,
                maximum_discount DECIMAL(10,2),
                usage_limit INTEGER,
                used_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                starts_at DATETIME,
                expires_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // 13. TABELA DE USO DE CUPONS
            `CREATE TABLE IF NOT EXISTS coupon_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                coupon_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                order_id INTEGER NOT NULL,
                discount_amount DECIMAL(10,2) NOT NULL,
                used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        console.log('📊 Tabelas inicializadas com sucesso');
    }

    async createIndexes() {
        const indexes = [
            // Índices para usuários
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
            'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
            
            // Índices para produtos
            'CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug)',
            'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)',
            'CREATE INDEX IF NOT EXISTS idx_products_active ON products(active)',
            'CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured)',
            'CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)',
            'CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating)',
            
            // Índices para carrinho
            'CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id)',
            'CREATE INDEX IF NOT EXISTS idx_cart_product ON cart_items(product_id)',
            
            // Índices para pedidos
            'CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
            'CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)',
            'CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at)',
            
            // Índices para avaliações
            'CREATE INDEX IF NOT EXISTS idx_reviews_product ON product_reviews(product_id)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_user ON product_reviews(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_approved ON product_reviews(is_approved)'
        ];

        for (const index of indexes) {
            await this.run(index);
        }

        console.log('🔍 Índices criados com sucesso');
    }

    // ==================== MÉTODOS DE CONSULTA COM POOL ====================

    async run(sql, params = []) {
        const connection = await this.pool.acquire();
        try {
            return new Promise((resolve, reject) => {
                connection.db.run(sql, params, function(err) {
                    if (err) {
                        console.error('Erro SQL:', err.message);
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, changes: this.changes });
                    }
                });
            });
        } finally {
            this.pool.release(connection);
        }
    }

    async get(sql, params = []) {
        const connection = await this.pool.acquire();
        try {
            return new Promise((resolve, reject) => {
                connection.db.get(sql, params, (err, row) => {
                    if (err) {
                        console.error('Erro SQL:', err.message);
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
        } finally {
            this.pool.release(connection);
        }
    }

    async all(sql, params = []) {
        const connection = await this.pool.acquire();
        try {
            return new Promise((resolve, reject) => {
                connection.db.all(sql, params, (err, rows) => {
                    if (err) {
                        console.error('Erro SQL:', err.message);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });
        } finally {
            this.pool.release(connection);
        }
    }

    // Método para executar transações
    async transaction(callback) {
        const connection = await this.pool.acquire();
        try {
            return new Promise((resolve, reject) => {
                connection.db.serialize(() => {
                    connection.db.run('BEGIN TRANSACTION');
                    
                    const transactionMethods = {
                        run: (sql, params = []) => {
                            return new Promise((res, rej) => {
                                connection.db.run(sql, params, function(err) {
                                    if (err) rej(err);
                                    else res({ id: this.lastID, changes: this.changes });
                                });
                            });
                        },
                        get: (sql, params = []) => {
                            return new Promise((res, rej) => {
                                connection.db.get(sql, params, (err, row) => {
                                    if (err) rej(err);
                                    else res(row);
                                });
                            });
                        },
                        all: (sql, params = []) => {
                            return new Promise((res, rej) => {
                                connection.db.all(sql, params, (err, rows) => {
                                    if (err) rej(err);
                                    else res(rows);
                                });
                            });
                        }
                    };

                    callback(transactionMethods)
                        .then(result => {
                            connection.db.run('COMMIT', (err) => {
                                if (err) {
                                    connection.db.run('ROLLBACK');
                                    reject(err);
                                } else {
                                    resolve(result);
                                }
                            });
                        })
                        .catch(error => {
                            connection.db.run('ROLLBACK', (rollbackErr) => {
                                if (rollbackErr) {
                                    console.error('Erro no rollback:', rollbackErr.message);
                                }
                                reject(error);
                            });
                        });
                });
            });
        } finally {
            this.pool.release(connection);
        }
    }

    // Método para obter estatísticas do pool
    getPoolStats() {
        return this.pool.getStats();
    }

    async close() {
        await this.pool.close();
        this.isConnected = false;
        console.log('🔒 Banco de dados fechado');
    }

    // ==================== INSERÇÃO DE DADOS INICIAIS ====================

    async insertInitialData() {
        // Verificar se já existem dados
        const userCount = await this.get('SELECT COUNT(*) as count FROM users');
        if (userCount.count > 0) {
            console.log('📋 Dados iniciais já existem');
            return;
        }

        console.log('📥 Inserindo dados iniciais...');

        // Inserir categorias
        await this.insertInitialCategories();
        
        // Inserir usuário admin
        await this.insertInitialUsers();
        
        // Inserir produtos
        await this.insertInitialProducts();

        console.log('✅ Dados iniciais inseridos com sucesso');
    }

    async insertInitialCategories() {
        const categories = [
            { name: 'Eletrônicos', slug: 'eletronicos', description: 'Smartphones, notebooks, tablets e acessórios' },
            { name: 'Moda', slug: 'moda', description: 'Roupas, calçados e acessórios' },
            { name: 'Casa e Jardim', slug: 'casa-jardim', description: 'Móveis, decoração e utensílios' },
            { name: 'Esportes', slug: 'esportes', description: 'Equipamentos e roupas esportivas' },
            { name: 'Games', slug: 'games', description: 'Consoles, jogos e acessórios' }
        ];

        for (const category of categories) {
            await this.run(
                'INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)',
                [category.name, category.slug, category.description]
            );
        }
    }

    async insertInitialUsers() {
        const adminPassword = await bcrypt.hash('123456', 10);
        await this.run(
            'INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, ?)',
            ['Administrador CompreAqui', 'admin@compreaqui.com', adminPassword, 'admin', 1]
        );
    }

    async insertInitialProducts() {
        const products = [
            {
                name: 'iPhone 15 Pro',
                slug: 'iphone-15-pro',
                description: 'O iPhone mais avançado da Apple com chip A17 Pro, câmera de 48MP e tela Super Retina XDR.',
                short_description: 'iPhone 15 Pro 256GB - Titânio Natural',
                price: 7999.00,
                original_price: 8999.00,
                category_id: 1,
                brand: 'Apple',
                sku: 'IPH15PRO256',
                stock_quantity: 50,
                rating: 4.8,
                review_count: 245,
                featured: 1
            },
            {
                name: 'Samsung Galaxy S24',
                slug: 'samsung-galaxy-s24',
                description: 'Smartphone premium com IA integrada, câmera de 200MP e tela Dynamic AMOLED 2X.',
                short_description: 'Galaxy S24 256GB - Phantom Black',
                price: 4499.00,
                original_price: 4999.00,
                category_id: 1,
                brand: 'Samsung',
                sku: 'GALS24256',
                stock_quantity: 30,
                rating: 4.6,
                review_count: 189,
                featured: 1
            }
        ];

        for (const product of products) {
            const result = await this.run(
                `INSERT INTO products (name, slug, description, short_description, price, original_price, 
                 category_id, brand, sku, stock_quantity, rating, review_count, featured) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    product.name, product.slug, product.description, product.short_description,
                    product.price, product.original_price, product.category_id, product.brand,
                    product.sku, product.stock_quantity, product.rating, product.review_count, product.featured
                ]
            );

            // Inserir imagem principal
            await this.run(
                'INSERT INTO product_images (product_id, image_url, alt_text, is_primary) VALUES (?, ?, ?, ?)',
                [result.id, `img/products/${product.slug}-1.jpg`, product.name, 1]
            );
        }
    }
}

// Instância singleton do banco
const database = new CompreAquiDatabase();

module.exports = database;