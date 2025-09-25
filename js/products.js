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
    recentlyViewed: [],
    customProducts: []
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
    // Inicializar gerenciador de produtos
    init: async () => {
        await ProductManager.loadCustomProducts();
        ProductState.allProducts = [...EXTENDED_PRODUCTS, ...ProductState.customProducts];
        ProductManager.loadFromStorage();
        await ProductManager.updateOffersDisplay();
        ProductManager.applyFilters();
    },
    
    // Carregar produtos customizados do banco SQLite
    loadCustomProducts: async () => {
        try {
            if (window.productDB && window.productDB.isInitialized) {
                const dbProducts = await window.productDB.getAllProducts();
                ProductState.customProducts = dbProducts || [];
                console.log('Produtos carregados do SQLite:', ProductState.customProducts.length);
            } else {
                // Fallback para localStorage
                const customProducts = JSON.parse(localStorage.getItem('compreaqui_products') || '[]');
                ProductState.customProducts = customProducts;
                console.log('Produtos carregados do localStorage:', ProductState.customProducts.length);
            }
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            ProductState.customProducts = [];
        }
    },
    
    // Atualizar exibição de ofertas na página principal
    updateOffersDisplay: async () => {
        try {
            let offers = [];
            
            // Tentar carregar ofertas do banco SQLite
            if (window.productDB && window.productDB.isInitialized) {
                const featuredProducts = await window.productDB.getFeaturedProducts();
                offers = featuredProducts.map(product => ({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    image: product.images && product.images[0] ? product.images[0] : null,
                    category: product.category,
                    discount: product.discount
                }));
                console.log('Ofertas carregadas do SQLite:', offers.length);
            } else {
                // Fallback para localStorage
                offers = JSON.parse(localStorage.getItem('compreaqui_offers') || '[]');
                console.log('Ofertas carregadas do localStorage:', offers.length);
            }
            
            offers.forEach(offer => {
                ProductManager.addOfferToCarousel(offer);
            });
        } catch (error) {
            console.error('Erro ao carregar ofertas:', error);
        }
    },
    
    // Adicionar oferta ao carousel da página principal
    addOfferToCarousel: (offer) => {
        const categorySlide = document.querySelector(`[data-category="${offer.category}"] .offer-products`);
        
        if (categorySlide) {
            const offerItem = document.createElement('div');
            offerItem.className = 'offer-item';
            offerItem.innerHTML = `
                ${offer.image ? 
                    `<img src="${offer.image}" alt="${offer.name}" onerror="this.outerHTML='<div class=\"placeholder-img\">${offer.name.charAt(0)}</div>';">` :
                    `<div class="placeholder-img">${offer.name.charAt(0)}</div>`
                }
                <div class="offer-info">
                    <span class="offer-name">${offer.name}</span>
                    <span class="offer-price">R$ ${offer.price.toFixed(2).replace('.', ',')}</span>
                </div>
            `;
            
            categorySlide.appendChild(offerItem);
        }
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

    renderProductCard: (product) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-product-id', product.id);
        
        // Imagem do produto
        const imageContainer = document.createElement('div');
        imageContainer.className = 'product-image';
        
        const img = document.createElement('img');
        img.src = product.image;
        img.alt = SecurityUtils.escapeHTML(product.name);
        img.loading = 'lazy';
        
        imageContainer.appendChild(img);
        
        // Informações do produto
        const infoContainer = document.createElement('div');
        infoContainer.className = 'product-info';
        
        const title = document.createElement('h3');
        title.className = 'product-title';
        title.textContent = product.name;
        
        const description = document.createElement('p');
        description.className = 'product-description';
        description.textContent = product.description;
        
        const priceContainer = document.createElement('div');
        priceContainer.className = 'product-price';
        
        const price = document.createElement('span');
        price.className = 'price';
        price.textContent = `R$ ${product.price.toFixed(2)}`;
        
        priceContainer.appendChild(price);
        
        // Botão de adicionar ao carrinho
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-primary add-to-cart-btn';
        addButton.textContent = 'Adicionar ao Carrinho';
        addButton.onclick = () => CartManager.addToCart(product);
        
        // Montar o card
        infoContainer.appendChild(title);
        infoContainer.appendChild(description);
        infoContainer.appendChild(priceContainer);
        infoContainer.appendChild(addButton);
        
        card.appendChild(imageContainer);
        card.appendChild(infoContainer);
        
        return card;
    },

    // Renderizar lista de produtos
    renderProductList: (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container com ID '${containerId}' não encontrado`);
            return false;
        }

        if (!Array.isArray(products)) {
            console.warn('Lista de produtos deve ser um array');
            return false;
        }

        if (products.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Tente ajustar os filtros ou fazer uma nova busca</p>
                </div>
            `;
            return true;
        }

        try {
            // Usar renderProduct do MainProductManager se disponível, senão usar renderProductCard local
            const renderFunction = window.MainProductManager?.renderProduct || ProductManager.renderProductCard;
            container.innerHTML = products.map(product => renderFunction(product)).join('');

            // Aplicar animações
            container.querySelectorAll('.product-card').forEach((card, index) => {
                card.style.animationDelay = `${index * 0.1}s`;
                card.classList.add('fade-in');
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao renderizar produtos:', error);
            container.innerHTML = '<div class="error-message">Erro ao carregar produtos</div>';
            return false;
        }
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

    // Usar funções do MainProductManager para evitar duplicação
    getFeaturedProducts: () => {
        return window.MainProductManager ? window.MainProductManager.getFeaturedProducts() : [];
    },

    getBestSellers: () => {
        return window.MainProductManager ? window.MainProductManager.getBestSellers() : [];
    },

    getDailyOffers: () => {
        return window.MainProductManager ? window.MainProductManager.getDailyOffers() : [];
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

function renderProductGrid(products) {
    const container = document.getElementById('products-grid');
    if (!container) return;
    
    // Limpar container
    container.innerHTML = '';
    
    if (!products || products.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-products-message';
        emptyMessage.textContent = 'Nenhum produto encontrado.';
        container.appendChild(emptyMessage);
        return;
    }
    
    // Renderizar produtos
    products.forEach(product => {
        const productCard = ProductManager.renderProductCard(product);
        container.appendChild(productCard);
    });
}

function renderCategoryFilter(categories) {
    const filterContainer = document.getElementById('category-filter');
    if (!filterContainer) return;
    
    // Limpar container
    filterContainer.innerHTML = '';
    
    // Botão "Todos"
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.textContent = 'Todos';
    allButton.onclick = () => {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        allButton.classList.add('active');
        renderProductGrid(ProductManager.getAllProducts());
    };
    
    filterContainer.appendChild(allButton);
    
    // Botões de categoria
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        button.textContent = category;
        button.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filteredProducts = ProductManager.getProductsByCategory(category);
            renderProductGrid(filteredProducts);
        };
        
        filterContainer.appendChild(button);
    });
}