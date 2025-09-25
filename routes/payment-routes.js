const express = require('express');
const PaymentController = require('../api/payment-controller');
const authMiddleware = require('../middleware/auth-middleware');
const rateLimitMiddleware = require('../middleware/rate-limit-middleware');
const { logger } = require('../utils/logger');

const router = express.Router();
const paymentController = new PaymentController();

/**
 * Middleware de autenticação para todas as rotas de pagamento
 */
router.use(authMiddleware);

/**
 * Middleware de rate limiting para pagamentos
 */
const paymentRateLimit = rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 tentativas por IP
    message: {
        success: false,
        message: 'Muitas tentativas de pagamento. Tente novamente em 15 minutos.'
    }
});

/**
 * @route GET /api/payments/methods
 * @desc Listar métodos de pagamento disponíveis
 * @access Private
 */
router.get('/methods', async (req, res) => {
    await paymentController.getPaymentMethods(req, res);
});

/**
 * @route POST /api/payments/initiate
 * @desc Iniciar processo de pagamento
 * @access Private
 */
router.post('/initiate', paymentRateLimit, async (req, res) => {
    await paymentController.initiatePayment(req, res);
});

/**
 * @route POST /api/payments/:transactionId/pix
 * @desc Processar pagamento PIX
 * @access Private
 */
router.post('/:transactionId/pix', paymentRateLimit, async (req, res) => {
    await paymentController.processPixPayment(req, res);
});

/**
 * @route POST /api/payments/:transactionId/card
 * @desc Processar pagamento com cartão
 * @access Private
 */
router.post('/:transactionId/card', paymentRateLimit, async (req, res) => {
    await paymentController.processCardPayment(req, res);
});

/**
 * @route POST /api/payments/:transactionId/boleto
 * @desc Processar pagamento com boleto
 * @access Private
 */
router.post('/:transactionId/boleto', paymentRateLimit, async (req, res) => {
    await paymentController.processBoletoPayment(req, res);
});

/**
 * @route GET /api/payments/:transactionId/status
 * @desc Consultar status de transação
 * @access Private
 */
router.get('/:transactionId/status', async (req, res) => {
    await paymentController.getTransactionStatus(req, res);
});

/**
 * @route GET /api/payments/transactions
 * @desc Listar transações do usuário
 * @access Private
 */
router.get('/transactions', async (req, res) => {
    await paymentController.getUserTransactions(req, res);
});

/**
 * @route PUT /api/payments/:transactionId/cancel
 * @desc Cancelar transação
 * @access Private
 */
router.put('/:transactionId/cancel', async (req, res) => {
    await paymentController.cancelTransaction(req, res);
});

/**
 * @route GET /api/payments/fees/calculate
 * @desc Calcular taxas de pagamento
 * @access Private
 */
router.get('/fees/calculate', async (req, res) => {
    await paymentController.calculateFees(req, res);
});

/**
 * @route POST /api/payments/webhook
 * @desc Webhook para notificações de pagamento
 * @access Public (mas com verificação de assinatura)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    await paymentController.handlePaymentWebhook(req, res);
});

/**
 * @route GET /api/payments/reports/transactions
 * @desc Gerar relatório de transações (Admin)
 * @access Private (Admin)
 */
router.get('/reports/transactions', async (req, res) => {
    await paymentController.getTransactionReport(req, res);
});

/**
 * Middleware de tratamento de erros específico para pagamentos
 */
router.use((error, req, res, next) => {
    logger.error('Erro nas rotas de pagamento:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        user: req.user?.id
    });

    // Não expor detalhes do erro em produção
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Erro interno do servidor',
        ...(isDevelopment && { stack: error.stack })
    });
});

module.exports = router;