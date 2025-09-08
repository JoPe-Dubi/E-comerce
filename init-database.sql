-- CompreAqui E-commerce - Inicialização do Banco de Dados SQLite
-- Script para criar tabelas e inserir dados iniciais

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    phone TEXT,
    birth_date DATE,
    gender TEXT CHECK(gender IN ('M', 'F', 'Other')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1,
    email_verified BOOLEAN DEFAULT 0
);

-- Criar tabela de endereços dos usuários
CREATE TABLE IF NOT EXISTS user_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT DEFAULT 'home' CHECK(type IN ('home', 'work', 'other')),
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    device_info TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de recuperação de senha
CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    category TEXT NOT NULL,
    brand TEXT,
    sku TEXT UNIQUE,
    stock_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    weight DECIMAL(8,3),
    dimensions TEXT, -- JSON: {"length": 10, "width": 5, "height": 3}
    rating DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    meta_title TEXT,
    meta_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de imagens de produtos
CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Criar tabela de carrinho de compras
CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL, -- Preço no momento da adição
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Criar tabela de lista de desejos
CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

-- Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
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
    payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    shipping_address TEXT NOT NULL, -- JSON com endereço completo
    billing_address TEXT, -- JSON com endereço de cobrança
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Criar tabela de itens do pedido
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL, -- Nome do produto no momento da compra
    product_sku TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Inserir usuário administrador padrão
-- Senha: 123456 (hash bcrypt)
INSERT OR IGNORE INTO users (name, email, password_hash, role, is_active, email_verified) 
VALUES (
    'Administrador CompreAqui',
    'admin@compreaqui.com',
    '$2b$10$rOzJqKqKqKqKqKqKqKqKqOzJqKqKqKqKqKqKqKqKqKqKqKqKqKqKq', -- Hash para '123456'
    'admin',
    1,
    1
);

-- Inserir produtos de exemplo
INSERT OR IGNORE INTO products (id, name, slug, description, short_description, price, original_price, category, brand, sku, stock_quantity, rating, review_count, featured, active) VALUES
(1, 'iPhone 15 Pro', 'iphone-15-pro', 'O iPhone mais avançado da Apple com chip A17 Pro, sistema de câmera profissional e design em titânio.', 'iPhone 15 Pro com 128GB, tela Super Retina XDR de 6.1 polegadas', 7999.00, 8999.00, 'eletronicos', 'Apple', 'IPH15PRO128', 50, 4.8, 245, 1, 1),
(2, 'Samsung Galaxy S24', 'samsung-galaxy-s24', 'Smartphone premium com inteligência artificial integrada, câmera de 200MP e tela Dynamic AMOLED 2X.', 'Galaxy S24 com 256GB, tela Dynamic AMOLED 2X de 6.2 polegadas', 4499.00, 4999.00, 'eletronicos', 'Samsung', 'GALS24256', 30, 4.6, 189, 1, 1),
(3, 'MacBook Air M3', 'macbook-air-m3', 'Notebook ultrafino e poderoso com chip M3 da Apple, ideal para trabalho e criatividade.', 'MacBook Air de 13 polegadas com chip M3, 8GB RAM e 256GB SSD', 12999.00, NULL, 'eletronicos', 'Apple', 'MBAM3256', 25, 4.9, 156, 1, 1),
(4, 'Tênis Nike Air Max', 'tenis-nike-air-max', 'Tênis esportivo com tecnologia Air Max para máximo conforto e performance.', 'Tênis Nike Air Max 270 - Tamanhos 38 ao 44', 499.00, 599.00, 'moda', 'Nike', 'NIKAM270', 100, 4.5, 324, 1, 1),
(5, 'Camiseta Adidas Originals', 'camiseta-adidas-originals', 'Camiseta casual da linha Adidas Originals, 100% algodão.', 'Camiseta Adidas Originals - Tamanhos P ao GG', 99.00, 129.00, 'moda', 'Adidas', 'ADIORG001', 200, 4.2, 89, 1, 1),
(6, 'PlayStation 5', 'playstation-5', 'Console de videogame de nova geração com gráficos 4K e SSD ultrarrápido.', 'PlayStation 5 - Console + 1 Controle DualSense', 4499.00, 4999.00, 'games', 'Sony', 'PS5CONSOLE', 15, 4.7, 412, 1, 1),
(7, 'Smart TV LG 55"', 'smart-tv-lg-55', 'Smart TV LG 55 polegadas 4K UHD com WebOS e HDR.', 'Smart TV LG 55" 4K UHD - Modelo 2024', 3499.00, 3999.00, 'eletronicos', 'LG', 'LGTV55UK', 20, 4.4, 167, 1, 1),
(8, 'Sofá 3 Lugares', 'sofa-3-lugares', 'Sofá confortável de 3 lugares em tecido suede, ideal para sala de estar.', 'Sofá 3 Lugares em Suede - Cor Cinza', 1899.00, 2299.00, 'casa', 'MóveisMax', 'SOFA3LUG', 10, 4.1, 78, 1, 1);

-- Inserir imagens dos produtos
INSERT OR IGNORE INTO product_images (product_id, image_url, alt_text, is_primary, sort_order) VALUES
(1, 'img/products/iphone-15-pro-1.jpg', 'iPhone 15 Pro - Frente', 1, 1),
(2, 'img/products/galaxy-s24-1.jpg', 'Samsung Galaxy S24 - Frente', 1, 1),
(3, 'img/products/macbook-air-m3-1.jpg', 'MacBook Air M3 - Vista Superior', 1, 1),
(4, 'img/products/nike-air-max.jpg', 'Tênis Nike Air Max 270', 1, 1),
(5, 'img/products/adidas-originals.jpg', 'Camiseta Adidas Originals', 1, 1),
(6, 'img/products/playstation-5.jpg', 'PlayStation 5 Console', 1, 1),
(7, 'img/products/lg-tv-55.jpg', 'Smart TV LG 55 polegadas', 1, 1),
(8, 'img/products/sofa-3-lugares.jpg', 'Sofá 3 Lugares Cinza', 1, 1);

-- Inserir endereço para o administrador
INSERT OR IGNORE INTO user_addresses (user_id, type, street, number, neighborhood, city, state, zip_code, is_default) VALUES
(1, 'work', 'Rua do Comércio', '123', 'Centro', 'São Paulo', 'SP', '01000-000', 1);

PRAGMA foreign_keys = ON;

-- Mensagem de sucesso
SELECT 'Banco de dados CompreAqui inicializado com sucesso!' as message;