/**
 * Sistema de Pagamento - Frontend JavaScript
 * Gerencia a interface e interações do usuário
 */

class PaymentInterface {
    constructor() {
        this.selectedMethod = null;
        this.orderData = null;
        this.apiBaseUrl = '/api/payments';
        this.init();
    }

    /**
     * Inicializar interface
     */
    init() {
        this.loadOrderData();
        this.setupEventListeners();
        this.setupFormValidation();
        this.setupMasks();
    }

    /**
     * Carregar dados do pedido
     */
    loadOrderData() {
        // Em produção, carregar do localStorage ou API
        this.orderData = {
            items: [
                {
                    name: 'Produto Exemplo 1',
                    quantity: 2,
                    price: 99.90,
                    total: 199.80
                },
                {
                    name: 'Produto Exemplo 2',
                    quantity: 1,
                    price: 149.90,
                    total: 149.90
                }
            ],
            subtotal: 349.70,
            shipping: 15.90,
            total: 365.60
        };

        this.renderOrderSummary();
        this.updateBoletoExpiryDate();
    }

    /**
     * Renderizar resumo do pedido
     */
    renderOrderSummary() {
        const orderItemsContainer = document.getElementById('orderItems');
        const subtotalElement = document.getElementById('subtotal');
        const shippingElement = document.getElementById('shipping');
        const totalElement = document.getElementById('totalAmount');

        // Renderizar itens
        orderItemsContainer.innerHTML = this.orderData.items.map(item => `
            <div class="order-item">
                <div class="item-info">
                    <h4>${item.name}</h4>
                    <p>Quantidade: ${item.quantity}</p>
                </div>
                <div class="item-price">
                    ${this.formatCurrency(item.total)}
                </div>
            </div>
        `).join('');

        // Atualizar totais
        subtotalElement.textContent = this.formatCurrency(this.orderData.subtotal);
        shippingElement.textContent = this.formatCurrency(this.orderData.shipping);
        totalElement.textContent = this.formatCurrency(this.orderData.total);
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Seleção de método de pagamento
        document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectPaymentMethod(e.target.value);
            });
        });

        // Botão de processar pagamento
        document.getElementById('processPaymentButton').addEventListener('click', () => {
            this.processPayment();
        });

        // Botão voltar
        document.getElementById('backButton').addEventListener('click', () => {
            window.history.back();
        });

        // Modal
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modalConfirm').addEventListener('click', () => {
            this.closeModal();
        });

        // CEP lookup
        document.getElementById('zipCode').addEventListener('blur', (e) => {
            this.lookupZipCode(e.target.value);
        });

        // Validação de cartão em tempo real
        document.getElementById('cardNumber').addEventListener('input', (e) => {
            this.validateCardNumber(e.target.value);
            this.detectCardBrand(e.target.value);
        });

        document.getElementById('cardExpiry').addEventListener('input', (e) => {
            this.validateCardExpiry(e.target.value);
        });

        document.getElementById('cardCvv').addEventListener('input', (e) => {
            this.validateCardCvv(e.target.value);
        });
    }

    /**
     * Selecionar método de pagamento
     */
    selectPaymentMethod(method) {
        this.selectedMethod = method;

        // Remover seleção anterior
        document.querySelectorAll('.payment-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Adicionar seleção atual
        document.querySelector(`[data-method="${method}"]`).classList.add('selected');

        // Mostrar/ocultar formulários
        this.showPaymentForm(method);

        // Atualizar parcelamento para cartão de crédito
        if (method === 'credit_card') {
            this.updateInstallments();
            document.getElementById('installmentsRow').style.display = 'block';
        } else {
            document.getElementById('installmentsRow').style.display = 'none';
        }

        // Aplicar descontos
        this.applyDiscount(method);
    }

    /**
     * Mostrar formulário de pagamento
     */
    showPaymentForm(method) {
        // Ocultar todos os formulários
        document.querySelectorAll('.payment-form').forEach(form => {
            form.style.display = 'none';
        });

        // Mostrar formulário específico
        switch (method) {
            case 'pix':
                document.getElementById('pixForm').style.display = 'block';
                break;
            case 'credit_card':
            case 'debit_card':
                document.getElementById('cardForm').style.display = 'block';
                break;
            case 'boleto':
                document.getElementById('boletoForm').style.display = 'block';
                break;
        }
    }

    /**
     * Aplicar desconto baseado no método
     */
    applyDiscount(method) {
        let discount = 0;
        let newTotal = this.orderData.subtotal + this.orderData.shipping;

        switch (method) {
            case 'pix':
                discount = 0.05; // 5%
                break;
            case 'debit_card':
                discount = 0.03; // 3%
                break;
        }

        if (discount > 0) {
            newTotal = newTotal * (1 - discount);
        }

        document.getElementById('totalAmount').textContent = this.formatCurrency(newTotal);
    }

    /**
     * Atualizar opções de parcelamento
     */
    updateInstallments() {
        const installmentsSelect = document.getElementById('installments');
        const total = this.orderData.subtotal + this.orderData.shipping;
        
        installmentsSelect.innerHTML = '';

        for (let i = 1; i <= 12; i++) {
            const installmentValue = total / i;
            const option = document.createElement('option');
            option.value = i;
            
            if (i === 1) {
                option.textContent = `1x de ${this.formatCurrency(installmentValue)} (à vista)`;
            } else {
                option.textContent = `${i}x de ${this.formatCurrency(installmentValue)} sem juros`;
            }
            
            installmentsSelect.appendChild(option);
        }
    }

    /**
     * Atualizar data de vencimento do boleto
     */
    updateBoletoExpiryDate() {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 3); // 3 dias úteis
        
        document.getElementById('boletoExpiryDate').textContent = 
            expiryDate.toLocaleDateString('pt-BR');
    }

    /**
     * Configurar máscaras de entrada
     */
    setupMasks() {
        // Máscara para número do cartão
        document.getElementById('cardNumber').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
            e.target.value = value;
        });

        // Máscara para data de expiração
        document.getElementById('cardExpiry').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });

        // Máscara para CVV
        document.getElementById('cardCvv').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });

        // Máscara para CPF/CNPJ
        document.getElementById('customerDocument').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length <= 11) {
                // CPF
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else {
                // CNPJ
                value = value.replace(/^(\d{2})(\d)/, '$1.$2');
                value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
                value = value.replace(/(\d{4})(\d)/, '$1-$2');
            }
            
            e.target.value = value;
        });

        // Máscara para telefone
        document.getElementById('customerPhone').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            value = value.replace(/(\d)(\d{4})$/, '$1-$2');
            e.target.value = value;
        });

        // Máscara para CEP
        document.getElementById('zipCode').addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }

    /**
     * Configurar validação de formulários
     */
    setupFormValidation() {
        // Validação em tempo real
        document.querySelectorAll('input[required]').forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    /**
     * Validar campo individual
     */
    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'customerName':
                isValid = value.length >= 2;
                errorMessage = 'Nome deve ter pelo menos 2 caracteres';
                break;
            
            case 'customerDocument':
                isValid = this.validateDocument(value);
                errorMessage = 'CPF ou CNPJ inválido';
                break;
            
            case 'customerEmail':
                isValid = this.validateEmail(value);
                errorMessage = 'E-mail inválido';
                break;
            
            case 'cardNumber':
                isValid = this.validateCardNumber(value);
                errorMessage = 'Número do cartão inválido';
                break;
            
            case 'cardExpiry':
                isValid = this.validateCardExpiry(value);
                errorMessage = 'Data de expiração inválida';
                break;
            
            case 'cardCvv':
                isValid = this.validateCardCvv(value);
                errorMessage = 'CVV inválido';
                break;
        }

        this.showFieldError(field, isValid ? '' : errorMessage);
        return isValid;
    }

    /**
     * Mostrar erro do campo
     */
    showFieldError(field, message) {
        const errorElement = document.getElementById(field.name + 'Error');
        
        if (message) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            field.classList.add('invalid');
            field.classList.remove('valid');
        } else {
            errorElement.classList.remove('show');
            field.classList.remove('invalid');
            field.classList.add('valid');
        }
    }

    /**
     * Validar documento (CPF/CNPJ)
     */
    validateDocument(document) {
        const cleanDoc = document.replace(/\D/g, '');
        
        if (cleanDoc.length === 11) {
            return this.validateCPF(cleanDoc);
        } else if (cleanDoc.length === 14) {
            return this.validateCNPJ(cleanDoc);
        }
        
        return false;
    }

    /**
     * Validar CPF
     */
    validateCPF(cpf) {
        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        
        let digit1 = 11 - (sum % 11);
        if (digit1 === 10 || digit1 === 11) digit1 = 0;
        
        if (digit1 !== parseInt(cpf.charAt(9))) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        
        let digit2 = 11 - (sum % 11);
        if (digit2 === 10 || digit2 === 11) digit2 = 0;
        
        return digit2 === parseInt(cpf.charAt(10));
    }

    /**
     * Validar CNPJ
     */
    validateCNPJ(cnpj) {
        if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
            return false;
        }

        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cnpj.charAt(i)) * weights1[i];
        }
        
        let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (digit1 !== parseInt(cnpj.charAt(12))) return false;

        sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cnpj.charAt(i)) * weights2[i];
        }
        
        let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        return digit2 === parseInt(cnpj.charAt(13));
    }

    /**
     * Validar e-mail
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validar número do cartão (Algoritmo de Luhn)
     */
    validateCardNumber(cardNumber) {
        const number = cardNumber.replace(/\D/g, '');
        
        if (number.length < 13 || number.length > 19) {
            return false;
        }

        let sum = 0;
        let isEven = false;

        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number.charAt(i));

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return sum % 10 === 0;
    }

    /**
     * Detectar bandeira do cartão
     */
    detectCardBrand(cardNumber) {
        const number = cardNumber.replace(/\D/g, '');
        const brandIcon = document.getElementById('cardBrandIcon');
        
        let brand = '';
        
        if (/^4/.test(number)) {
            brand = 'visa';
        } else if (/^5[1-5]/.test(number)) {
            brand = 'mastercard';
        } else if (/^3[47]/.test(number)) {
            brand = 'amex';
        } else if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(number)) {
            brand = 'elo';
        }

        brandIcon.className = brand ? `card-brand-icon card-brand-${brand}` : 'card-brand-icon';
    }

    /**
     * Validar data de expiração
     */
    validateCardExpiry(expiry) {
        const match = expiry.match(/^(\d{2})\/(\d{2})$/);
        
        if (!match) return false;

        const month = parseInt(match[1]);
        const year = parseInt('20' + match[2]);
        
        if (month < 1 || month > 12) return false;

        const now = new Date();
        const expiryDate = new Date(year, month - 1);
        
        return expiryDate > now;
    }

    /**
     * Validar CVV
     */
    validateCardCvv(cvv) {
        return /^\d{3,4}$/.test(cvv);
    }

    /**
     * Buscar CEP
     */
    async lookupZipCode(zipCode) {
        const cleanZip = zipCode.replace(/\D/g, '');
        
        if (cleanZip.length !== 8) return;

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
            const data = await response.json();

            if (!data.erro) {
                document.getElementById('street').value = data.logradouro;
                document.getElementById('neighborhood').value = data.bairro;
                document.getElementById('city').value = data.localidade;
                document.getElementById('state').value = data.uf;
            }
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
        }
    }

    /**
     * Processar pagamento
     */
    async processPayment() {
        if (!this.selectedMethod) {
            this.showError('Selecione um método de pagamento');
            return;
        }

        // Validar formulários
        if (!this.validateAllForms()) {
            this.showError('Preencha todos os campos obrigatórios corretamente');
            return;
        }

        const paymentData = this.collectPaymentData();
        
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Payment-Token': this.generatePaymentToken()
                },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (response.ok) {
                this.handlePaymentSuccess(result);
            } else {
                this.handlePaymentError(result);
            }
        } catch (error) {
            console.error('Erro no pagamento:', error);
            this.showError('Erro de conexão. Tente novamente.');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Validar todos os formulários
     */
    validateAllForms() {
        let isValid = true;

        // Validar dados do cliente
        document.querySelectorAll('#customerForm input[required]').forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        // Validar endereço
        document.querySelectorAll('#addressForm input[required], #addressForm select[required]').forEach(input => {
            if (!input.value.trim()) {
                this.showFieldError(input, 'Campo obrigatório');
                isValid = false;
            }
        });

        // Validar dados do cartão (se aplicável)
        if (this.selectedMethod === 'credit_card' || this.selectedMethod === 'debit_card') {
            document.querySelectorAll('#cardPaymentForm input[required]').forEach(input => {
                if (!this.validateField(input)) {
                    isValid = false;
                }
            });
        }

        return isValid;
    }

    /**
     * Coletar dados do pagamento
     */
    collectPaymentData() {
        const customerData = {
            name: document.getElementById('customerName').value,
            document: document.getElementById('customerDocument').value.replace(/\D/g, ''),
            email: document.getElementById('customerEmail').value,
            phone: document.getElementById('customerPhone').value.replace(/\D/g, '')
        };

        const addressData = {
            zipCode: document.getElementById('zipCode').value.replace(/\D/g, ''),
            street: document.getElementById('street').value,
            number: document.getElementById('number').value,
            complement: document.getElementById('complement').value,
            neighborhood: document.getElementById('neighborhood').value,
            city: document.getElementById('city').value,
            state: document.getElementById('state').value
        };

        const paymentData = {
            method: this.selectedMethod,
            amount: this.getCurrentTotal(),
            orderId: this.generateOrderId(),
            customer: customerData,
            address: addressData,
            items: this.orderData.items
        };

        // Adicionar dados específicos do método
        if (this.selectedMethod === 'credit_card' || this.selectedMethod === 'debit_card') {
            paymentData.card = {
                number: document.getElementById('cardNumber').value.replace(/\D/g, ''),
                name: document.getElementById('cardName').value,
                expiryMonth: document.getElementById('cardExpiry').value.split('/')[0],
                expiryYear: '20' + document.getElementById('cardExpiry').value.split('/')[1],
                cvv: document.getElementById('cardCvv').value
            };

            if (this.selectedMethod === 'credit_card') {
                paymentData.installments = parseInt(document.getElementById('installments').value);
            }
        }

        return paymentData;
    }

    /**
     * Obter total atual (com descontos aplicados)
     */
    getCurrentTotal() {
        const totalText = document.getElementById('totalAmount').textContent;
        return parseFloat(totalText.replace(/[^\d,]/g, '').replace(',', '.'));
    }

    /**
     * Gerar ID do pedido
     */
    generateOrderId() {
        return 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Gerar token de pagamento
     */
    generatePaymentToken() {
        return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
    }

    /**
     * Lidar com sucesso do pagamento
     */
    handlePaymentSuccess(result) {
        switch (this.selectedMethod) {
            case 'pix':
                this.showPixPayment(result);
                break;
            case 'boleto':
                this.showBoletoPayment(result);
                break;
            case 'credit_card':
            case 'debit_card':
                this.showCardPaymentSuccess(result);
                break;
        }
    }

    /**
     * Mostrar pagamento PIX
     */
    showPixPayment(result) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="qr-code-container">
                <h4>Escaneie o QR Code para pagar</h4>
                <div class="qr-code">
                    <img src="data:image/png;base64,${result.qrCodeImage}" alt="QR Code PIX" style="width: 100%; height: 100%;">
                </div>
                <div class="pix-copy-paste">
                    <label>Ou copie e cole o código PIX:</label>
                    <div class="copy-input">
                        <input type="text" value="${result.pixCode}" readonly>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('${result.pixCode}')">
                            Copiar
                        </button>
                    </div>
                </div>
                <p><strong>Valor:</strong> ${this.formatCurrency(result.amount)}</p>
                <p><strong>Válido até:</strong> ${new Date(result.expiresAt).toLocaleString('pt-BR')}</p>
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Pagamento PIX';
        this.showModal();
    }

    /**
     * Mostrar pagamento boleto
     */
    showBoletoPayment(result) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="boleto-container">
                <h4>Boleto gerado com sucesso!</h4>
                <p><strong>Número do boleto:</strong> ${result.boletoNumber}</p>
                <p><strong>Vencimento:</strong> ${new Date(result.dueDate).toLocaleDateString('pt-BR')}</p>
                <p><strong>Valor:</strong> ${this.formatCurrency(result.amount)}</p>
                <p><strong>Linha digitável:</strong></p>
                <code style="font-size: 12px; word-break: break-all;">${result.digitableLine}</code>
                <br><br>
                <a href="${result.boletoUrl}" target="_blank" class="btn btn-primary">
                    <i class="fas fa-download"></i>
                    Baixar Boleto
                </a>
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Boleto Bancário';
        this.showModal();
    }

    /**
     * Mostrar sucesso do pagamento com cartão
     */
    showCardPaymentSuccess(result) {
        const modalBody = document.getElementById('modalBody');
        modalBody.innerHTML = `
            <div class="success-container">
                <div style="text-align: center; margin-bottom: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 48px; color: #10b981;"></i>
                </div>
                <h4>Pagamento aprovado!</h4>
                <p><strong>Transação:</strong> ${result.transactionId}</p>
                <p><strong>Valor:</strong> ${this.formatCurrency(result.amount)}</p>
                <p><strong>Cartão:</strong> **** **** **** ${result.cardLastFour}</p>
                ${result.installments > 1 ? `<p><strong>Parcelamento:</strong> ${result.installments}x</p>` : ''}
                <p><strong>Status:</strong> Aprovado</p>
            </div>
        `;

        document.getElementById('modalTitle').textContent = 'Pagamento Aprovado';
        this.showModal();
    }

    /**
     * Lidar com erro do pagamento
     */
    handlePaymentError(error) {
        this.showError(error.message || 'Erro no processamento do pagamento');
    }

    /**
     * Mostrar modal
     */
    showModal() {
        document.getElementById('resultModal').style.display = 'flex';
    }

    /**
     * Fechar modal
     */
    closeModal() {
        document.getElementById('resultModal').style.display = 'none';
    }

    /**
     * Mostrar loading
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        const button = document.getElementById('processPaymentButton');
        
        if (show) {
            overlay.style.display = 'flex';
            button.classList.add('loading');
            button.disabled = true;
        } else {
            overlay.style.display = 'none';
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    /**
     * Mostrar erro
     */
    showError(message) {
        alert(message); // Em produção, usar um toast ou modal mais elegante
    }

    /**
     * Formatar moeda
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new PaymentInterface();
});