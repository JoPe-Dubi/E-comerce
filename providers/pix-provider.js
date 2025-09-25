const crypto = require('crypto');
const QRCode = require('qrcode');
const { logger } = require('../utils/logger');

/**
 * Provedor de Pagamento PIX
 * Gerencia a geração e processamento de pagamentos PIX
 */
class PixProvider {
    constructor() {
        this.pixKey = process.env.PIX_KEY || 'exemplo@empresa.com';
        this.merchantName = process.env.MERCHANT_NAME || 'Sua Empresa LTDA';
        this.merchantCity = process.env.MERCHANT_CITY || 'São Paulo';
        this.merchantCategoryCode = process.env.MERCHANT_CATEGORY_CODE || '0000';
        this.countryCode = 'BR';
        this.currencyCode = '986'; // Real brasileiro
    }

    /**
     * Gerar pagamento PIX
     */
    async generatePixPayment(paymentData) {
        try {
            const { amount, description, transactionId, customerDocument, customerName } = paymentData;

            // Gerar identificador único para o PIX
            const pixId = this.generatePixId(transactionId);

            // Gerar payload PIX
            const pixPayload = this.generatePixPayload({
                amount,
                description,
                pixId,
                transactionId
            });

            // Gerar QR Code
            const qrCodeImage = await this.generateQRCode(pixPayload);

            // Calcular tempo de expiração (30 minutos)
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

            logger.info('PIX gerado com sucesso:', {
                transactionId,
                pixId,
                amount,
                expiresAt
            });

            return {
                pixKey: this.pixKey,
                pixId,
                qrCode: pixPayload,
                qrCodeImage,
                expiresAt: expiresAt.toISOString(),
                amount,
                description
            };

        } catch (error) {
            logger.error('Erro ao gerar PIX:', error);
            throw new Error('Falha ao gerar pagamento PIX');
        }
    }

    /**
     * Verificar status do pagamento PIX
     */
    async checkPixPaymentStatus(pixId) {
        try {
            // Em um ambiente real, você consultaria a API do seu provedor PIX
            // Por exemplo: Banco Central, PagSeguro, Mercado Pago, etc.
            
            // Simulação de consulta de status
            const mockStatus = this.simulatePixStatus();

            logger.info('Status PIX consultado:', {
                pixId,
                status: mockStatus
            });

            return {
                pixId,
                status: mockStatus,
                paidAt: mockStatus === 'paid' ? new Date().toISOString() : null
            };

        } catch (error) {
            logger.error('Erro ao consultar status PIX:', error);
            throw new Error('Falha ao consultar status do PIX');
        }
    }

    /**
     * Processar webhook PIX
     */
    async processPixWebhook(webhookData) {
        try {
            const { pixId, status, paidAt, amount } = webhookData;

            // Validar dados do webhook
            if (!pixId || !status) {
                throw new Error('Dados do webhook PIX inválidos');
            }

            logger.info('Webhook PIX recebido:', {
                pixId,
                status,
                paidAt,
                amount
            });

            return {
                pixId,
                status,
                paidAt,
                amount: parseFloat(amount)
            };

        } catch (error) {
            logger.error('Erro ao processar webhook PIX:', error);
            throw error;
        }
    }

    /**
     * Gerar payload PIX (EMV)
     */
    generatePixPayload(data) {
        const { amount, description, pixId, transactionId } = data;

        // Construir payload EMV para PIX
        let payload = '';

        // Payload Format Indicator
        payload += this.buildEMVField('00', '01');

        // Point of Initiation Method
        payload += this.buildEMVField('01', '12');

        // Merchant Account Information
        let merchantInfo = '';
        merchantInfo += this.buildEMVField('00', 'BR.GOV.BCB.PIX');
        merchantInfo += this.buildEMVField('01', this.pixKey);
        
        if (description) {
            merchantInfo += this.buildEMVField('02', description.substring(0, 72));
        }

        payload += this.buildEMVField('26', merchantInfo);

        // Merchant Category Code
        payload += this.buildEMVField('52', this.merchantCategoryCode);

        // Transaction Currency
        payload += this.buildEMVField('53', this.currencyCode);

        // Transaction Amount
        if (amount) {
            payload += this.buildEMVField('54', amount.toFixed(2));
        }

        // Country Code
        payload += this.buildEMVField('58', this.countryCode);

        // Merchant Name
        payload += this.buildEMVField('59', this.merchantName.substring(0, 25));

        // Merchant City
        payload += this.buildEMVField('60', this.merchantCity.substring(0, 15));

        // Additional Data Field Template
        let additionalData = '';
        if (pixId) {
            additionalData += this.buildEMVField('05', pixId);
        }
        if (transactionId) {
            additionalData += this.buildEMVField('07', transactionId.substring(0, 25));
        }

        if (additionalData) {
            payload += this.buildEMVField('62', additionalData);
        }

        // CRC16
        payload += '6304';
        const crc = this.calculateCRC16(payload);
        payload += crc;

        return payload;
    }

    /**
     * Construir campo EMV
     */
    buildEMVField(id, value) {
        const length = value.length.toString().padStart(2, '0');
        return id + length + value;
    }

    /**
     * Calcular CRC16 para PIX
     */
    calculateCRC16(payload) {
        const polynomial = 0x1021;
        let crc = 0xFFFF;

        for (let i = 0; i < payload.length; i++) {
            crc ^= (payload.charCodeAt(i) << 8);
            
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ polynomial;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }

        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    /**
     * Gerar QR Code
     */
    async generateQRCode(payload) {
        try {
            const qrCodeDataURL = await QRCode.toDataURL(payload, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                width: 256
            });

            return qrCodeDataURL;

        } catch (error) {
            logger.error('Erro ao gerar QR Code:', error);
            throw new Error('Falha ao gerar QR Code');
        }
    }

    /**
     * Gerar ID único para PIX
     */
    generatePixId(transactionId) {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex');
        return `PIX${timestamp}${random}`.toUpperCase().substring(0, 25);
    }

    /**
     * Simular status PIX (para desenvolvimento)
     */
    simulatePixStatus() {
        // Em produção, isso seria uma consulta real à API do provedor
        const statuses = ['pending', 'paid', 'expired'];
        const weights = [0.3, 0.6, 0.1]; // 60% chance de estar pago
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < statuses.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return statuses[i];
            }
        }
        
        return 'pending';
    }

    /**
     * Validar chave PIX
     */
    validatePixKey(pixKey) {
        if (!pixKey || typeof pixKey !== 'string') {
            return false;
        }

        const cleanKey = pixKey.trim();

        // CPF (11 dígitos)
        if (/^\d{11}$/.test(cleanKey)) {
            return this.isValidCPF(cleanKey);
        }

        // CNPJ (14 dígitos)
        if (/^\d{14}$/.test(cleanKey)) {
            return this.isValidCNPJ(cleanKey);
        }

        // Email
        if (cleanKey.includes('@')) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanKey);
        }

        // Telefone (+5511999999999)
        if (cleanKey.startsWith('+55')) {
            return /^\+55\d{10,11}$/.test(cleanKey);
        }

        // Chave aleatória (UUID)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanKey)) {
            return true;
        }

        return false;
    }

    /**
     * Validar CPF
     */
    isValidCPF(cpf) {
        if (/^(\d)\1{10}$/.test(cpf)) return false;

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf[i]) * (10 - i);
        }
        let digit1 = 11 - (sum % 11);
        if (digit1 > 9) digit1 = 0;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf[i]) * (11 - i);
        }
        let digit2 = 11 - (sum % 11);
        if (digit2 > 9) digit2 = 0;

        return digit1 === parseInt(cpf[9]) && digit2 === parseInt(cpf[10]);
    }

    /**
     * Validar CNPJ
     */
    isValidCNPJ(cnpj) {
        if (/^(\d)\1{13}$/.test(cnpj)) return false;

        let sum = 0;
        let weight = 2;
        for (let i = 11; i >= 0; i--) {
            sum += parseInt(cnpj[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

        sum = 0;
        weight = 2;
        for (let i = 12; i >= 0; i--) {
            sum += parseInt(cnpj[i]) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

        return digit1 === parseInt(cnpj[12]) && digit2 === parseInt(cnpj[13]);
    }

    /**
     * Formatar valor para PIX
     */
    formatPixAmount(amount) {
        return parseFloat(amount).toFixed(2);
    }

    /**
     * Obter informações da chave PIX
     */
    getPixKeyInfo(pixKey) {
        if (!this.validatePixKey(pixKey)) {
            return { valid: false, type: 'invalid' };
        }

        const cleanKey = pixKey.trim();

        if (/^\d{11}$/.test(cleanKey)) {
            return { valid: true, type: 'cpf', formatted: this.formatCPF(cleanKey) };
        }

        if (/^\d{14}$/.test(cleanKey)) {
            return { valid: true, type: 'cnpj', formatted: this.formatCNPJ(cleanKey) };
        }

        if (cleanKey.includes('@')) {
            return { valid: true, type: 'email', formatted: cleanKey };
        }

        if (cleanKey.startsWith('+55')) {
            return { valid: true, type: 'phone', formatted: this.formatPhone(cleanKey) };
        }

        return { valid: true, type: 'random', formatted: cleanKey };
    }

    /**
     * Formatar CPF
     */
    formatCPF(cpf) {
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    /**
     * Formatar CNPJ
     */
    formatCNPJ(cnpj) {
        return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }

    /**
     * Formatar telefone
     */
    formatPhone(phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 13) {
            return clean.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
        }
        return phone;
    }
}

module.exports = PixProvider;