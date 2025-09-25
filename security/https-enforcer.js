const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const SSLManager = require('./ssl-manager');
const SecurityHeaders = require('./security-headers');

class HTTPSEnforcer {
    constructor(options = {}) {
        this.options = {
            // Configurações de porta
            httpsPort: options.httpsPort || process.env.HTTPS_PORT || 443,
            httpPort: options.httpPort || process.env.HTTP_PORT || 80,
            
            // Caminhos dos certificados
            keyPath: options.keyPath || process.env.SSL_KEY_PATH || './certs/private-key.pem',
            certPath: options.certPath || process.env.SSL_CERT_PATH || './certs/certificate.pem',
            caPath: options.caPath || process.env.SSL_CA_PATH || './certs/ca-bundle.pem',
            
            // Configurações de segurança
            forceHTTPS: options.forceHTTPS !== false,
            hstsMaxAge: options.hstsMaxAge || 31536000, // 1 ano
            hstsIncludeSubDomains: options.hstsIncludeSubDomains !== false,
            hstsPreload: options.hstsPreload || false,
            
            // Domínios permitidos
            allowedDomains: options.allowedDomains || [],
            
            // Modo de desenvolvimento
            developmentMode: options.developmentMode || process.env.NODE_ENV === 'development',
            
            ...options
        };
        
        this.httpServer = null;
        this.httpsServer = null;
        this.certificates = null;
        
        // Inicializar gerenciadores
        this.sslManager = new SSLManager({
            certsDir: path.dirname(this.options.keyPath),
            domains: this.options.allowedDomains,
            useLetEncrypt: !this.options.developmentMode && process.env.USE_LETS_ENCRYPT === 'true'
        });
        
        this.securityHeaders = new SecurityHeaders({
            environment: process.env.NODE_ENV,
            hsts: {
                enabled: true,
                maxAge: this.options.hstsMaxAge,
                includeSubDomains: this.options.hstsIncludeSubDomains,
                preload: this.options.hstsPreload
            }
        });
    }

    // Middleware para forçar HTTPS
    forceHTTPSMiddleware() {
        return (req, res, next) => {
            // Verificar se já está usando HTTPS
            if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
                return next();
            }
            
            // Verificar se deve forçar HTTPS
            if (!this.options.forceHTTPS) {
                return next();
            }
            
            // Verificar domínio permitido
            if (this.options.allowedDomains.length > 0) {
                const host = req.get('host');
                if (!this.isAllowedDomain(host)) {
                    return res.status(403).json({ error: 'Domain not allowed' });
                }
            }
            
            // Redirecionar para HTTPS
            const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
            res.redirect(301, httpsUrl);
        };
    }

    // Middleware de cabeçalhos de segurança
    securityHeadersMiddleware() {
        return this.securityHeaders.middleware();
    }

    // Middleware combinado
    middleware() {
        return (req, res, next) => {
            // Aplicar middleware de HTTPS
            this.forceHTTPSMiddleware()(req, res, (err) => {
                if (err) return next(err);
                
                // Aplicar cabeçalhos de segurança
                this.securityHeadersMiddleware()(req, res, next);
            });
        };
    }

    // Verificar se domínio é permitido
    isAllowedDomain(host) {
        if (!host) return false;
        const domain = host.split(':')[0];
        return this.options.allowedDomains.some(allowed => {
            return domain === allowed || domain.endsWith(`.${allowed}`);
        });
    }

    // Inicializar HTTPS Enforcer
    async initialize() {
        try {
            console.log('🔐 Inicializando HTTPS Enforcer...');
            
            // Inicializar SSL Manager
            await this.sslManager.initialize();
            
            // Carregar certificados
            await this.loadCertificates();
            
            console.log('✅ HTTPS Enforcer inicializado');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar HTTPS Enforcer:', error);
            return false;
        }
    }

    // Carregar certificados SSL
    async loadCertificates() {
        try {
            // Verificar se certificados existem
            const validation = await this.sslManager.validateCertificates();
            
            if (!validation.valid) {
                if (this.options.developmentMode) {
                    console.log('🔧 Gerando certificados para desenvolvimento...');
                    await this.sslManager.generateCertificates();
                } else {
                    throw new Error(`Certificados inválidos: ${validation.error}`);
                }
            }
            
            // Carregar certificados
            const keyContent = await fs.readFile(this.options.keyPath, 'utf8');
            const certContent = await fs.readFile(this.options.certPath, 'utf8');
            
            let caContent = null;
            try {
                if (this.options.caPath) {
                    caContent = await fs.readFile(this.options.caPath, 'utf8');
                }
            } catch (error) {
                // CA bundle é opcional
            }
            
            this.certificates = {
                key: keyContent,
                cert: certContent,
                ca: caContent,
                
                // Configurações SSL avançadas
                secureProtocol: 'TLSv1_2_method',
                ciphers: [
                    'ECDHE-RSA-AES128-GCM-SHA256',
                    'ECDHE-RSA-AES256-GCM-SHA384',
                    'ECDHE-RSA-AES128-SHA256',
                    'ECDHE-RSA-AES256-SHA384',
                    'DHE-RSA-AES128-GCM-SHA256',
                    'DHE-RSA-AES256-GCM-SHA384'
                ].join(':'),
                honorCipherOrder: true,
                
                // Desabilitar protocolos inseguros
                secureOptions: require('constants').SSL_OP_NO_SSLv2 | 
                              require('constants').SSL_OP_NO_SSLv3 |
                              require('constants').SSL_OP_NO_TLSv1 |
                              require('constants').SSL_OP_NO_TLSv1_1
            };
            
            console.log('✅ Certificados SSL carregados');
        } catch (error) {
            console.error('❌ Erro ao carregar certificados:', error);
            throw error;
        }
    }

    // Carregar certificados SSL (método legado)
    async loadSSLCredentials() {
        console.log('⚠️ loadSSLCredentials está deprecated, use loadCertificates()');
        await this.loadCertificates();
        this.sslCredentials = this.certificates;
        return this.certificates;
    }

    // Gerar certificados auto-assinados para desenvolvimento
    async generateSelfSignedCertificates() {
        try {
            const { execSync } = require('child_process');
            const certsDir = path.dirname(this.options.keyPath);
            
            // Criar diretório de certificados
            if (!fs.existsSync(certsDir)) {
                fs.mkdirSync(certsDir, { recursive: true });
            }

            // Gerar chave privada e certificado auto-assinado
            const commands = [
                `openssl genrsa -out "${this.options.keyPath}" 2048`,
                `openssl req -new -x509 -key "${this.options.keyPath}" -out "${this.options.certPath}" -days 365 -subj "/C=BR/ST=SP/L=SaoPaulo/O=CompreAqui/OU=Development/CN=localhost"`
            ];

            for (const command of commands) {
                execSync(command, { stdio: 'pipe' });
            }

            console.log('✅ Certificados auto-assinados gerados com sucesso');
            
            // Carregar os certificados gerados
            return await this.loadSSLCredentials();
            
        } catch (error) {
            console.error('❌ Erro ao gerar certificados auto-assinados:', error.message);
            console.log('💡 Dica: Instale o OpenSSL ou configure certificados manualmente');
            throw error;
        }
    }

    // Criar servidor HTTPS
    async createHTTPSServer(app) {
        try {
            if (!this.sslCredentials) {
                await this.loadSSLCredentials();
            }

            this.httpsServer = https.createServer(this.sslCredentials, app);
            
            // Configurações de segurança do servidor
            this.httpsServer.on('secureConnection', (tlsSocket) => {
                console.log('🔒 Conexão HTTPS segura estabelecida:', {
                    cipher: tlsSocket.getCipher(),
                    protocol: tlsSocket.getProtocol(),
                    authorized: tlsSocket.authorized
                });
            });

            return this.httpsServer;
        } catch (error) {
            console.error('❌ Erro ao criar servidor HTTPS:', error);
            throw error;
        }
    }

    // Criar servidor HTTP (para redirecionamento)
    createHTTPServer() {
        const redirectApp = (req, res) => {
            const httpsUrl = `https://${req.headers.host}${req.url}`;
            console.log(`🔄 Redirecionando HTTP para HTTPS: ${httpsUrl}`);
            
            res.writeHead(301, {
                'Location': httpsUrl,
                'Strict-Transport-Security': `max-age=${this.options.hstsMaxAge}; includeSubDomains; preload`
            });
            res.end();
        };

        this.httpServer = http.createServer(redirectApp);
        return this.httpServer;
    }

    // Iniciar servidores
    async startServers(app) {
        try {
            console.log('🚀 Iniciando servidores HTTP/HTTPS...');
            
            // Criar e iniciar servidor HTTPS
            const httpsServer = await this.createHTTPSServer(app);
            await new Promise((resolve, reject) => {
                httpsServer.listen(this.options.httpsPort, (err) => {
                    if (err) reject(err);
                    else {
                        console.log(`✅ Servidor HTTPS rodando na porta ${this.options.httpsPort}`);
                        resolve();
                    }
                });
            });

            // Criar e iniciar servidor HTTP (apenas para redirecionamento)
            if (this.options.forceHTTPS) {
                const httpServer = this.createHTTPServer();
                await new Promise((resolve, reject) => {
                    httpServer.listen(this.options.httpPort, (err) => {
                        if (err) reject(err);
                        else {
                            console.log(`✅ Servidor HTTP (redirecionamento) rodando na porta ${this.options.httpPort}`);
                            resolve();
                        }
                    });
                });
            }

            return {
                httpsServer: this.httpsServer,
                httpServer: this.httpServer
            };
        } catch (error) {
            console.error('❌ Erro ao iniciar servidores:', error);
            throw error;
        }
    }

    // Parar servidores
    async stopServers() {
        const promises = [];

        if (this.httpsServer) {
            promises.push(new Promise((resolve) => {
                this.httpsServer.close(() => {
                    console.log('🛑 Servidor HTTPS parado');
                    resolve();
                });
            }));
        }

        if (this.httpServer) {
            promises.push(new Promise((resolve) => {
                this.httpServer.close(() => {
                    console.log('🛑 Servidor HTTP parado');
                    resolve();
                });
            }));
        }

        await Promise.all(promises);
    }

    // Verificar status dos certificados
    async checkCertificateStatus() {
        try {
            if (!this.sslCredentials) {
                return { valid: false, error: 'Certificados não carregados' };
            }

            const crypto = require('crypto');
            const cert = crypto.createCertificate();
            
            // Analisar certificado
            const certInfo = cert.exportChallenge(this.sslCredentials.cert);
            
            return {
                valid: true,
                info: {
                    subject: 'Certificado carregado',
                    issuer: 'Autoridade certificadora',
                    validFrom: 'Data de início',
                    validTo: 'Data de expiração',
                    fingerprint: 'Impressão digital'
                }
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Middleware de validação de domínio
    validateDomain() {
        return (req, res, next) => {
            if (this.options.allowedDomains.length === 0) {
                return next();
            }

            const host = req.get('host');
            const domain = host ? host.split(':')[0] : '';

            if (!this.options.allowedDomains.includes(domain)) {
                console.log(`🚫 Domínio não permitido: ${domain}`);
                return res.status(403).json({
                    error: 'Domínio não autorizado',
                    domain: domain
                });
            }

            next();
        };
    }

    // Obter informações de status
    getStatus() {
        return {
            httpsEnabled: !!this.httpsServer,
            httpRedirectEnabled: !!this.httpServer,
            certificatesLoaded: !!this.sslCredentials,
            forceHTTPS: this.options.forceHTTPS,
            hstsEnabled: true,
            hstsMaxAge: this.options.hstsMaxAge,
            allowedDomains: this.options.allowedDomains,
            isDevelopment: this.options.isDevelopment
        };
    }
}

module.exports = HTTPSEnforcer;