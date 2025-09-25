const crypto = require('crypto');

class SecurityHeaders {
    constructor(options = {}) {
        this.options = {
            // Configurações gerais
            environment: options.environment || process.env.NODE_ENV || 'development',
            reportOnly: options.reportOnly || process.env.SECURITY_REPORT_ONLY === 'true',
            
            // HSTS (HTTP Strict Transport Security)
            hsts: {
                enabled: options.hsts?.enabled !== false,
                maxAge: options.hsts?.maxAge || 31536000, // 1 ano
                includeSubDomains: options.hsts?.includeSubDomains !== false,
                preload: options.hsts?.preload || false,
                ...options.hsts
            },
            
            // CSP (Content Security Policy)
            csp: {
                enabled: options.csp?.enabled !== false,
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    manifestSrc: ["'self'"],
                    workerSrc: ["'self'"],
                    childSrc: ["'self'"],
                    formAction: ["'self'"],
                    frameAncestors: ["'none'"],
                    baseUri: ["'self'"],
                    upgradeInsecureRequests: true,
                    blockAllMixedContent: true,
                    ...options.csp?.directives
                },
                reportUri: options.csp?.reportUri || '/api/security/csp-report',
                ...options.csp
            },
            
            // X-Frame-Options
            frameOptions: {
                enabled: options.frameOptions?.enabled !== false,
                action: options.frameOptions?.action || 'DENY', // DENY, SAMEORIGIN, ALLOW-FROM
                domain: options.frameOptions?.domain || null,
                ...options.frameOptions
            },
            
            // X-Content-Type-Options
            contentTypeOptions: {
                enabled: options.contentTypeOptions?.enabled !== false,
                ...options.contentTypeOptions
            },
            
            // X-XSS-Protection
            xssProtection: {
                enabled: options.xssProtection?.enabled !== false,
                mode: options.xssProtection?.mode || '1; mode=block',
                ...options.xssProtection
            },
            
            // Referrer Policy
            referrerPolicy: {
                enabled: options.referrerPolicy?.enabled !== false,
                policy: options.referrerPolicy?.policy || 'strict-origin-when-cross-origin',
                ...options.referrerPolicy
            },
            
            // Permissions Policy (Feature Policy)
            permissionsPolicy: {
                enabled: options.permissionsPolicy?.enabled !== false,
                directives: {
                    camera: ['self'],
                    microphone: ['self'],
                    geolocation: ['self'],
                    payment: ['self'],
                    usb: ['none'],
                    magnetometer: ['none'],
                    gyroscope: ['none'],
                    accelerometer: ['none'],
                    ...options.permissionsPolicy?.directives
                },
                ...options.permissionsPolicy
            },
            
            // Cross-Origin Policies
            crossOrigin: {
                embedderPolicy: {
                    enabled: options.crossOrigin?.embedderPolicy?.enabled !== false,
                    policy: options.crossOrigin?.embedderPolicy?.policy || 'require-corp'
                },
                openerPolicy: {
                    enabled: options.crossOrigin?.openerPolicy?.enabled !== false,
                    policy: options.crossOrigin?.openerPolicy?.policy || 'same-origin'
                },
                resourcePolicy: {
                    enabled: options.crossOrigin?.resourcePolicy?.enabled !== false,
                    policy: options.crossOrigin?.resourcePolicy?.policy || 'cross-origin'
                },
                ...options.crossOrigin
            },
            
            // Expect-CT
            expectCt: {
                enabled: options.expectCt?.enabled || false,
                maxAge: options.expectCt?.maxAge || 86400,
                enforce: options.expectCt?.enforce || false,
                reportUri: options.expectCt?.reportUri || '/api/security/ct-report',
                ...options.expectCt
            },
            
            // Custom headers
            customHeaders: options.customHeaders || {},
            
            // Nonce generation
            nonce: {
                enabled: options.nonce?.enabled || false,
                algorithm: options.nonce?.algorithm || 'base64',
                length: options.nonce?.length || 16,
                ...options.nonce
            }
        };
        
        this.nonceCache = new Map();
    }

    // Middleware principal
    middleware() {
        return (req, res, next) => {
            try {
                // Gerar nonce se habilitado
                if (this.options.nonce.enabled) {
                    req.nonce = this.generateNonce();
                    res.locals.nonce = req.nonce;
                }
                
                // Aplicar todos os cabeçalhos de segurança
                this.applyHSTS(res);
                this.applyCSP(res, req.nonce);
                this.applyFrameOptions(res);
                this.applyContentTypeOptions(res);
                this.applyXSSProtection(res);
                this.applyReferrerPolicy(res);
                this.applyPermissionsPolicy(res);
                this.applyCrossOriginPolicies(res);
                this.applyExpectCT(res);
                this.applyCustomHeaders(res);
                
                // Remover cabeçalhos que podem vazar informações
                this.removeUnsafeHeaders(res);
                
                next();
            } catch (error) {
                console.error('Erro ao aplicar cabeçalhos de segurança:', error);
                next();
            }
        };
    }

    // Aplicar HSTS
    applyHSTS(res) {
        if (!this.options.hsts.enabled) return;
        
        let hstsValue = `max-age=${this.options.hsts.maxAge}`;
        
        if (this.options.hsts.includeSubDomains) {
            hstsValue += '; includeSubDomains';
        }
        
        if (this.options.hsts.preload) {
            hstsValue += '; preload';
        }
        
        res.setHeader('Strict-Transport-Security', hstsValue);
    }

    // Aplicar CSP
    applyCSP(res, nonce) {
        if (!this.options.csp.enabled) return;
        
        const directives = { ...this.options.csp.directives };
        
        // Adicionar nonce aos scripts e estilos se habilitado
        if (nonce) {
            if (directives.scriptSrc) {
                directives.scriptSrc = [...directives.scriptSrc, `'nonce-${nonce}'`];
            }
            if (directives.styleSrc) {
                directives.styleSrc = [...directives.styleSrc, `'nonce-${nonce}'`];
            }
        }
        
        // Construir política CSP
        const cspParts = [];
        
        Object.entries(directives).forEach(([directive, values]) => {
            if (directive === 'upgradeInsecureRequests' && values) {
                cspParts.push('upgrade-insecure-requests');
            } else if (directive === 'blockAllMixedContent' && values) {
                cspParts.push('block-all-mixed-content');
            } else if (Array.isArray(values) && values.length > 0) {
                const kebabDirective = this.camelToKebab(directive);
                cspParts.push(`${kebabDirective} ${values.join(' ')}`);
            }
        });
        
        // Adicionar report-uri se configurado
        if (this.options.csp.reportUri) {
            cspParts.push(`report-uri ${this.options.csp.reportUri}`);
        }
        
        const cspValue = cspParts.join('; ');
        const headerName = this.options.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
        
        res.setHeader(headerName, cspValue);
    }

    // Aplicar X-Frame-Options
    applyFrameOptions(res) {
        if (!this.options.frameOptions.enabled) return;
        
        let value = this.options.frameOptions.action;
        
        if (value === 'ALLOW-FROM' && this.options.frameOptions.domain) {
            value += ` ${this.options.frameOptions.domain}`;
        }
        
        res.setHeader('X-Frame-Options', value);
    }

    // Aplicar X-Content-Type-Options
    applyContentTypeOptions(res) {
        if (!this.options.contentTypeOptions.enabled) return;
        
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    // Aplicar X-XSS-Protection
    applyXSSProtection(res) {
        if (!this.options.xssProtection.enabled) return;
        
        res.setHeader('X-XSS-Protection', this.options.xssProtection.mode);
    }

    // Aplicar Referrer Policy
    applyReferrerPolicy(res) {
        if (!this.options.referrerPolicy.enabled) return;
        
        res.setHeader('Referrer-Policy', this.options.referrerPolicy.policy);
    }

    // Aplicar Permissions Policy
    applyPermissionsPolicy(res) {
        if (!this.options.permissionsPolicy.enabled) return;
        
        const directives = [];
        
        Object.entries(this.options.permissionsPolicy.directives).forEach(([feature, allowlist]) => {
            if (Array.isArray(allowlist)) {
                const formattedAllowlist = allowlist.map(origin => {
                    if (origin === 'self') return 'self';
                    if (origin === 'none') return '';
                    return `"${origin}"`;
                }).join(' ');
                
                directives.push(`${feature}=(${formattedAllowlist})`);
            }
        });
        
        if (directives.length > 0) {
            res.setHeader('Permissions-Policy', directives.join(', '));
        }
    }

    // Aplicar políticas Cross-Origin
    applyCrossOriginPolicies(res) {
        const { crossOrigin } = this.options;
        
        if (crossOrigin.embedderPolicy.enabled) {
            res.setHeader('Cross-Origin-Embedder-Policy', crossOrigin.embedderPolicy.policy);
        }
        
        if (crossOrigin.openerPolicy.enabled) {
            res.setHeader('Cross-Origin-Opener-Policy', crossOrigin.openerPolicy.policy);
        }
        
        if (crossOrigin.resourcePolicy.enabled) {
            res.setHeader('Cross-Origin-Resource-Policy', crossOrigin.resourcePolicy.policy);
        }
    }

    // Aplicar Expect-CT
    applyExpectCT(res) {
        if (!this.options.expectCt.enabled) return;
        
        let value = `max-age=${this.options.expectCt.maxAge}`;
        
        if (this.options.expectCt.enforce) {
            value += ', enforce';
        }
        
        if (this.options.expectCt.reportUri) {
            value += `, report-uri="${this.options.expectCt.reportUri}"`;
        }
        
        res.setHeader('Expect-CT', value);
    }

    // Aplicar cabeçalhos customizados
    applyCustomHeaders(res) {
        Object.entries(this.options.customHeaders).forEach(([name, value]) => {
            res.setHeader(name, value);
        });
    }

    // Remover cabeçalhos inseguros
    removeUnsafeHeaders(res) {
        const unsafeHeaders = [
            'X-Powered-By',
            'Server',
            'X-AspNet-Version',
            'X-AspNetMvc-Version'
        ];
        
        unsafeHeaders.forEach(header => {
            res.removeHeader(header);
        });
    }

    // Gerar nonce
    generateNonce() {
        const buffer = crypto.randomBytes(this.options.nonce.length);
        
        switch (this.options.nonce.algorithm) {
            case 'hex':
                return buffer.toString('hex');
            case 'base64url':
                return buffer.toString('base64url');
            case 'base64':
            default:
                return buffer.toString('base64');
        }
    }

    // Converter camelCase para kebab-case
    camelToKebab(str) {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
    }

    // Middleware para relatórios CSP
    cspReportHandler() {
        return (req, res, next) => {
            if (req.path === this.options.csp.reportUri && req.method === 'POST') {
                let body = '';
                
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                
                req.on('end', () => {
                    try {
                        const report = JSON.parse(body);
                        this.handleCSPReport(report, req);
                        res.status(204).end();
                    } catch (error) {
                        console.error('Erro ao processar relatório CSP:', error);
                        res.status(400).json({ error: 'Invalid CSP report' });
                    }
                });
            } else {
                next();
            }
        };
    }

    // Processar relatório CSP
    handleCSPReport(report, req) {
        const violation = report['csp-report'];
        
        if (violation) {
            console.warn('🚨 Violação CSP detectada:', {
                documentUri: violation['document-uri'],
                violatedDirective: violation['violated-directive'],
                blockedUri: violation['blocked-uri'],
                sourceFile: violation['source-file'],
                lineNumber: violation['line-number'],
                columnNumber: violation['column-number'],
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            
            // Aqui você pode implementar lógica adicional como:
            // - Salvar no banco de dados
            // - Enviar alertas
            // - Análise de padrões
        }
    }

    // Middleware para relatórios Expect-CT
    expectCtReportHandler() {
        return (req, res, next) => {
            if (req.path === this.options.expectCt.reportUri && req.method === 'POST') {
                let body = '';
                
                req.on('data', chunk => {
                    body += chunk.toString();
                });
                
                req.on('end', () => {
                    try {
                        const report = JSON.parse(body);
                        this.handleExpectCtReport(report, req);
                        res.status(204).end();
                    } catch (error) {
                        console.error('Erro ao processar relatório Expect-CT:', error);
                        res.status(400).json({ error: 'Invalid Expect-CT report' });
                    }
                });
            } else {
                next();
            }
        };
    }

    // Processar relatório Expect-CT
    handleExpectCtReport(report, req) {
        console.warn('🚨 Violação Expect-CT detectada:', {
            hostname: report.hostname,
            port: report.port,
            effectiveExpirationDate: report['effective-expiration-date'],
            servedCertificateChain: report['served-certificate-chain'],
            validatedCertificateChain: report['validated-certificate-chain'],
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        });
    }

    // Obter configuração atual
    getConfiguration() {
        return {
            environment: this.options.environment,
            reportOnly: this.options.reportOnly,
            enabledFeatures: {
                hsts: this.options.hsts.enabled,
                csp: this.options.csp.enabled,
                frameOptions: this.options.frameOptions.enabled,
                contentTypeOptions: this.options.contentTypeOptions.enabled,
                xssProtection: this.options.xssProtection.enabled,
                referrerPolicy: this.options.referrerPolicy.enabled,
                permissionsPolicy: this.options.permissionsPolicy.enabled,
                expectCt: this.options.expectCt.enabled,
                nonce: this.options.nonce.enabled
            }
        };
    }

    // Validar configuração
    validateConfiguration() {
        const issues = [];
        
        // Verificar HSTS
        if (this.options.hsts.enabled && this.options.hsts.maxAge < 300) {
            issues.push('HSTS max-age muito baixo (recomendado: >= 300 segundos)');
        }
        
        // Verificar CSP
        if (this.options.csp.enabled) {
            const { directives } = this.options.csp;
            
            if (directives.scriptSrc?.includes("'unsafe-eval'")) {
                issues.push('CSP permite unsafe-eval para scripts (risco de segurança)');
            }
            
            if (directives.styleSrc?.includes("'unsafe-inline'") && !this.options.nonce.enabled) {
                issues.push('CSP permite unsafe-inline para estilos sem nonce');
            }
        }
        
        // Verificar Frame Options
        if (this.options.frameOptions.enabled && this.options.frameOptions.action === 'ALLOW-FROM' && !this.options.frameOptions.domain) {
            issues.push('Frame Options ALLOW-FROM requer domínio especificado');
        }
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    // Atualizar configuração
    updateConfiguration(newOptions) {
        this.options = { ...this.options, ...newOptions };
        
        // Validar nova configuração
        const validation = this.validateConfiguration();
        if (!validation.valid) {
            console.warn('⚠️ Problemas na configuração de segurança:', validation.issues);
        }
        
        return validation;
    }
}

module.exports = SecurityHeaders;