const HTTPSEnforcer = require('./https-enforcer');
const SSLManager = require('./ssl-manager');
const SecurityHeaders = require('./security-headers');
const config = require('../config/environment');

/**
 * Sistema de Segurança Integrado
 * Gerencia HTTPS, SSL/TLS e cabeçalhos de segurança
 */
class SecuritySystem {
    constructor(options = {}) {
        this.config = config.get();
        this.options = {
            ...this.config.security,
            ...options
        };
        
        this.httpsEnforcer = null;
        this.sslManager = null;
        this.securityHeaders = null;
        this.isInitialized = false;
        this.servers = {
            http: null,
            https: null
        };
    }

    /**
     * Inicializar sistema de segurança
     */
    async initialize() {
        try {
            console.log('🔐 Inicializando sistema de segurança...');
            
            // Inicializar SSL Manager
            this.sslManager = new SSLManager(this.options.ssl);
            await this.sslManager.initialize();
            
            // Inicializar Security Headers
            this.securityHeaders = new SecurityHeaders(this.options.headers);
            
            // Inicializar HTTPS Enforcer
            this.httpsEnforcer = new HTTPSEnforcer({
                ...this.options.https,
                sslManager: this.sslManager,
                securityHeaders: this.securityHeaders
            });
            
            await this.httpsEnforcer.initialize();
            
            this.isInitialized = true;
            console.log('✅ Sistema de segurança inicializado com sucesso');
            
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de segurança:', error);
            throw error;
        }
    }

    /**
     * Configurar middlewares de segurança para Express
     */
    configureMiddlewares(app) {
        if (!this.isInitialized) {
            throw new Error('Sistema de segurança não foi inicializado');
        }

        // Middleware de HTTPS enforcement
        app.use(this.httpsEnforcer.middleware());
        
        // Middleware de cabeçalhos de segurança
        app.use(this.securityHeaders.middleware());
        
        console.log('🛡️ Middlewares de segurança configurados');
    }

    /**
     * Iniciar servidores HTTP e HTTPS
     */
    async startServers(app, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Sistema de segurança não foi inicializado');
        }

        const serverOptions = {
            httpPort: this.config.server.httpPort || 3000,
            httpsPort: this.config.server.httpsPort || 3443,
            ...options
        };

        try {
            // Iniciar servidores através do HTTPS Enforcer
            await this.httpsEnforcer.startServers(app, serverOptions);
            
            this.servers = this.httpsEnforcer.getServers();
            
            console.log('🚀 Servidores HTTP/HTTPS iniciados com sucesso');
            return this.servers;
        } catch (error) {
            console.error('❌ Erro ao iniciar servidores:', error);
            throw error;
        }
    }

    /**
     * Parar servidores
     */
    async stopServers() {
        if (this.httpsEnforcer) {
            await this.httpsEnforcer.stopServers();
            this.servers = { http: null, https: null };
            console.log('🛑 Servidores HTTP/HTTPS parados');
        }
    }

    /**
     * Obter status do sistema de segurança
     */
    getStatus() {
        if (!this.isInitialized) {
            return {
                initialized: false,
                ssl: null,
                https: null,
                headers: null
            };
        }

        return {
            initialized: true,
            ssl: this.sslManager.getStatus(),
            https: this.httpsEnforcer.getStatus(),
            headers: this.securityHeaders.getStatus(),
            servers: {
                http: this.servers.http ? 'running' : 'stopped',
                https: this.servers.https ? 'running' : 'stopped'
            }
        };
    }

    /**
     * Verificar certificados SSL
     */
    async checkCertificates() {
        if (!this.sslManager) {
            throw new Error('SSL Manager não foi inicializado');
        }

        return await this.sslManager.getCertificateInfo();
    }

    /**
     * Renovar certificados SSL
     */
    async renewCertificates() {
        if (!this.sslManager) {
            throw new Error('SSL Manager não foi inicializado');
        }

        return await this.sslManager.renewCertificate();
    }

    /**
     * Atualizar configurações de segurança
     */
    async updateSecurityConfig(newConfig) {
        try {
            // Atualizar configurações
            this.options = { ...this.options, ...newConfig };
            
            // Reinicializar componentes se necessário
            if (newConfig.headers && this.securityHeaders) {
                this.securityHeaders.updateOptions(newConfig.headers);
            }
            
            if (newConfig.ssl && this.sslManager) {
                // SSL Manager precisa ser reinicializado para mudanças
                console.log('⚠️ Configurações SSL alteradas - reinicialização necessária');
            }
            
            console.log('🔄 Configurações de segurança atualizadas');
            return true;
        } catch (error) {
            console.error('❌ Erro ao atualizar configurações:', error);
            throw error;
        }
    }

    /**
     * Gerar relatório de segurança
     */
    generateSecurityReport() {
        const status = this.getStatus();
        const timestamp = new Date().toISOString();
        
        return {
            timestamp,
            system: {
                initialized: status.initialized,
                environment: this.config.environment
            },
            ssl: status.ssl,
            https: {
                enforced: this.options.https?.forceHTTPS || false,
                hsts: this.options.https?.hstsMaxAge || 0,
                status: status.https
            },
            headers: status.headers,
            servers: status.servers,
            recommendations: this.generateRecommendations(status)
        };
    }

    /**
     * Gerar recomendações de segurança
     */
    generateRecommendations(status) {
        const recommendations = [];
        
        if (!status.ssl?.valid) {
            recommendations.push({
                type: 'ssl',
                priority: 'high',
                message: 'Certificado SSL inválido ou expirado'
            });
        }
        
        if (!this.options.https?.forceHTTPS) {
            recommendations.push({
                type: 'https',
                priority: 'high',
                message: 'HTTPS enforcement não está ativado'
            });
        }
        
        if (!this.options.https?.hstsMaxAge || this.options.https.hstsMaxAge < 31536000) {
            recommendations.push({
                type: 'hsts',
                priority: 'medium',
                message: 'HSTS max-age deve ser pelo menos 1 ano (31536000 segundos)'
            });
        }
        
        if (!status.headers?.csp?.enabled) {
            recommendations.push({
                type: 'csp',
                priority: 'medium',
                message: 'Content Security Policy não está configurado'
            });
        }
        
        return recommendations;
    }

    /**
     * Cleanup e finalização
     */
    async cleanup() {
        try {
            await this.stopServers();
            
            if (this.sslManager) {
                await this.sslManager.cleanup();
            }
            
            this.isInitialized = false;
            console.log('🧹 Sistema de segurança finalizado');
        } catch (error) {
            console.error('❌ Erro durante cleanup:', error);
        }
    }
}

module.exports = SecuritySystem;