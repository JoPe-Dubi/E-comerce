const validator = require('validator');
const { logger } = require('../utils/logger');

/**
 * Validador de Dados de Pagamento
 * Valida todos os dados relacionados a pagamentos
 */
class PaymentValidator {
    constructor() {
        this.errors = [];
    }

    /**
     * Validar dados gerais de pagamento
     */
    async validatePaymentData(data) {
        this.errors = [];

        // Validar campos obrigatórios
        this.validateRequired(data, [
            'paymentMethod',
            'amount',
            'orderId'
        ]);

        // Validar método de pagamento
        this.validatePaymentMethod(data.paymentMethod);

        // Validar valor
        this.validateAmount(data.amount);

        // Validar ID do pedido
        this.validateOrderId(data.orderId);

        // Validar itens se fornecidos
        if (data.items) {
            this.validateItems(data.items);
        }

        return {
            isValid: this.errors.length === 0,
            errors: this.errors
        };
    }

    /**
     * Validar dados PIX
     */
    async validatePixData(data) {
        this.errors = [];

        // Validar campos obrigatórios
        this.validateRequired(data, [
            'customerName',
            'customerDocument'
        ]);

        // Validar nome do cliente
        if (data.customerName) {
            this.validateName(data.customerName, 'customerName');
        }

        // Validar documento
        if (data.customerDocument) {
            this.validateDocument(data.customerDocument, 'customerDocument');
        }

        // Validar email se fornecido
        if (data.customerEmail) {
            this.validateEmail(data.customerEmail, 'customerEmail');
        }

        return {
            isValid: this.errors.length === 0,
            errors: this.errors
        };
    }

    /**
     * Validar dados do cartão
     */
    async validateCardData(data) {
        this.errors = [];

        // Validar campos obrigatórios
        this.validateRequired(data, [
            'number',
            'holderName',
            'expiryMonth',
            'expiryYear',
            'cvv',
            'holderDocument'
        ]);

        // Validar número do cartão
        if (data.number) {
            this.validateCardNumber(data.number);
        }

        // Validar nome do portador
        if (data.holderName) {
            this.validateName(data.holderName, 'holderName');
        }

        // Validar data de expiração
        if (data.expiryMonth && data.expiryYear) {
            this.validateExpiryDate(data.expiryMonth, data.expiryYear);
        }

        // Validar CVV
        if (data.cvv) {
            this.validateCVV(data.cvv);
        }

        // Validar documento do portador
        if (data.holderDocument) {
            this.validateDocument(data.holderDocument, 'holderDocument');
        }

        // Validar email se fornecido
        if (data.holderEmail) {
            this.validateEmail(data.holderEmail, 'holderEmail');
        }

        // Validar parcelas
        if (data.installments) {
            this.validateInstallments(data.installments);
        }

        return {
            isValid: this.errors.length === 0,
            errors: this.errors
        };
    }

    /**
     * Validar dados do boleto
     */
    async validateBoletoData(data) {
        this.errors = [];

        // Validar campos obrigatórios
        this.validateRequired(data, [
            'customerName',
            'customerDocument',
            'customerEmail',
            'customerAddress'
        ]);

        // Validar nome do cliente
        if (data.customerName) {
            this.validateName(data.customerName, 'customerName');
        }

        // Validar documento
        if (data.customerDocument) {
            this.validateDocument(data.customerDocument, 'customerDocument');
        }

        // Validar email
        if (data.customerEmail) {
            this.validateEmail(data.customerEmail, 'customerEmail');
        }

        // Validar endereço
        if (data.customerAddress) {
            this.validateAddress(data.customerAddress);
        }

        return {
            isValid: this.errors.length === 0,
            errors: this.errors
        };
    }

    /**
     * Validar campos obrigatórios
     */
    validateRequired(data, fields) {
        fields.forEach(field => {
            if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
                this.addError(field, `Campo ${field} é obrigatório`);
            }
        });
    }

    /**
     * Validar método de pagamento
     */
    validatePaymentMethod(method) {
        const validMethods = ['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'BOLETO'];
        
        if (!validMethods.includes(method)) {
            this.addError('paymentMethod', 'Método de pagamento inválido');
        }
    }

    /**
     * Validar valor
     */
    validateAmount(amount) {
        const numAmount = parseFloat(amount);
        
        if (isNaN(numAmount) || numAmount <= 0) {
            this.addError('amount', 'Valor deve ser um número positivo');
            return;
        }

        if (numAmount < 0.01) {
            this.addError('amount', 'Valor mínimo é R$ 0,01');
        }

        if (numAmount > 100000) {
            this.addError('amount', 'Valor máximo é R$ 100.000,00');
        }
    }

    /**
     * Validar ID do pedido
     */
    validateOrderId(orderId) {
        if (typeof orderId !== 'string' || orderId.length < 3) {
            this.addError('orderId', 'ID do pedido deve ter pelo menos 3 caracteres');
        }
    }

    /**
     * Validar itens do pedido
     */
    validateItems(items) {
        if (!Array.isArray(items)) {
            this.addError('items', 'Itens devem ser um array');
            return;
        }

        if (items.length === 0) {
            this.addError('items', 'Pelo menos um item é obrigatório');
            return;
        }

        items.forEach((item, index) => {
            if (!item.id) {
                this.addError(`items[${index}].id`, 'ID do item é obrigatório');
            }

            if (!item.name || item.name.trim() === '') {
                this.addError(`items[${index}].name`, 'Nome do item é obrigatório');
            }

            if (!item.price || parseFloat(item.price) <= 0) {
                this.addError(`items[${index}].price`, 'Preço do item deve ser positivo');
            }

            if (!item.quantity || parseInt(item.quantity) <= 0) {
                this.addError(`items[${index}].quantity`, 'Quantidade do item deve ser positiva');
            }
        });
    }

    /**
     * Validar nome
     */
    validateName(name, field) {
        if (typeof name !== 'string') {
            this.addError(field, 'Nome deve ser uma string');
            return;
        }

        const cleanName = name.trim();
        
        if (cleanName.length < 2) {
            this.addError(field, 'Nome deve ter pelo menos 2 caracteres');
        }

        if (cleanName.length > 100) {
            this.addError(field, 'Nome deve ter no máximo 100 caracteres');
        }

        // Verificar se contém apenas letras, espaços e acentos
        const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
        if (!nameRegex.test(cleanName)) {
            this.addError(field, 'Nome deve conter apenas letras e espaços');
        }
    }

    /**
     * Validar documento (CPF/CNPJ)
     */
    validateDocument(document, field) {
        if (typeof document !== 'string') {
            this.addError(field, 'Documento deve ser uma string');
            return;
        }

        // Remover caracteres não numéricos
        const cleanDoc = document.replace(/\D/g, '');

        if (cleanDoc.length === 11) {
            // Validar CPF
            if (!this.isValidCPF(cleanDoc)) {
                this.addError(field, 'CPF inválido');
            }
        } else if (cleanDoc.length === 14) {
            // Validar CNPJ
            if (!this.isValidCNPJ(cleanDoc)) {
                this.addError(field, 'CNPJ inválido');
            }
        } else {
            this.addError(field, 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos');
        }
    }

    /**
     * Validar email
     */
    validateEmail(email, field) {
        if (!validator.isEmail(email)) {
            this.addError(field, 'Email inválido');
        }
    }

    /**
     * Validar número do cartão
     */
    validateCardNumber(number) {
        // Remover espaços e caracteres não numéricos
        const cleanNumber = number.replace(/\D/g, '');

        if (cleanNumber.length < 13 || cleanNumber.length > 19) {
            this.addError('number', 'Número do cartão deve ter entre 13 e 19 dígitos');
            return;
        }

        // Validar usando algoritmo de Luhn
        if (!this.isValidLuhn(cleanNumber)) {
            this.addError('number', 'Número do cartão inválido');
        }
    }

    /**
     * Validar data de expiração
     */
    validateExpiryDate(month, year) {
        const numMonth = parseInt(month);
        const numYear = parseInt(year);

        if (isNaN(numMonth) || numMonth < 1 || numMonth > 12) {
            this.addError('expiryMonth', 'Mês de expiração inválido');
        }

        if (isNaN(numYear)) {
            this.addError('expiryYear', 'Ano de expiração inválido');
        }

        // Verificar se a data não está no passado
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (numYear < currentYear || (numYear === currentYear && numMonth < currentMonth)) {
            this.addError('expiryDate', 'Cartão expirado');
        }

        // Verificar se não está muito no futuro (mais de 10 anos)
        if (numYear > currentYear + 10) {
            this.addError('expiryYear', 'Ano de expiração muito distante');
        }
    }

    /**
     * Validar CVV
     */
    validateCVV(cvv) {
        const cleanCVV = cvv.toString().replace(/\D/g, '');

        if (cleanCVV.length < 3 || cleanCVV.length > 4) {
            this.addError('cvv', 'CVV deve ter 3 ou 4 dígitos');
        }
    }

    /**
     * Validar parcelas
     */
    validateInstallments(installments) {
        const numInstallments = parseInt(installments);

        if (isNaN(numInstallments) || numInstallments < 1) {
            this.addError('installments', 'Número de parcelas deve ser positivo');
            return;
        }

        if (numInstallments > 12) {
            this.addError('installments', 'Máximo de 12 parcelas');
        }
    }

    /**
     * Validar endereço
     */
    validateAddress(address) {
        const requiredFields = ['street', 'number', 'city', 'state', 'zipCode'];

        requiredFields.forEach(field => {
            if (!address[field] || address[field].trim() === '') {
                this.addError(`customerAddress.${field}`, `Campo ${field} do endereço é obrigatório`);
            }
        });

        // Validar CEP
        if (address.zipCode) {
            const cleanZip = address.zipCode.replace(/\D/g, '');
            if (cleanZip.length !== 8) {
                this.addError('customerAddress.zipCode', 'CEP deve ter 8 dígitos');
            }
        }

        // Validar estado (UF)
        if (address.state && address.state.length !== 2) {
            this.addError('customerAddress.state', 'Estado deve ter 2 caracteres (UF)');
        }
    }

    /**
     * Validar CPF
     */
    isValidCPF(cpf) {
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cpf)) {
            return false;
        }

        // Calcular primeiro dígito verificador
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf[i]) * (10 - i);
        }
        let digit1 = 11 - (sum % 11);
        if (digit1 > 9) digit1 = 0;

        // Calcular segundo dígito verificador
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf[i]) * (11 - i);
        }
        let digit2 = 11 - (sum % 11);
        if (digit2 > 9) digit2 = 0;

        // Verificar se os dígitos calculados conferem
        return digit1 === parseInt(cpf[9]) && digit2 === parseInt(cpf[10]);
    }

    /**
     * Validar CNPJ
     */
    isValidCNPJ(cnpj) {
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1{13}$/.test(cnpj)) {
            return false;
        }

        // Calcular primeiro dígito verificador
        let sum = 0;
        let weight = 2;
        for (let i = 11; i >= 0; i--) {
            sum += parseInt(cnpj[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

        // Calcular segundo dígito verificador
        sum = 0;
        weight = 2;
        for (let i = 12; i >= 0; i--) {
            sum += parseInt(cnpj[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

        // Verificar se os dígitos calculados conferem
        return digit1 === parseInt(cnpj[12]) && digit2 === parseInt(cnpj[13]);
    }

    /**
     * Validar usando algoritmo de Luhn (cartão de crédito)
     */
    isValidLuhn(number) {
        let sum = 0;
        let isEven = false;

        // Processar dígitos da direita para a esquerda
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number[i]);

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
     * Adicionar erro à lista
     */
    addError(field, message) {
        this.errors.push({
            field,
            message
        });
    }

    /**
     * Sanitizar dados de cartão (remover dados sensíveis)
     */
    sanitizeCardData(cardData) {
        const sanitized = { ...cardData };
        
        if (sanitized.number) {
            // Manter apenas os últimos 4 dígitos
            const cleanNumber = sanitized.number.replace(/\D/g, '');
            sanitized.number = '**** **** **** ' + cleanNumber.slice(-4);
        }

        // Remover CVV
        delete sanitized.cvv;

        return sanitized;
    }

    /**
     * Validar força da senha (se aplicável)
     */
    validatePasswordStrength(password) {
        const errors = [];

        if (password.length < 8) {
            errors.push('Senha deve ter pelo menos 8 caracteres');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Senha deve conter pelo menos uma letra maiúscula');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Senha deve conter pelo menos uma letra minúscula');
        }

        if (!/\d/.test(password)) {
            errors.push('Senha deve conter pelo menos um número');
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('Senha deve conter pelo menos um caractere especial');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = PaymentValidator;