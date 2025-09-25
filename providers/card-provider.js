const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Provedor de Pagamento com Cartão
 * Gerencia tokenização e processamento de pagamentos com cartão
 */
class CardProvider {
    constructor() {
        this.apiKey = process.env.CARD_PROVIDER_API_KEY || 'test_api_key';
        this.apiSecret = process.env.CARD_PROVIDER_API_SECRET || 'test_api_secret';
        this.apiUrl = process.env.CARD_PROVIDER_API_URL || 'https://api.exemplo.com';
        this.encryptionKey = process.env.CARD_ENCRYPTION_KEY || 'default_encryption_key_32_chars';
    }

    /**
     * Tokenizar dados do cartão
     */
    async tokenizeCard(cardData) {
        try {
            const { number, holderName, expiryMonth, expiryYear, cvv } = cardData;

            // Validar dados do cartão
            this.validateCardData(cardData);

            // Detectar bandeira do cartão
            const brand = this.detectCardBrand(number);

            // Gerar token seguro
            const token = this.generateCardToken();

            // Criptografar dados sensíveis (em produção, use HSM ou serviço especializado)
            const encryptedData = this.encryptCardData({
                number,
                cvv,
                expiryMonth,
                expiryYear
            });

            // Simular armazenamento seguro do token
            await this.storeTokenizedCard(token, {
                holderName,
                brand,
                lastFour: number.slice(-4),
                expiryMonth,
                expiryYear,
                encryptedData
            });

            logger.info('Cartão tokenizado com sucesso:', {
                token,
                brand,
                lastFour: number.slice(-4)
            });

            return {
                token,
                brand,
                lastFour: number.slice(-4),
                expiryMonth,
                expiryYear,
                holderName
            };

        } catch (error) {
            logger.error('Erro ao tokenizar cartão:', error);
            throw new Error('Falha ao processar dados do cartão');
        }
    }

    /**
     * Processar pagamento com cartão
     */
    async processPayment(paymentData) {
        try {
            const { 
                token, 
                amount, 
                installments = 1, 
                description, 
                transactionId, 
                customer 
            } = paymentData;

            // Recuperar dados do cartão pelo token
            const cardData = await this.getTokenizedCard(token);
            if (!cardData) {
                throw new Error('Token de cartão inválido');
            }

            // Descriptografar dados do cartão
            const decryptedCard = this.decryptCardData(cardData.encryptedData);

            // Simular processamento com adquirente
            const authResult = await this.processWithAcquirer({
                cardNumber: decryptedCard.number,
                cvv: decryptedCard.cvv,
                expiryMonth: decryptedCard.expiryMonth,
                expiryYear: decryptedCard.expiryYear,
                holderName: cardData.holderName,
                amount,
                installments,
                description,
                transactionId,
                customer
            });

            logger.info('Pagamento processado:', {
                transactionId,
                status: authResult.status,
                authorizationCode: authResult.authorizationCode
            });

            return authResult;

        } catch (error) {
            logger.error('Erro ao processar pagamento:', error);
            throw error;
        }
    }

    /**
     * Cancelar/Estornar transação
     */
    async cancelTransaction(transactionId, amount = null) {
        try {
            // Simular cancelamento com adquirente
            const cancelResult = await this.cancelWithAcquirer(transactionId, amount);

            logger.info('Transação cancelada:', {
                transactionId,
                status: cancelResult.status,
                cancelId: cancelResult.cancelId
            });

            return cancelResult;

        } catch (error) {
            logger.error('Erro ao cancelar transação:', error);
            throw error;
        }
    }

    /**
     * Capturar transação pré-autorizada
     */
    async captureTransaction(transactionId, amount = null) {
        try {
            // Simular captura com adquirente
            const captureResult = await this.captureWithAcquirer(transactionId, amount);

            logger.info('Transação capturada:', {
                transactionId,
                status: captureResult.status,
                captureId: captureResult.captureId
            });

            return captureResult;

        } catch (error) {
            logger.error('Erro ao capturar transação:', error);
            throw error;
        }
    }

    /**
     * Consultar status da transação
     */
    async getTransactionStatus(acquirerTransactionId) {
        try {
            // Simular consulta com adquirente
            const status = await this.queryAcquirerStatus(acquirerTransactionId);

            return status;

        } catch (error) {
            logger.error('Erro ao consultar status:', error);
            throw error;
        }
    }

    /**
     * Validar dados do cartão
     */
    validateCardData(cardData) {
        const { number, holderName, expiryMonth, expiryYear, cvv } = cardData;

        if (!number || !this.isValidCardNumber(number)) {
            throw new Error('Número do cartão inválido');
        }

        if (!holderName || holderName.trim().length < 2) {
            throw new Error('Nome do portador inválido');
        }

        if (!expiryMonth || !expiryYear || !this.isValidExpiryDate(expiryMonth, expiryYear)) {
            throw new Error('Data de expiração inválida');
        }

        if (!cvv || !this.isValidCVV(cvv)) {
            throw new Error('CVV inválido');
        }
    }

    /**
     * Detectar bandeira do cartão
     */
    detectCardBrand(number) {
        const cleanNumber = number.replace(/\D/g, '');

        // Visa
        if (/^4/.test(cleanNumber)) {
            return 'visa';
        }

        // Mastercard
        if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
            return 'mastercard';
        }

        // American Express
        if (/^3[47]/.test(cleanNumber)) {
            return 'amex';
        }

        // Elo
        if (/^(4011|4312|4389|4514|4573|6277|6362|6363|6504|6505|6516|6550)/.test(cleanNumber)) {
            return 'elo';
        }

        // Hipercard
        if (/^(3841|6062)/.test(cleanNumber)) {
            return 'hipercard';
        }

        // Diners Club
        if (/^3[0689]/.test(cleanNumber)) {
            return 'diners';
        }

        return 'unknown';
    }

    /**
     * Validar número do cartão (Algoritmo de Luhn)
     */
    isValidCardNumber(number) {
        const cleanNumber = number.replace(/\D/g, '');
        
        if (cleanNumber.length < 13 || cleanNumber.length > 19) {
            return false;
        }

        let sum = 0;
        let isEven = false;

        for (let i = cleanNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cleanNumber[i]);

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
     * Validar data de expiração
     */
    isValidExpiryDate(month, year) {
        const numMonth = parseInt(month);
        const numYear = parseInt(year);

        if (numMonth < 1 || numMonth > 12) {
            return false;
        }

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (numYear < currentYear || (numYear === currentYear && numMonth < currentMonth)) {
            return false;
        }

        return true;
    }

    /**
     * Validar CVV
     */
    isValidCVV(cvv) {
        const cleanCVV = cvv.toString().replace(/\D/g, '');
        return cleanCVV.length >= 3 && cleanCVV.length <= 4;
    }

    /**
     * Gerar token de cartão
     */
    generateCardToken() {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(16).toString('hex');
        return `card_${timestamp}_${random}`;
    }

    /**
     * Criptografar dados do cartão
     */
    encryptCardData(cardData) {
        try {
            const algorithm = 'aes-256-gcm';
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            const iv = crypto.randomBytes(16);
            
            const cipher = crypto.createCipher(algorithm, key);
            cipher.setAAD(Buffer.from('cardData'));
            
            let encrypted = cipher.update(JSON.stringify(cardData), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const authTag = cipher.getAuthTag();
            
            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex')
            };

        } catch (error) {
            logger.error('Erro ao criptografar dados:', error);
            throw new Error('Falha na criptografia');
        }
    }

    /**
     * Descriptografar dados do cartão
     */
    decryptCardData(encryptedData) {
        try {
            const algorithm = 'aes-256-gcm';
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            
            const decipher = crypto.createDecipher(algorithm, key);
            decipher.setAAD(Buffer.from('cardData'));
            decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
            
            let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);

        } catch (error) {
            logger.error('Erro ao descriptografar dados:', error);
            throw new Error('Falha na descriptografia');
        }
    }

    /**
     * Armazenar cartão tokenizado (simulação)
     */
    async storeTokenizedCard(token, cardData) {
        // Em produção, isso seria armazenado em um HSM ou serviço seguro
        // Por enquanto, simularemos o armazenamento em memória
        if (!this.tokenStorage) {
            this.tokenStorage = new Map();
        }
        
        this.tokenStorage.set(token, {
            ...cardData,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        });
    }

    /**
     * Recuperar cartão tokenizado
     */
    async getTokenizedCard(token) {
        if (!this.tokenStorage) {
            return null;
        }

        const cardData = this.tokenStorage.get(token);
        
        if (!cardData) {
            return null;
        }

        // Verificar se o token não expirou
        if (new Date() > new Date(cardData.expiresAt)) {
            this.tokenStorage.delete(token);
            return null;
        }

        return cardData;
    }

    /**
     * Processar com adquirente (simulação)
     */
    async processWithAcquirer(paymentData) {
        // Simular processamento com adquirente
        // Em produção, isso seria uma chamada para a API do adquirente
        
        const { amount, cardNumber, installments } = paymentData;

        // Simular diferentes cenários baseados no número do cartão
        const lastDigit = parseInt(cardNumber.slice(-1));
        
        let status, message, authorizationCode;

        if (lastDigit === 0) {
            // Simular cartão sem saldo
            status = 'rejected';
            message = 'Cartão sem saldo suficiente';
            authorizationCode = null;
        } else if (lastDigit === 1) {
            // Simular cartão bloqueado
            status = 'rejected';
            message = 'Cartão bloqueado';
            authorizationCode = null;
        } else if (lastDigit === 2) {
            // Simular erro de comunicação
            status = 'error';
            message = 'Erro de comunicação com o banco';
            authorizationCode = null;
        } else {
            // Simular aprovação
            status = 'approved';
            message = 'Transação aprovada';
            authorizationCode = this.generateAuthCode();
        }

        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        return {
            status,
            message,
            authorizationCode,
            acquirerTransactionId: this.generateAcquirerTransactionId(),
            amount,
            installments,
            processedAt: new Date().toISOString()
        };
    }

    /**
     * Cancelar com adquirente (simulação)
     */
    async cancelWithAcquirer(transactionId, amount) {
        // Simular cancelamento
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            status: 'cancelled',
            cancelId: this.generateCancelId(),
            amount,
            cancelledAt: new Date().toISOString()
        };
    }

    /**
     * Capturar com adquirente (simulação)
     */
    async captureWithAcquirer(transactionId, amount) {
        // Simular captura
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            status: 'captured',
            captureId: this.generateCaptureId(),
            amount,
            capturedAt: new Date().toISOString()
        };
    }

    /**
     * Consultar status no adquirente (simulação)
     */
    async queryAcquirerStatus(acquirerTransactionId) {
        // Simular consulta
        await new Promise(resolve => setTimeout(resolve, 300));

        const statuses = ['approved', 'rejected', 'pending', 'cancelled'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        return {
            acquirerTransactionId,
            status: randomStatus,
            queriedAt: new Date().toISOString()
        };
    }

    /**
     * Gerar código de autorização
     */
    generateAuthCode() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    /**
     * Gerar ID da transação no adquirente
     */
    generateAcquirerTransactionId() {
        return `ACQ_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * Gerar ID de cancelamento
     */
    generateCancelId() {
        return `CANCEL_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    /**
     * Gerar ID de captura
     */
    generateCaptureId() {
        return `CAPTURE_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    /**
     * Calcular taxa de parcelamento
     */
    calculateInstallmentFee(amount, installments) {
        if (installments <= 1) {
            return 0;
        }

        // Taxa progressiva por parcela
        const rates = {
            2: 0.02,   // 2%
            3: 0.03,   // 3%
            4: 0.04,   // 4%
            5: 0.05,   // 5%
            6: 0.06,   // 6%
            7: 0.07,   // 7%
            8: 0.08,   // 8%
            9: 0.09,   // 9%
            10: 0.10,  // 10%
            11: 0.11,  // 11%
            12: 0.12   // 12%
        };

        const rate = rates[installments] || 0.12;
        return amount * rate;
    }

    /**
     * Obter informações da bandeira
     */
    getBrandInfo(brand) {
        const brandInfo = {
            visa: {
                name: 'Visa',
                maxInstallments: 12,
                minAmount: 1.00,
                maxAmount: 50000.00
            },
            mastercard: {
                name: 'Mastercard',
                maxInstallments: 12,
                minAmount: 1.00,
                maxAmount: 50000.00
            },
            amex: {
                name: 'American Express',
                maxInstallments: 10,
                minAmount: 1.00,
                maxAmount: 30000.00
            },
            elo: {
                name: 'Elo',
                maxInstallments: 12,
                minAmount: 1.00,
                maxAmount: 25000.00
            },
            hipercard: {
                name: 'Hipercard',
                maxInstallments: 12,
                minAmount: 1.00,
                maxAmount: 20000.00
            },
            diners: {
                name: 'Diners Club',
                maxInstallments: 6,
                minAmount: 1.00,
                maxAmount: 15000.00
            }
        };

        return brandInfo[brand] || {
            name: 'Desconhecida',
            maxInstallments: 1,
            minAmount: 1.00,
            maxAmount: 1000.00
        };
    }

    /**
     * Mascarar número do cartão
     */
    maskCardNumber(number) {
        const cleanNumber = number.replace(/\D/g, '');
        const firstSix = cleanNumber.substring(0, 6);
        const lastFour = cleanNumber.substring(cleanNumber.length - 4);
        const middle = '*'.repeat(cleanNumber.length - 10);
        
        return `${firstSix}${middle}${lastFour}`;
    }
}

module.exports = CardProvider;