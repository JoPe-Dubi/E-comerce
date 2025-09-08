// CompreAqui E-commerce - Gerenciador de Produtos

// Configurações de produtos
const ProductConfig = {
    PRODUCTS_PER_PAGE: 12,
    STORAGE_KEYS: {
        WISHLIST: 'compreaqui_wishlist',
        RECENTLY_VIEWED: 'compreaqui_recently_viewed'
    }
};

// Estado dos produtos
const ProductState = {
    allProducts: [],
    filteredProducts: [],
    currentPage: 1,
    totalPages: 1,
    currentFilters: {
        category: null,
        priceRange: [0, 10000],
        brands: [],
        rating: 0
    },
    sortBy: 'newest',
    searchQuery: '',
    wishlist: [],
    recentlyViewed: []
};

// Dados de produtos expandidos
const EXTENDED_PRODUCTS = [
    {
        id: 1,
        name: 'iPhone 15 Pro',
        price: 7999.00,
        originalPrice: 8999.00,
        images: [
            'img/products/iphone-15-pro-1.jpg',
            'img/products/iphone-15-pro-2.jpg'
        ],
        category: 'eletronicos',
        brand: 'Apple',
        rating: 4.8,
        reviews: 245,
        description: 'O iPhone mais avançado da Apple com chip A17 Pro, sistema de câmera profissional e design em titânio.',
        shortDescription: 'iPhone 15 Pro com 128GB, tela Super Retina XDR de 6.1 polegadas',
        specifications: {
            'Tela': '6.1" Super Retina XDR',
            'Processador': 'Chip A17 Pro',
            'Armazenamento': '128GB',
            'Câmera': '48MP + 12MP + 12MP',
            'Bateria': 'Até 23h de vídeo',
            'Sistema': 'iOS 17'
        },
        inStock: true,
        featured: true,
        discount: 11,
        tags: ['smartphone', 'apple', 'premium', '5g']
    },
    {
        id: 2,
        name: 'Samsung Galaxy S24',
        price: 4499.00,
        originalPrice: 4999.00,
        images: [
            'img/products/galaxy-s24-1.jpg',
            'img/products/galaxy-s24-2.jpg'
        ],
        category: 'eletronicos',
        brand: 'Samsung',
        rating: 4.6,
        reviews: 189,
        description: 'Smartphone premium com inteligência artificial integrada, câmera de 200MP e tela Dynamic AMOLED 2X.',
        shortDescription: 'Galaxy S24 com 256GB, tela Dynamic AMOLED 2X de 6.2 polegadas',
        specifications: {
            'Tela': '6.2" Dynamic AMOLED 2X',
            'Processador': 'Snapdragon 8 Gen 3',
            'Armazenamento': '256GB',
            'Câmera': '50MP + 12MP + 10MP',
            'Bateria': '4000mAh',
            'Sistema': 'Android 14'
        },
        inStock: true,
        featured: true,
        discount: 10,
        tags: ['smartphone', 'samsung', 'android', '5g', 'ai']
    },
    {
        id: 3,
        name: 'MacBook Air M3',
        price: 12999.00,
        originalPrice: null,
        images: [
            'img/products/macbook-air-m3-1.jpg'
        ],
        category: 'eletronicos',
        brand: 'Apple',
        rating: 4.9,
        reviews: 156,
        description: 'Notebook ultrafino e poderoso com chip M3 da Apple, ideal para trabalho e criatividade.',
        shortDescription: 'MacBook Air de 13 polegadas com chip M3, 8GB RAM e 256GB SSD',
        specifications: {
            'Tela': '13.6" Liquid Retina',
            'Processador': 'Chip M3',
            'Memória': '8GB RAM unificada',
            'Armazenamento': '256GB SSD',
            'Bateria': 'Até 18 horas',
            'Sistema': 'macOS Sonoma'
        },
        inStock: true,
        featured: true,
        discount: 0,
        tags: ['notebook', 'apple', 'macbook', 'ultrabook']
    },
    {
        id: 4,
        name: 'Smart TV LG OLED 55"',
        price: 5499.00,
        originalPrice: 6799.00,
        images: [
            'img/products/lg-oled-tv-1.jpg',
            'img/products/lg-oled-tv-2.jpg'
        ],
        category: 'eletronicos',
        brand: 'LG',
        rating: 4.7,
        reviews: 132,
        description: 'TV OLED com cores perfeitas, contraste infinito e sistema webOS para streaming.',
        shortDescription: 'Smart TV LG OLED 55" 4K com Inteligência Artificial',
        specifications: {
            'Tela': '55" OLED 4K',
            'Processador': 'α9 Gen5 AI',
            'Sistema': 'webOS 22',
            'HDR': 'Dolby Vision IQ',
            'Áudio': 'Dolby Atmos',
            'Conexões': '4x HDMI 2.1, 3x USB'
        },
        inStock: true,
        featured: true,
        discount: 19,
        tags: ['tv', 'oled', 'smarttv', '4k', 'lg']
    },
    {
        id: 5,
        name: 'Cafeteira Nespresso Essenza Mini',
        price: 549.00,
        originalPrice: 699.00,
        images: [
            'img/products/nespresso-essenza-1.jpg'
        ],
        category: 'eletrodomesticos',
        brand: 'Nespresso',
        rating: 4.5,
        reviews: 208,
        description: 'Cafeteira compacta com extração perfeita para cafés espresso e lungo.',
        shortDescription: 'Cafeteira Nespresso Essenza Mini preta com 19 bar de pressão',
        specifications: {
            'Pressão': '19 bar',
            'Capacidade': '0.6L',
            'Potência': '1310W',
            'Dimensões': '8.4 x 33 x 20.4 cm',
            'Peso': '2.3kg',
            'Cores': 'Preto'
        },
        inStock: true,
        featured: false,
        discount: 21,
        tags: ['cafeteira', 'nespresso', 'capsulas', 'eletrodomestico']
    },
    {
        id: 6,
        name: 'Tênis Nike Air Max 90',
        price: 799.00,
        originalPrice: 899.00,
        images: [
            'img/products/nike-airmax-1.jpg',
            'img/products/nike-airmax-2.jpg'
        ],
        category: 'moda',
        brand: 'Nike',
        rating: 4.6,
        reviews: 175,
        description: 'Tênis clássico com amortecimento Air Max e design atemporal para conforto diário.',
        shortDescription: 'Tênis Nike Air Max 90 masculino em cores clássicas',
        specifications: {
            'Material': 'Couro e tecido',
            'Solado': 'Borracha',
            'Amortecimento': 'Air Max',
            'Fechamento': 'Cadarço',
            'Indicado para': 'Uso casual',
            'Origem': 'Importado'
        },
        inStock: true,
        featured: false,
        discount: 11,
        tags: ['tenis', 'nike', 'airmax', 'calcado', 'moda']
    },
    {
        id: 7,
        name: 'Livro Clean Code',
        price: 129.90,
        originalPrice: 149.90,
        images: [
            'img/products/clean-code-1.jpg'
        ],
        category: 'livros',
        brand: 'Prentice Hall',
        rating: 4.9,
        reviews: 320,
        description: 'Um manual para desenvolvimento de software limpo e manutenível, escrito por Robert C. Martin.',
        shortDescription: 'Clean Code: A Handbook of Agile Software Craftsmanship',
        specifications: {
            'Autor': 'Robert C. Martin',
            'Páginas': '464',
            'Idioma': 'Inglês',
            'Editora': 'Prentice Hall',
            'Ano': '2008',
            'ISBN': '9780132350884'
        },
        inStock: true,
        featured: false,
        discount: 13,
        tags: ['livro', 'programação', 'desenvolvimento', 'software']
    }
];

// Gerenciador de Produtos
const ProductManager = {
    // Inicializar gerenciador
    init: () => {
        ProductState.allProducts = EXTENDED_PRODUCTS;
        ProductManager.loadFromStorage();
        ProductManager.applyFilters();
    },

    // Carregar dados do localStorage
    loadFromStorage: () => {
        ProductState.wishlist = Utils.loadFromStorage(ProductConfig.STORAGE_KEYS.WISHLIST, []);
        ProductState.recentlyViewed = Utils.loadFromStorage(ProductConfig.STORAGE_KEYS.RECENTLY_VIEWED, []);
    },

    // Salvar no localStorage
    saveToStorage: () => {
        Utils.saveToStorage(ProductConfig.STORAGE_KEYS.WISHLIST, ProductState.wishlist);
        Utils.saveToStorage(ProductConfig.STORAGE_KEYS.RECENTLY_VIEWED, ProductState.recentlyViewed);
    },

    // Obter produto por ID
    getProductById: (id) => {
        return ProductState.allProducts.find(product => product.id === parseInt(id));
    },

    // Buscar produtos
    searchProducts: (query, category = null, filters = {}) => {
        let products = [...ProductState.allProducts];

        // Filtrar por categoria
        if (category) {
            products = products.filter(product => product.category === category);
        }

        // Filtrar por busca
        if (query) {
            const searchTerm = query.toLowerCase();
            products = products.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm) ||
                product.brand.toLowerCase().includes(searchTerm) ||
                product.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        // Aplicar filtros adicionais
        if (filters.priceRange) {
            products = products.filter(product => 
                product.price >= filters.priceRange[0] &&
                product.price <= filters.priceRange[1]
            );
        }

        if (filters.brands && filters.brands.length > 0) {
            products = products.filter(product => 
                filters.brands.includes(product.brand)
            );
        }

        if (filters.rating > 0) {
            products = products.filter(product => product.rating >= filters.rating);
        }

        return products;
    },

    // Aplicar filtros
    applyFilters: () => {
        let filtered = [...ProductState.allProducts];

        // Filtro de busca
        if (ProductState.searchQuery) {
            filtered = ProductManager.searchProducts(ProductState.searchQuery);
        }

        // Aplicar ordenação
        filtered = ProductManager.sortProducts(filtered);

        ProductState.filteredProducts = filtered;
        ProductState.totalPages = Math.ceil(filtered.length / ProductConfig.PRODUCTS_PER_PAGE);
        ProductState.currentPage = 1;
    },

    // Ordenar produtos
    sortProducts: (products) => {
        switch (ProductState.sortBy) {
            case 'price_asc':
                return products.sort((a, b) => a.price - b.price);
            case 'price_desc':
                return products.sort((a, b) => b.price - a.price);
            case 'name_asc':
                return products.sort((a, b) => a.name.localeCompare(b.name));
            case 'rating':
                return products.sort((a, b) => b.rating - a.rating);
            case 'popular':
                return products.sort((a, b) => b.reviews - a.reviews);
            case 'newest':
            default:
                return products.sort((a, b) => b.id - a.id);
        }
    },

    // Renderizar card do produto
    renderProductCard: (product) => {
        const isInWishlist = ProductState.wishlist.includes(product.id);
        
        const discountBadge = product.discount > 0 ? 
            `<div class="discount-badge">-${product.discount}%</div>` : '';

        const originalPrice = product.originalPrice ? 
            `<span class="original-price">${Utils.formatPrice(product.originalPrice)}</span>` : '';

        return `
            <div class="product-card" data-product-id="${product.id}">
                ${discountBadge}
                <div class="product-actions">
                    <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" 
                            onclick="ProductManager.toggleWishlist(${product.id})" 
                            title="${isInWishlist ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}">
                        <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="quick-view-btn" 
                            onclick="ProductManager.showQuickView(${product.id})" 
                            title="Visualização rápida">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="product-image-container" onclick="ProductManager.viewProduct(${product.id})">
                    <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                </div>
                <div class="product-info">
                    <div class="product-brand">${product.brand}</div>
                    <h3 class="product-title" onclick="ProductManager.viewProduct(${product.id})">${product.name}</h3>
                    <div class="product-rating">
                        <div class="stars">${Utils.generateStars(product.rating)}</div>
                        <span class="rating-count">(${product.reviews})</span>
                    </div>
                    <div class="product-price">
                        <span class="current-price">${Utils.formatPrice(product.price)}</span>
                        ${originalPrice}
                    </div>
                    <button class="add-to-cart" onclick="ProductManager.addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        `;
    },

    // Renderizar lista de produtos
    renderProductList: (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Tente ajustar os filtros ou fazer uma nova busca</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => 
            ProductManager.renderProductCard(product)
        ).join('');

        // Aplicar animações
        container.querySelectorAll('.product-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
        });
    },

    // Visualizar produto
    viewProduct: (productId) => {
        const product = ProductManager.getProductById(productId);
        if (!product) return;

        // Adicionar aos recentemente visualizados
        ProductManager.addToRecentlyViewed(productId);
        
        Utils.showNotification(`Visualizando: ${product.name}`, 'info');
    },

    // Visualização rápida
    showQuickView: (productId) => {
        const product = ProductManager.getProductById(productId);
        if (!product) return;

        Utils.showNotification(`Visualização rápida: ${product.name}`, 'info');
    },

    // Adicionar ao carrinho
    addToCart: (productId, quantity = 1) => {
        const product = ProductManager.getProductById(productId);
        if (!product) {
            Utils.showNotification('Produto não encontrado', 'error');
            return false;
        }

        if (!product.inStock) {
            Utils.showNotification('Produto fora de estoque', 'warning');
            return false;
        }

        // Usar CartManager se disponível
        if (window.CartManager) {
            return window.CartManager.addItem(product, quantity);
        } else if (window.addToCart) {
            return window.addToCart(productId, quantity);
        } else {
            Utils.showNotification(`${product.name} adicionado ao carrinho!`);
            return true;
        }
    },

    // Toggle lista de desejos
    toggleWishlist: (productId) => {
        const index = ProductState.wishlist.indexOf(productId);
        const product = ProductManager.getProductById(productId);
        
        if (index === -1) {
            ProductState.wishlist.push(productId);
            Utils.showNotification(`${product.name} adicionado à lista de desejos`);
        } else {
            ProductState.wishlist.splice(index, 1);
            Utils.showNotification(`${product.name} removido da lista de desejos`);
        }
        
        ProductManager.saveToStorage();
        ProductManager.updateWishlistUI();
    },

    // Adicionar aos recentemente visualizados
    addToRecentlyViewed: (productId) => {
        const index = ProductState.recentlyViewed.indexOf(productId);
        
        if (index !== -1) {
            ProductState.recentlyViewed.splice(index, 1);
        }
        
        ProductState.recentlyViewed.unshift(productId);
        
        // Manter apenas os últimos 10
        if (ProductState.recentlyViewed.length > 10) {
            ProductState.recentlyViewed = ProductState.recentlyViewed.slice(0, 10);
        }
        
        ProductManager.saveToStorage();
    },

    // Atualizar UI da lista de desejos
    updateWishlistUI: () => {
        const wishlistBtns = document.querySelectorAll('.wishlist-btn');
        wishlistBtns.forEach(btn => {
            const productId = parseInt(btn.closest('.product-card').dataset.productId);
            const isInWishlist = ProductState.wishlist.includes(productId);
            
            btn.classList.toggle('active', isInWishlist);
            btn.querySelector('i').className = isInWishlist ? 'fas fa-heart' : 'far fa-heart';
            btn.title = isInWishlist ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos';
        });
    },

    // Obter produtos em destaque
    getFeaturedProducts: () => {
        return ProductState.allProducts.filter(product => product.featured);
    },

    // Obter produtos mais vendidos
    getBestSellers: () => {
        return ProductState.allProducts
            .sort((a, b) => b.reviews - a.reviews)
            .slice(0, 8);
    },

    // Obter ofertas do dia
    getDailyOffers: () => {
        return ProductState.allProducts
            .filter(product => product.discount > 0)
            .sort((a, b) => b.discount - a.discount)
            .slice(0, 8);
    }
};

// Funções globais
window.ProductManager = ProductManager;

// Funções de conveniência
window.viewProduct = (productId) => ProductManager.viewProduct(productId);
window.addToWishlist = (productId) => ProductManager.toggleWishlist(productId);

// Inicializar quando o DOM estiver pronto
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ProductManager.init);
    } else {
        ProductManager.init();
    }
}