const express = require('express');
const path = require('path');

class MonitoringDashboard {
    constructor(metricsCollector, alertManager) {
        this.metricsCollector = metricsCollector;
        this.alertManager = alertManager;
        this.router = express.Router();
        this.setupRoutes();
    }

    setupRoutes() {
        // Middleware de autenticação para dashboard
        this.router.use(this.authenticateAdmin.bind(this));

        // Página principal do dashboard
        this.router.get('/', this.renderDashboard.bind(this));

        // API endpoints para dados do dashboard
        this.router.get('/api/metrics', this.getMetrics.bind(this));
        this.router.get('/api/metrics/history', this.getMetricsHistory.bind(this));
        this.router.get('/api/alerts', this.getAlerts.bind(this));
        this.router.get('/api/alerts/stats', this.getAlertStats.bind(this));
        this.router.get('/api/health', this.getHealthStatus.bind(this));
        this.router.get('/api/system', this.getSystemInfo.bind(this));

        // Endpoints para gerenciar alertas
        this.router.post('/api/alerts/rules', this.createAlertRule.bind(this));
        this.router.put('/api/alerts/rules/:ruleId', this.updateAlertRule.bind(this));
        this.router.delete('/api/alerts/rules/:ruleId', this.deleteAlertRule.bind(this));

        // Servir arquivos estáticos do dashboard
        this.router.use('/static', express.static(path.join(__dirname, 'dashboard-static')));
    }

    // Middleware de autenticação para admin
    authenticateAdmin(req, res, next) {
        const adminToken = req.headers.authorization?.replace('Bearer ', '') || 
                          req.query.token || 
                          req.cookies.admin_token;

        // Em produção, implementar autenticação adequada
        if (process.env.NODE_ENV === 'production') {
            if (!adminToken || adminToken !== process.env.ADMIN_DASHBOARD_TOKEN) {
                return res.status(401).json({ error: 'Acesso não autorizado' });
            }
        }

        next();
    }

    // Renderizar página principal do dashboard
    renderDashboard(req, res) {
        const html = this.generateDashboardHTML();
        res.send(html);
    }

    // Obter métricas atuais
    async getMetrics(req, res) {
        try {
            const metrics = this.metricsCollector.getMetrics();
            res.json({
                success: true,
                data: metrics,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao obter métricas'
            });
        }
    }

    // Obter histórico de métricas
    async getMetricsHistory(req, res) {
        try {
            const { period = '1h', metric } = req.query;
            const history = this.metricsCollector.getMetricsHistory(period, metric);
            
            res.json({
                success: true,
                data: history,
                period: period
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao obter histórico de métricas'
            });
        }
    }

    // Obter alertas
    async getAlerts(req, res) {
        try {
            const { limit = 50 } = req.query;
            const alerts = this.alertManager.getAlertHistory(parseInt(limit));
            
            res.json({
                success: true,
                data: alerts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao obter alertas'
            });
        }
    }

    // Obter estatísticas de alertas
    async getAlertStats(req, res) {
        try {
            const stats = this.alertManager.getAlertStats();
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao obter estatísticas de alertas'
            });
        }
    }

    // Obter status de saúde do sistema
    async getHealthStatus(req, res) {
        try {
            const metrics = this.metricsCollector.getMetrics();
            const alerts = this.alertManager.getAlertStats();
            
            const health = {
                status: 'healthy',
                checks: {
                    api: {
                        status: metrics.requests.errorRate < 5 ? 'healthy' : 'unhealthy',
                        errorRate: metrics.requests.errorRate,
                        responseTime: metrics.requests.averageResponseTime
                    },
                    database: {
                        status: metrics.database.connections.active > 0 ? 'healthy' : 'unhealthy',
                        connections: metrics.database.connections.active,
                        queryErrors: metrics.database.queries.errors
                    },
                    memory: {
                        status: metrics.system.memory.percentage < 80 ? 'healthy' : 'unhealthy',
                        usage: metrics.system.memory.percentage
                    },
                    alerts: {
                        status: alerts.last24h < 10 ? 'healthy' : 'warning',
                        count24h: alerts.last24h,
                        critical: alerts.bySeverity.critical
                    }
                }
            };

            // Determinar status geral
            const unhealthyChecks = Object.values(health.checks).filter(check => 
                check.status === 'unhealthy'
            ).length;
            
            if (unhealthyChecks > 0) {
                health.status = 'unhealthy';
            } else if (Object.values(health.checks).some(check => check.status === 'warning')) {
                health.status = 'warning';
            }

            res.json({
                success: true,
                data: health
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao obter status de saúde'
            });
        }
    }

    // Obter informações do sistema
    async getSystemInfo(req, res) {
        try {
            const os = require('os');
            const process = require('process');
            
            const systemInfo = {
                server: {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    arch: os.arch(),
                    uptime: os.uptime(),
                    loadavg: os.loadavg()
                },
                node: {
                    version: process.version,
                    uptime: process.uptime(),
                    pid: process.pid,
                    memoryUsage: process.memoryUsage()
                },
                cpu: {
                    count: os.cpus().length,
                    model: os.cpus()[0]?.model || 'Unknown'
                },
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    used: os.totalmem() - os.freemem()
                }
            };

            res.json({
                success: true,
                data: systemInfo
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao obter informações do sistema'
            });
        }
    }

    // Criar regra de alerta
    async createAlertRule(req, res) {
        try {
            const { ruleId, rule } = req.body;
            
            if (!ruleId || !rule) {
                return res.status(400).json({
                    success: false,
                    error: 'ruleId e rule são obrigatórios'
                });
            }

            this.alertManager.addRule(ruleId, rule);
            
            res.json({
                success: true,
                message: 'Regra de alerta criada com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao criar regra de alerta'
            });
        }
    }

    // Atualizar regra de alerta
    async updateAlertRule(req, res) {
        try {
            const { ruleId } = req.params;
            const { rule } = req.body;
            
            if (!rule) {
                return res.status(400).json({
                    success: false,
                    error: 'rule é obrigatório'
                });
            }

            this.alertManager.addRule(ruleId, rule);
            
            res.json({
                success: true,
                message: 'Regra de alerta atualizada com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar regra de alerta'
            });
        }
    }

    // Deletar regra de alerta
    async deleteAlertRule(req, res) {
        try {
            const { ruleId } = req.params;
            this.alertManager.removeRule(ruleId);
            
            res.json({
                success: true,
                message: 'Regra de alerta removida com sucesso'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Erro ao remover regra de alerta'
            });
        }
    }

    // Gerar HTML do dashboard
    generateDashboardHTML() {
        return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Dashboard de Monitoramento - CompreAqui</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background-color: #f8f9fa;
                    color: #333;
                }

                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 1rem 2rem;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }

                .header h1 {
                    font-size: 1.8rem;
                    font-weight: 600;
                }

                .header p {
                    opacity: 0.9;
                    margin-top: 0.5rem;
                }

                .container {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .card {
                    background: white;
                    border-radius: 12px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    border: 1px solid #e9ecef;
                }

                .card h3 {
                    color: #495057;
                    margin-bottom: 1rem;
                    font-size: 1.1rem;
                    font-weight: 600;
                }

                .metric {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid #f1f3f4;
                }

                .metric:last-child {
                    border-bottom: none;
                }

                .metric-label {
                    color: #6c757d;
                    font-size: 0.9rem;
                }

                .metric-value {
                    font-weight: 600;
                    font-size: 1.1rem;
                }

                .status-indicator {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    margin-right: 0.5rem;
                }

                .status-healthy { background-color: #28a745; }
                .status-warning { background-color: #ffc107; }
                .status-unhealthy { background-color: #dc3545; }

                .chart-container {
                    position: relative;
                    height: 300px;
                    margin-top: 1rem;
                }

                .alert-item {
                    padding: 1rem;
                    border-left: 4px solid #ffc107;
                    background-color: #fff3cd;
                    margin-bottom: 0.5rem;
                    border-radius: 0 4px 4px 0;
                }

                .alert-item.critical {
                    border-left-color: #dc3545;
                    background-color: #f8d7da;
                }

                .alert-time {
                    font-size: 0.8rem;
                    color: #6c757d;
                    margin-bottom: 0.25rem;
                }

                .alert-message {
                    font-weight: 500;
                }

                .refresh-btn {
                    position: fixed;
                    bottom: 2rem;
                    right: 2rem;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 50px;
                    padding: 1rem 1.5rem;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                    font-weight: 600;
                    transition: all 0.3s ease;
                }

                .refresh-btn:hover {
                    background: #0056b3;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(0,123,255,0.4);
                }

                .loading {
                    opacity: 0.6;
                    pointer-events: none;
                }

                @media (max-width: 768px) {
                    .container {
                        padding: 1rem;
                    }
                    
                    .grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🚀 Dashboard de Monitoramento</h1>
                <p>CompreAqui - Sistema de Monitoramento em Tempo Real</p>
            </div>

            <div class="container">
                <div class="grid">
                    <!-- Status Geral -->
                    <div class="card">
                        <h3>🏥 Status do Sistema</h3>
                        <div id="health-status">
                            <div class="metric">
                                <span class="metric-label">Carregando...</span>
                                <span class="metric-value">⏳</span>
                            </div>
                        </div>
                    </div>

                    <!-- Métricas de Requisições -->
                    <div class="card">
                        <h3>📊 Requisições HTTP</h3>
                        <div id="request-metrics">
                            <div class="metric">
                                <span class="metric-label">Carregando...</span>
                                <span class="metric-value">⏳</span>
                            </div>
                        </div>
                    </div>

                    <!-- Métricas do Sistema -->
                    <div class="card">
                        <h3>💻 Sistema</h3>
                        <div id="system-metrics">
                            <div class="metric">
                                <span class="metric-label">Carregando...</span>
                                <span class="metric-value">⏳</span>
                            </div>
                        </div>
                    </div>

                    <!-- Métricas do Banco -->
                    <div class="card">
                        <h3>🗄️ Banco de Dados</h3>
                        <div id="database-metrics">
                            <div class="metric">
                                <span class="metric-label">Carregando...</span>
                                <span class="metric-value">⏳</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Gráficos -->
                <div class="grid">
                    <div class="card">
                        <h3>📈 Tempo de Resposta</h3>
                        <div class="chart-container">
                            <canvas id="responseTimeChart"></canvas>
                        </div>
                    </div>

                    <div class="card">
                        <h3>🔥 Taxa de Erro</h3>
                        <div class="chart-container">
                            <canvas id="errorRateChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Alertas Recentes -->
                <div class="card">
                    <h3>🚨 Alertas Recentes</h3>
                    <div id="recent-alerts">
                        <div class="metric">
                            <span class="metric-label">Carregando alertas...</span>
                            <span class="metric-value">⏳</span>
                        </div>
                    </div>
                </div>
            </div>

            <button class="refresh-btn" onclick="refreshDashboard()">
                🔄 Atualizar
            </button>

            <script>
                let responseTimeChart, errorRateChart;

                // Inicializar dashboard
                document.addEventListener('DOMContentLoaded', function() {
                    initCharts();
                    loadDashboardData();
                    
                    // Auto-refresh a cada 30 segundos
                    setInterval(loadDashboardData, 30000);
                });

                // Inicializar gráficos
                function initCharts() {
                    const ctx1 = document.getElementById('responseTimeChart').getContext('2d');
                    responseTimeChart = new Chart(ctx1, {
                        type: 'line',
                        data: {
                            labels: [],
                            datasets: [{
                                label: 'Tempo de Resposta (ms)',
                                data: [],
                                borderColor: '#007bff',
                                backgroundColor: 'rgba(0,123,255,0.1)',
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });

                    const ctx2 = document.getElementById('errorRateChart').getContext('2d');
                    errorRateChart = new Chart(ctx2, {
                        type: 'line',
                        data: {
                            labels: [],
                            datasets: [{
                                label: 'Taxa de Erro (%)',
                                data: [],
                                borderColor: '#dc3545',
                                backgroundColor: 'rgba(220,53,69,0.1)',
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    max: 100
                                }
                            }
                        }
                    });
                }

                // Carregar dados do dashboard
                async function loadDashboardData() {
                    try {
                        document.body.classList.add('loading');
                        
                        const [metrics, health, alerts] = await Promise.all([
                            fetch('/monitoring/api/metrics').then(r => r.json()),
                            fetch('/monitoring/api/health').then(r => r.json()),
                            fetch('/monitoring/api/alerts?limit=10').then(r => r.json())
                        ]);

                        updateHealthStatus(health.data);
                        updateMetrics(metrics.data);
                        updateAlerts(alerts.data);
                        updateCharts(metrics.data);
                        
                    } catch (error) {
                        console.error('Erro ao carregar dados:', error);
                    } finally {
                        document.body.classList.remove('loading');
                    }
                }

                // Atualizar status de saúde
                function updateHealthStatus(health) {
                    const container = document.getElementById('health-status');
                    const statusClass = 'status-' + health.status;
                    
                    container.innerHTML = \`
                        <div class="metric">
                            <span class="metric-label">
                                <span class="status-indicator \${statusClass}"></span>
                                Status Geral
                            </span>
                            <span class="metric-value">\${health.status.toUpperCase()}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">API</span>
                            <span class="metric-value">
                                <span class="status-indicator status-\${health.checks.api.status}"></span>
                                \${health.checks.api.status}
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Banco de Dados</span>
                            <span class="metric-value">
                                <span class="status-indicator status-\${health.checks.database.status}"></span>
                                \${health.checks.database.status}
                            </span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Memória</span>
                            <span class="metric-value">
                                <span class="status-indicator status-\${health.checks.memory.status}"></span>
                                \${health.checks.memory.usage.toFixed(1)}%
                            </span>
                        </div>
                    \`;
                }

                // Atualizar métricas
                function updateMetrics(metrics) {
                    // Métricas de requisições
                    document.getElementById('request-metrics').innerHTML = \`
                        <div class="metric">
                            <span class="metric-label">Total</span>
                            <span class="metric-value">\${metrics.requests.total.toLocaleString()}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Taxa de Erro</span>
                            <span class="metric-value">\${metrics.requests.errorRate.toFixed(2)}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Tempo Médio</span>
                            <span class="metric-value">\${metrics.requests.averageResponseTime.toFixed(0)}ms</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">RPS</span>
                            <span class="metric-value">\${metrics.requests.requestsPerSecond.toFixed(1)}</span>
                        </div>
                    \`;

                    // Métricas do sistema
                    document.getElementById('system-metrics').innerHTML = \`
                        <div class="metric">
                            <span class="metric-label">Uptime</span>
                            <span class="metric-value">\${formatUptime(metrics.system.uptime)}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Memória</span>
                            <span class="metric-value">\${metrics.system.memory.percentage.toFixed(1)}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">CPU</span>
                            <span class="metric-value">\${metrics.system.cpu.percentage.toFixed(1)}%</span>
                        </div>
                    \`;

                    // Métricas do banco
                    document.getElementById('database-metrics').innerHTML = \`
                        <div class="metric">
                            <span class="metric-label">Conexões Ativas</span>
                            <span class="metric-value">\${metrics.database.connections.active}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Total Queries</span>
                            <span class="metric-value">\${metrics.database.queries.total.toLocaleString()}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Erros</span>
                            <span class="metric-value">\${metrics.database.queries.errors}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Queries Lentas</span>
                            <span class="metric-value">\${metrics.database.queries.slow}</span>
                        </div>
                    \`;
                }

                // Atualizar alertas
                function updateAlerts(alerts) {
                    const container = document.getElementById('recent-alerts');
                    
                    if (alerts.length === 0) {
                        container.innerHTML = '<div class="metric"><span class="metric-label">Nenhum alerta recente</span><span class="metric-value">✅</span></div>';
                        return;
                    }

                    container.innerHTML = alerts.map(alert => \`
                        <div class="alert-item \${alert.severity}">
                            <div class="alert-time">\${new Date(alert.timestamp).toLocaleString('pt-BR')}</div>
                            <div class="alert-message">\${alert.name}: \${alert.message}</div>
                        </div>
                    \`).join('');
                }

                // Atualizar gráficos
                function updateCharts(metrics) {
                    const now = new Date().toLocaleTimeString();
                    
                    // Gráfico de tempo de resposta
                    responseTimeChart.data.labels.push(now);
                    responseTimeChart.data.datasets[0].data.push(metrics.requests.averageResponseTime);
                    
                    if (responseTimeChart.data.labels.length > 20) {
                        responseTimeChart.data.labels.shift();
                        responseTimeChart.data.datasets[0].data.shift();
                    }
                    
                    responseTimeChart.update('none');

                    // Gráfico de taxa de erro
                    errorRateChart.data.labels.push(now);
                    errorRateChart.data.datasets[0].data.push(metrics.requests.errorRate);
                    
                    if (errorRateChart.data.labels.length > 20) {
                        errorRateChart.data.labels.shift();
                        errorRateChart.data.datasets[0].data.shift();
                    }
                    
                    errorRateChart.update('none');
                }

                // Formatar uptime
                function formatUptime(seconds) {
                    const days = Math.floor(seconds / 86400);
                    const hours = Math.floor((seconds % 86400) / 3600);
                    const minutes = Math.floor((seconds % 3600) / 60);
                    
                    if (days > 0) return \`\${days}d \${hours}h\`;
                    if (hours > 0) return \`\${hours}h \${minutes}m\`;
                    return \`\${minutes}m\`;
                }

                // Atualizar dashboard manualmente
                function refreshDashboard() {
                    loadDashboardData();
                }
            </script>
        </body>
        </html>
        `;
    }

    // Obter router do Express
    getRouter() {
        return this.router;
    }
}

module.exports = MonitoringDashboard;