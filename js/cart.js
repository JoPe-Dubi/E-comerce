// CompreAqui E-commerce - Gerenciador de Carrinho

// Configurações do carrinho
const CartConfig = {
    FREE_SHIPPING_THRESHOLD: 200,
    SHIPPING_COST: 15,
    MAX_QUANTITY_PER_ITEM: 10,
    STORAGE_KEY: 'compreaqui_cart',
    COUPON_STORAGE_KEY: 'compreaqui_applied_coupon'
};

// Estado do carrinho
const CartState = {
    items: [],
    appliedCoupon: null,
    shippingMethod: 'standard',
    shippingCost: 0,
    subtotal: 0,
    discount: 0,
    total: 0
};

// Cupons de desconto disponíveis
const AVAILABLE_COUPONS = {
    'BEMVINDO10': {
        type: 'percentage',
        value: 10,
        minAmount: 100,
        description: '10% de desconto para novos clientes'
    },
    'FRETE50': {
        type: 'fixed',
        value: 50,
        minAmount: 200,
        description: 'R$ 50 de desconto no frete'
    },
    'BLACK20': {
        type: 'percentage',
        value: 20,
        minAmount: 500,
        description: '20% de desconto Black Friday'
    }
};

// Gerenciador do Carrinho
const CartManager = {
    // Inicializar carrinho
    init: () => {
        CartManager.loadFromStorage();
        CartManager.updateUI();
        CartManager.bindEvents();
    },

    // Carregar carrinho do localStorage
    loadFromStorage: () => {
        const savedCart = Utils.loadFromStorage(CartConfig.STORAGE_KEY, []);
        const savedCoupon = Utils.loadFromStorage(CartConfig.COUPON_STORAGE_KEY, null);
        
        CartState.items = savedCart;
        CartState.appliedCoupon = savedCoupon;
        
        CartManager.calculateTotals();
    },

    // Salvar carrinho no localStorage
    saveToStorage: () => {
        Utils.saveToStorage(CartConfig.STORAGE_KEY, CartState.items);
        Utils.saveToStorage(CartConfig.COUPON_STORAGE_KEY, CartState.appliedCoupon);
    },

    // Adicionar item ao carrinho
    addItem: (product, quantity = 1, variant = null) => {
        if (!product || !product.id) {
            Utils.showNotification('Produto inválido', 'error');
            return false;
        }

        if (!product.inStock) {
            Utils.showNotification('Produto fora de estoque', 'warning');
            return false;
        }

        const itemId = variant ? `${product.id}-${variant.id}` : product.id.toString();
        const existingItem = CartState.items.find(item => item.id === itemId);

        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > CartConfig.MAX_QUANTITY_PER_ITEM) {
                Utils.showNotification(`Quantidade máxima por item: ${CartConfig.MAX_QUANTITY_PER_ITEM}`, 'warning');
                return false;
            }
            existingItem.quantity = newQuantity;
        } else {
            const cartItem = {
                id: itemId,
                productId: product.id,
                name: product.name,
                price: variant ? variant.price : product.price,
                originalPrice: variant ? variant.originalPrice : product.originalPrice,
                image: variant && variant.image ? variant.image : product.image,
                quantity: quantity,
                variant: variant,
                addedAt: new Date().toISOString()
            };
            CartState.items.push(cartItem);
        }

        CartManager.calculateTotals();
        CartManager.saveToStorage();
        CartManager.updateUI();
        
        const itemName = variant ? `${product.name} (${variant.name})` : product.name;
        Utils.showNotification(`${itemName} adicionado ao carrinho!`);
        
        // Animar botão do carrinho
        CartManager.animateCartButton();
        
        return true;
    },

    // Remover item do carrinho
    removeItem: (itemId) => {
        const itemIndex = CartState.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) {
            Utils.showNotification('Item não encontrado no carrinho', 'error');
            return false;
        }

        const removedItem = CartState.items.splice(itemIndex, 1)[0];
        
        CartManager.calculateTotals();
        CartManager.saveToStorage();
        CartManager.updateUI();
        
        Utils.showNotification(`${removedItem.name} removido do carrinho`);
        return true;
    },

    // Atualizar quantidade de um item
    updateQuantity: (itemId, newQuantity) => {
        const item = CartState.items.find(item => item.id === itemId);
        if (!item) {
            Utils.showNotification('Item não encontrado no carrinho', 'error');
            return false;
        }

        if (newQuantity <= 0) {
            return CartManager.removeItem(itemId);
        }

        if (newQuantity > CartConfig.MAX_QUANTITY_PER_ITEM) {
            Utils.showNotification(`Quantidade máxima por item: ${CartConfig.MAX_QUANTITY_PER_ITEM}`, 'warning');
            return false;
        }

        item.quantity = newQuantity;
        
        CartManager.calculateTotals();
        CartManager.saveToStorage();
        CartManager.updateUI();
        
        return true;
    },

    // Limpar carrinho
    clear: () => {
        CartState.items = [];
        CartState.appliedCoupon = null;
        
        CartManager.calculateTotals();
        CartManager.saveToStorage();
        CartManager.updateUI();
        
        Utils.showNotification('Carrinho limpo');
    },

    // Calcular totais
    calculateTotals: () => {
        // Calcular subtotal
        CartState.subtotal = CartState.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // Calcular frete
        CartState.shippingCost = CartState.subtotal >= CartConfig.FREE_SHIPPING_THRESHOLD ? 0 : CartConfig.SHIPPING_COST;

        // Aplicar cupom de desconto
        CartState.discount = 0;
        if (CartState.appliedCoupon && AVAILABLE_COUPONS[CartState.appliedCoupon]) {
            const coupon = AVAILABLE_COUPONS[CartState.appliedCoupon];
            
            if (CartState.subtotal >= coupon.minAmount) {
                if (coupon.type === 'percentage') {
                    CartState.discount = CartState.subtotal * (coupon.value / 100);
                } else if (coupon.type === 'fixed') {
                    CartState.discount = Math.min(coupon.value, CartState.subtotal);
                }
            }
        }

        // Calcular total
        CartState.total = CartState.subtotal + CartState.shippingCost - CartState.discount;
        CartState.total = Math.max(0, CartState.total); // Garantir que não seja negativo
    },

    // Aplicar cupom de desconto
    applyCoupon: (couponCode) => {
        const coupon = AVAILABLE_COUPONS[couponCode.toUpperCase()];
        
        if (!coupon) {
            Utils.showNotification('Cupom inválido', 'error');
            return false;
        }

        if (CartState.subtotal < coupon.minAmount) {
            Utils.showNotification(`Valor mínimo para este cupom: ${Utils.formatPrice(coupon.minAmount)}`, 'warning');
            return false;
        }

        CartState.appliedCoupon = couponCode.toUpperCase();
        
        CartManager.calculateTotals();
        CartManager.saveToStorage();
        CartManager.updateUI();
        
        Utils.showNotification(`Cupom ${couponCode} aplicado com sucesso!`);
        return true;
    },

    // Remover cupom
    removeCoupon: () => {
        CartState.appliedCoupon = null;
        
        CartManager.calculateTotals();
        CartManager.saveToStorage();
        CartManager.updateUI();
        
        Utils.showNotification('Cupom removido');
    },

    // Atualizar interface do usuário
    updateUI: () => {
        CartManager.updateCartCounter();
        CartManager.updateCartSidebar();
        CartManager.updateCartSummary();
    },

    // Atualizar contador do carrinho
    updateCartCounter: () => {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const totalItems = CartState.items.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = totalItems;
            cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    },

    // Atualizar sidebar do carrinho
    updateCartSidebar: () => {
        const cartItems = document.getElementById('cartItems');
        const cartFooter = document.getElementById('cartFooter');
        
        if (!cartItems) {
            console.warn('Elemento cartItems não encontrado');
            return;
        }

        if (CartState.items.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Seu carrinho está vazio</p>
                    <button onclick="toggleCart()" class="continue-shopping-btn">
                        Continuar Comprando
                    </button>
                </div>
            `;
            if (cartFooter) cartFooter.style.display = 'none';
            return;
        }

        cartItems.innerHTML = CartState.items.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" loading="lazy">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    ${item.variant ? `<div class="cart-item-variant">${item.variant.name}</div>` : ''}
                    <div class="cart-item-price">
                        <span class="current-price">${Utils.formatPrice(item.price)}</span>
                        ${item.originalPrice && item.originalPrice > item.price ? 
                            `<span class="original-price">${Utils.formatPrice(item.originalPrice)}</span>` : ''}
                    </div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="CartManager.updateQuantity('${item.id}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${CartConfig.MAX_QUANTITY_PER_ITEM}"
                               onchange="CartManager.updateQuantity('${item.id}', parseInt(this.value))">
                        <button class="quantity-btn" onclick="CartManager.updateQuantity('${item.id}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="remove-item" onclick="CartManager.removeItem('${item.id}')" title="Remover item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        if (cartFooter) {
            cartFooter.style.display = 'block';
        }
    },

    // Atualizar resumo do carrinho
    updateCartSummary: () => {
        const elements = {
            subtotal: document.getElementById('cartSubtotal'),
            shipping: document.getElementById('cartShipping'),
            discount: document.getElementById('cartDiscount'),
            total: document.getElementById('cartTotal')
        };

        if (elements.subtotal) {
            elements.subtotal.textContent = Utils.formatPrice(CartState.subtotal);
        }

        if (elements.shipping) {
            if (CartState.shippingCost === 0) {
                elements.shipping.textContent = 'Grátis';
                elements.shipping.classList.add('free-shipping');
            } else {
                elements.shipping.textContent = Utils.formatPrice(CartState.shippingCost);
                elements.shipping.classList.remove('free-shipping');
            }
        }

        if (elements.discount) {
            if (CartState.discount > 0) {
                elements.discount.textContent = `-${Utils.formatPrice(CartState.discount)}`;
                elements.discount.parentElement.style.display = 'flex';
            } else {
                elements.discount.parentElement.style.display = 'none';
            }
        }

        if (elements.total) {
            elements.total.textContent = Utils.formatPrice(CartState.total);
        }

        // Atualizar informações do cupom
        CartManager.updateCouponUI();
    },

    // Atualizar UI do cupom
    updateCouponUI: () => {
        const couponInput = document.getElementById('couponInput');
        const couponButton = document.getElementById('applyCouponBtn');
        const appliedCouponDiv = document.getElementById('appliedCoupon');

        if (CartState.appliedCoupon) {
            if (couponInput) couponInput.style.display = 'none';
            if (couponButton) couponButton.style.display = 'none';
            
            if (appliedCouponDiv) {
                const coupon = AVAILABLE_COUPONS[CartState.appliedCoupon];
                appliedCouponDiv.innerHTML = `
                    <div class="applied-coupon">
                        <span class="coupon-info">
                            <i class="fas fa-tag"></i>
                            ${CartState.appliedCoupon} - ${coupon.description}
                        </span>
                        <button class="remove-coupon-btn" onclick="CartManager.removeCoupon()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                appliedCouponDiv.style.display = 'block';
            }
        } else {
            if (couponInput) couponInput.style.display = 'block';
            if (couponButton) couponButton.style.display = 'block';
            if (appliedCouponDiv) appliedCouponDiv.style.display = 'none';
        }
    },

    // Animar botão do carrinho
    animateCartButton: () => {
        const cartBtn = document.querySelector('.cart-btn');
        if (cartBtn) {
            cartBtn.classList.add('cart-animation');
            setTimeout(() => {
                cartBtn.classList.remove('cart-animation');
            }, 600);
        }
    },

    // Vincular eventos
    bindEvents: () => {
        // Evento para aplicar cupom
        const applyCouponBtn = document.getElementById('applyCouponBtn');
        const couponInput = document.getElementById('couponInput');
        
        if (applyCouponBtn && couponInput) {
            applyCouponBtn.addEventListener('click', () => {
                const couponCode = couponInput.value.trim();
                if (couponCode) {
                    CartManager.applyCoupon(couponCode);
                    couponInput.value = '';
                }
            });

            couponInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    applyCouponBtn.click();
                }
            });
        }

        // Evento para calcular frete
        const calculateShippingBtn = document.getElementById('calculateShippingBtn');
        const zipCodeInput = document.getElementById('zipCodeInput');
        
        if (calculateShippingBtn && zipCodeInput) {
            calculateShippingBtn.addEventListener('click', () => {
                const zipCode = zipCodeInput.value.trim();
                if (zipCode) {
                    CartManager.calculateShipping(zipCode);
                }
            });
        }
    },

    // Calcular frete por CEP (simulado)
    calculateShipping: (zipCode) => {
        if (!/^\d{5}-?\d{3}$/.test(zipCode)) {
            Utils.showNotification('CEP inválido. Use o formato 12345-678', 'error');
            return;
        }

        Utils.showLoading();
        
        // Simular consulta de frete
        setTimeout(() => {
            Utils.hideLoading();
            
            // Simulação de diferentes custos baseado no CEP
            const firstDigit = parseInt(zipCode.charAt(0));
            let shippingCost = CartConfig.SHIPPING_COST;
            
            if (firstDigit <= 2) {
                shippingCost = 10; // Região Sudeste
            } else if (firstDigit <= 4) {
                shippingCost = 20; // Região Sul
            } else if (firstDigit <= 6) {
                shippingCost = 25; // Região Nordeste
            } else {
                shippingCost = 30; // Outras regiões
            }

            // Aplicar frete grátis se aplicável
            if (CartState.subtotal >= CartConfig.FREE_SHIPPING_THRESHOLD) {
                shippingCost = 0;
            }

            CartState.shippingCost = shippingCost;
            CartManager.calculateTotals();
            CartManager.updateUI();
            
            const message = shippingCost === 0 ? 
                'Frete grátis para este CEP!' : 
                `Frete calculado: ${Utils.formatPrice(shippingCost)}`;
            
            Utils.showNotification(message);
        }, 1500);
    },

    // Obter dados do carrinho para checkout
    getCartData: () => {
        return {
            items: CartState.items,
            subtotal: CartState.subtotal,
            shippingCost: CartState.shippingCost,
            discount: CartState.discount,
            total: CartState.total,
            appliedCoupon: CartState.appliedCoupon,
            itemCount: CartState.items.reduce((sum, item) => sum + item.quantity, 0)
        };
    },

    // Validar carrinho antes do checkout
    validateCart: () => {
        if (CartState.items.length === 0) {
            Utils.showNotification('Carrinho vazio', 'warning');
            return false;
        }

        // Verificar se todos os itens ainda estão em estoque
        for (const item of CartState.items) {
            const product = ProductManager.getProductById(item.productId);
            if (!product || !product.inStock) {
                Utils.showNotification(`${item.name} não está mais disponível`, 'error');
                return false;
            }
        }

        return true;
    }
};

// Funções globais para o carrinho
window.CartManager = CartManager;

// Funções de conveniência
window.addToCart = (productId, quantity = 1, variant = null) => {
    const product = ProductManager.getProductById(productId);
    if (product) {
        return CartManager.addItem(product, quantity, variant);
    }
    return false;
};

window.removeFromCart = (itemId) => {
    return CartManager.removeItem(itemId);
};

window.updateCartQuantity = (itemId, change) => {
    const item = CartState.items.find(item => item.id === itemId);
    if (item) {
        return CartManager.updateQuantity(itemId, item.quantity + change);
    }
    return false;
};

window.clearCart = () => {
    if (confirm('Tem certeza que deseja limpar o carrinho?')) {
        CartManager.clear();
    }
};

window.goToCheckout = () => {
    if (CartManager.validateCart()) {
        // Implementar redirecionamento para checkout
        Utils.showNotification('Redirecionando para checkout...');
        // window.location.href = 'checkout.html';
    }
};

// CSS adicional para animações do carrinho
const cartStyles = `
    .cart-animation {
        animation: cartBounce 0.6s ease-in-out;
    }
    
    @keyframes cartBounce {
        0%, 20%, 60%, 100% {
            transform: translateY(0);
        }
        40% {
            transform: translateY(-10px);
        }
        80% {
            transform: translateY(-5px);
        }
    }
    
    .free-shipping {
        color: var(--success-green) !important;
        font-weight: 600;
    }
    
    .applied-coupon {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--light-gray);
        padding: 10px 15px;
        border-radius: 8px;
        margin-bottom: 15px;
    }
    
    .coupon-info {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--success-green);
        font-weight: 500;
    }
    
    .remove-coupon-btn {
        background: none;
        border: none;
        color: var(--error-red);
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
        transition: var(--transition);
    }
    
    .remove-coupon-btn:hover {
        background: var(--error-red);
        color: white;
    }
    
    .continue-shopping-btn {
        background: var(--primary-red);
        color: white;
        border: none;
        padding: 12px 25px;
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
    }
    
    .continue-shopping-btn:hover {
        background: #d32f2f;
        transform: translateY(-2px);
    }
    
    .cart-item-variant {
        font-size: 0.9rem;
        color: var(--dark-gray);
        margin-bottom: 5px;
    }
`;

// Adicionar estilos ao documento
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = cartStyles;
    document.head.appendChild(styleSheet);
}

// Inicializar carrinho quando o DOM estiver pronto
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', CartManager.init);
    } else {
        CartManager.init();
    }
}

function renderCartItems() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    
    if (!cartItemsContainer) return;
    
    // Limpar container
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-cart-message';
        emptyMessage.textContent = 'Seu carrinho está vazio';
        cartItemsContainer.appendChild(emptyMessage);
        
        if (cartTotalElement) {
            cartTotalElement.textContent = 'R$ 0,00';
        }
        return;
    }
    
    let total = 0;
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.dataset.productId = item.id;
        
        // Imagem do produto
        const imageDiv = document.createElement('div');
        imageDiv.className = 'cart-item-image';
        
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.name;
        img.loading = 'lazy';
        
        imageDiv.appendChild(img);
        
        // Informações do produto
        const infoDiv = document.createElement('div');
        infoDiv.className = 'cart-item-info';
        
        const nameElement = document.createElement('h4');
        nameElement.textContent = item.name;
        
        const priceElement = document.createElement('p');
        priceElement.className = 'cart-item-price';
        priceElement.textContent = Utils.formatPrice(item.price);
        
        infoDiv.appendChild(nameElement);
        infoDiv.appendChild(priceElement);
        
        // Controles de quantidade
        const quantityDiv = document.createElement('div');
        quantityDiv.className = 'cart-item-quantity';
        
        const decreaseBtn = document.createElement('button');
        decreaseBtn.className = 'quantity-btn decrease';
        decreaseBtn.textContent = '-';
        decreaseBtn.onclick = () => updateQuantity(item.id, item.quantity - 1);
        
        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'quantity';
        quantitySpan.textContent = item.quantity;
        
        const increaseBtn = document.createElement('button');
        increaseBtn.className = 'quantity-btn increase';
        increaseBtn.textContent = '+';
        increaseBtn.onclick = () => updateQuantity(item.id, item.quantity + 1);
        
        quantityDiv.appendChild(decreaseBtn);
        quantityDiv.appendChild(quantitySpan);
        quantityDiv.appendChild(increaseBtn);
        
        // Botão remover
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-item-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => removeFromCart(item.id);
        
        // Subtotal
        const subtotalDiv = document.createElement('div');
        subtotalDiv.className = 'cart-item-subtotal';
        subtotalDiv.textContent = Utils.formatPrice(item.price * item.quantity);
        
        cartItem.appendChild(imageDiv);
        cartItem.appendChild(infoDiv);
        cartItem.appendChild(quantityDiv);
        cartItem.appendChild(removeBtn);
        cartItem.appendChild(subtotalDiv);
        
        cartItemsContainer.appendChild(cartItem);
        
        total += item.price * item.quantity;
    });
    
    if (cartTotalElement) {
        cartTotalElement.textContent = Utils.formatPrice(total);
    }
    
    updateCartBadge();
}