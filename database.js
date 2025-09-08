// CompreAqui E-commerce - Banco de Dados SQLite

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Configuração do banco
const DB_PATH = path.join(__dirname, 'compreaqui.db');

class Database {
    constructor() {
        this.db = null;
    }

    // Conectar ao banco
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('Erro ao conectar ao banco:', err.message);
                    reject(err);
                } else {
                    console.log('Conectado ao banco SQLite');
                    this.initializeTables().then(resolve).catch(reject);
                }
            });
        });
    }

    // Inicializar tabelas
    async initializeTables() {
        const tables = [
            // Tabela de usuários
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela de produtos
            `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                original_price DECIMAL(10,2),
                category TEXT NOT NULL,
                brand TEXT,
                image_url TEXT,
                stock_quantity INTEGER DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                featured BOOLEAN DEFAULT 0,
                active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabela de carrinho
            `CREATE TABLE IF NOT EXISTS cart (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_id TEXT,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`,

            // Tabela de pedidos
            `CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status TEXT DEFAULT 'pending',
                shipping_address TEXT,
                payment_method TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,

            // Tabela de itens do pedido
            `CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`
        ];

        for (const table of tables) {
            await this.run(table);
        }

        // Inserir dados iniciais
        await this.insertInitialData();
    }

    // Inserir dados iniciais
    async insertInitialData() {
        // Verificar se já existem dados
        const userCount = await this.get('SELECT COUNT(*) as count FROM users');
        if (userCount.count > 0) {
            return; // Dados já existem
        }

        // Inserir usuário admin
        const adminPassword = await bcrypt.hash('123456', 10);
        await this.run(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['Administrador', 'admin@compreaqui.com', adminPassword, 'admin']
        );

        // Inserir produtos de exemplo
        const products = [
            {
                name: 'iPhone 15 Pro',
                description: 'O iPhone mais avançado da Apple com chip A17 Pro',
                price: 7999.00,
                original_price: 8999.00,
                category: 'eletronicos',
                brand: 'Apple',
                image_url: 'img/products/iphone-15-pro-1.jpg',
                stock_quantity: 50,
                rating: 4.8,
                review_count: 245,
                featured: 1
            },
            {
                name: 'Samsung Galaxy S24',
                description: 'Smartphone premium com IA integrada',
                price: 4499.00,
                original_price: 4999.00,
                category: 'eletronicos',
                brand: 'Samsung',
                image_url: 'img/products/galaxy-s24-1.jpg',
                stock_quantity: 30,
                rating: 4.6,
                review_count: 189,
                featured: 1
            },
            {
                name: 'MacBook Air M3',
                description: 'Notebook ultrafino com chip M3 da Apple',
                price: 12999.00,
                original_price: null,
                category: 'eletronicos',
                brand: 'Apple',
                image_url: 'img/products/macbook-air-m3-1.jpg',
                stock_quantity: 25,
                rating: 4.9,
                review_count: 156,
                featured: 1
            }
        ];

        for (const product of products) {
            await this.run(
                `INSERT INTO products (name, description, price, original_price, category, brand, 
                 image_url, stock_quantity, rating, review_count, featured) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    product.name, product.description, product.price, product.original_price,
                    product.category, product.brand, product.image_url, product.stock_quantity,
                    product.rating, product.review_count, product.featured
                ]
            );
        }

        console.log('Dados iniciais inseridos com sucesso');
    }

    // Executar query
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Obter uma linha
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Obter múltiplas linhas
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Fechar conexão
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('Conexão com banco fechada');
                    resolve();
                }
            });
        });
    }

    // Métodos específicos para usuários
    async createUser(name, email, password) {
        const passwordHash = await bcrypt.hash(password, 10);
        return this.run(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, passwordHash]
        );
    }

    async getUserByEmail(email) {
        return this.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    // Métodos específicos para produtos
    async getProducts(limit = 50, offset = 0) {
        return this.all(
            'SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, offset]
        );
    }

    async getProductById(id) {
        return this.get('SELECT * FROM products WHERE id = ? AND active = 1', [id]);
    }

    async searchProducts(query) {
        return this.all(
            `SELECT * FROM products 
             WHERE active = 1 AND (name LIKE ? OR description LIKE ? OR brand LIKE ?)
             ORDER BY rating DESC, review_count DESC`,
            [`%${query}%`, `%${query}%`, `%${query}%`]
        );
    }

    async getProductsByCategory(category) {
        return this.all(
            'SELECT * FROM products WHERE category = ? AND active = 1 ORDER BY rating DESC',
            [category]
        );
    }

    // Métodos específicos para carrinho
    async addToCart(userId, sessionId, productId, quantity) {
        // Verificar se item já existe no carrinho
        const existing = await this.get(
            'SELECT * FROM cart WHERE (user_id = ? OR session_id = ?) AND product_id = ?',
            [userId, sessionId, productId]
        );

        if (existing) {
            // Atualizar quantidade
            return this.run(
                'UPDATE cart SET quantity = quantity + ? WHERE id = ?',
                [quantity, existing.id]
            );
        } else {
            // Inserir novo item
            return this.run(
                'INSERT INTO cart (user_id, session_id, product_id, quantity) VALUES (?, ?, ?, ?)',
                [userId, sessionId, productId, quantity]
            );
        }
    }

    async getCartItems(userId, sessionId) {
        return this.all(
            `SELECT c.*, p.name, p.price, p.image_url 
             FROM cart c 
             JOIN products p ON c.product_id = p.id 
             WHERE (c.user_id = ? OR c.session_id = ?) AND p.active = 1`,
            [userId, sessionId]
        );
    }

    async removeFromCart(userId, sessionId, productId) {
        return this.run(
            'DELETE FROM cart WHERE (user_id = ? OR session_id = ?) AND product_id = ?',
            [userId, sessionId, productId]
        );
    }

    async clearCart(userId, sessionId) {
        return this.run(
            'DELETE FROM cart WHERE user_id = ? OR session_id = ?',
            [userId, sessionId]
        );
    }
}

// Instância singleton do banco
const database = new Database();

module.exports = database;