const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class AlertManager {
    constructor() {
        this.alertHistory = [];
        this.alertRules = new Map();
        this.notificationChannels = new Map();
        this.suppressedAlerts = new Set();
        
        // Configurar canais de notificação padrão
        this.setupDefaultChannels();
        
        // Configurar regras de alerta padrão
        this.setupDefaultRules();
    }

    // Configurar canais de notificação
    setupDefaultChannels() {
        // Canal de Email
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            const emailTransporter = nodemailer.createTransporter({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            this.notificationChannels.set('email', {
                type: 'email',
                transporter: emailTransporter,
                recipients: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean),
                enabled: true
            });
        }

        // Canal de Webhook (Slack, Discord, etc.)
        if (process.env.WEBHOOK_URL) {
            this.notificationChannels.set('webhook', {
                type: 'webhook',
                url: process.env.WEBHOOK_URL,
                enabled: true
            });
        }

        // Canal de Log
        this.notificationChannels.set('log', {
            type: 'log',
            logFile: path.join(__dirname, '../logs/alerts.log'),
            enabled: true
        });
    }

    // Configurar regras de alerta padrão
    setupDefaultRules() {
        this.alertRules.set('error_rate', {
            name: 'Taxa de Erro Alta',
            condition: (metrics) => metrics.requests.errorRate > 5,
            severity: (metrics) => metrics.requests.errorRate > 10 ? 'critical' : 'warning',
            cooldown: 300000, // 5 minutos
            channels: ['email', 'webhook', 'log']
        });

        this.alertRules.set('response_time', {
            name: 'Tempo de Resposta Alto',
            condition: (metrics) => metrics.requests.averageResponseTime > 1000,
            severity: (metrics) => metrics.requests.averageResponseTime > 2000 ? 'critical' : 'warning',
            cooldown: 300000, // 5 minutos
            channels: ['email', 'webhook', 'log']
        });

        this.alertRules.set('memory_usage', {
            name: 'Uso de Memória Alto',
            condition: (metrics) => metrics.system.memory.percentage > 80,
            severity: (metrics) => metrics.system.memory.percentage > 90 ? 'critical' : 'warning',
            cooldown: 600000, // 10 minutos
            channels: ['email', 'webhook', 'log']
        });

        this.alertRules.set('database_errors', {
            name: 'Erros de Banco de Dados',
            condition: (metrics) => {
                const errorRate = metrics.database.queries.total > 0 ? 
                    (metrics.database.queries.errors / metrics.database.queries.total) * 100 : 0;
                return errorRate > 5;
            },
            severity: (metrics) => {
                const errorRate = (metrics.database.queries.errors / metrics.database.queries.total) * 100;
                return errorRate > 15 ? 'critical' : 'warning';
            },
            cooldown: 300000, // 5 minutos
            channels: ['email', 'webhook', 'log']
        });

        this.alertRules.set('slow_queries', {
            name: 'Queries Lentas',
            condition: (metrics) => {
                const slowRate = metrics.database.queries.total > 0 ? 
                    (metrics.database.queries.slow / metrics.database.queries.total) * 100 : 0;
                return slowRate > 10;
            },
            severity: (metrics) => {
                const slowRate = (metrics.database.queries.slow / metrics.database.queries.total) * 100;
                return slowRate > 20 ? 'critical' : 'warning';
            },
            cooldown: 600000, // 10 minutos
            channels: ['webhook', 'log']
        });

        this.alertRules.set('low_disk_space', {
            name: 'Espaço em Disco Baixo',
            condition: (metrics) => {
                // Implementar verificação de espaço em disco se necessário
                return false;
            },
            severity: () => 'warning',
            cooldown: 3600000, // 1 hora
            channels: ['email', 'log']
        });
    }

    // Verificar alertas baseado nas métricas
    async checkAlerts(metrics) {
        const triggeredAlerts = [];

        for (const [ruleId, rule] of this.alertRules) {
            try {
                if (rule.condition(metrics)) {
                    const alertKey = `${ruleId}_${Date.now()}`;
                    
                    // Verificar cooldown
                    if (this.isInCooldown(ruleId)) {
                        continue;
                    }

                    const alert = {
                        id: alertKey,
                        ruleId: ruleId,
                        name: rule.name,
                        severity: rule.severity(metrics),
                        timestamp: new Date().toISOString(),
                        metrics: this.extractRelevantMetrics(ruleId, metrics),
                        message: this.generateAlertMessage(ruleId, rule, metrics)
                    };

                    triggeredAlerts.push(alert);
                    this.alertHistory.push(alert);

                    // Enviar notificações
                    await this.sendNotifications(alert, rule.channels);

                    // Adicionar ao cooldown
                    this.addToCooldown(ruleId, rule.cooldown);
                }
            } catch (error) {
                console.error(`Erro ao verificar regra de alerta ${ruleId}:`, error);
            }
        }

        // Limpar histórico antigo (manter apenas últimos 1000 alertas)
        if (this.alertHistory.length > 1000) {
            this.alertHistory = this.alertHistory.slice(-1000);
        }

        return triggeredAlerts;
    }

    // Verificar se um alerta está em cooldown
    isInCooldown(ruleId) {
        const suppressKey = `cooldown_${ruleId}`;
        return this.suppressedAlerts.has(suppressKey);
    }

    // Adicionar alerta ao cooldown
    addToCooldown(ruleId, cooldownMs) {
        const suppressKey = `cooldown_${ruleId}`;
        this.suppressedAlerts.add(suppressKey);
        
        setTimeout(() => {
            this.suppressedAlerts.delete(suppressKey);
        }, cooldownMs);
    }

    // Extrair métricas relevantes para o alerta
    extractRelevantMetrics(ruleId, metrics) {
        switch (ruleId) {
            case 'error_rate':
                return {
                    errorRate: metrics.requests.errorRate,
                    totalRequests: metrics.requests.total,
                    errors: metrics.requests.errors
                };
            case 'response_time':
                return {
                    averageResponseTime: metrics.requests.averageResponseTime,
                    p95ResponseTime: metrics.requests.p95ResponseTime,
                    p99ResponseTime: metrics.requests.p99ResponseTime
                };
            case 'memory_usage':
                return {
                    memoryUsage: metrics.system.memory.percentage,
                    usedMemory: metrics.system.memory.used,
                    totalMemory: metrics.system.memory.total
                };
            case 'database_errors':
                return {
                    totalQueries: metrics.database.queries.total,
                    errors: metrics.database.queries.errors,
                    errorRate: (metrics.database.queries.errors / metrics.database.queries.total) * 100
                };
            case 'slow_queries':
                return {
                    totalQueries: metrics.database.queries.total,
                    slowQueries: metrics.database.queries.slow,
                    slowRate: (metrics.database.queries.slow / metrics.database.queries.total) * 100,
                    averageTime: metrics.database.queries.averageTime
                };
            default:
                return {};
        }
    }

    // Gerar mensagem do alerta
    generateAlertMessage(ruleId, rule, metrics) {
        const relevantMetrics = this.extractRelevantMetrics(ruleId, metrics);
        
        switch (ruleId) {
            case 'error_rate':
                return `Taxa de erro de ${relevantMetrics.errorRate}% detectada (${relevantMetrics.errors}/${relevantMetrics.totalRequests} requisições)`;
            case 'response_time':
                return `Tempo de resposta médio de ${relevantMetrics.averageResponseTime}ms (P95: ${relevantMetrics.p95ResponseTime}ms)`;
            case 'memory_usage':
                return `Uso de memória em ${relevantMetrics.memoryUsage}% (${relevantMetrics.usedMemory}MB/${relevantMetrics.totalMemory}MB)`;
            case 'database_errors':
                return `Taxa de erro do banco em ${relevantMetrics.errorRate.toFixed(1)}% (${relevantMetrics.errors}/${relevantMetrics.totalQueries} queries)`;
            case 'slow_queries':
                return `Taxa de queries lentas em ${relevantMetrics.slowRate.toFixed(1)}% (${relevantMetrics.slowQueries}/${relevantMetrics.totalQueries} queries)`;
            default:
                return `Alerta: ${rule.name}`;
        }
    }

    // Enviar notificações
    async sendNotifications(alert, channels) {
        for (const channelName of channels) {
            const channel = this.notificationChannels.get(channelName);
            if (!channel || !channel.enabled) continue;

            try {
                switch (channel.type) {
                    case 'email':
                        await this.sendEmailNotification(alert, channel);
                        break;
                    case 'webhook':
                        await this.sendWebhookNotification(alert, channel);
                        break;
                    case 'log':
                        await this.sendLogNotification(alert, channel);
                        break;
                }
            } catch (error) {
                console.error(`Erro ao enviar notificação via ${channelName}:`, error);
            }
        }
    }

    // Enviar notificação por email
    async sendEmailNotification(alert, channel) {
        if (!channel.recipients.length) return;

        const subject = `[${alert.severity.toUpperCase()}] ${alert.name} - CompreAqui`;
        const html = this.generateEmailHTML(alert);

        await channel.transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: channel.recipients.join(','),
            subject: subject,
            html: html
        });
    }

    // Enviar notificação via webhook
    async sendWebhookNotification(alert, channel) {
        const payload = {
            text: `🚨 **${alert.name}**`,
            attachments: [{
                color: alert.severity === 'critical' ? 'danger' : 'warning',
                fields: [
                    {
                        title: 'Severidade',
                        value: alert.severity.toUpperCase(),
                        short: true
                    },
                    {
                        title: 'Timestamp',
                        value: alert.timestamp,
                        short: true
                    },
                    {
                        title: 'Detalhes',
                        value: alert.message,
                        short: false
                    }
                ]
            }]
        };

        const fetch = require('node-fetch');
        await fetch(channel.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }

    // Enviar notificação para log
    async sendLogNotification(alert, channel) {
        const logEntry = `[${alert.timestamp}] [${alert.severity.toUpperCase()}] ${alert.name}: ${alert.message}\n`;
        
        try {
            await fs.appendFile(channel.logFile, logEntry);
        } catch (error) {
            // Se não conseguir escrever no arquivo, usar console
            console.error(`ALERT [${alert.severity.toUpperCase()}] ${alert.name}: ${alert.message}`);
        }
    }

    // Gerar HTML para email
    generateEmailHTML(alert) {
        const severityColor = alert.severity === 'critical' ? '#dc3545' : '#ffc107';
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Alerta - CompreAqui</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8f9fa;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="background-color: ${severityColor}; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">🚨 Alerta do Sistema</h1>
                    <p style="margin: 10px 0 0 0; font-size: 18px;">${alert.name}</p>
                </div>
                
                <div style="padding: 30px;">
                    <div style="margin-bottom: 20px;">
                        <strong>Severidade:</strong> 
                        <span style="background-color: ${severityColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                            ${alert.severity}
                        </span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong>Timestamp:</strong> ${alert.timestamp}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <strong>Detalhes:</strong><br>
                        ${alert.message}
                    </div>
                    
                    ${Object.keys(alert.metrics).length > 0 ? `
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-top: 20px;">
                        <strong>Métricas:</strong><br>
                        <pre style="margin: 10px 0 0 0; font-size: 12px;">${JSON.stringify(alert.metrics, null, 2)}</pre>
                    </div>
                    ` : ''}
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d;">
                    <p>Este é um alerta automático do sistema CompreAqui.</p>
                    <p>ID do Alerta: ${alert.id}</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    // Obter histórico de alertas
    getAlertHistory(limit = 100) {
        return this.alertHistory.slice(-limit).reverse();
    }

    // Obter estatísticas de alertas
    getAlertStats() {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        const last7d = now - (7 * 24 * 60 * 60 * 1000);

        const recent24h = this.alertHistory.filter(alert => 
            new Date(alert.timestamp).getTime() > last24h
        );
        
        const recent7d = this.alertHistory.filter(alert => 
            new Date(alert.timestamp).getTime() > last7d
        );

        return {
            total: this.alertHistory.length,
            last24h: recent24h.length,
            last7d: recent7d.length,
            bySeverity: {
                critical: this.alertHistory.filter(a => a.severity === 'critical').length,
                warning: this.alertHistory.filter(a => a.severity === 'warning').length
            },
            byRule: this.alertHistory.reduce((acc, alert) => {
                acc[alert.ruleId] = (acc[alert.ruleId] || 0) + 1;
                return acc;
            }, {})
        };
    }

    // Adicionar regra de alerta customizada
    addRule(ruleId, rule) {
        this.alertRules.set(ruleId, rule);
    }

    // Remover regra de alerta
    removeRule(ruleId) {
        this.alertRules.delete(ruleId);
    }

    // Configurar canal de notificação
    setNotificationChannel(channelName, config) {
        this.notificationChannels.set(channelName, config);
    }
}

module.exports = AlertManager;