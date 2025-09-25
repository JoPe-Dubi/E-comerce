// CompreAqui E-commerce - Funções CRUD Completas
// Sistema de operações Create, Read, Update, Delete para todas as tabelas

const bcrypt = require('bcrypt');
const database = require('./database');

// ==================== MÓDULO DE USUÁRIOS ====================

const UserCRUD = {
    // CREATE - Criar usuário
    async create(userData) {
        const { name, email, password, role = 'user', phone, birth_date, gender } = userData;
        const passwordHash = await bcrypt.hash(password, 10);
        
        return database.run(
            `INSERT INTO users (name, email, password_hash, role, phone, birth_date, gender) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, passwordHash, role, phone, birth_date, gender]
        );
    },

    // READ - Buscar usuários
    async getById(id) {
        return database.get('SELECT * FROM users WHERE id = ?', [id]);
    },

    async getByEmail(email) {
        return database.get('SELECT * FROM users WHERE email = ?', [email]);
    },

    async getAll(filters = {}) {
        let sql = 'SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE 1=1';
        const params = [];

        if (filters.role) {
            sql += ' AND role = ?';
            params.push(filters.role);
        }

        if (filters.is_active !== undefined) {
            sql += ' AND is_active = ?';
            params.push(filters.is_active);
        }

        sql += ' ORDER BY created_at DESC';

        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
        }

        return database.all(sql, params);
    },

    // UPDATE - Atualizar usuário
    async update(id, userData) {
        const { name, email, phone, birth_date, gender, is_active } = userData;
        
        return database.run(
            `UPDATE users SET name = ?, email = ?, phone = ?, birth_date = ?, 
             gender = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [name, email, phone, birth_date, gender, is_active, id]
        );
    },

    async updatePassword(id, newPassword) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        return database.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, id]
        );
    },

    async updateLastLogin(id) {
        return database.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    },

    // DELETE - Deletar usuário (soft delete)
    async delete(id) {
        return database.run(
            'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    },

    async hardDelete(id) {
        return database.run('DELETE FROM users WHERE id = ?', [id]);
    },

    // UTILS - Funções auxiliares
    async verifyPassword(password, hash) {
        return bcrypt.compare(password, hash);
    },

    async authenticate(email, password) {
        const user = await this.getByEmail(email);
        if (!user || !user.is_active) return null;

        const isValid = await this.verifyPassword(password, user.password_hash);
        if (!isValid) return null;

        await this.updateLastLogin(user.id);
        return { ...user, password_hash: undefined };
    }
};

// ==================== MÓDULO DE PERFIS DE USUÁRIO ====================

const UserProfileCRUD = {
    // CREATE/UPDATE - Criar ou atualizar perfil
    async createOrUpdate(userId, profileData) {
        const {
            cpf, phone, birth_date, cep, street, number, 
            complement, neighborhood, city, state, country = 'Brasil',
            newsletter_opt_in = false, sms_opt_in = false
        } = profileData;

        const existing = await this.getByUserId(userId);

        if (existing) {
            return database.run(
                `UPDATE user_profiles SET 
                 cpf = ?, phone = ?, birth_date = ?, cep = ?, street = ?, 
                 number = ?, complement = ?, neighborhood = ?, city = ?, state = ?, country = ?,
                 newsletter_opt_in = ?, sms_opt_in = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                [cpf, phone, birth_date, cep, street, number, complement, 
                 neighborhood, city, state, country, newsletter_opt_in, sms_opt_in, userId]
            );
        } else {
            return database.run(
                `INSERT INTO user_profiles 
                 (user_id, cpf, phone, birth_date, cep, street, number, complement, 
                  neighborhood, city, state, country, newsletter_opt_in, sms_opt_in)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, cpf, phone, birth_date, cep, street, number, complement,
                 neighborhood, city, state, country, newsletter_opt_in, sms_opt_in]
            );
        }
    },

    // READ - Buscar perfis
    async getByUserId(userId) {
        return database.get(
            `SELECT up.*, u.name, u.email 
             FROM user_profiles up 
             JOIN users u ON up.user_id = u.id 
             WHERE up.user_id = ?`,
            [userId]
        );
    },

    async getByCpf(cpf) {
        return database.get('SELECT * FROM user_profiles WHERE cpf = ?', [cpf]);
    },

    // DELETE - Deletar perfil
    async delete(userId) {
        return database.run('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
    }
};

// ==================== MÓDULO DE ENDEREÇOS ====================

const AddressCRUD = {
    // CREATE - Criar endereço
    async create(addressData) {
        const {
            user_id, type = 'home', label, street, number, complement,
            neighborhood, city, state, zip_code, country = 'Brasil', is_default = false
        } = addressData;

        // Se é endereço padrão, remover padrão dos outros
        if (is_default) {
            await database.run(
                'UPDATE user_addresses SET is_default = 0 WHERE user_id = ?',
                [user_id]
            );
        }

        return database.run(
            `INSERT INTO user_addresses 
             (user_id, type, label, street, number, complement, neighborhood, 
              city, state, zip_code, country, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, type, label, street, number, complement, neighborhood,
             city, state, zip_code, country, is_default]
        );
    },

    // READ - Buscar endereços
    async getById(id) {
        return database.get('SELECT * FROM user_addresses WHERE id = ?', [id]);
    },

    async getByUserId(userId) {
        return database.all(
            'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
    },

    async getDefaultByUserId(userId) {
        return database.get(
            'SELECT * FROM user_addresses WHERE user_id = ? AND is_default = 1',
            [userId]
        );
    },

    // UPDATE - Atualizar endereço
    async update(id, addressData) {
        const {
            type, label, street, number, complement, neighborhood,
            city, state, zip_code, country, is_default
        } = addressData;

        // Se é endereço padrão, remover padrão dos outros
        if (is_default) {
            const address = await this.getById(id);
            if (address) {
                await database.run(
                    'UPDATE user_addresses SET is_default = 0 WHERE user_id = ? AND id != ?',
                    [address.user_id, id]
                );
            }
        }

        return database.run(
            `UPDATE user_addresses SET 
             type = ?, label = ?, street = ?, number = ?, complement = ?,
             neighborhood = ?, city = ?, state = ?, zip_code = ?, country = ?,
             is_default = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [type, label, street, number, complement, neighborhood,
             city, state, zip_code, country, is_default, id]
        );
    },

    // DELETE - Deletar endereço
    async delete(id) {
        return database.run('DELETE FROM user_addresses WHERE id = ?', [id]);
    }
};

// ==================== MÓDULO DE CATEGORIAS ====================

const CategoryCRUD = {
    // CREATE - Criar categoria
    async create(categoryData) {
        const { name, slug, description, parent_id, image_url, sort_order = 0 } = categoryData;
        
        return database.run(
            `INSERT INTO categories (name, slug, description, parent_id, image_url, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, slug, description, parent_id, image_url, sort_order]
        );
    },

    // READ - Buscar categorias
    async getById(id) {
        return database.get('SELECT * FROM categories WHERE id = ? AND is_active = 1', [id]);
    },

    async getBySlug(slug) {
        return database.get('SELECT * FROM categories WHERE slug = ? AND is_active = 1', [slug]);
    },

    async getAll(includeInactive = false) {
        let sql = 'SELECT * FROM categories';
        if (!includeInactive) {
            sql += ' WHERE is_active = 1';
        }
        sql += ' ORDER BY sort_order ASC, name ASC';
        
        return database.all(sql);
    },

    async getParentCategories() {
        return database.all(
            'SELECT * FROM categories WHERE parent_id IS NULL AND is_active = 1 ORDER BY sort_order ASC'
        );
    },

    async getSubCategories(parentId) {
        return database.all(
            'SELECT * FROM categories WHERE parent_id = ? AND is_active = 1 ORDER BY sort_order ASC',
            [parentId]
        );
    },

    // UPDATE - Atualizar categoria
    async update(id, categoryData) {
        const { name, slug, description, parent_id, image_url, is_active, sort_order } = categoryData;
        
        return database.run(
            `UPDATE categories SET 
             name = ?, slug = ?, description = ?, parent_id = ?, image_url = ?,
             is_active = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, slug, description, parent_id, image_url, is_active, sort_order, id]
        );
    },

    // DELETE - Deletar categoria (soft delete)
    async delete(id) {
        return database.run(
            'UPDATE categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    },

    async hardDelete(id) {
        return database.run('DELETE FROM categories WHERE id = ?', [id]);
    }
};

// ==================== MÓDULO DE PRODUTOS ====================

const ProductCRUD = {
    // CREATE - Criar produto
    async create(productData) {
        const {
            name, slug, description, short_description, price, original_price, cost_price,
            category_id, brand, sku, barcode, stock_quantity = 0, min_stock = 5, max_stock = 1000,
            weight, dimensions, featured = false, is_digital = false, meta_title, meta_description, tags
        } = productData;

        return database.run(
            `INSERT INTO products 
             (name, slug, description, short_description, price, original_price, cost_price,
              category_id, brand, sku, barcode, stock_quantity, min_stock, max_stock,
              weight, dimensions, featured, is_digital, meta_title, meta_description, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, slug, description, short_description, price, original_price, cost_price,
             category_id, brand, sku, barcode, stock_quantity, min_stock, max_stock,
             weight, dimensions, featured, is_digital, meta_title, meta_description, tags]
        );
    },

    // READ - Buscar produtos
    async getById(id) {
        return database.get(
            `SELECT p.*, c.name as category_name, c.slug as category_slug
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.id = ? AND p.active = 1`,
            [id]
        );
    },

    async getBySlug(slug) {
        return database.get(
            `SELECT p.*, c.name as category_name, c.slug as category_slug
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.slug = ? AND p.active = 1`,
            [slug]
        );
    },

    async getBySku(sku) {
        return database.get('SELECT * FROM products WHERE sku = ?', [sku]);
    },

    async getAll(filters = {}) {
        let sql = `SELECT p.*, c.name as category_name, c.slug as category_slug
                   FROM products p
                   LEFT JOIN categories c ON p.category_id = c.id
                   WHERE p.active = 1`;
        const params = [];

        if (filters.category_id) {
            sql += ' AND p.category_id = ?';
            params.push(filters.category_id);
        }

        if (filters.featured) {
            sql += ' AND p.featured = 1';
        }

        if (filters.min_price) {
            sql += ' AND p.price >= ?';
            params.push(filters.min_price);
        }

        if (filters.max_price) {
            sql += ' AND p.price <= ?';
            params.push(filters.max_price);
        }

        if (filters.brand) {
            sql += ' AND p.brand = ?';
            params.push(filters.brand);
        }

        if (filters.search) {
            sql += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        // Ordenação
        const orderBy = filters.order_by || 'created_at';
        const orderDir = filters.order_dir || 'DESC';
        sql += ` ORDER BY p.${orderBy} ${orderDir}`;

        // Paginação
        if (filters.limit) {
            sql += ' LIMIT ?';
            params.push(filters.limit);
            
            if (filters.offset) {
                sql += ' OFFSET ?';
                params.push(filters.offset);
            }
        }

        return database.all(sql, params);
    },

    async getFeatured(limit = 10) {
        return database.all(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.featured = 1 AND p.active = 1
             ORDER BY p.rating DESC, p.review_count DESC
             LIMIT ?`,
            [limit]
        );
    },

    async getByCategory(categoryId, limit = 20, offset = 0) {
        return database.all(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.category_id = ? AND p.active = 1
             ORDER BY p.rating DESC, p.review_count DESC
             LIMIT ? OFFSET ?`,
            [categoryId, limit, offset]
        );
    },

    async search(query, limit = 20, offset = 0) {
        return database.all(
            `SELECT p.*, c.name as category_name
             FROM products p
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE p.active = 1 AND (
                 p.name LIKE ? OR 
                 p.description LIKE ? OR 
                 p.brand LIKE ? OR
                 p.tags LIKE ?
             )
             ORDER BY p.rating DESC, p.review_count DESC
             LIMIT ? OFFSET ?`,
            [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit, offset]
        );
    },

    // UPDATE - Atualizar produto
    async update(id, productData) {
        const {
            name, slug, description, short_description, price, original_price, cost_price,
            category_id, brand, sku, barcode, stock_quantity, min_stock, max_stock,
            weight, dimensions, featured, is_digital, active, meta_title, meta_description, tags
        } = productData;

        return database.run(
            `UPDATE products SET 
             name = ?, slug = ?, description = ?, short_description = ?, price = ?, 
             original_price = ?, cost_price = ?, category_id = ?, brand = ?, sku = ?, 
             barcode = ?, stock_quantity = ?, min_stock = ?, max_stock = ?, weight = ?, 
             dimensions = ?, featured = ?, is_digital = ?, active = ?, meta_title = ?, 
             meta_description = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [name, slug, description, short_description, price, original_price, cost_price,
             category_id, brand, sku, barcode, stock_quantity, min_stock, max_stock,
             weight, dimensions, featured, is_digital, active, meta_title, meta_description, tags, id]
        );
    },

    async updateStock(id, quantity) {
        return database.run(
            'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [quantity, id]
        );
    },

    async incrementViewCount(id) {
        return database.run(
            'UPDATE products SET view_count = view_count + 1 WHERE id = ?',
            [id]
        );
    },

    // DELETE - Deletar produto (soft delete)
    async delete(id) {
        return database.run(
            'UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [id]
        );
    },

    async hardDelete(id) {
        return database.run('DELETE FROM products WHERE id = ?', [id]);
    }
};

// ==================== MÓDULO DE IMAGENS DE PRODUTOS ====================

const ProductImageCRUD = {
    // CREATE - Adicionar imagem
    async create(imageData) {
        const { product_id, image_url, alt_text, is_primary = false, sort_order = 0 } = imageData;

        // Se é imagem primária, remover primária das outras
        if (is_primary) {
            await database.run(
                'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
                [product_id]
            );
        }

        return database.run(
            'INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES (?, ?, ?, ?, ?)',
            [product_id, image_url, alt_text, is_primary, sort_order]
        );
    },

    // READ - Buscar imagens
    async getByProductId(productId) {
        return database.all(
            'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, sort_order ASC',
            [productId]
        );
    },

    async getPrimaryByProductId(productId) {
        return database.get(
            'SELECT * FROM product_images WHERE product_id = ? AND is_primary = 1',
            [productId]
        );
    },

    // UPDATE - Atualizar imagem
    async update(id, imageData) {
        const { image_url, alt_text, is_primary, sort_order } = imageData;

        // Se é imagem primária, remover primária das outras
        if (is_primary) {
            const image = await database.get('SELECT product_id FROM product_images WHERE id = ?', [id]);
            if (image) {
                await database.run(
                    'UPDATE product_images SET is_primary = 0 WHERE product_id = ? AND id != ?',
                    [image.product_id, id]
                );
            }
        }

        return database.run(
            'UPDATE product_images SET image_url = ?, alt_text = ?, is_primary = ?, sort_order = ? WHERE id = ?',
            [image_url, alt_text, is_primary, sort_order, id]
        );
    },

    // DELETE - Deletar imagem
    async delete(id) {
        return database.run('DELETE FROM product_images WHERE id = ?', [id]);
    },

    async deleteByProductId(productId) {
        return database.run('DELETE FROM product_images WHERE product_id = ?', [productId]);
    }
};

// ==================== MÓDULO DE CARRINHO ====================

const CartCRUD = {
    // CREATE/UPDATE - Adicionar ao carrinho
    async addItem(cartData) {
        const { user_id, session_id, product_id, quantity, price } = cartData;

        // Verificar se item já existe
        const existing = await database.get(
            'SELECT * FROM cart_items WHERE (user_id = ? OR session_id = ?) AND product_id = ?',
            [user_id, session_id, product_id]
        );

        if (existing) {
            // Atualizar quantidade
            return database.run(
                'UPDATE cart_items SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [quantity, existing.id]
            );
        } else {
            // Inserir novo item
            return database.run(
                'INSERT INTO cart_items (user_id, session_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
                [user_id, session_id, product_id, quantity, price]
            );
        }
    },

    // READ - Buscar itens do carrinho
    async getItems(userId, sessionId) {
        return database.all(
            `SELECT ci.*, p.name, p.slug, p.stock_quantity, pi.image_url
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.id
             LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
             WHERE (ci.user_id = ? OR ci.session_id = ?) AND p.active = 1
             ORDER BY ci.created_at DESC`,
            [userId, sessionId]
        );
    },

    async getItemCount(userId, sessionId) {
        const result = await database.get(
            'SELECT SUM(quantity) as total FROM cart_items WHERE (user_id = ? OR session_id = ?)',
            [userId, sessionId]
        );
        return result?.total || 0;
    },

    async getTotal(userId, sessionId) {
        const result = await database.get(
            'SELECT SUM(quantity * price) as total FROM cart_items WHERE (user_id = ? OR session_id = ?)',
            [userId, sessionId]
        );
        return result?.total || 0;
    },

    // UPDATE - Atualizar item do carrinho
    async updateQuantity(id, quantity) {
        if (quantity <= 0) {
            return this.removeItem(id);
        }
        
        return database.run(
            'UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [quantity, id]
        );
    },

    // DELETE - Remover do carrinho
    async removeItem(id) {
        return database.run('DELETE FROM cart_items WHERE id = ?', [id]);
    },

    async removeByProduct(userId, sessionId, productId) {
        return database.run(
            'DELETE FROM cart_items WHERE (user_id = ? OR session_id = ?) AND product_id = ?',
            [userId, sessionId, productId]
        );
    },

    async clear(userId, sessionId) {
        return database.run(
            'DELETE FROM cart_items WHERE user_id = ? OR session_id = ?',
            [userId, sessionId]
        );
    },

    // UTILS - Migrar carrinho de sessão para usuário
    async migrateSessionToUser(sessionId, userId) {
        return database.run(
            'UPDATE cart_items SET user_id = ?, session_id = NULL WHERE session_id = ?',
            [userId, sessionId]
        );
    }
};

// ==================== MÓDULO DE LISTA DE DESEJOS ====================

const WishlistCRUD = {
    // CREATE - Adicionar à lista de desejos
    async addItem(userId, productId) {
        return database.run(
            'INSERT OR IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)',
            [userId, productId]
        );
    },

    // READ - Buscar lista de desejos
    async getItems(userId) {
        return database.all(
            `SELECT w.*, p.name, p.slug, p.price, p.original_price, pi.image_url
             FROM wishlist w
             JOIN products p ON w.product_id = p.id
             LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
             WHERE w.user_id = ? AND p.active = 1
             ORDER BY w.created_at DESC`,
            [userId]
        );
    },

    async isInWishlist(userId, productId) {
        const result = await database.get(
            'SELECT id FROM wishlist WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );
        return !!result;
    },

    // DELETE - Remover da lista de desejos
    async removeItem(userId, productId) {
        return database.run(
            'DELETE FROM wishlist WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );
    },

    async clear(userId) {
        return database.run('DELETE FROM wishlist WHERE user_id = ?', [userId]);
    }
};

// Exportar todos os módulos CRUD
module.exports = {
    UserCRUD,
    UserProfileCRUD,
    AddressCRUD,
    CategoryCRUD,
    ProductCRUD,
    ProductImageCRUD,
    CartCRUD,
    WishlistCRUD
};