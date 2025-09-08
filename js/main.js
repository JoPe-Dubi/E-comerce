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

// Utilitários
const Utils = {
    // Formatar preço em reais
    formatPrice: (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    },

    // Debounce para otimizar performance
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Gerar estrelas para avaliação
    generateStars: (rating, maxStars = 5) => {
        let stars = '';
        for (let i = 1; i <= maxStars; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    },

    // Salvar no localStorage
    saveToStorage: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
        }
    },

    // Carregar do localStorage
    loadFromStorage: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Erro ao carregar do localStorage:', error);
            return defaultValue;
        }
    },

    // Mostrar loading
    showLoading: () => {
        document.getElementById('loadingSpinner').style.display = 'flex';
        AppState.isLoading = true;
    },

    // Esconder loading
    hideLoading: () => {
        document.getElementById('loadingSpinner').style.display = 'none';
        AppState.isLoading = false;
    },

    // Mostrar notificação
    showNotification: (message, type = 'success') => {
        const notification = document.getElementById('notification');
        const icon = notification.querySelector('.notification-icon');
        const messageEl = notification.querySelector('.notification-message');

        // Definir ícone baseado no tipo
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        icon.className = `notification-icon ${icons[type] || icons.success}`;
        messageEl.textContent = message;

        notification.classList.add('show');

        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    },

    // Scroll suave para elemento
    scrollToElement: (elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // Validar email
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Gerar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

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

    // Renderizar lista de produtos
    renderProductList: (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <p>Nenhum produto encontrado</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => MainProductManager.renderProduct(product)).join('');
        
        // Adicionar animação
        container.querySelectorAll('.product-card').forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('fade-in');
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
    Utils.scrollToElement('offers');
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
    const cartFooter = document.getElementById('cartFooter');
    
    if (AppState.cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Seu carrinho está vazio</p>
                <button onclick="toggleCart()">Continuar Comprando</button>
            </div>
        `;
        cartFooter.style.display = 'none';
        return;
    }
    
    cartItems.innerHTML = AppState.cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${Utils.formatPrice(item.price)}</div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" 
                           onchange="setCartQuantity(${item.id}, this.value)">
                    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
            <button class="remove-item" onclick="removeFromCart(${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    // Calcular totais
    const subtotal = AppState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 200 ? 0 : 15; // Frete grátis acima de R$ 200
    const total = subtotal + shipping;
    
    document.getElementById('cartSubtotal').textContent = Utils.formatPrice(subtotal);
    document.getElementById('cartShipping').textContent = shipping === 0 ? 'Grátis' : Utils.formatPrice(shipping);
    document.getElementById('cartTotal').textContent = Utils.formatPrice(total);
    
    cartFooter.style.display = 'block';
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
document.addEventListener('DOMContentLoaded', () => {
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
    
    console.log('CompreAqui E-commerce inicializado com sucesso!');
});

// Tornar funções globais
window.slideCarousel = slideCarousel;
window.goToSlide = goToSlide;

// Funções de sugestão de busca
function showSearchSuggestions(query) {
    const suggestions = document.getElementById('searchSuggestions');
    const products = ProductManager.searchProducts(query).slice(0, 5);
    
    if (products.length > 0) {
        suggestions.innerHTML = products.map(product => `
            <div class="suggestion-item" onclick="selectSuggestion('${product.name}')">
                <i class="fas fa-search"></i> ${product.name}
            </div>
        `).join('');
        suggestions.style.display = 'block';
    } else {
        hideSearchSuggestions();
    }
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
window.Utils = Utils;
window.MainProductManager = MainProductManager;