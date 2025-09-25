const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Middleware de Segurança para Sistema de Pagamentos
 * Implementa validações, rate limiting, sanitização e proteções
 */

/**
 * Rate Limiting para endpoints de pagamento
 */
const paymentRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // máximo 10 tentativas por IP
    message: {
        error: 'Muitas tentativas de pagamento. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Usar IP + user ID se autenticado
        const userId = req.user?.id || 'anonymous';
        return `${req.ip}-${userId}`;
    },
    skip: (req) => {
        // Pular rate limit para webhooks
        return req.path.includes('/webhook');
    }
});

/**
 * Rate Limiting mais restritivo para criação de pagamentos
 */
const createPaymentRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 3, // máximo 3 criações por IP
    message: {
        error: 'Muitas tentativas de criação de pagamento. Tente novamente em 5 minutos.',
        code: 'CREATE_PAYMENT_RATE_LIMIT'
    }
});

/**
 * Configuração do Helmet para segurança HTTP
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.mercadopago.com", "https://api.pagar.me"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
});

/**
 * Middleware de validação de entrada
 */
const inputValidation = (req, res, next) => {
    try {
        // Sanitizar dados de entrada
        if (req.body) {
            req.body = sanitizeInput(req.body);
        }

        if (req.query) {
            req.query = sanitizeInput(req.query);
        }

        if (req.params) {
            req.params = sanitizeInput(req.params);
        }

        // Validar tamanho do payload
        const payloadSize = JSON.stringify(req.body || {}).length;
        if (payloadSize > 50000) { // 50KB máximo
            return res.status(413).json({
                error: 'Payload muito grande',
                code: 'PAYLOAD_TOO_LARGE'
            });
        }

        next();
    } catch (error) {
        logger.error('Erro na validação de entrada:', error);
        res.status(400).json({
            error: 'Dados de entrada inválidos',
            code: 'INVALID_INPUT'
        });
    }
};

/**
 * Sanitizar dados de entrada
 */
function sanitizeInput(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' ? obj.trim() : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeInput(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Remover propriedades perigosas
        if (key.startsWith('__') || key.includes('prototype')) {
            continue;
        }

        if (typeof value === 'string') {
            // Remover caracteres perigosos
            sanitized[key] = value
                .trim()
                .replace(/[<>]/g, '') // Remover < e >
                .replace(/javascript:/gi, '') // Remover javascript:
                .replace(/on\w+=/gi, ''); // Remover event handlers
        } else if (typeof value === 'object') {
            sanitized[key] = sanitizeInput(value);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Middleware de validação de webhook
 */
const webhookValidation = (req, res, next) => {
    try {
        const signature = req.headers['x-signature'] || req.headers['x-hub-signature-256'];
        const payload = JSON.stringify(req.body);

        if (!signature) {
            return res.status(401).json({
                error: 'Assinatura do webhook ausente',
                code: 'MISSING_WEBHOOK_SIGNATURE'
            });
        }

        // Validar assinatura do webhook
        const isValid = validateWebhookSignature(payload, signature);
        
        if (!isValid) {
            logger.warn('Tentativa de webhook com assinatura inválida:', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                signature
            });

            return res.status(401).json({
                error: 'Assinatura do webhook inválida',
                code: 'INVALID_WEBHOOK_SIGNATURE'
            });
        }

        next();
    } catch (error) {
        logger.error('Erro na validação do webhook:', error);
        res.status(500).json({
            error: 'Erro interno na validação do webhook',
            code: 'WEBHOOK_VALIDATION_ERROR'
        });
    }
};

/**
 * Validar assinatura do webhook
 */
function validateWebhookSignature(payload, signature) {
    try {
        const secret = process.env.WEBHOOK_SECRET || 'default_webhook_secret';
        
        // Suportar diferentes formatos de assinatura
        let expectedSignature;
        
        if (signature.startsWith('sha256=')) {
            // GitHub/PayPal style
            const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
            expectedSignature = `sha256=${hash}`;
        } else if (signature.startsWith('sha1=')) {
            // Older webhook style
            const hash = crypto.createHmac('sha1', secret).update(payload).digest('hex');
            expectedSignature = `sha1=${hash}`;
        } else {
            // Direct hash
            expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        }

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch (error) {
        logger.error('Erro ao validar assinatura:', error);
        return false;
    }
}

/**
 * Middleware de detecção de fraude básica
 */
const fraudDetection = (req, res, next) => {
    try {
        const suspiciousPatterns = [
            // Múltiplas tentativas com valores altos
            { pattern: 'high_value_multiple', check: checkHighValueMultiple },
            // Tentativas com dados similares
            { pattern: 'similar_data', check: checkSimilarData },
            // Velocidade de tentativas suspeita
            { pattern: 'velocity', check: checkVelocity }
        ];

        for (const { pattern, check } of suspiciousPatterns) {
            const risk = check(req);
            
            if (risk.level === 'high') {
                logger.warn('Atividade suspeita detectada:', {
                    pattern,
                    risk,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    body: req.body
                });

                return res.status(429).json({
                    error: 'Atividade suspeita detectada. Tente novamente mais tarde.',
                    code: 'SUSPICIOUS_ACTIVITY'
                });
            }
        }

        next();
    } catch (error) {
        logger.error('Erro na detecção de fraude:', error);
        next(); // Continuar em caso de erro para não bloquear pagamentos legítimos
    }
};

/**
 * Verificar múltiplas tentativas com valores altos
 */
function checkHighValueMultiple(req) {
    const amount = req.body.amount || 0;
    const highValueThreshold = 10000; // R$ 10.000

    if (amount > highValueThreshold) {
        // Em produção, verificar histórico no Redis/banco
        return { level: 'medium', reason: 'High value transaction' };
    }

    return { level: 'low' };
}

/**
 * Verificar dados similares
 */
function checkSimilarData(req) {
    // Em produção, implementar verificação de dados similares
    // usando cache Redis ou banco de dados
    return { level: 'low' };
}

/**
 * Verificar velocidade de tentativas
 */
function checkVelocity(req) {
    // Em produção, implementar verificação de velocidade
    // usando cache Redis para contar tentativas por IP/usuário
    return { level: 'low' };
}

/**
 * Middleware de log de segurança
 */
const securityLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log da requisição
    logger.info('Requisição de pagamento:', {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    });

    // Interceptar resposta para log
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        
        logger.info('Resposta de pagamento:', {
            statusCode: res.statusCode,
            duration,
            path: req.path,
            ip: req.ip,
            userId: req.user?.id
        });

        return originalSend.call(this, data);
    };

    next();
};

/**
 * Middleware de validação de HTTPS
 */
const httpsOnly = (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.status(426).json({
            error: 'HTTPS obrigatório para operações de pagamento',
            code: 'HTTPS_REQUIRED'
        });
    }
    next();
};

/**
 * Middleware de validação de origem
 */
const corsValidation = (req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    const origin = req.get('Origin');

    if (origin && !allowedOrigins.includes(origin)) {
        logger.warn('Tentativa de acesso de origem não autorizada:', {
            origin,
            ip: req.ip,
            path: req.path
        });

        return res.status(403).json({
            error: 'Origem não autorizada',
            code: 'FORBIDDEN_ORIGIN'
        });
    }

    next();
};

/**
 * Middleware de timeout para requisições
 */
const requestTimeout = (timeoutMs = 30000) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                logger.warn('Timeout de requisição:', {
                    path: req.path,
                    method: req.method,
                    ip: req.ip,
                    timeout: timeoutMs
                });

                res.status(408).json({
                    error: 'Timeout da requisição',
                    code: 'REQUEST_TIMEOUT'
                });
            }
        }, timeoutMs);

        res.on('finish', () => {
            clearTimeout(timeout);
        });

        next();
    };
};

/**
 * Middleware de validação de token de pagamento
 */
const paymentTokenValidation = (req, res, next) => {
    try {
        const token = req.headers['x-payment-token'];
        
        if (!token) {
            return res.status(401).json({
                error: 'Token de pagamento obrigatório',
                code: 'MISSING_PAYMENT_TOKEN'
            });
        }

        // Validar formato do token
        if (!/^[a-zA-Z0-9_-]+$/.test(token) || token.length < 32) {
            return res.status(401).json({
                error: 'Token de pagamento inválido',
                code: 'INVALID_PAYMENT_TOKEN'
            });
        }

        // Em produção, validar token no banco/cache
        req.paymentToken = token;
        next();
    } catch (error) {
        logger.error('Erro na validação do token de pagamento:', error);
        res.status(500).json({
            error: 'Erro interno na validação do token',
            code: 'TOKEN_VALIDATION_ERROR'
        });
    }
};

module.exports = {
    paymentRateLimit,
    createPaymentRateLimit,
    securityHeaders,
    inputValidation,
    webhookValidation,
    fraudDetection,
    securityLogger,
    httpsOnly,
    corsValidation,
    requestTimeout,
    paymentTokenValidation,
    sanitizeInput,
    validateWebhookSignature
};