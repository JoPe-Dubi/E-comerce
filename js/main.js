// CompreAqui E-commerce - JavaScript Principal

// Configurações globais
const CONFIG = {
    API_BASE_URL: 'https://api.compreaqui.com',
    STORAGE_KEYS: {
        CART: 'compreaqui_cart',
        USER: 'compreaqui_user',
        WISHLIST: 'compreaqui_wishlist',
        RECENT_SEARCHES: 'compreaqui_recent_searches'
    },
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300
};

// Estado global da aplicação
const AppState = {
    user: null,
    cart: [],
    wishlist: [],
    products: [],
    categories: [],
    isLoading: false,
    currentPage: 1,
    searchQuery: '',
    selectedCategory: null,
    filters: {
        priceRange: [0, 10000],
        brands: [],
        rating: 0
    }
};

// Produtos de exemplo (simulando API)
const SAMPLE_PRODUCTS = [
    {
        id: 1,
        name: 'iPhone 15 Pro',
        price: 7999.00,
        originalPrice: 8999.00,
        image: 'img/products/iphone-15-pro.jpg',
        category: 'eletronicos',
        brand: 'Apple',
        rating: 4.8,
        reviews: 245,
        description: 'iPhone 15 Pro com chip A17 Pro e câmera profissional',
        inStock: true,
        featured: true,
        discount: 11
    },
    {
        id: 2,
        name: 'Samsung Galaxy S24',
        price: 4499.00,
        originalPrice: 4999.00,
        image: 'img/products/galaxy-s24.jpg',
        category: 'eletronicos',
        brand: 'Samsung',
        rating: 4.6,
        reviews: 189,
        description: 'Smartphone premium com IA integrada',
        inStock: true,
        featured: true,
        discount: 10
    },
    {
        id: 3,
        name: 'MacBook Air M3',
        price: 12999.00,
        originalPrice: null,
        image: 'img/products/macbook-air-m3.jpg',
        category: 'eletronicos',
        brand: 'Apple',
        rating: 4.9,
        reviews: 156,
        description: 'Notebook ultrafino com chip M3',
        inStock: true,
        featured: true,
        discount: 0
    },
    {
        id: 4,
        name: 'Tênis Nike Air Max',
        price: 499.00,
        originalPrice: 599.00,
        image: 'img/products/nike-air-max.jpg',
        category: 'esportes',
        brand: 'Nike',
        rating: 4.5,
        reviews: 324,
        description: 'Tênis esportivo com tecnologia Air Max',
        inStock: true,
        featured: false,
        discount: 17
    },
    {
        id: 5,
        name: 'Camiseta Adidas Originals',
        price: 99.00,
        originalPrice: 129.00,
        image: 'img/products/adidas-originals.jpg',
        category: 'moda',
        brand: 'Adidas',
        rating: 4.3,
        reviews: 89,
        description: 'Camiseta casual da linha Originals',
        inStock: true,
        featured: false,
        discount: 23
    },
    {
        id: 6,
        name: 'PlayStation 5',
        price: 4499.00,
        originalPrice: 4999.00,
        image: 'img/products/playstation-5.jpg',
        category: 'games',
        brand: 'Sony',
        rating: 4.7,
        reviews: 412,
        description: 'Console de nova geração',
        inStock: true,
        featured: true,
        discount: 10
    },
    {
        id: 7,
        name: 'Smart TV LG 55"',
        price: 3499.00,
        originalPrice: 3999.00,
        image: 'img/products/lg-tv-55.jpg',
        category: 'eletronicos',
        brand: 'LG',
        rating: 4.4,
        reviews: 167,
        description: 'Smart TV 4K UHD com WebOS',
        inStock: true,
        featured: false,
        discount: 13
    },
    {
        id: 8,
        name: 'Sofá 3 Lugares',
        price: 1899.00,
        originalPrice: 2299.00,
        image: 'img/products/sofa-3-lugares.jpg',
        category: 'casa',
        brand: 'Casa & Cia',
        rating: 4.2,
        reviews: 78,
        description: 'Sofá confortável para sala de estar',
        inStock: true,
        featured: false,
        discount: 17
    }
];

// Utils será carregado do arquivo utils.js

// Gerenciador básico de produtos para main.js
const MainProductManager = {
    // Carregar produtos
    loadProducts: () => {
        AppState.products = SAMPLE_PRODUCTS;
        return AppState.products;
    },

    // Buscar produtos
    searchProducts: (query, category = null, filters = {}) => {
        let products = AppState.products;

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
                product.brand.toLowerCase().includes(searchTerm)
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

        if (filters.rating) {
            products = products.filter(product => product.rating >= filters.rating);
        }

        return products;
    },

    // Obter produto por ID
    getProductById: (id) => {
        return AppState.products.find(product => product.id === parseInt(id));
    },

    // Obter produtos em destaque
    getFeaturedProducts: () => {
        return AppState.products.filter(product => product.featured);
    },

    // Obter produtos mais vendidos (simulado)
    getBestSellers: () => {
        return AppState.products
            .sort((a, b) => b.reviews - a.reviews)
            .slice(0, 8);
    },

    // Obter ofertas do dia
    getDailyOffers: () => {
        return AppState.products
            .filter(product => product.discount > 0)
            .sort((a, b) => b.discount - a.discount)
            .slice(0, 8);
    },

    // Renderizar produto
    renderProduct: (product) => {
        const discountBadge = product.discount > 0 ? 
            `<div class="discount-badge">-${product.discount}%</div>` : '';

        const originalPrice = product.originalPrice ? 
            `<span class="original-price">${Utils.formatPrice(product.originalPrice)}</span>` : '';

        return `
            <div class="product-card" onclick="viewProduct(${product.id})">
                ${discountBadge}
                <img src="${product.images ? product.images[0] : product.image}" alt="${product.name}" class="product-image" loading="lazy">
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <div class="product-rating">
                        <div class="stars">${Utils.generateStars(product.rating)}</div>
                        <span class="rating-count">(${product.reviews})</span>
                    </div>
                    <div class="product-price">
                        <span class="current-price">${Utils.formatPrice(product.price)}</span>
                        ${originalPrice}
                    </div>
                    <button class="add-to-cart" onclick="event.stopPropagation(); addToCart(${product.id})">
                        <i class="fas fa-shopping-cart"></i> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        `;
    },

    // Usar renderProductList do ProductManager para evitar duplicação
    renderProductList: (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        // Limpa o container
        container.innerHTML = '';
        
        // Cria elementos de forma segura
        products.forEach(product => {
            const productHTML = MainProductManager.renderProduct(product);
            const tempDiv = document.createElement('div');
            SecurityUtils.safeSetHTML(tempDiv, productHTML);
            container.appendChild(tempDiv.firstElementChild);
        });
    }
};

// Funções globais
window.performSearch = () => {
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        AppState.searchQuery = query;
        const results = MainProductManager.searchProducts(query);
        MainProductManager.renderProductList(results, 'searchResults');
        
        // Salvar busca recente
        const recentSearches = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, []);
        if (!recentSearches.includes(query)) {
            recentSearches.unshift(query);
            if (recentSearches.length > 10) recentSearches.pop();
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.RECENT_SEARCHES, recentSearches);
        }
        
        Utils.showNotification(`${results.length} produtos encontrados para "${query}"`);
    }
};

window.filterByCategory = (category) => {
    AppState.selectedCategory = category;
    const products = MainProductManager.searchProducts('', category);
    MainProductManager.renderProductList(products, 'categoryResults');
    Utils.showNotification(`Mostrando produtos da categoria: ${category}`);
};

window.viewProduct = (productId) => {
    const product = MainProductManager.getProductById(productId);
    if (product) {
        // Implementar página de produto ou modal
        Utils.showNotification(`Visualizando: ${product.name}`);
        // Aqui você pode redirecionar para uma página de produto ou abrir um modal
    }
};

window.addToCart = (productId, quantity = 1) => {
    const product = MainProductManager.getProductById(productId);
    if (!product) {
        Utils.showNotification('Produto não encontrado', 'error');
        return;
    }

    if (!product.inStock) {
        Utils.showNotification('Produto fora de estoque', 'warning');
        return;
    }

    // Verificar se produto já está no carrinho
    const existingItem = AppState.cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        AppState.cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.images ? product.images[0] : product.image,
            quantity: quantity
        });
    }

    // Salvar carrinho
    Utils.saveToStorage(CONFIG.STORAGE_KEYS.CART, AppState.cart);
    
    // Atualizar UI
    updateCartUI();
    Utils.showNotification(`${product.name} adicionado ao carrinho!`);
};

window.toggleCart = () => {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('open');
    
    if (cartSidebar.classList.contains('open')) {
        renderCartItems();
    }
};

window.scrollToOffers = () => {
    // Rolar para a seção de categorias já que a seção de ofertas foi removida
    const categoriesSection = document.querySelector('.categories-section');
    if (categoriesSection) {
        categoriesSection.scrollIntoView({ behavior: 'smooth' });
    }
};

window.subscribeNewsletter = (event) => {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    
    if (!Utils.isValidEmail(email)) {
        Utils.showNotification('Por favor, insira um email válido', 'error');
        return;
    }
    
    // Simular inscrição
    Utils.showNotification('Inscrição realizada com sucesso!');
    event.target.reset();
};

// Funções do carrinho
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const totalItems = AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    if (totalItems > 0) {
        cartCount.style.display = 'flex';
    } else {
        cartCount.style.display = 'none';
    }
}

function renderCartItems() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;

    if (AppState.cart.length === 0) {
        const emptyMessage = SecurityUtils.createElement('div', { class: 'empty-cart' });
        emptyMessage.innerHTML = `
            <i class="fas fa-shopping-cart"></i>
            <p>Seu carrinho está vazio</p>
            <button onclick="toggleCart()" class="btn btn-primary">Continuar Comprando</button>
        `;
        cartItems.innerHTML = '';
        cartItems.appendChild(emptyMessage);
        return;
    }

    // Limpa o container
    cartItems.innerHTML = '';
    
    // Adiciona cada item do carrinho de forma segura
    AppState.cart.forEach(item => {
        const itemHTML = `
            <div class="cart-item" data-product-id="${item.id}">
                <img src="${SecurityUtils.escapeHTML(item.image)}" alt="${SecurityUtils.escapeHTML(item.name)}" class="cart-item-image">
                <div class="cart-item-info">
                    <h4>${SecurityUtils.escapeHTML(item.name)}</h4>
                    <p class="cart-item-price">R$ ${item.price.toFixed(2)}</p>
                </div>
                <div class="cart-item-controls">
                    <button onclick="updateCartQuantity(${item.id}, -1)" class="btn-quantity">-</button>
                    <input type="number" value="${item.quantity}" min="1" onchange="setCartQuantity(${item.id}, this.value)" class="quantity-input">
                    <button onclick="updateCartQuantity(${item.id}, 1)" class="btn-quantity">+</button>
                    <button onclick="removeFromCart(${item.id})" class="btn-remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        SecurityUtils.safeSetHTML(tempDiv, itemHTML);
        cartItems.appendChild(tempDiv.firstElementChild);
    });
}

window.updateCartQuantity = (productId, change) => {
    const item = AppState.cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.CART, AppState.cart);
            updateCartUI();
            renderCartItems();
        }
    }
};

window.setCartQuantity = (productId, quantity) => {
    const item = AppState.cart.find(item => item.id === productId);
    if (item) {
        const newQuantity = parseInt(quantity);
        if (newQuantity > 0) {
            item.quantity = newQuantity;
            Utils.saveToStorage(CONFIG.STORAGE_KEYS.CART, AppState.cart);
            updateCartUI();
            renderCartItems();
        }
    }
};

window.removeFromCart = (productId) => {
    AppState.cart = AppState.cart.filter(item => item.id !== productId);
    Utils.saveToStorage(CONFIG.STORAGE_KEYS.CART, AppState.cart);
    updateCartUI();
    renderCartItems();
    Utils.showNotification('Item removido do carrinho');
};

window.goToCheckout = () => {
    if (AppState.cart.length === 0) {
        Utils.showNotification('Carrinho vazio', 'warning');
        return;
    }
    
    // Implementar checkout
    Utils.showNotification('Redirecionando para checkout...');
    // window.location.href = 'checkout.html';
};

// Carrossel de Categorias
let currentSlide = 0;
const totalSlides = 6; // Total de categorias

function initCarousel() {
    const indicators = document.getElementById('carouselIndicators');
    if (!indicators) return;
    
    // Criar indicadores
    for (let i = 0; i < totalSlides; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'indicator';
        if (i === 0) indicator.classList.add('active');
        indicator.onclick = () => goToSlide(i);
        indicators.appendChild(indicator);
    }
    
    // Mostrar primeiro slide
    showSlide(0);
    
    // Auto-play do carrossel
    setInterval(() => {
        slideCarousel(1);
    }, 5000);
}

function slideCarousel(direction) {
    currentSlide += direction;
    
    if (currentSlide >= totalSlides) {
        currentSlide = 0;
    } else if (currentSlide < 0) {
        currentSlide = totalSlides - 1;
    }
    
    showSlide(currentSlide);
}

function goToSlide(index) {
    currentSlide = index;
    showSlide(currentSlide);
}

function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    // Esconder todos os slides
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    // Mostrar slide atual
    if (slides[index]) {
        slides[index].classList.add('active');
    }
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Aguardar inicialização do banco SQLite
    if (window.productDB) {
        try {
            await window.productDB.init();
            console.log('Banco SQLite inicializado no main.js');
        } catch (error) {
            console.error('Erro ao inicializar banco SQLite no main.js:', error);
        }
    }
    
    // Carregar dados salvos
    AppState.cart = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.CART, []);
    AppState.user = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.USER, null);
    AppState.wishlist = Utils.loadFromStorage(CONFIG.STORAGE_KEYS.WISHLIST, []);
    
    // Carregar produtos
    MainProductManager.loadProducts();
    
    // Renderizar seções
    MainProductManager.renderProductList(MainProductManager.getDailyOffers(), 'dailyOffers');
    MainProductManager.renderProductList(MainProductManager.getBestSellers(), 'bestSellers');
    MainProductManager.renderProductList(MainProductManager.getFeaturedProducts(), 'recommendations');
    
    // Atualizar UI do carrinho
    updateCartUI();
    
    // Inicializar carrossel
    initCarousel();
    
    // Configurar busca com debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', Utils.debounce((e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                // Implementar sugestões de busca
                showSearchSuggestions(query);
            } else {
                hideSearchSuggestions();
            }
        }, CONFIG.DEBOUNCE_DELAY));
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
                hideSearchSuggestions();
            }
        });
    }
    
    // Fechar carrinho ao clicar fora
    document.addEventListener('click', (e) => {
        const cartSidebar = document.getElementById('cartSidebar');
        const cartBtn = document.querySelector('.cart-btn');
        
        if (cartSidebar.classList.contains('open') && 
            !cartSidebar.contains(e.target) && 
            !cartBtn.contains(e.target)) {
            cartSidebar.classList.remove('open');
        }
    });
    
    // CompreAqui E-commerce inicializado
    console.log('CompreAqui E-commerce inicializado com sucesso!');
});

// Tornar funções globais
window.slideCarousel = slideCarousel;
window.goToSlide = goToSlide;

// Funções de sugestão de busca
function showSearchSuggestions(query) {
    const suggestions = document.getElementById('searchSuggestions');
    if (!suggestions) return;

    const products = MainProductManager.searchProducts(query).slice(0, 5);
    
    // Limpa sugestões
    suggestions.innerHTML = '';
    
    // Adiciona produtos de forma segura
    products.forEach(product => {
        const suggestionHTML = `
            <div class="search-suggestion" onclick="selectSuggestion('${SecurityUtils.escapeHTML(product.name)}')">
                <img src="${SecurityUtils.escapeHTML(product.image)}" alt="${SecurityUtils.escapeHTML(product.name)}">
                <span>${SecurityUtils.escapeHTML(product.name)}</span>
            </div>
        `;
        
        const tempDiv = document.createElement('div');
        SecurityUtils.safeSetHTML(tempDiv, suggestionHTML);
        suggestions.appendChild(tempDiv.firstElementChild);
    });
    
    suggestions.style.display = products.length > 0 ? 'block' : 'none';
}

function hideSearchSuggestions() {
    const suggestions = document.getElementById('searchSuggestions');
    suggestions.style.display = 'none';
}

window.selectSuggestion = (suggestion) => {
    document.getElementById('searchInput').value = suggestion;
    hideSearchSuggestions();
    performSearch();
};

// Exportar para uso global
window.AppState = AppState;
window.MainProductManager = MainProductManager;