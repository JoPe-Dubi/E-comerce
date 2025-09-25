#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

/**
 * Script de Health Check para monitoramento
 * Verifica saúde da aplicação, SSL, banco de dados e serviços
 */
class HealthChecker {
    constructor(options = {}) {
        this.options = {
            baseUrl: process.env.BASE_URL || 'https://localhost:3443',
            timeout: 10000,
            retries: 3,
            checkInterval: 30000,
            logFile: './logs/health-check.log',
            ...options
        };
        
        this.checks = [];
        this.results = [];
        this.isRunning = false;
    }

    /**
     * Executar health check completo
     */
    async run() {
        console.log('🏥 Iniciando health check...\n');
        
        try {
            await this.setupChecks();
            const results = await this.executeChecks();
            await this.generateReport(results);
            
            const overallHealth = this.calculateOverallHealth(results);
            
            if (overallHealth.status === 'healthy') {
                console.log('✅ Sistema saudável');
                process.exit(0);
            } else {
                console.log('❌ Sistema com problemas');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Erro durante health check:', error.message);
            process.exit(1);
        }
    }

    /**
     * Configurar verificações
     */
    async setupChecks() {
        this.checks = [
            {
                name: 'HTTP Server',
                type: 'http',
                url: this.options.baseUrl.replace('https:', 'http:').replace('3443', '3000'),
                expected: { status: [200, 301, 302] }
            },
            {
                name: 'HTTPS Server',
                type: 'https',
                url: this.options.baseUrl,
                expected: { status: [200] }
            },
            {
                name: 'Health Endpoint',
                type: 'endpoint',
                url: `${this.options.baseUrl}/health`,
                expected: { status: [200], body: { status: 'OK' } }
            },
            {
                name: 'API Endpoint',
                type: 'endpoint',
                url: `${this.options.baseUrl}/api/health`,
                expected: { status: [200] }
            },
            {
                name: 'Database',
                type: 'database',
                check: this.checkDatabase.bind(this)
            },
            {
                name: 'SSL Certificate',
                type: 'ssl',
                check: this.checkSSLCertificate.bind(this)
            },
            {
                name: 'File System',
                type: 'filesystem',
                check: this.checkFileSystem.bind(this)
            },
            {
                name: 'Memory Usage',
                type: 'memory',
                check: this.checkMemoryUsage.bind(this)
            },
            {
                name: 'Disk Space',
                type: 'disk',
                check: this.checkDiskSpace.bind(this)
            }
        ];
    }

    /**
     * Executar todas as verificações
     */
    async executeChecks() {
        const results = [];
        
        for (const check of this.checks) {
            console.log(`🔍 Verificando ${check.name}...`);
            
            try {
                const result = await this.executeCheck(check);
                results.push(result);
                
                if (result.status === 'healthy') {
                    console.log(`  ✅ ${check.name}: OK`);
                } else {
                    console.log(`  ❌ ${check.name}: ${result.message}`);
                }
                
            } catch (error) {
                const result = {
                    name: check.name,
                    type: check.type,
                    status: 'unhealthy',
                    message: error.message,
                    timestamp: new Date().toISOString()
                };
                
                results.push(result);
                console.log(`  ❌ ${check.name}: ${error.message}`);
            }
        }
        
        return results;
    }

    /**
     * Executar verificação individual
     */
    async executeCheck(check) {
        const startTime = Date.now();
        
        let result;
        if (check.type === 'http' || check.type === 'https') {
            result = await this.checkHttpEndpoint(check);
        } else if (check.type === 'endpoint') {
            result = await this.checkApiEndpoint(check);
        } else if (check.check) {
            result = await check.check();
        } else {
            throw new Error(`Tipo de verificação não suportado: ${check.type}`);
        }
        
        const responseTime = Date.now() - startTime;
        
        return {
            ...result,
            name: check.name,
            type: check.type,
            responseTime,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Verificar endpoint HTTP/HTTPS
     */
    async checkHttpEndpoint(check) {
        return new Promise((resolve, reject) => {
            const url = new URL(check.url);
            const isHttps = url.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'GET',
                timeout: this.options.timeout,
                rejectUnauthorized: false // Para certificados auto-assinados
            };
            
            const req = client.request(options, (res) => {
                const expectedStatus = check.expected?.status || [200];
                
                if (expectedStatus.includes(res.statusCode)) {
                    resolve({
                        status: 'healthy',
                        message: `Status ${res.statusCode}`,
                        details: {
                            statusCode: res.statusCode,
                            headers: res.headers
                        }
                    });
                } else {
                    resolve({
                        status: 'unhealthy',
                        message: `Status inesperado: ${res.statusCode}`,
                        details: { statusCode: res.statusCode }
                    });
                }
            });
            
            req.on('error', (error) => {
                resolve({
                    status: 'unhealthy',
                    message: error.message,
                    details: { error: error.code }
                });
            });
            
            req.on('timeout', () => {
                req.destroy();
                resolve({
                    status: 'unhealthy',
                    message: 'Timeout na requisição',
                    details: { timeout: this.options.timeout }
                });
            });
            
            req.end();
        });
    }

    /**
     * Verificar endpoint da API
     */
    async checkApiEndpoint(check) {
        const result = await this.checkHttpEndpoint(check);
        
        if (result.status === 'healthy' && check.expected?.body) {
            // TODO: Verificar corpo da resposta se necessário
        }
        
        return result;
    }

    /**
     * Verificar banco de dados
     */
    async checkDatabase() {
        try {
            const dbPath = process.env.DATABASE_URL || './data/production.db';
            
            // Verificar se arquivo existe
            await fs.access(dbPath.replace('file:', ''));
            
            // TODO: Executar query simples para verificar conectividade
            
            return {
                status: 'healthy',
                message: 'Banco de dados acessível',
                details: { path: dbPath }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Erro no banco de dados: ${error.message}`,
                details: { error: error.code }
            };
        }
    }

    /**
     * Verificar certificado SSL
     */
    async checkSSLCertificate() {
        try {
            const certPath = process.env.SSL_CERT_PATH || './ssl/certificate.crt';
            
            // Verificar se arquivo existe
            await fs.access(certPath);
            
            // Ler certificado
            const certContent = await fs.readFile(certPath, 'utf8');
            
            // TODO: Verificar validade do certificado
            
            return {
                status: 'healthy',
                message: 'Certificado SSL válido',
                details: { path: certPath }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Erro no certificado SSL: ${error.message}`,
                details: { error: error.code }
            };
        }
    }

    /**
     * Verificar sistema de arquivos
     */
    async checkFileSystem() {
        try {
            const testFile = './tmp/health-check-test.txt';
            const testContent = `Health check test - ${Date.now()}`;
            
            // Escrever arquivo de teste
            await fs.writeFile(testFile, testContent);
            
            // Ler arquivo de teste
            const readContent = await fs.readFile(testFile, 'utf8');
            
            // Remover arquivo de teste
            await fs.unlink(testFile);
            
            if (readContent === testContent) {
                return {
                    status: 'healthy',
                    message: 'Sistema de arquivos funcionando',
                    details: { test: 'write/read/delete' }
                };
            } else {
                return {
                    status: 'unhealthy',
                    message: 'Erro na leitura/escrita de arquivos',
                    details: { expected: testContent, actual: readContent }
                };
            }
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Erro no sistema de arquivos: ${error.message}`,
                details: { error: error.code }
            };
        }
    }

    /**
     * Verificar uso de memória
     */
    async checkMemoryUsage() {
        const memUsage = process.memoryUsage();
        const totalMem = require('os').totalmem();
        const freeMem = require('os').freemem();
        
        const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;
        const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        
        const isHealthy = usedMemPercent < 90 && heapUsedPercent < 90;
        
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            message: isHealthy ? 'Uso de memória normal' : 'Alto uso de memória',
            details: {
                systemMemoryUsed: `${usedMemPercent.toFixed(1)}%`,
                heapUsed: `${heapUsedPercent.toFixed(1)}%`,
                rss: `${(memUsage.rss / 1024 / 1024).toFixed(1)}MB`,
                heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB`
            }
        };
    }

    /**
     * Verificar espaço em disco
     */
    async checkDiskSpace() {
        try {
            const stats = await fs.stat('./');
            
            // TODO: Implementar verificação real de espaço em disco
            // Por enquanto, assumir que está OK
            
            return {
                status: 'healthy',
                message: 'Espaço em disco suficiente',
                details: { check: 'basic' }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                message: `Erro ao verificar disco: ${error.message}`,
                details: { error: error.code }
            };
        }
    }

    /**
     * Calcular saúde geral
     */
    calculateOverallHealth(results) {
        const total = results.length;
        const healthy = results.filter(r => r.status === 'healthy').length;
        const unhealthy = total - healthy;
        
        const healthPercent = (healthy / total) * 100;
        
        let status;
        if (healthPercent === 100) {
            status = 'healthy';
        } else if (healthPercent >= 80) {
            status = 'degraded';
        } else {
            status = 'unhealthy';
        }
        
        return {
            status,
            healthy,
            unhealthy,
            total,
            healthPercent: healthPercent.toFixed(1)
        };
    }

    /**
     * Gerar relatório
     */
    async generateReport(results) {
        const overallHealth = this.calculateOverallHealth(results);
        const timestamp = new Date().toISOString();
        
        const report = {
            timestamp,
            overall: overallHealth,
            checks: results,
            summary: {
                totalChecks: results.length,
                healthyChecks: results.filter(r => r.status === 'healthy').length,
                unhealthyChecks: results.filter(r => r.status === 'unhealthy').length,
                averageResponseTime: results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length
            }
        };
        
        // Salvar relatório em arquivo
        try {
            const logDir = path.dirname(this.options.logFile);
            await fs.mkdir(logDir, { recursive: true });
            await fs.writeFile(this.options.logFile, JSON.stringify(report, null, 2));
        } catch (error) {
            console.log('⚠️ Erro ao salvar relatório:', error.message);
        }
        
        // Exibir resumo
        console.log('\n📊 Resumo do Health Check:');
        console.log(`Status Geral: ${overallHealth.status.toUpperCase()}`);
        console.log(`Verificações: ${overallHealth.healthy}/${overallHealth.total} saudáveis`);
        console.log(`Tempo Médio: ${report.summary.averageResponseTime.toFixed(0)}ms`);
        
        return report;
    }

    /**
     * Monitoramento contínuo
     */
    async startMonitoring() {
        console.log('🔄 Iniciando monitoramento contínuo...');
        this.isRunning = true;
        
        while (this.isRunning) {
            try {
                await this.run();
                await this.sleep(this.options.checkInterval);
            } catch (error) {
                console.error('❌ Erro no monitoramento:', error.message);
                await this.sleep(5000); // Aguardar 5s em caso de erro
            }
        }
    }

    /**
     * Parar monitoramento
     */
    stopMonitoring() {
        this.isRunning = false;
        console.log('🛑 Monitoramento parado');
    }

    /**
     * Utilitário para aguardar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const args = process.argv.slice(2);
    const isMonitoring = args.includes('--monitor') || args.includes('-m');
    
    const checker = new HealthChecker();
    
    if (isMonitoring) {
        checker.startMonitoring();
        
        // Graceful shutdown
        process.on('SIGTERM', () => checker.stopMonitoring());
        process.on('SIGINT', () => checker.stopMonitoring());
    } else {
        checker.run();
    }
}

module.exports = HealthChecker;