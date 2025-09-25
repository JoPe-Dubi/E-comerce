const crypto = require('crypto');
const Database = require('../database/database');
const PixProvider = require('../providers/pix-provider');
const CardProvider = require('../providers/card-provider');
const BoletoProvider = require('../providers/boleto-provider');
const { logger } = require('../utils/logger');

/**
 * Serviço de Pagamentos
 * Contém toda a lógica de negócio para processamento de pagamentos
 */
class PaymentService {
    constructor() {
        this.db = new Database();
        this.pixProvider = new PixProvider();
        this.cardProvider = new CardProvider();
        this.boletoProvider = new BoletoProvider();
    }

    /**
     * Obter métodos de pagamento disponíveis
     */
    async getAvailablePaymentMethods() {
        try {
            const query = `
                SELECT 
                    id,
                    name,
                    code,
                    description,
                    is_active,
                    min_amount,
                    max_amount,
                    processing_fee,
                    supports_installments,
                    max_installments
                FROM payment_methods 
                WHERE is_active = 1
                ORDER BY display_order ASC
            `;

            const methods = await this.db.query(query);

            return methods.map(method => ({
                ...method,
                processing_fee: parseFloat(method.processing_fee),
                min_amount: parseFloat(method.min_amount),
                max_amount: parseFloat(method.max_amount)
            }));
        } catch (error) {
            logger.error('Erro ao obter métodos de pagamento:', error);
            throw new Error('Falha ao carregar métodos de pagamento');
        }
    }

    /**
     * Iniciar processo de pagamento
     */
    async initiatePayment(paymentData) {
        const { userId, transactionId, paymentMethod, amount, orderId, items } = paymentData;

        try {
            // Verificar se o método de pagamento é válido
            const method = await this.validatePaymentMethod(paymentMethod, amount);
            if (!method) {
                throw new Error('Método de pagamento inválido ou indisponível');
            }

            // Calcular taxas
            const fees = await this.calculatePaymentFees(amount, paymentMethod, paymentData.installments || 1);

            // Criar transação no banco
            const transaction = await this.createTransaction({
                transactionId,
                userId,
                orderId,
                paymentMethodId: method.id,
                amount,
                fees: fees.totalFees,
                finalAmount: fees.finalAmount,
                status: 'pending',
                items: JSON.stringify(items)
            });

            // Log da transação
            await this.logTransaction(transactionId, 'INITIATED', 'Transação iniciada');

            return {
                transactionId,
                status: 'pending',
                amount: fees.finalAmount,
                fees: fees,
                paymentMethod: method,
                expiresAt: this.calculateExpirationTime(paymentMethod)
            };

        } catch (error) {
            logger.error('Erro ao iniciar pagamento:', error);
            await this.logTransaction(transactionId, 'ERROR', error.message);
            throw error;
        }
    }

    /**
     * Processar pagamento PIX
     */
    async processPixPayment(transactionId, pixData) {
        try {
            // Buscar transação
            const transaction = await this.getTransaction(transactionId);
            if (!transaction) {
                throw new Error('Transação não encontrada');
            }

            if (transaction.status !== 'pending') {
                throw new Error('Transação não está pendente');
            }

            // Gerar QR Code PIX
            const pixResult = await this.pixProvider.generatePixPayment({
                amount: transaction.final_amount,
                description: `Pagamento - Pedido ${transaction.order_id}`,
                transactionId: transactionId,
                customerDocument: pixData.customerDocument,
                customerName: pixData.customerName
            });

            // Salvar dados PIX
            await this.savePixPaymentData(transactionId, {
                pixKey: pixResult.pixKey,
                qrCode: pixResult.qrCode,
                qrCodeImage: pixResult.qrCodeImage,
                expiresAt: pixResult.expiresAt
            });

            // Atualizar status da transação
            await this.updateTransactionStatus(transactionId, 'awaiting_payment');
            await this.logTransaction(transactionId, 'PIX_GENERATED', 'QR Code PIX gerado');

            return {
                transactionId,
                status: 'awaiting_payment',
                pix: {
                    qrCode: pixResult.qrCode,
                    qrCodeImage: pixResult.qrCodeImage,
                    expiresAt: pixResult.expiresAt
                }
            };

        } catch (error) {
            logger.error('Erro ao processar PIX:', error);
            await this.logTransaction(transactionId, 'ERROR', error.message);
            throw error;
        }
    }

    /**
     * Processar pagamento com cartão
     */
    async processCardPayment(transactionId, cardData) {
        try {
            // Buscar transação
            const transaction = await this.getTransaction(transactionId);
            if (!transaction) {
                throw new Error('Transação não encontrada');
            }

            if (transaction.status !== 'pending') {
                throw new Error('Transação não está pendente');
            }

            // Tokenizar dados do cartão
            const tokenizedCard = await this.cardProvider.tokenizeCard({
                number: cardData.number,
                holderName: cardData.holderName,
                expiryMonth: cardData.expiryMonth,
                expiryYear: cardData.expiryYear,
                cvv: cardData.cvv
            });

            // Processar pagamento
            const paymentResult = await this.cardProvider.processPayment({
                token: tokenizedCard.token,
                amount: transaction.final_amount,
                installments: cardData.installments || 1,
                description: `Pagamento - Pedido ${transaction.order_id}`,
                transactionId: transactionId,
                customer: {
                    name: cardData.holderName,
                    document: cardData.holderDocument,
                    email: cardData.holderEmail
                }
            });

            // Salvar dados do cartão
            await this.saveCardPaymentData(transactionId, {
                cardToken: tokenizedCard.token,
                cardBrand: tokenizedCard.brand,
                cardLastFour: tokenizedCard.lastFour,
                installments: cardData.installments || 1,
                authorizationCode: paymentResult.authorizationCode,
                acquirerTransactionId: paymentResult.acquirerTransactionId
            });

            // Atualizar status baseado no resultado
            const newStatus = paymentResult.status === 'approved' ? 'paid' : 'failed';
            await this.updateTransactionStatus(transactionId, newStatus);
            
            const logMessage = paymentResult.status === 'approved' 
                ? 'Pagamento aprovado' 
                : `Pagamento rejeitado: ${paymentResult.message}`;
            
            await this.logTransaction(transactionId, paymentResult.status.toUpperCase(), logMessage);

            return {
                transactionId,
                status: newStatus,
                authorizationCode: paymentResult.authorizationCode,
                message: paymentResult.message
            };

        } catch (error) {
            logger.error('Erro ao processar cartão:', error);
            await this.updateTransactionStatus(transactionId, 'failed');
            await this.logTransaction(transactionId, 'ERROR', error.message);
            throw error;
        }
    }

    /**
     * Processar pagamento com boleto
     */
    async processBoletoPayment(transactionId, boletoData) {
        try {
            // Buscar transação
            const transaction = await this.getTransaction(transactionId);
            if (!transaction) {
                throw new Error('Transação não encontrada');
            }

            if (transaction.status !== 'pending') {
                throw new Error('Transação não está pendente');
            }

            // Gerar boleto
            const boletoResult = await this.boletoProvider.generateBoleto({
                amount: transaction.final_amount,
                dueDate: this.calculateBoletoDueDate(),
                description: `Pagamento - Pedido ${transaction.order_id}`,
                transactionId: transactionId,
                customer: {
                    name: boletoData.customerName,
                    document: boletoData.customerDocument,
                    email: boletoData.customerEmail,
                    address: boletoData.customerAddress
                }
            });

            // Salvar dados do boleto
            await this.saveBoletoPaymentData(transactionId, {
                boletoNumber: boletoResult.boletoNumber,
                barcode: boletoResult.barcode,
                digitableLine: boletoResult.digitableLine,
                boletoUrl: boletoResult.boletoUrl,
                dueDate: boletoResult.dueDate
            });

            // Atualizar status da transação
            await this.updateTransactionStatus(transactionId, 'awaiting_payment');
            await this.logTransaction(transactionId, 'BOLETO_GENERATED', 'Boleto gerado');

            return {
                transactionId,
                status: 'awaiting_payment',
                boleto: {
                    boletoNumber: boletoResult.boletoNumber,
                    barcode: boletoResult.barcode,
                    digitableLine: boletoResult.digitableLine,
                    boletoUrl: boletoResult.boletoUrl,
                    dueDate: boletoResult.dueDate
                }
            };

        } catch (error) {
            logger.error('Erro ao processar boleto:', error);
            await this.logTransaction(transactionId, 'ERROR', error.message);
            throw error;
        }
    }

    /**
     * Obter status da transação
     */
    async getTransactionStatus(transactionId, userId) {
        try {
            const query = `
                SELECT 
                    t.*,
                    pm.name as payment_method_name,
                    pm.code as payment_method_code
                FROM transactions t
                JOIN payment_methods pm ON t.payment_method_id = pm.id
                WHERE t.transaction_id = ? AND t.user_id = ?
            `;

            const transaction = await this.db.queryOne(query, [transactionId, userId]);
            
            if (!transaction) {
                return null;
            }

            // Buscar dados específicos do método de pagamento
            let paymentDetails = {};
            
            switch (transaction.payment_method_code) {
                case 'PIX':
                    paymentDetails = await this.getPixPaymentDetails(transactionId);
                    break;
                case 'CREDIT_CARD':
                case 'DEBIT_CARD':
                    paymentDetails = await this.getCardPaymentDetails(transactionId);
                    break;
                case 'BOLETO':
                    paymentDetails = await this.getBoletoPaymentDetails(transactionId);
                    break;
            }

            return {
                ...transaction,
                paymentDetails,
                amount: parseFloat(transaction.amount),
                fees: parseFloat(transaction.fees),
                finalAmount: parseFloat(transaction.final_amount)
            };

        } catch (error) {
            logger.error('Erro ao consultar transação:', error);
            throw error;
        }
    }

    /**
     * Listar transações do usuário
     */
    async getUserTransactions(userId, options = {}) {
        try {
            const { page = 1, limit = 10, status } = options;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE t.user_id = ?';
            let params = [userId];

            if (status) {
                whereClause += ' AND t.status = ?';
                params.push(status);
            }

            const query = `
                SELECT 
                    t.transaction_id,
                    t.order_id,
                    t.amount,
                    t.fees,
                    t.final_amount,
                    t.status,
                    t.created_at,
                    t.updated_at,
                    pm.name as payment_method_name,
                    pm.code as payment_method_code
                FROM transactions t
                JOIN payment_methods pm ON t.payment_method_id = pm.id
                ${whereClause}
                ORDER BY t.created_at DESC
                LIMIT ? OFFSET ?
            `;

            params.push(limit, offset);

            const transactions = await this.db.query(query, params);

            // Contar total de registros
            const countQuery = `
                SELECT COUNT(*) as total
                FROM transactions t
                ${whereClause}
            `;

            const countResult = await this.db.queryOne(countQuery, params.slice(0, -2));

            return {
                transactions: transactions.map(t => ({
                    ...t,
                    amount: parseFloat(t.amount),
                    fees: parseFloat(t.fees),
                    finalAmount: parseFloat(t.final_amount)
                })),
                pagination: {
                    page,
                    limit,
                    total: countResult.total,
                    totalPages: Math.ceil(countResult.total / limit)
                }
            };

        } catch (error) {
            logger.error('Erro ao listar transações:', error);
            throw error;
        }
    }

    /**
     * Cancelar transação
     */
    async cancelTransaction(transactionId, userId, reason) {
        try {
            const transaction = await this.getTransactionStatus(transactionId, userId);
            
            if (!transaction) {
                throw new Error('Transação não encontrada');
            }

            if (!['pending', 'awaiting_payment'].includes(transaction.status)) {
                throw new Error('Transação não pode ser cancelada');
            }

            // Atualizar status
            await this.updateTransactionStatus(transactionId, 'cancelled');
            await this.logTransaction(transactionId, 'CANCELLED', reason || 'Cancelado pelo usuário');

            return {
                transactionId,
                status: 'cancelled',
                message: 'Transação cancelada com sucesso'
            };

        } catch (error) {
            logger.error('Erro ao cancelar transação:', error);
            throw error;
        }
    }

    /**
     * Processar notificação de pagamento (webhook)
     */
    async handlePaymentNotification(payload) {
        try {
            const { transactionId, status, provider } = payload;

            logger.info('Notificação de pagamento recebida:', { transactionId, status, provider });

            // Buscar transação
            const transaction = await this.getTransaction(transactionId);
            if (!transaction) {
                throw new Error('Transação não encontrada');
            }

            // Mapear status do provedor para status interno
            const internalStatus = this.mapProviderStatus(status, provider);

            // Atualizar status da transação
            await this.updateTransactionStatus(transactionId, internalStatus);
            await this.logTransaction(transactionId, 'WEBHOOK_RECEIVED', `Status atualizado para: ${internalStatus}`);

            // Se pagamento foi aprovado, processar confirmação
            if (internalStatus === 'paid') {
                await this.processPaymentConfirmation(transactionId);
            }

            return { success: true };

        } catch (error) {
            logger.error('Erro ao processar notificação:', error);
            throw error;
        }
    }

    /**
     * Calcular taxas de pagamento
     */
    async calculatePaymentFees(amount, paymentMethod, installments = 1) {
        try {
            const method = await this.getPaymentMethodByCode(paymentMethod);
            if (!method) {
                throw new Error('Método de pagamento não encontrado');
            }

            let processingFee = parseFloat(method.processing_fee);
            let installmentFee = 0;

            // Calcular taxa de parcelamento para cartão de crédito
            if (paymentMethod === 'CREDIT_CARD' && installments > 1) {
                const installmentRate = await this.getInstallmentRate(installments);
                installmentFee = amount * (installmentRate / 100);
            }

            const totalFees = processingFee + installmentFee;
            const finalAmount = amount + totalFees;

            return {
                originalAmount: amount,
                processingFee,
                installmentFee,
                totalFees,
                finalAmount,
                installments,
                installmentAmount: installments > 1 ? finalAmount / installments : finalAmount
            };

        } catch (error) {
            logger.error('Erro ao calcular taxas:', error);
            throw error;
        }
    }

    /**
     * Gerar relatório de transações
     */
    async generateTransactionReport(filters = {}) {
        try {
            const { startDate, endDate, paymentMethod, status } = filters;

            let whereClause = 'WHERE 1=1';
            let params = [];

            if (startDate) {
                whereClause += ' AND t.created_at >= ?';
                params.push(startDate);
            }

            if (endDate) {
                whereClause += ' AND t.created_at <= ?';
                params.push(endDate);
            }

            if (paymentMethod) {
                whereClause += ' AND pm.code = ?';
                params.push(paymentMethod);
            }

            if (status) {
                whereClause += ' AND t.status = ?';
                params.push(status);
            }

            const query = `
                SELECT 
                    pm.name as payment_method,
                    t.status,
                    COUNT(*) as transaction_count,
                    SUM(t.amount) as total_amount,
                    SUM(t.fees) as total_fees,
                    AVG(t.amount) as average_amount
                FROM transactions t
                JOIN payment_methods pm ON t.payment_method_id = pm.id
                ${whereClause}
                GROUP BY pm.name, t.status
                ORDER BY pm.name, t.status
            `;

            const results = await this.db.query(query, params);

            return {
                summary: results.map(r => ({
                    ...r,
                    total_amount: parseFloat(r.total_amount),
                    total_fees: parseFloat(r.total_fees),
                    average_amount: parseFloat(r.average_amount)
                })),
                filters,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Erro ao gerar relatório:', error);
            throw error;
        }
    }

    // Métodos auxiliares privados

    async validatePaymentMethod(code, amount) {
        const query = `
            SELECT * FROM payment_methods 
            WHERE code = ? AND is_active = 1 
            AND min_amount <= ? AND max_amount >= ?
        `;
        return await this.db.queryOne(query, [code, amount, amount]);
    }

    async createTransaction(data) {
        const query = `
            INSERT INTO transactions (
                transaction_id, user_id, order_id, payment_method_id,
                amount, fees, final_amount, status, items, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;

        await this.db.query(query, [
            data.transactionId, data.userId, data.orderId, data.paymentMethodId,
            data.amount, data.fees, data.finalAmount, data.status, data.items
        ]);

        return data;
    }

    async getTransaction(transactionId) {
        const query = 'SELECT * FROM transactions WHERE transaction_id = ?';
        return await this.db.queryOne(query, [transactionId]);
    }

    async updateTransactionStatus(transactionId, status) {
        const query = `
            UPDATE transactions 
            SET status = ?, updated_at = datetime('now')
            WHERE transaction_id = ?
        `;
        await this.db.query(query, [status, transactionId]);
    }

    async logTransaction(transactionId, event, description) {
        const query = `
            INSERT INTO transaction_logs (
                transaction_id, event_type, description, created_at
            ) VALUES (?, ?, ?, datetime('now'))
        `;
        await this.db.query(query, [transactionId, event, description]);
    }

    calculateExpirationTime(paymentMethod) {
        const now = new Date();
        switch (paymentMethod) {
            case 'PIX':
                return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutos
            case 'BOLETO':
                return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
            default:
                return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos
        }
    }

    calculateBoletoDueDate() {
        const now = new Date();
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
    }

    mapProviderStatus(providerStatus, provider) {
        const statusMap = {
            'approved': 'paid',
            'paid': 'paid',
            'rejected': 'failed',
            'failed': 'failed',
            'cancelled': 'cancelled',
            'pending': 'awaiting_payment'
        };

        return statusMap[providerStatus] || 'pending';
    }

    async processPaymentConfirmation(transactionId) {
        // Aqui você pode adicionar lógica adicional quando um pagamento é confirmado
        // Por exemplo: atualizar estoque, enviar email de confirmação, etc.
        logger.info(`Pagamento confirmado para transação: ${transactionId}`);
    }

    // Métodos para salvar dados específicos de cada método de pagamento
    async savePixPaymentData(transactionId, data) {
        const query = `
            INSERT INTO pix_payments (
                transaction_id, pix_key, qr_code, qr_code_image, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, datetime('now'))
        `;
        await this.db.query(query, [
            transactionId, data.pixKey, data.qrCode, data.qrCodeImage, data.expiresAt
        ]);
    }

    async saveCardPaymentData(transactionId, data) {
        const query = `
            INSERT INTO card_payments (
                transaction_id, card_token, card_brand, card_last_four,
                installments, authorization_code, acquirer_transaction_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        await this.db.query(query, [
            transactionId, data.cardToken, data.cardBrand, data.cardLastFour,
            data.installments, data.authorizationCode, data.acquirerTransactionId
        ]);
    }

    async saveBoletoPaymentData(transactionId, data) {
        const query = `
            INSERT INTO boleto_payments (
                transaction_id, boleto_number, barcode, digitable_line,
                boleto_url, due_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `;
        await this.db.query(query, [
            transactionId, data.boletoNumber, data.barcode, data.digitableLine,
            data.boletoUrl, data.dueDate
        ]);
    }

    // Métodos para buscar dados específicos de cada método de pagamento
    async getPixPaymentDetails(transactionId) {
        const query = 'SELECT * FROM pix_payments WHERE transaction_id = ?';
        return await this.db.queryOne(query, [transactionId]);
    }

    async getCardPaymentDetails(transactionId) {
        const query = 'SELECT * FROM card_payments WHERE transaction_id = ?';
        return await this.db.queryOne(query, [transactionId]);
    }

    async getBoletoPaymentDetails(transactionId) {
        const query = 'SELECT * FROM boleto_payments WHERE transaction_id = ?';
        return await this.db.queryOne(query, [transactionId]);
    }

    async getPaymentMethodByCode(code) {
        const query = 'SELECT * FROM payment_methods WHERE code = ? AND is_active = 1';
        return await this.db.queryOne(query, [code]);
    }

    async getInstallmentRate(installments) {
        const query = 'SELECT installment_rate FROM payment_settings WHERE setting_key = ?';
        const result = await this.db.queryOne(query, [`installment_rate_${installments}`]);
        return result ? parseFloat(result.installment_rate) : 2.5; // Taxa padrão de 2.5%
    }
}

module.exports = PaymentService;