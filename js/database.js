// CompreAqui E-commerce - Sistema de Banco de Dados SQLite para Produtos

// Configuração do banco SQLite
const DB_CONFIG = {
    name: 'compreaqui_products.db',
    version: '1.0'
};

// Gerenciador de Banco de Dados SQLite
class ProductSQLiteDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.SQL = null;
    }

    // Inicializar banco SQLite
    async init() {
        try {
            // Carregar SQL.js via CDN
            if (!window.initSqlJs) {
                await this.loadSQLJS();
            }
            
            this.SQL = await initSqlJs({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });
            
            // Tentar carregar banco existente do localStorage
            const savedDB = localStorage.getItem('compreaqui_sqlite_db');
            
            if (savedDB) {
                // Restaurar banco existente
                const uInt8Array = new Uint8Array(JSON.parse(savedDB));
                this.db = new this.SQL.Database(uInt8Array);
                console.log('Banco SQLite restaurado do localStorage');
            } else {
                // Criar novo banco
                this.db = new this.SQL.Database();
                this.createTables();
                console.log('Novo banco SQLite criado');
            }
            
            this.isInitialized = true;
            return this.db;
        } catch (error) {
            console.error('Erro ao inicializar banco SQLite:', error);
            // Fallback para localStorage simples
            this.initFallback();
            return null;
        }
    }
    
    // Carregar SQL.js dinamicamente
    async loadSQLJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://sql.js.org/dist/sql-wasm.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    // Fallback para localStorage se SQLite falhar
    initFallback() {
        console.log('Usando fallback localStorage');
        this.isInitialized = true;
        this.isFallback = true;
    }

    // Criar tabelas
    createTables() {
        const createProductsTable = `
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                original_price REAL,
                category TEXT NOT NULL,
                brand TEXT NOT NULL,
                stock INTEGER DEFAULT 0,
                description TEXT,
                link TEXT,
                images TEXT, -- JSON string
                rating REAL DEFAULT 4.5,
                reviews INTEGER DEFAULT 0,
                short_description TEXT,
                specifications TEXT, -- JSON string
                in_stock BOOLEAN DEFAULT 1,
                featured BOOLEAN DEFAULT 0,
                discount INTEGER DEFAULT 0,
                tags TEXT, -- JSON string
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        this.db.run(createProductsTable);
        this.saveDatabase();
    }

    // Salvar banco no localStorage
    saveDatabase() {
        if (this.db && !this.isFallback) {
            const data = this.db.export();
            const buffer = Array.from(data);
            localStorage.setItem('compreaqui_sqlite_db', JSON.stringify(buffer));
        }
    }

    // Adicionar produto
    async addProduct(productData) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            return this.addProductFallback(productData);
        }

        try {
            const stmt = this.db.prepare(`
                INSERT INTO products (
                    name, price, original_price, category, brand, stock,
                    description, link, images, rating, reviews, short_description,
                    specifications, in_stock, featured, discount, tags
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run([
                productData.name,
                productData.price,
                productData.originalPrice || null,
                productData.category,
                productData.brand,
                productData.stock || 0,
                productData.description,
                productData.link || null,
                JSON.stringify(productData.images || []),
                productData.rating || 4.5,
                productData.reviews || 0,
                productData.shortDescription || productData.name,
                JSON.stringify(productData.specifications || {}),
                productData.inStock ? 1 : 0,
                productData.featured ? 1 : 0,
                productData.discount || 0,
                JSON.stringify(productData.tags || [])
            ]);
            
            stmt.free();
            this.saveDatabase();
            
            // Buscar produto criado
            const newProduct = await this.getProductById(result.lastInsertRowid);
            console.log('Produto adicionado no SQLite:', newProduct);
            return newProduct;
        } catch (error) {
            console.error('Erro ao adicionar produto no SQLite:', error);
            throw error;
        }
    }
    
    // Fallback para localStorage
    addProductFallback(productData) {
        const products = JSON.parse(localStorage.getItem('compreaqui_products_fallback') || '[]');
        const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        
        const newProduct = {
            id: newId,
            ...productData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        localStorage.setItem('compreaqui_products_fallback', JSON.stringify(products));
        
        console.log('Produto adicionado no fallback:', newProduct);
        return newProduct;
    }

    // Buscar produto por ID
    async getProductById(id) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            const products = JSON.parse(localStorage.getItem('compreaqui_products_fallback') || '[]');
            return products.find(p => p.id == id);
        }

        try {
            const stmt = this.db.prepare('SELECT * FROM products WHERE id = ?');
            const result = stmt.getAsObject([id]);
            stmt.free();
            
            if (result.id) {
                return this.parseProduct(result);
            }
            return null;
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            return null;
        }
    }

    // Buscar todos os produtos
    async getAllProducts() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            return JSON.parse(localStorage.getItem('compreaqui_products_fallback') || '[]');
        }

        try {
            const stmt = this.db.prepare('SELECT * FROM products ORDER BY created_at DESC');
            const products = [];
            
            while (stmt.step()) {
                const row = stmt.getAsObject();
                products.push(this.parseProduct(row));
            }
            
            stmt.free();
            return products;
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            return [];
        }
    }

    // Buscar produtos por categoria
    async getProductsByCategory(category) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            const products = JSON.parse(localStorage.getItem('compreaqui_products_fallback') || '[]');
            return products.filter(p => p.category === category);
        }

        try {
            const stmt = this.db.prepare('SELECT * FROM products WHERE category = ? ORDER BY created_at DESC');
            const products = [];
            
            stmt.bind([category]);
            while (stmt.step()) {
                const row = stmt.getAsObject();
                products.push(this.parseProduct(row));
            }
            
            stmt.free();
            return products;
        } catch (error) {
            console.error('Erro ao buscar produtos por categoria:', error);
            return [];
        }
    }

    // Buscar produtos em oferta
    async getFeaturedProducts() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            const products = JSON.parse(localStorage.getItem('compreaqui_products_fallback') || '[]');
            return products.filter(p => p.featured);
        }

        try {
            const stmt = this.db.prepare('SELECT * FROM products WHERE featured = 1 ORDER BY created_at DESC');
            const products = [];
            
            while (stmt.step()) {
                const row = stmt.getAsObject();
                products.push(this.parseProduct(row));
            }
            
            stmt.free();
            return products;
        } catch (error) {
            console.error('Erro ao buscar produtos em oferta:', error);
            return [];
        }
    }

    // Contar produtos
    async getProductCount() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            const products = JSON.parse(localStorage.getItem('compreaqui_products_fallback') || '[]');
            return products.length;
        }

        try {
            const stmt = this.db.prepare('SELECT COUNT(*) as count FROM products');
            const result = stmt.getAsObject();
            stmt.free();
            return result.count || 0;
        } catch (error) {
            console.error('Erro ao contar produtos:', error);
            return 0;
        }
    }

    // Deletar produto
    async deleteProduct(id) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            const products = JSON.parse(localStorage.getItem('compreaqui_products_fallback') || '[]');
            const filtered = products.filter(p => p.id != id);
            localStorage.setItem('compreaqui_products_fallback', JSON.stringify(filtered));
            return true;
        }

        try {
            const stmt = this.db.prepare('DELETE FROM products WHERE id = ?');
            stmt.run([id]);
            stmt.free();
            this.saveDatabase();
            
            console.log('Produto deletado:', id);
            return true;
        } catch (error) {
            console.error('Erro ao deletar produto:', error);
            return false;
        }
    }

    // Limpar todos os produtos
    async clearAllProducts() {
        if (!this.isInitialized) {
            await this.init();
        }

        if (this.isFallback) {
            localStorage.removeItem('compreaqui_products_fallback');
            return true;
        }

        try {
            this.db.run('DELETE FROM products');
            this.saveDatabase();
            console.log('Todos os produtos foram removidos');
            return true;
        } catch (error) {
            console.error('Erro ao limpar produtos:', error);
            return false;
        }
    }

    // Converter dados do SQLite para objeto JavaScript
    parseProduct(row) {
        return {
            id: row.id,
            name: row.name,
            price: row.price,
            originalPrice: row.original_price,
            category: row.category,
            brand: row.brand,
            stock: row.stock,
            description: row.description,
            link: row.link,
            images: row.images ? JSON.parse(row.images) : [],
            rating: row.rating,
            reviews: row.reviews,
            shortDescription: row.short_description,
            specifications: row.specifications ? JSON.parse(row.specifications) : {},
            inStock: Boolean(row.in_stock),
            featured: Boolean(row.featured),
            discount: row.discount,
            tags: row.tags ? JSON.parse(row.tags) : [],
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}

// Instância global do banco SQLite
const productDB = new ProductSQLiteDatabase();

// Sistema de eventos para notificar quando o banco estiver pronto
const dbReadyCallbacks = [];
let dbReady = false;

window.onDatabaseReady = (callback) => {
    if (dbReady) {
        callback();
    } else {
        dbReadyCallbacks.push(callback);
    }
};

// Exportar para uso global
window.ProductSQLiteDatabase = ProductSQLiteDatabase;
window.productDB = productDB;

// Inicializar automaticamente
productDB.init().then(() => {
    console.log('Sistema de banco SQLite inicializado com sucesso');
    dbReady = true;
    // Executar callbacks pendentes
    dbReadyCallbacks.forEach(callback => {
        try {
            callback();
        } catch (error) {
            console.error('Erro ao executar callback do banco:', error);
        }
    });
    dbReadyCallbacks.length = 0; // Limpar array
}).catch(error => {
    console.error('Erro ao inicializar banco SQLite:', error);
    dbReady = true; // Marcar como pronto mesmo com erro (fallback)
    dbReadyCallbacks.forEach(callback => callback());
    dbReadyCallbacks.length = 0;
});

console.log('Sistema de banco de dados SQLite carregado');