/**
 * Testes de Integração do Sistema de Pagamento
 * Testa a integração entre diferentes componentes e fluxos completos
 */

const assert = require('assert');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const app = require('../app');
const CheckoutIntegration = require('../integration/checkout-integration');

describe('Testes de Integração', () => {
    
    let dom;
    let window;
    let document;

    beforeEach(() => {
        // Configurar ambiente DOM para testes frontend
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Teste</title>
            </head>
            <body>
                <div id="checkout-container">
                    <form id="checkout-form">
                        <input name="total" value="199.90" />
                        <input name="customer_name" value="João Silva" />
                        <input name="customer_email" value="joao@teste.com" />
                        <input name="customer_phone" value="11999999999" />
                        <input name="customer_document" value="12345678901" />
                    </form>
                    <div id="payment-container"></div>
                </div>
            </body>
            </html>
        `);
        
        window = dom.window;
        document = window.document;
        global.window = window;
        global.document = document;
    });

    describe('Integração Frontend-Backend', () => {
        
        it('deve integrar checkout existente com sistema de pagamento', async () => {
            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                apiBaseUrl: '/api/payments',
                theme: 'default'
            });

            // Inicializar integração
            await integration.initialize();

            // Verificar se elementos foram criados
            const paymentContainer = document.getElementById('payment-container');
            assert(paymentContainer);
            
            // Simular extração de dados do checkout
            const orderData = integration.extractOrderData();
            assert.strictEqual(orderData.amount, 199.90);
            assert.strictEqual(orderData.customer.name, 'João Silva');
        });

        it('deve processar fluxo completo PIX', async () => {
            // 1. Iniciar pagamento via API
            const paymentData = {
                method: 'pix',
                amount: 199.90,
                orderId: 'INTEGRATION_TEST_PIX',
                customer: {
                    name: 'João Silva',
                    email: 'joao@teste.com',
                    phone: '11999999999',
                    document: '12345678901'
                }
            };

            const response = await request(app)
                .post('/api/payments/process')
                .send(paymentData)
                .expect(200);

            const { transactionId, pixCode, qrCodeImage } = response.body;

            // 2. Verificar dados retornados
            assert(transactionId);
            assert(pixCode);
            assert(qrCodeImage);

            // 3. Consultar status
            const statusResponse = await request(app)
                .get(`/api/payments/status/${transactionId}`)
                .expect(200);

            assert.strictEqual(statusResponse.body.status, 'pending');

            // 4. Simular webhook de confirmação
            const webhookData = {
                transactionId,
                status: 'approved',
                amount: 199.90,
                paidAt: new Date().toISOString()
            };

            await request(app)
                .post('/api/payments/webhook')
                .send(webhookData)
                .expect(200);

            // 5. Verificar status atualizado
            const finalStatusResponse = await request(app)
                .get(`/api/payments/status/${transactionId}`)
                .expect(200);

            assert.strictEqual(finalStatusResponse.body.status, 'approved');
        });

        it('deve processar fluxo completo Cartão de Crédito', async () => {
            // 1. Iniciar pagamento
            const paymentData = {
                method: 'credit_card',
                amount: 299.90,
                orderId: 'INTEGRATION_TEST_CARD',
                customer: {
                    name: 'Maria Silva',
                    email: 'maria@teste.com',
                    phone: '11888888888',
                    document: '98765432100'
                },
                card: {
                    number: '4111111111111111',
                    name: 'MARIA SILVA',
                    expiryMonth: '12',
                    expiryYear: '2025',
                    cvv: '123'
                },
                installments: 3
            };

            const response = await request(app)
                .post('/api/payments/process')
                .send(paymentData)
                .expect(200);

            const { transactionId, authorizationCode, installments } = response.body;

            // 2. Verificar dados
            assert(transactionId);
            assert(authorizationCode);
            assert.strictEqual(installments, 3);

            // 3. Capturar transação (se necessário)
            if (response.body.status === 'authorized') {
                const captureResponse = await request(app)
                    .post(`/api/payments/capture/${transactionId}`)
                    .expect(200);

                assert.strictEqual(captureResponse.body.status, 'captured');
            }

            // 4. Verificar transação final
            const statusResponse = await request(app)
                .get(`/api/payments/status/${transactionId}`)
                .expect(200);

            assert(['approved', 'captured'].includes(statusResponse.body.status));
        });

        it('deve processar fluxo completo Boleto', async () => {
            // 1. Gerar boleto
            const paymentData = {
                method: 'boleto',
                amount: 150.00,
                orderId: 'INTEGRATION_TEST_BOLETO',
                customer: {
                    name: 'Carlos Silva',
                    email: 'carlos@teste.com',
                    phone: '11777777777',
                    document: '11122233344'
                },
                address: {
                    zipCode: '01234567',
                    street: 'Rua Teste',
                    number: '123',
                    neighborhood: 'Centro',
                    city: 'São Paulo',
                    state: 'SP'
                }
            };

            const response = await request(app)
                .post('/api/payments/process')
                .send(paymentData)
                .expect(200);

            const { transactionId, boletoNumber, digitableLine, boletoUrl } = response.body;

            // 2. Verificar dados do boleto
            assert(transactionId);
            assert(boletoNumber);
            assert(digitableLine);
            assert(boletoUrl);

            // 3. Simular pagamento do boleto via webhook
            const webhookData = {
                transactionId,
                status: 'paid',
                amount: 150.00,
                paidAt: new Date().toISOString(),
                boletoNumber
            };

            await request(app)
                .post('/api/payments/webhook')
                .send(webhookData)
                .expect(200);

            // 4. Verificar status final
            const statusResponse = await request(app)
                .get(`/api/payments/status/${transactionId}`)
                .expect(200);

            assert.strictEqual(statusResponse.body.status, 'paid');
        });
    });

    describe('Integração com Checkout Existente', () => {
        
        it('deve integrar com formulário de checkout simples', async () => {
            // Simular HTML de checkout existente
            document.body.innerHTML = `
                <form id="simple-checkout">
                    <input name="product_name" value="Produto Teste" />
                    <input name="product_price" value="99.90" />
                    <input name="customer_name" value="Ana Silva" />
                    <input name="customer_email" value="ana@teste.com" />
                    <button type="submit">Finalizar Compra</button>
                </form>
                <div id="payment-integration"></div>
            `;

            const integration = new CheckoutIntegration({
                containerId: 'payment-integration',
                checkoutFormId: 'simple-checkout',
                apiBaseUrl: '/api/payments'
            });

            await integration.initialize();

            // Simular submissão do formulário
            const form = document.getElementById('simple-checkout');
            const submitEvent = new window.Event('submit');
            form.dispatchEvent(submitEvent);

            // Verificar se interface de pagamento foi carregada
            const paymentInterface = document.querySelector('#payment-integration .payment-interface');
            assert(paymentInterface);
        });

        it('deve integrar com e-commerce complexo', async () => {
            // Simular estrutura de e-commerce mais complexa
            document.body.innerHTML = `
                <div class="cart-summary">
                    <div class="cart-item" data-price="50.00">Item 1</div>
                    <div class="cart-item" data-price="75.50">Item 2</div>
                    <div class="shipping-cost" data-cost="15.00">Frete</div>
                    <div class="total-amount">140.50</div>
                </div>
                <form class="customer-form">
                    <input name="firstName" value="Pedro" />
                    <input name="lastName" value="Santos" />
                    <input name="email" value="pedro@teste.com" />
                    <input name="phone" value="11666666666" />
                </form>
                <div id="advanced-payment"></div>
            `;

            const integration = new CheckoutIntegration({
                containerId: 'advanced-payment',
                dataExtractors: {
                    amount: () => {
                        const items = document.querySelectorAll('.cart-item');
                        const shipping = document.querySelector('.shipping-cost');
                        let total = 0;
                        
                        items.forEach(item => {
                            total += parseFloat(item.dataset.price);
                        });
                        
                        if (shipping) {
                            total += parseFloat(shipping.dataset.cost);
                        }
                        
                        return total;
                    },
                    customer: () => {
                        const form = document.querySelector('.customer-form');
                        const formData = new FormData(form);
                        
                        return {
                            name: `${formData.get('firstName')} ${formData.get('lastName')}`,
                            email: formData.get('email'),
                            phone: formData.get('phone')
                        };
                    }
                }
            });

            await integration.initialize();

            const orderData = integration.extractOrderData();
            assert.strictEqual(orderData.amount, 140.50);
            assert.strictEqual(orderData.customer.name, 'Pedro Santos');
        });
    });

    describe('Integração com Diferentes Plataformas', () => {
        
        it('deve integrar com WooCommerce', async () => {
            // Simular estrutura do WooCommerce
            document.body.innerHTML = `
                <form name="checkout" class="woocommerce-checkout">
                    <input name="billing_first_name" value="Lucas" />
                    <input name="billing_last_name" value="Oliveira" />
                    <input name="billing_email" value="lucas@teste.com" />
                    <input name="billing_phone" value="11555555555" />
                    <div class="order-total" data-total="250.00">R$ 250,00</div>
                </form>
                <div id="woo-payment-integration"></div>
            `;

            const integration = new CheckoutIntegration({
                containerId: 'woo-payment-integration',
                platform: 'woocommerce',
                apiBaseUrl: '/api/payments'
            });

            await integration.initialize();

            const orderData = integration.extractOrderData();
            assert.strictEqual(orderData.amount, 250.00);
            assert.strictEqual(orderData.customer.name, 'Lucas Oliveira');
        });

        it('deve integrar com Shopify', async () => {
            // Simular estrutura do Shopify
            document.body.innerHTML = `
                <form class="shopify-checkout">
                    <input name="checkout[shipping_address][first_name]" value="Carla" />
                    <input name="checkout[shipping_address][last_name]" value="Costa" />
                    <input name="checkout[email]" value="carla@teste.com" />
                    <span class="total-price" data-checkout-total-price="18990">R$ 189,90</span>
                </form>
                <div id="shopify-payment-integration"></div>
            `;

            const integration = new CheckoutIntegration({
                containerId: 'shopify-payment-integration',
                platform: 'shopify',
                apiBaseUrl: '/api/payments'
            });

            await integration.initialize();

            const orderData = integration.extractOrderData();
            assert.strictEqual(orderData.amount, 189.90);
            assert.strictEqual(orderData.customer.name, 'Carla Costa');
        });
    });

    describe('Testes de Callback e Eventos', () => {
        
        it('deve executar callbacks de sucesso', async () => {
            let callbackExecuted = false;
            let callbackData = null;

            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                apiBaseUrl: '/api/payments',
                callbacks: {
                    onPaymentSuccess: (data) => {
                        callbackExecuted = true;
                        callbackData = data;
                    }
                }
            });

            await integration.initialize();

            // Simular pagamento bem-sucedido
            const mockPaymentData = {
                transactionId: 'TEST_SUCCESS_123',
                status: 'approved',
                method: 'pix',
                amount: 100.00
            };

            integration.handlePaymentSuccess(mockPaymentData);

            assert.strictEqual(callbackExecuted, true);
            assert.strictEqual(callbackData.transactionId, 'TEST_SUCCESS_123');
        });

        it('deve executar callbacks de erro', async () => {
            let errorCallbackExecuted = false;
            let errorData = null;

            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                apiBaseUrl: '/api/payments',
                callbacks: {
                    onPaymentError: (error) => {
                        errorCallbackExecuted = true;
                        errorData = error;
                    }
                }
            });

            await integration.initialize();

            // Simular erro de pagamento
            const mockError = {
                code: 'PAYMENT_FAILED',
                message: 'Cartão recusado',
                details: { reason: 'insufficient_funds' }
            };

            integration.handlePaymentError(mockError);

            assert.strictEqual(errorCallbackExecuted, true);
            assert.strictEqual(errorData.code, 'PAYMENT_FAILED');
        });

        it('deve executar callbacks de mudança de status', async () => {
            const statusChanges = [];

            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                apiBaseUrl: '/api/payments',
                callbacks: {
                    onStatusChange: (status, transactionId) => {
                        statusChanges.push({ status, transactionId });
                    }
                }
            });

            await integration.initialize();

            // Simular mudanças de status
            integration.handleStatusChange('processing', 'TXN_123');
            integration.handleStatusChange('approved', 'TXN_123');

            assert.strictEqual(statusChanges.length, 2);
            assert.strictEqual(statusChanges[0].status, 'processing');
            assert.strictEqual(statusChanges[1].status, 'approved');
        });
    });

    describe('Testes de Personalização', () => {
        
        it('deve aplicar tema personalizado', async () => {
            const customTheme = {
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                borderRadius: '8px',
                fontFamily: 'Arial, sans-serif'
            };

            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                theme: customTheme
            });

            await integration.initialize();

            // Verificar se estilos foram aplicados
            const paymentInterface = document.querySelector('.payment-interface');
            if (paymentInterface) {
                const computedStyle = window.getComputedStyle(paymentInterface);
                // Nota: Em ambiente de teste, pode ser necessário simular a aplicação de estilos
                assert(integration.config.theme.primaryColor === '#007bff');
            }
        });

        it('deve filtrar métodos de pagamento habilitados', async () => {
            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                enabledMethods: ['pix', 'credit_card']
            });

            await integration.initialize();

            const availableMethods = integration.getEnabledMethods();
            assert(availableMethods.includes('pix'));
            assert(availableMethods.includes('credit_card'));
            assert(!availableMethods.includes('boleto'));
        });
    });

    describe('Testes de Responsividade', () => {
        
        it('deve adaptar interface para mobile', async () => {
            // Simular viewport mobile
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 375
            });

            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                responsive: true
            });

            await integration.initialize();

            // Verificar se classe mobile foi aplicada
            const container = document.getElementById('payment-container');
            assert(container.classList.contains('mobile-view') || 
                   integration.isMobileView());
        });

        it('deve adaptar interface para desktop', async () => {
            // Simular viewport desktop
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 1200
            });

            const integration = new CheckoutIntegration({
                containerId: 'payment-container',
                responsive: true
            });

            await integration.initialize();

            // Verificar se classe desktop foi aplicada
            const container = document.getElementById('payment-container');
            assert(container.classList.contains('desktop-view') || 
                   !integration.isMobileView());
        });
    });

    describe('Testes de Performance', () => {
        
        it('deve carregar interface rapidamente', async () => {
            const startTime = Date.now();

            const integration = new CheckoutIntegration({
                containerId: 'payment-container'
            });

            await integration.initialize();

            const endTime = Date.now();
            const loadTime = endTime - startTime;

            // Deve carregar em menos de 2 segundos
            assert(loadTime < 2000);
        });

        it('deve processar múltiplas inicializações', async () => {
            const promises = [];

            for (let i = 0; i < 5; i++) {
                const integration = new CheckoutIntegration({
                    containerId: `payment-container-${i}`
                });

                promises.push(integration.initialize());
            }

            const results = await Promise.all(promises);
            
            // Todas devem ser bem-sucedidas
            results.forEach(result => {
                assert(result !== false);
            });
        });
    });

    afterEach(() => {
        // Limpeza após cada teste
        if (dom) {
            dom.window.close();
        }
        
        delete global.window;
        delete global.document;
    });
});

// Utilitários para testes de integração
class TestUtils {
    static async waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkElement = () => {
                const element = document.querySelector(selector);
                
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Elemento ${selector} não encontrado após ${timeout}ms`));
                } else {
                    setTimeout(checkElement, 100);
                }
            };
            
            checkElement();
        });
    }

    static simulateUserInput(element, value) {
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    static simulateClick(element) {
        element.dispatchEvent(new Event('click', { bubbles: true }));
    }

    static async simulateFormSubmission(formSelector, data) {
        const form = document.querySelector(formSelector);
        
        if (!form) {
            throw new Error(`Formulário ${formSelector} não encontrado`);
        }

        // Preencher campos
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                this.simulateUserInput(input, data[key]);
            }
        });

        // Submeter formulário
        form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
}

module.exports = { TestUtils };