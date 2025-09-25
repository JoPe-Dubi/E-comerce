const crypto = require('crypto');
const PaymentService = require('../services/payment-service');
const PaymentValidator = require('../validators/payment-validator');
const { logger } = require('../utils/logger');

/**
 * Controlador para API de Pagamentos
 * Gerencia todas as operações relacionadas a pagamentos
 */
class PaymentController {
    constructor() {
        this.paymentService = new PaymentService();
        this.validator = new PaymentValidator();
    }

    /**
     * Listar métodos de pagamento disponíveis
     */
    async getPaymentMethods(req, res) {
        try {
            const methods = await this.paymentService.getAvailablePaymentMethods();
            
            res.json({
                success: true,
                data: methods,
                message: 'Métodos de pagamento obtidos com sucesso'
            });
        } catch (error) {
            logger.error('Erro ao obter métodos de pagamento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Iniciar processo de pagamento
     */
    async initiatePayment(req, res) {
        try {
            const { userId } = req.user;
            const paymentData = req.body;

            // Validar dados de entrada
            const validation = await this.validator.validatePaymentData(paymentData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados de pagamento inválidos',
                    errors: validation.errors
                });
            }

            // Gerar ID único da transação
            const transactionId = this.generateTransactionId();

            // Iniciar pagamento
            const result = await this.paymentService.initiatePayment({
                ...paymentData,
                userId,
                transactionId
            });

            // Log da transação
            logger.info('Pagamento iniciado:', {
                transactionId,
                userId,
                method: paymentData.paymentMethod,
                amount: paymentData.amount
            });

            res.status(201).json({
                success: true,
                data: result,
                message: 'Pagamento iniciado com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao iniciar pagamento:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao processar pagamento',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Processar pagamento PIX
     */
    async processPixPayment(req, res) {
        try {
            const { transactionId } = req.params;
            const pixData = req.body;

            // Validar dados PIX
            const validation = await this.validator.validatePixData(pixData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados PIX inválidos',
                    errors: validation.errors
                });
            }

            // Processar pagamento PIX
            const result = await this.paymentService.processPixPayment(transactionId, pixData);

            res.json({
                success: true,
                data: result,
                message: 'Pagamento PIX processado com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao processar PIX:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao processar pagamento PIX',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Processar pagamento com cartão
     */
    async processCardPayment(req, res) {
        try {
            const { transactionId } = req.params;
            const cardData = req.body;

            // Validar dados do cartão
            const validation = await this.validator.validateCardData(cardData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do cartão inválidos',
                    errors: validation.errors
                });
            }

            // Processar pagamento com cartão
            const result = await this.paymentService.processCardPayment(transactionId, cardData);

            res.json({
                success: true,
                data: result,
                message: 'Pagamento com cartão processado com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao processar cartão:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao processar pagamento com cartão',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Processar pagamento com boleto
     */
    async processBoletoPayment(req, res) {
        try {
            const { transactionId } = req.params;
            const boletoData = req.body;

            // Validar dados do boleto
            const validation = await this.validator.validateBoletoData(boletoData);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Dados do boleto inválidos',
                    errors: validation.errors
                });
            }

            // Processar pagamento com boleto
            const result = await this.paymentService.processBoletoPayment(transactionId, boletoData);

            res.json({
                success: true,
                data: result,
                message: 'Boleto gerado com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao processar boleto:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar boleto',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Consultar status de transação
     */
    async getTransactionStatus(req, res) {
        try {
            const { transactionId } = req.params;
            const { userId } = req.user;

            const transaction = await this.paymentService.getTransactionStatus(transactionId, userId);

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transação não encontrada'
                });
            }

            res.json({
                success: true,
                data: transaction,
                message: 'Status da transação obtido com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao consultar transação:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao consultar transação',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Listar transações do usuário
     */
    async getUserTransactions(req, res) {
        try {
            const { userId } = req.user;
            const { page = 1, limit = 10, status } = req.query;

            const transactions = await this.paymentService.getUserTransactions(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                status
            });

            res.json({
                success: true,
                data: transactions,
                message: 'Transações obtidas com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao listar transações:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao listar transações',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Cancelar transação
     */
    async cancelTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const { userId } = req.user;
            const { reason } = req.body;

            const result = await this.paymentService.cancelTransaction(transactionId, userId, reason);

            res.json({
                success: true,
                data: result,
                message: 'Transação cancelada com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao cancelar transação:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao cancelar transação',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Webhook para notificações de pagamento
     */
    async handlePaymentWebhook(req, res) {
        try {
            const signature = req.headers['x-webhook-signature'];
            const payload = req.body;

            // Verificar assinatura do webhook
            if (!this.verifyWebhookSignature(payload, signature)) {
                return res.status(401).json({
                    success: false,
                    message: 'Assinatura do webhook inválida'
                });
            }

            // Processar notificação
            await this.paymentService.handlePaymentNotification(payload);

            res.json({
                success: true,
                message: 'Webhook processado com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao processar webhook:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao processar webhook'
            });
        }
    }

    /**
     * Calcular taxas de pagamento
     */
    async calculateFees(req, res) {
        try {
            const { amount, paymentMethod, installments = 1 } = req.query;

            if (!amount || !paymentMethod) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetros obrigatórios: amount, paymentMethod'
                });
            }

            const fees = await this.paymentService.calculatePaymentFees(
                parseFloat(amount),
                paymentMethod,
                parseInt(installments)
            );

            res.json({
                success: true,
                data: fees,
                message: 'Taxas calculadas com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao calcular taxas:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao calcular taxas',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Gerar relatório de transações (Admin)
     */
    async getTransactionReport(req, res) {
        try {
            // Verificar se é admin
            if (!req.user.isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado'
                });
            }

            const { startDate, endDate, paymentMethod, status } = req.query;

            const report = await this.paymentService.generateTransactionReport({
                startDate,
                endDate,
                paymentMethod,
                status
            });

            res.json({
                success: true,
                data: report,
                message: 'Relatório gerado com sucesso'
            });

        } catch (error) {
            logger.error('Erro ao gerar relatório:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao gerar relatório',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Gerar ID único para transação
     */
    generateTransactionId() {
        const timestamp = Date.now().toString();
        const random = crypto.randomBytes(4).toString('hex');
        return `TXN_${timestamp}_${random}`.toUpperCase();
    }

    /**
     * Verificar assinatura do webhook
     */
    verifyWebhookSignature(payload, signature) {
        try {
            const secret = process.env.WEBHOOK_SECRET;
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(JSON.stringify(payload))
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );
        } catch (error) {
            logger.error('Erro ao verificar assinatura:', error);
            return false;
        }
    }
}

module.exports = PaymentController;