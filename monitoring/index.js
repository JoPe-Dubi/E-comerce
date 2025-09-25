const MetricsCollector = require('./metrics');
const AlertManager = require('./alerts');
const MonitoringDashboard = require('./dashboard');
const fs = require('fs').promises;
const path = require('path');

class MonitoringSystem {
    constructor() {
        this.metricsCollector = new MetricsCollector();
        this.alertManager = new AlertManager();
        this.dashboard = new MonitoringDashboard(this.metricsCollector, this.alertManager);
        
        this.isRunning = false;
        this.alertCheckInterval = null;
        this.metricsHistoryInterval = null;
        
        // Configurações
        this.config = {
            alertCheckIntervalMs: 60000, // 1 minuto
            metricsHistoryIntervalMs: 300000, // 5 minutos
            logDirectory: path.join(__dirname, '../logs'),
            enableDashboard: process.env.ENABLE_MONITORING_DASHBOARD !== 'false',
            enableAlerts: process.env.ENABLE_MONITORING_ALERTS !== 'false'
        };
    }

    // Inicializar sistema de monitoramento
    async initialize() {
        try {
            console.log('🚀 Inicializando sistema de monitoramento...');
            
            // Criar diretório de logs se não existir
            await this.ensureLogDirectory();
            
            // Inicializar coletores de métricas
            await this.metricsCollector.initialize();
            
            // Configurar middleware de métricas
            this.setupMetricsMiddleware();
            
            console.log('✅ Sistema de monitoramento inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de monitoramento:', error);
            return false;
        }
    }

    // Iniciar monitoramento
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Sistema de monitoramento já está em execução');
            return;
        }

        try {
            console.log('▶️ Iniciando sistema de monitoramento...');
            
            // Iniciar coleta de métricas do sistema
            this.metricsCollector.startSystemMetricsCollection();
            
            // Iniciar verificação de alertas
            if (this.config.enableAlerts) {
                this.startAlertChecking();
            }
            
            // Iniciar salvamento de histórico de métricas
            this.startMetricsHistory();
            
            this.isRunning = true;
            console.log('✅ Sistema de monitoramento iniciado');
            
            // Log inicial
            await this.logSystemStart();
            
        } catch (error) {
            console.error('❌ Erro ao iniciar sistema de monitoramento:', error);
            throw error;
        }
    }

    // Parar monitoramento
    async stop() {
        if (!this.isRunning) {
            console.log('⚠️ Sistema de monitoramento não está em execução');
            return;
        }

        try {
            console.log('⏹️ Parando sistema de monitoramento...');
            
            // Parar intervalos
            if (this.alertCheckInterval) {
                clearInterval(this.alertCheckInterval);
                this.alertCheckInterval = null;
            }
            
            if (this.metricsHistoryInterval) {
                clearInterval(this.metricsHistoryInterval);
                this.metricsHistoryInterval = null;
            }
            
            // Parar coleta de métricas do sistema
            this.metricsCollector.stopSystemMetricsCollection();
            
            this.isRunning = false;
            console.log('✅ Sistema de monitoramento parado');
            
            // Log final
            await this.logSystemStop();
            
        } catch (error) {
            console.error('❌ Erro ao parar sistema de monitoramento:', error);
        }
    }

    // Configurar middleware de métricas para Express
    setupMetricsMiddleware() {
        this.requestMiddleware = (req, res, next) => {
            const startTime = Date.now();
            
            // Interceptar o final da resposta
            const originalSend = res.send;
            res.send = function(data) {
                const responseTime = Date.now() - startTime;
                
                // Registrar métricas da requisição
                this.metricsCollector.recordRequest({
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    responseTime: responseTime,
                    userAgent: req.get('User-Agent'),
                    ip: req.ip
                });
                
                return originalSend.call(this, data);
            }.bind(this);
            
            next();
        };
    }

    // Iniciar verificação de alertas
    startAlertChecking() {
        this.alertCheckInterval = setInterval(async () => {
            try {
                const metrics = this.metricsCollector.getMetrics();
                const triggeredAlerts = await this.alertManager.checkAlerts(metrics);
                
                if (triggeredAlerts.length > 0) {
                    console.log(`🚨 ${triggeredAlerts.length} alerta(s) disparado(s)`);
                    
                    // Log dos alertas
                    for (const alert of triggeredAlerts) {
                        await this.logAlert(alert);
                    }
                }
            } catch (error) {
                console.error('Erro na verificação de alertas:', error);
            }
        }, this.config.alertCheckIntervalMs);
    }

    // Iniciar salvamento de histórico de métricas
    startMetricsHistory() {
        this.metricsHistoryInterval = setInterval(async () => {
            try {
                const metrics = this.metricsCollector.getMetrics();
                await this.saveMetricsHistory(metrics);
            } catch (error) {
                console.error('Erro ao salvar histórico de métricas:', error);
            }
        }, this.config.metricsHistoryIntervalMs);
    }

    // Salvar histórico de métricas
    async saveMetricsHistory(metrics) {
        try {
            const timestamp = new Date().toISOString();
            const historyEntry = {
                timestamp,
                metrics
            };
            
            const historyFile = path.join(this.config.logDirectory, 'metrics-history.jsonl');
            const logLine = JSON.stringify(historyEntry) + '\n';
            
            await fs.appendFile(historyFile, logLine);
            
            // Manter apenas os últimos 7 dias de histórico
            await this.cleanupMetricsHistory();
            
        } catch (error) {
            console.error('Erro ao salvar histórico de métricas:', error);
        }
    }

    // Limpar histórico antigo de métricas
    async cleanupMetricsHistory() {
        try {
            const historyFile = path.join(this.config.logDirectory, 'metrics-history.jsonl');
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            
            // Ler arquivo existente
            const content = await fs.readFile(historyFile, 'utf8').catch(() => '');
            const lines = content.split('\n').filter(Boolean);
            
            // Filtrar linhas recentes
            const recentLines = lines.filter(line => {
                try {
                    const entry = JSON.parse(line);
                    return new Date(entry.timestamp).getTime() > sevenDaysAgo;
                } catch {
                    return false;
                }
            });
            
            // Reescrever arquivo se necessário
            if (recentLines.length < lines.length) {
                await fs.writeFile(historyFile, recentLines.join('\n') + '\n');
            }
            
        } catch (error) {
            console.error('Erro ao limpar histórico de métricas:', error);
        }
    }

    // Garantir que o diretório de logs existe
    async ensureLogDirectory() {
        try {
            await fs.mkdir(this.config.logDirectory, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    // Log do início do sistema
    async logSystemStart() {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: 'system_start',
            message: 'Sistema de monitoramento iniciado',
            config: {
                alertsEnabled: this.config.enableAlerts,
                dashboardEnabled: this.config.enableDashboard,
                alertCheckInterval: this.config.alertCheckIntervalMs,
                metricsHistoryInterval: this.config.metricsHistoryIntervalMs
            }
        };
        
        await this.writeLog('system.log', logEntry);
    }

    // Log do fim do sistema
    async logSystemStop() {
        const metrics = this.metricsCollector.getMetrics();
        const alertStats = this.alertManager.getAlertStats();
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            event: 'system_stop',
            message: 'Sistema de monitoramento parado',
            finalStats: {
                totalRequests: metrics.requests.total,
                totalAlerts: alertStats.total,
                uptime: metrics.system.uptime
            }
        };
        
        await this.writeLog('system.log', logEntry);
    }

    // Log de alerta
    async logAlert(alert) {
        const logEntry = {
            timestamp: alert.timestamp,
            event: 'alert_triggered',
            alert: {
                id: alert.id,
                name: alert.name,
                severity: alert.severity,
                message: alert.message,
                metrics: alert.metrics
            }
        };
        
        await this.writeLog('alerts.log', logEntry);
    }

    // Escrever log
    async writeLog(filename, entry) {
        try {
            const logFile = path.join(this.config.logDirectory, filename);
            const logLine = JSON.stringify(entry) + '\n';
            await fs.appendFile(logFile, logLine);
        } catch (error) {
            console.error(`Erro ao escrever log ${filename}:`, error);
        }
    }

    // Obter middleware de métricas
    getMetricsMiddleware() {
        return this.requestMiddleware;
    }

    // Obter router do dashboard
    getDashboardRouter() {
        return this.dashboard.getRouter();
    }

    // Obter métricas atuais
    getMetrics() {
        return this.metricsCollector.getMetrics();
    }

    // Obter histórico de alertas
    getAlertHistory(limit = 50) {
        return this.alertManager.getAlertHistory(limit);
    }

    // Obter estatísticas de alertas
    getAlertStats() {
        return this.alertManager.getAlertStats();
    }

    // Adicionar regra de alerta customizada
    addAlertRule(ruleId, rule) {
        return this.alertManager.addRule(ruleId, rule);
    }

    // Remover regra de alerta
    removeAlertRule(ruleId) {
        return this.alertManager.removeRule(ruleId);
    }

    // Configurar canal de notificação
    setNotificationChannel(channelName, config) {
        return this.alertManager.setNotificationChannel(channelName, config);
    }

    // Obter status de saúde do sistema
    getHealthStatus() {
        const metrics = this.getMetrics();
        const alertStats = this.getAlertStats();
        
        return {
            status: this.isRunning ? 'running' : 'stopped',
            uptime: metrics.system.uptime,
            metrics: {
                requests: {
                    total: metrics.requests.total,
                    errorRate: metrics.requests.errorRate,
                    averageResponseTime: metrics.requests.averageResponseTime
                },
                system: {
                    memory: metrics.system.memory.percentage,
                    cpu: metrics.system.cpu.percentage
                },
                database: {
                    connections: metrics.database.connections.active,
                    queries: metrics.database.queries.total
                }
            },
            alerts: {
                total: alertStats.total,
                last24h: alertStats.last24h,
                critical: alertStats.bySeverity.critical
            }
        };
    }

    // Gerar relatório de monitoramento
    async generateReport(period = '24h') {
        try {
            const currentMetrics = this.getMetrics();
            const alertStats = this.getAlertStats();
            const healthStatus = this.getHealthStatus();
            
            const report = {
                generatedAt: new Date().toISOString(),
                period: period,
                summary: {
                    status: healthStatus.status,
                    uptime: currentMetrics.system.uptime,
                    totalRequests: currentMetrics.requests.total,
                    averageResponseTime: currentMetrics.requests.averageResponseTime,
                    errorRate: currentMetrics.requests.errorRate,
                    totalAlerts: alertStats.total,
                    criticalAlerts: alertStats.bySeverity.critical
                },
                metrics: currentMetrics,
                alerts: {
                    stats: alertStats,
                    recent: this.getAlertHistory(20)
                },
                recommendations: this.generateRecommendations(currentMetrics, alertStats)
            };
            
            return report;
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            throw error;
        }
    }

    // Gerar recomendações baseadas nas métricas
    generateRecommendations(metrics, alertStats) {
        const recommendations = [];
        
        // Recomendações baseadas em performance
        if (metrics.requests.averageResponseTime > 1000) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Tempo de resposta médio alto. Considere otimizar queries ou adicionar cache.',
                metric: 'response_time',
                value: metrics.requests.averageResponseTime
            });
        }
        
        if (metrics.requests.errorRate > 5) {
            recommendations.push({
                type: 'reliability',
                priority: 'critical',
                message: 'Taxa de erro alta. Investigue logs de erro e implemente correções.',
                metric: 'error_rate',
                value: metrics.requests.errorRate
            });
        }
        
        // Recomendações baseadas em recursos
        if (metrics.system.memory.percentage > 80) {
            recommendations.push({
                type: 'resources',
                priority: 'high',
                message: 'Uso de memória alto. Considere otimizar aplicação ou aumentar recursos.',
                metric: 'memory_usage',
                value: metrics.system.memory.percentage
            });
        }
        
        // Recomendações baseadas em alertas
        if (alertStats.last24h > 10) {
            recommendations.push({
                type: 'monitoring',
                priority: 'medium',
                message: 'Muitos alertas nas últimas 24h. Revise configurações de alertas.',
                metric: 'alert_frequency',
                value: alertStats.last24h
            });
        }
        
        return recommendations;
    }
}

// Instância singleton
let monitoringInstance = null;

// Factory function
function createMonitoringSystem() {
    if (!monitoringInstance) {
        monitoringInstance = new MonitoringSystem();
    }
    return monitoringInstance;
}

module.exports = {
    MonitoringSystem,
    createMonitoringSystem,
    MetricsCollector,
    AlertManager,
    MonitoringDashboard
};