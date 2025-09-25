/**
 * Integração do Sistema de Pagamento com Checkout Existente
 * Este módulo facilita a integração do sistema de pagamento com e-commerces existentes
 */

class CheckoutIntegration {
    constructor(config = {}) {
        this.config = {
            apiBaseUrl: config.apiBaseUrl || '/api/payments',
            checkoutContainerId: config.checkoutContainerId || 'checkout-container',
            paymentContainerId: config.paymentContainerId || 'payment-container',
            theme: config.theme || 'default',
            language: config.language || 'pt-BR',
            enabledMethods: config.enabledMethods || ['pix', 'credit_card', 'debit_card', 'boleto'],
            callbacks: config.callbacks || {},
            ...config
        };

        this.currentOrder = null;
        this.paymentInterface = null;
        this.init();
    }

    /**
     * Inicializar integração
     */
    init() {
        this.loadStyles();
        this.setupEventListeners();
        console.log('Sistema de Pagamento integrado com sucesso');
    }

    /**
     * Carregar estilos do sistema de pagamento
     */
    loadStyles() {
        if (!document.getElementById('payment-styles')) {
            const link = document.createElement('link');
            link.id = 'payment-styles';
            link.rel = 'stylesheet';
            link.href = '/frontend/payment-styles.css';
            document.head.appendChild(link);
        }
    }

    /**
     * Configurar event listeners globais
     */
    setupEventListeners() {
        // Interceptar submissão do checkout
        document.addEventListener('submit', (e) => {
            if (e.target.matches('.checkout-form, #checkout-form, [data-checkout-form]')) {
                e.preventDefault();
                this.handleCheckoutSubmission(e.target);
            }
        });

        // Interceptar cliques em botões de pagamento
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-payment-trigger]')) {
                e.preventDefault();
                this.initializePayment(e.target.dataset.paymentTrigger);
            }
        });
    }

    /**
     * Inicializar processo de pagamento
     * @param {Object} orderData - Dados do pedido
     */
    async initializePayment(orderData) {
        try {
            // Validar dados do pedido
            if (!this.validateOrderData(orderData)) {
                throw new Error('Dados do pedido inválidos');
            }

            this.currentOrder = this.normalizeOrderData(orderData);

            // Criar interface de pagamento
            await this.createPaymentInterface();

            // Executar callback de inicialização
            if (this.config.callbacks.onPaymentInit) {
                this.config.callbacks.onPaymentInit(this.currentOrder);
            }

        } catch (error) {
            console.error('Erro ao inicializar pagamento:', error);
            this.handleError(error);
        }
    }

    /**
     * Lidar com submissão do checkout
     */
    async handleCheckoutSubmission(form) {
        const formData = new FormData(form);
        const orderData = this.extractOrderDataFromForm(formData);
        
        await this.initializePayment(orderData);
    }

    /**
     * Extrair dados do pedido do formulário
     */
    extractOrderDataFromForm(formData) {
        const orderData = {
            items: [],
            customer: {},
            shipping: {},
            totals: {}
        };

        // Extrair itens do carrinho
        const cartItems = this.getCartItems();
        orderData.items = cartItems;

        // Extrair dados do cliente
        orderData.customer = {
            name: formData.get('customer_name') || formData.get('name'),
            email: formData.get('customer_email') || formData.get('email'),
            phone: formData.get('customer_phone') || formData.get('phone'),
            document: formData.get('customer_document') || formData.get('document')
        };

        // Extrair dados de entrega
        orderData.shipping = {
            address: {
                zipCode: formData.get('zip_code') || formData.get('zipcode'),
                street: formData.get('street') || formData.get('address'),
                number: formData.get('number'),
                complement: formData.get('complement'),
                neighborhood: formData.get('neighborhood'),
                city: formData.get('city'),
                state: formData.get('state')
            },
            method: formData.get('shipping_method'),
            cost: parseFloat(formData.get('shipping_cost') || 0)
        };

        // Calcular totais
        orderData.totals = this.calculateTotals(orderData.items, orderData.shipping.cost);

        return orderData;
    }

    /**
     * Obter itens do carrinho (compatível com diferentes e-commerces)
     */
    getCartItems() {
        let items = [];

        // Tentar diferentes seletores comuns
        const selectors = [
            '.cart-item',
            '.product-item',
            '[data-cart-item]',
            '.checkout-item'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                items = Array.from(elements).map(element => this.extractItemData(element));
                break;
            }
        }

        // Se não encontrou itens no DOM, tentar localStorage ou sessionStorage
        if (items.length === 0) {
            items = this.getCartFromStorage();
        }

        return items;
    }

    /**
     * Extrair dados do item do elemento DOM
     */
    extractItemData(element) {
        return {
            id: element.dataset.productId || element.dataset.id,
            name: element.querySelector('.product-name, .item-name, [data-product-name]')?.textContent?.trim(),
            price: this.parsePrice(element.querySelector('.product-price, .item-price, [data-product-price]')?.textContent),
            quantity: parseInt(element.querySelector('.product-quantity, .item-quantity, [data-product-quantity]')?.textContent || 1),
            image: element.querySelector('img')?.src,
            description: element.querySelector('.product-description, .item-description')?.textContent?.trim()
        };
    }

    /**
     * Obter carrinho do storage
     */
    getCartFromStorage() {
        try {
            // Tentar diferentes chaves comuns
            const storageKeys = ['cart', 'shopping_cart', 'cartItems', 'checkout_items'];
            
            for (const key of storageKeys) {
                const data = localStorage.getItem(key) || sessionStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                }
            }
        } catch (error) {
            console.warn('Erro ao carregar carrinho do storage:', error);
        }

        return [];
    }

    /**
     * Calcular totais do pedido
     */
    calculateTotals(items, shippingCost = 0) {
        const subtotal = items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        const total = subtotal + shippingCost;

        return {
            subtotal,
            shipping: shippingCost,
            total
        };
    }

    /**
     * Validar dados do pedido
     */
    validateOrderData(orderData) {
        if (!orderData || typeof orderData !== 'object') {
            return false;
        }

        // Validar itens
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            return false;
        }

        // Validar totais
        if (!orderData.totals || typeof orderData.totals.total !== 'number' || orderData.totals.total <= 0) {
            return false;
        }

        return true;
    }

    /**
     * Normalizar dados do pedido
     */
    normalizeOrderData(orderData) {
        return {
            items: orderData.items.map(item => ({
                id: item.id || this.generateItemId(),
                name: item.name || 'Produto',
                price: parseFloat(item.price) || 0,
                quantity: parseInt(item.quantity) || 1,
                total: (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1),
                image: item.image,
                description: item.description
            })),
            customer: {
                name: orderData.customer?.name || '',
                email: orderData.customer?.email || '',
                phone: orderData.customer?.phone || '',
                document: orderData.customer?.document || ''
            },
            shipping: {
                address: orderData.shipping?.address || {},
                method: orderData.shipping?.method || 'standard',
                cost: parseFloat(orderData.shipping?.cost) || 0
            },
            totals: {
                subtotal: parseFloat(orderData.totals?.subtotal) || 0,
                shipping: parseFloat(orderData.totals?.shipping) || 0,
                total: parseFloat(orderData.totals?.total) || 0
            }
        };
    }

    /**
     * Criar interface de pagamento
     */
    async createPaymentInterface() {
        const container = document.getElementById(this.config.paymentContainerId) || 
                         this.createPaymentContainer();

        // Carregar HTML da interface
        const interfaceHtml = await this.loadPaymentInterfaceHtml();
        container.innerHTML = interfaceHtml;

        // Inicializar JavaScript da interface
        await this.initializePaymentScript();

        // Aplicar tema personalizado
        this.applyTheme();

        // Pré-preencher dados conhecidos
        this.prefillKnownData();

        // Mostrar interface
        this.showPaymentInterface();
    }

    /**
     * Criar container de pagamento
     */
    createPaymentContainer() {
        const container = document.createElement('div');
        container.id = this.config.paymentContainerId;
        container.className = 'payment-integration-container';
        
        // Inserir após o checkout ou no final do body
        const checkoutContainer = document.getElementById(this.config.checkoutContainerId);
        if (checkoutContainer) {
            checkoutContainer.parentNode.insertBefore(container, checkoutContainer.nextSibling);
        } else {
            document.body.appendChild(container);
        }

        return container;
    }

    /**
     * Carregar HTML da interface de pagamento
     */
    async loadPaymentInterfaceHtml() {
        try {
            const response = await fetch('/frontend/payment-interface.html');
            return await response.text();
        } catch (error) {
            console.error('Erro ao carregar interface de pagamento:', error);
            return this.getFallbackHtml();
        }
    }

    /**
     * HTML de fallback caso não consiga carregar o arquivo
     */
    getFallbackHtml() {
        return `
            <div class="payment-container">
                <div class="payment-header">
                    <h2>Finalizar Pagamento</h2>
                </div>
                <div class="payment-content">
                    <p>Carregando interface de pagamento...</p>
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;
    }

    /**
     * Inicializar script da interface de pagamento
     */
    async initializePaymentScript() {
        if (!window.PaymentInterface) {
            await this.loadPaymentScript();
        }

        // Configurar interface com dados do pedido atual
        if (window.PaymentInterface) {
            this.paymentInterface = new window.PaymentInterface();
            this.paymentInterface.orderData = this.currentOrder.totals;
            this.paymentInterface.renderOrderSummary();
        }
    }

    /**
     * Carregar script da interface de pagamento
     */
    loadPaymentScript() {
        return new Promise((resolve, reject) => {
            if (document.getElementById('payment-script')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = 'payment-script';
            script.src = '/frontend/payment-script.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Aplicar tema personalizado
     */
    applyTheme() {
        if (this.config.theme !== 'default') {
            const container = document.getElementById(this.config.paymentContainerId);
            container.classList.add(`theme-${this.config.theme}`);
        }

        // Aplicar cores personalizadas
        if (this.config.colors) {
            const style = document.createElement('style');
            style.textContent = this.generateThemeCSS(this.config.colors);
            document.head.appendChild(style);
        }
    }

    /**
     * Gerar CSS do tema
     */
    generateThemeCSS(colors) {
        return `
            .payment-integration-container {
                --primary-color: ${colors.primary || '#3b82f6'};
                --secondary-color: ${colors.secondary || '#6b7280'};
                --success-color: ${colors.success || '#10b981'};
                --error-color: ${colors.error || '#ef4444'};
                --background-color: ${colors.background || '#ffffff'};
                --text-color: ${colors.text || '#1f2937'};
            }
        `;
    }

    /**
     * Pré-preencher dados conhecidos
     */
    prefillKnownData() {
        if (!this.currentOrder.customer) return;

        const fields = {
            'customerName': this.currentOrder.customer.name,
            'customerEmail': this.currentOrder.customer.email,
            'customerPhone': this.currentOrder.customer.phone,
            'customerDocument': this.currentOrder.customer.document
        };

        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value) {
                field.value = value;
            }
        });

        // Pré-preencher endereço se disponível
        if (this.currentOrder.shipping?.address) {
            const address = this.currentOrder.shipping.address;
            const addressFields = {
                'zipCode': address.zipCode,
                'street': address.street,
                'number': address.number,
                'complement': address.complement,
                'neighborhood': address.neighborhood,
                'city': address.city,
                'state': address.state
            };

            Object.entries(addressFields).forEach(([fieldId, value]) => {
                const field = document.getElementById(fieldId);
                if (field && value) {
                    field.value = value;
                }
            });
        }
    }

    /**
     * Mostrar interface de pagamento
     */
    showPaymentInterface() {
        const container = document.getElementById(this.config.paymentContainerId);
        
        // Ocultar checkout se configurado
        if (this.config.hideCheckoutOnPayment) {
            const checkoutContainer = document.getElementById(this.config.checkoutContainerId);
            if (checkoutContainer) {
                checkoutContainer.style.display = 'none';
            }
        }

        // Mostrar interface de pagamento
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth' });

        // Executar callback
        if (this.config.callbacks.onPaymentShow) {
            this.config.callbacks.onPaymentShow();
        }
    }

    /**
     * Ocultar interface de pagamento
     */
    hidePaymentInterface() {
        const container = document.getElementById(this.config.paymentContainerId);
        container.style.display = 'none';

        // Mostrar checkout novamente
        if (this.config.hideCheckoutOnPayment) {
            const checkoutContainer = document.getElementById(this.config.checkoutContainerId);
            if (checkoutContainer) {
                checkoutContainer.style.display = 'block';
            }
        }
    }

    /**
     * Lidar com erro
     */
    handleError(error) {
        console.error('Erro na integração de pagamento:', error);

        if (this.config.callbacks.onError) {
            this.config.callbacks.onError(error);
        } else {
            alert('Erro ao processar pagamento: ' + error.message);
        }
    }

    /**
     * Utilitários
     */
    parsePrice(priceText) {
        if (!priceText) return 0;
        return parseFloat(priceText.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    }

    generateItemId() {
        return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Métodos públicos para integração externa
     */

    /**
     * Configurar callbacks
     */
    setCallbacks(callbacks) {
        this.config.callbacks = { ...this.config.callbacks, ...callbacks };
    }

    /**
     * Atualizar configuração
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Obter dados do pedido atual
     */
    getCurrentOrder() {
        return this.currentOrder;
    }

    /**
     * Resetar interface
     */
    reset() {
        this.currentOrder = null;
        this.hidePaymentInterface();
        
        const container = document.getElementById(this.config.paymentContainerId);
        if (container) {
            container.innerHTML = '';
        }
    }
}

// Função de inicialização global para facilitar integração
window.initPaymentSystem = function(config) {
    return new CheckoutIntegration(config);
};

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheckoutIntegration;
}

// Exemplo de uso:
/*
// Integração básica
const paymentSystem = window.initPaymentSystem({
    apiBaseUrl: '/api/payments',
    enabledMethods: ['pix', 'credit_card', 'boleto'],
    theme: 'modern',
    colors: {
        primary: '#007bff',
        success: '#28a745'
    },
    callbacks: {
        onPaymentInit: (order) => console.log('Pagamento iniciado:', order),
        onPaymentSuccess: (result) => console.log('Pagamento aprovado:', result),
        onError: (error) => console.error('Erro:', error)
    }
});

// Inicializar pagamento manualmente
paymentSystem.initializePayment({
    items: [
        { id: 1, name: 'Produto A', price: 99.90, quantity: 1 }
    ],
    totals: {
        subtotal: 99.90,
        shipping: 10.00,
        total: 109.90
    }
});
*/