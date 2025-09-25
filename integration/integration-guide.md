# Guia de Integração - Sistema de Pagamento

Este guia explica como integrar o sistema de pagamento completo ao seu e-commerce existente.

## 📋 Índice

1. [Instalação](#instalação)
2. [Configuração Básica](#configuração-básica)
3. [Integração com Checkout](#integração-com-checkout)
4. [Personalização](#personalização)
5. [Callbacks e Eventos](#callbacks-e-eventos)
6. [Exemplos Práticos](#exemplos-práticos)
7. [Troubleshooting](#troubleshooting)

## 🚀 Instalação

### 1. Estrutura de Arquivos

Copie os seguintes arquivos para seu projeto:

```
seu-projeto/
├── backend/
│   ├── controllers/payment-controller.js
│   ├── services/payment-service.js
│   ├── validators/payment-validator.js
│   ├── routes/payment-routes.js
│   ├── middleware/security-middleware.js
│   ├── providers/
│   │   ├── pix-provider.js
│   │   ├── card-provider.js
│   │   └── boleto-provider.js
│   └── utils/encryption.js
├── frontend/
│   ├── payment-interface.html
│   ├── payment-styles.css
│   └── payment-script.js
├── integration/
│   ├── checkout-integration.js
│   └── integration-guide.md
└── database/
    └── payment-schema.sql
```

### 2. Configuração do Banco de Dados

Execute o script SQL para criar as tabelas necessárias:

```sql
-- Execute o arquivo database/payment-schema.sql
mysql -u usuario -p nome_do_banco < database/payment-schema.sql
```

### 3. Dependências do Backend

Instale as dependências necessárias:

```bash
npm install express bcryptjs crypto qrcode mysql2 helmet express-rate-limit
```

## ⚙️ Configuração Básica

### 1. Configuração do Servidor

```javascript
// app.js ou server.js
const express = require('express');
const paymentRoutes = require('./routes/payment-routes');
const securityMiddleware = require('./middleware/security-middleware');

const app = express();

// Middlewares de segurança
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.rateLimiting);

// Rotas de pagamento
app.use('/api/payments', paymentRoutes);

// Servir arquivos estáticos
app.use('/frontend', express.static('frontend'));
app.use('/integration', express.static('integration'));
```

### 2. Variáveis de Ambiente

Crie um arquivo `.env` com as configurações:

```env
# Banco de dados
DB_HOST=localhost
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=seu_banco

# Criptografia
ENCRYPTION_KEY=sua_chave_de_32_caracteres_aqui
JWT_SECRET=seu_jwt_secret_aqui

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu-email@exemplo.com
EMAIL_PASSWORD=sua-senha-de-app

# PIX
PIX_MERCHANT_NAME=Sua Empresa
PIX_MERCHANT_CITY=Sua Cidade
PIX_KEY=sua_chave_pix

# URLs
API_BASE_URL=http://localhost:3000/api
WEBHOOK_URL=http://localhost:3000/api/payments/webhook

# Ambiente
NODE_ENV=development
```

## 🔗 Integração com Checkout

### Método 1: Integração Automática

A forma mais simples é usar o módulo de integração automática:

```html
<!-- No seu HTML de checkout -->
<script src="/integration/checkout-integration.js"></script>
<script>
// Inicializar sistema de pagamento
const paymentSystem = window.initPaymentSystem({
    apiBaseUrl: '/api/payments',
    checkoutContainerId: 'checkout-container',
    paymentContainerId: 'payment-container',
    enabledMethods: ['pix', 'credit_card', 'debit_card', 'boleto'],
    theme: 'modern',
    callbacks: {
        onPaymentSuccess: (result) => {
            // Redirecionar para página de sucesso
            window.location.href = '/success?transaction=' + result.transactionId;
        },
        onError: (error) => {
            alert('Erro no pagamento: ' + error.message);
        }
    }
});
</script>
```

### Método 2: Integração Manual

Para maior controle, você pode integrar manualmente:

```javascript
// Quando o usuário clicar em "Finalizar Compra"
document.getElementById('checkout-button').addEventListener('click', async () => {
    const orderData = {
        items: getCartItems(), // Sua função para obter itens do carrinho
        customer: getCustomerData(), // Dados do cliente
        totals: calculateTotals() // Totais do pedido
    };

    // Inicializar pagamento
    await paymentSystem.initializePayment(orderData);
});
```

### Método 3: Integração com Formulário Existente

Se você já tem um formulário de checkout:

```html
<!-- Adicione data-checkout-form ao seu formulário -->
<form id="checkout-form" data-checkout-form>
    <!-- Seus campos existentes -->
    <input name="customer_name" required>
    <input name="customer_email" required>
    <!-- ... outros campos ... -->
    
    <button type="submit">Finalizar Compra</button>
</form>

<div id="payment-container" style="display: none;"></div>
```

## 🎨 Personalização

### Temas

Você pode personalizar a aparência do sistema:

```javascript
const paymentSystem = window.initPaymentSystem({
    theme: 'modern', // 'default', 'modern', 'minimal'
    colors: {
        primary: '#007bff',
        secondary: '#6c757d',
        success: '#28a745',
        error: '#dc3545',
        background: '#ffffff',
        text: '#212529'
    }
});
```

### CSS Personalizado

```css
/* Sobrescrever estilos específicos */
.payment-integration-container {
    --primary-color: #your-brand-color;
    font-family: 'Sua Fonte', sans-serif;
}

.payment-option {
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Métodos de Pagamento

Habilite apenas os métodos desejados:

```javascript
const paymentSystem = window.initPaymentSystem({
    enabledMethods: ['pix', 'credit_card'], // Apenas PIX e cartão de crédito
    pixDiscount: 0.05, // 5% de desconto no PIX
    maxInstallments: 12 // Máximo de 12 parcelas
});
```

## 📡 Callbacks e Eventos

### Callbacks Disponíveis

```javascript
const paymentSystem = window.initPaymentSystem({
    callbacks: {
        // Quando o pagamento é inicializado
        onPaymentInit: (orderData) => {
            console.log('Pagamento iniciado:', orderData);
            // Enviar evento para Google Analytics
            gtag('event', 'begin_checkout', {
                currency: 'BRL',
                value: orderData.totals.total
            });
        },

        // Quando a interface de pagamento é exibida
        onPaymentShow: () => {
            console.log('Interface de pagamento exibida');
        },

        // Quando um método de pagamento é selecionado
        onMethodSelect: (method) => {
            console.log('Método selecionado:', method);
        },

        // Quando o pagamento é processado com sucesso
        onPaymentSuccess: (result) => {
            console.log('Pagamento aprovado:', result);
            
            // Limpar carrinho
            clearCart();
            
            // Redirecionar
            window.location.href = '/success?id=' + result.transactionId;
        },

        // Quando ocorre um erro
        onError: (error) => {
            console.error('Erro no pagamento:', error);
            
            // Mostrar mensagem personalizada
            showErrorMessage(error.message);
        },

        // Quando o pagamento é cancelado
        onPaymentCancel: () => {
            console.log('Pagamento cancelado');
            // Voltar para o checkout
            paymentSystem.hidePaymentInterface();
        }
    }
});
```

### Eventos Personalizados

O sistema também dispara eventos DOM personalizados:

```javascript
// Escutar eventos
document.addEventListener('payment:init', (e) => {
    console.log('Pagamento iniciado:', e.detail);
});

document.addEventListener('payment:success', (e) => {
    console.log('Pagamento aprovado:', e.detail);
});

document.addEventListener('payment:error', (e) => {
    console.log('Erro no pagamento:', e.detail);
});
```

## 💡 Exemplos Práticos

### Exemplo 1: E-commerce Simples

```html
<!DOCTYPE html>
<html>
<head>
    <title>Minha Loja</title>
    <link rel="stylesheet" href="/frontend/payment-styles.css">
</head>
<body>
    <div id="checkout-container">
        <h2>Finalizar Compra</h2>
        <div id="cart-items">
            <!-- Itens do carrinho serão inseridos aqui -->
        </div>
        <button id="pay-button">Pagar Agora</button>
    </div>

    <div id="payment-container"></div>

    <script src="/integration/checkout-integration.js"></script>
    <script>
        // Dados do carrinho (normalmente vem de uma API ou localStorage)
        const cartData = {
            items: [
                { id: 1, name: 'Produto A', price: 99.90, quantity: 2 },
                { id: 2, name: 'Produto B', price: 149.90, quantity: 1 }
            ]
        };

        // Calcular totais
        const subtotal = cartData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = 15.90;
        const total = subtotal + shipping;

        // Inicializar sistema de pagamento
        const paymentSystem = window.initPaymentSystem({
            enabledMethods: ['pix', 'credit_card', 'boleto'],
            callbacks: {
                onPaymentSuccess: (result) => {
                    alert('Pagamento aprovado! ID: ' + result.transactionId);
                    window.location.href = '/success';
                }
            }
        });

        // Botão de pagamento
        document.getElementById('pay-button').addEventListener('click', () => {
            paymentSystem.initializePayment({
                items: cartData.items,
                totals: { subtotal, shipping, total }
            });
        });
    </script>
</body>
</html>
```

### Exemplo 2: Integração com WooCommerce

```php
<?php
// functions.php do seu tema WordPress

// Adicionar scripts do sistema de pagamento
function add_payment_system_scripts() {
    if (is_checkout()) {
        wp_enqueue_script('payment-integration', get_template_directory_uri() . '/js/checkout-integration.js', array('jquery'), '1.0.0', true);
        wp_enqueue_style('payment-styles', get_template_directory_uri() . '/css/payment-styles.css', array(), '1.0.0');
        
        // Passar dados para JavaScript
        wp_localize_script('payment-integration', 'paymentConfig', array(
            'apiUrl' => home_url('/wp-json/payment/v1/'),
            'nonce' => wp_create_nonce('payment_nonce')
        ));
    }
}
add_action('wp_enqueue_scripts', 'add_payment_system_scripts');

// Hook para interceptar checkout
function custom_payment_integration() {
    ?>
    <script>
    jQuery(document).ready(function($) {
        const paymentSystem = window.initPaymentSystem({
            apiBaseUrl: paymentConfig.apiUrl,
            checkoutContainerId: 'checkout',
            callbacks: {
                onPaymentSuccess: (result) => {
                    // Redirecionar para página de agradecimento do WooCommerce
                    window.location.href = wc_checkout_params.checkout_url + '?payment_success=1&transaction_id=' + result.transactionId;
                }
            }
        });
    });
    </script>
    <?php
}
add_action('wp_footer', 'custom_payment_integration');
?>
```

### Exemplo 3: Integração com React

```jsx
import React, { useEffect, useState } from 'react';

const CheckoutPage = () => {
    const [paymentSystem, setPaymentSystem] = useState(null);
    const [cartItems, setCartItems] = useState([]);

    useEffect(() => {
        // Carregar script de integração
        const script = document.createElement('script');
        script.src = '/integration/checkout-integration.js';
        script.onload = () => {
            const system = window.initPaymentSystem({
                enabledMethods: ['pix', 'credit_card'],
                callbacks: {
                    onPaymentSuccess: (result) => {
                        // Usar React Router para navegar
                        navigate(`/success/${result.transactionId}`);
                    },
                    onError: (error) => {
                        setError(error.message);
                    }
                }
            });
            setPaymentSystem(system);
        };
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, []);

    const handlePayment = () => {
        if (paymentSystem) {
            const orderData = {
                items: cartItems,
                totals: calculateTotals(cartItems)
            };
            paymentSystem.initializePayment(orderData);
        }
    };

    return (
        <div>
            <div id="checkout-container">
                <h2>Finalizar Compra</h2>
                <CartSummary items={cartItems} />
                <button onClick={handlePayment}>Pagar Agora</button>
            </div>
            <div id="payment-container"></div>
        </div>
    );
};

export default CheckoutPage;
```

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Interface de pagamento não aparece

**Possíveis causas:**
- Scripts não carregados corretamente
- Container de pagamento não encontrado
- Dados do pedido inválidos

**Solução:**
```javascript
// Verificar se os scripts foram carregados
console.log('PaymentInterface disponível:', typeof window.PaymentInterface);
console.log('initPaymentSystem disponível:', typeof window.initPaymentSystem);

// Verificar se o container existe
console.log('Container encontrado:', document.getElementById('payment-container'));

// Validar dados do pedido
console.log('Dados do pedido:', orderData);
```

#### 2. Erro de CORS

**Solução:**
```javascript
// No seu servidor Express
app.use(cors({
    origin: ['http://localhost:3000', 'https://seudominio.com'],
    credentials: true
}));
```

#### 3. Estilos não aplicados

**Solução:**
```html
<!-- Verificar se o CSS foi carregado -->
<link rel="stylesheet" href="/frontend/payment-styles.css">

<!-- Ou carregar via JavaScript -->
<script>
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/frontend/payment-styles.css';
document.head.appendChild(link);
</script>
```

#### 4. Webhook não funciona

**Verificações:**
- URL do webhook acessível externamente
- HTTPS configurado (obrigatório em produção)
- Validação de assinatura implementada

```javascript
// Testar webhook localmente com ngrok
// npm install -g ngrok
// ngrok http 3000
// Usar a URL gerada como webhook
```

### Logs e Debug

Ative logs detalhados para debug:

```javascript
// Ativar modo debug
const paymentSystem = window.initPaymentSystem({
    debug: true, // Ativa logs detalhados
    callbacks: {
        onDebug: (message, data) => {
            console.log('[Payment Debug]', message, data);
        }
    }
});
```

### Testes

Para testar o sistema:

```javascript
// Dados de teste para cartão
const testCard = {
    number: '4111111111111111', // Visa de teste
    name: 'TESTE USUARIO',
    expiry: '12/25',
    cvv: '123'
};

// PIX de teste (sempre aprovado em desenvolvimento)
// Boleto de teste (sempre gerado com sucesso)
```

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique este guia primeiro
2. Consulte os logs do navegador (F12)
3. Verifique os logs do servidor
4. Teste com dados de exemplo

## 🔄 Atualizações

Para atualizar o sistema:

1. Faça backup dos arquivos personalizados
2. Substitua os arquivos do sistema
3. Execute migrações de banco se necessário
4. Teste todas as funcionalidades

---

**Nota:** Este sistema foi desenvolvido para ser flexível e compatível com a maioria dos e-commerces. Se você encontrar problemas específicos com sua plataforma, consulte a documentação técnica ou entre em contato para suporte personalizado.