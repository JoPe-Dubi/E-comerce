const os = require('os');
const process = require('process');
const { performance } = require('perf_hooks');

class MetricsCollector {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                success: 0,
                errors: 0,
                byEndpoint: new Map(),
                byMethod: new Map(),
                responseTime: []
            },
            system: {
                memory: {
                    used: 0,
                    total: 0,
                    percentage: 0
                },
                cpu: {
                    usage: 0,
                    loadAverage: []
                },
                uptime: 0
            },
            database: {
                connections: {
                    total: 0,
                    active: 0,
                    idle: 0
                },
                queries: {
                    total: 0,
                    slow: 0,
                    errors: 0,
                    averageTime: 0
                }
            },
            business: {
                users: {
                    total: 0,
                    active: 0,
                    registered: 0
                },
                orders: {
                    total: 0,
                    completed: 0,
                    pending: 0,
                    revenue: 0
                },
                products: {
                    views: 0,
                    searches: 0,
                    cartAdditions: 0
                }
            }
        };
        
        this.startTime = Date.now();
        this.intervals = [];
        
        // Iniciar coleta automática de métricas do sistema
        this.startSystemMetricsCollection();
    }

    // Métricas de Requisições HTTP
    recordRequest(method, endpoint, statusCode, responseTime) {
        this.metrics.requests.total++;
        
        if (statusCode >= 200 && statusCode < 400) {
            this.metrics.requests.success++;
        } else {
            this.metrics.requests.errors++;
        }
        
        // Registrar por endpoint
        const endpointKey = `${method} ${endpoint}`;
        if (!this.metrics.requests.byEndpoint.has(endpointKey)) {
            this.metrics.requests.byEndpoint.set(endpointKey, {
                count: 0,
                totalTime: 0,
                errors: 0
            });
        }
        
        const endpointMetrics = this.metrics.requests.byEndpoint.get(endpointKey);
        endpointMetrics.count++;
        endpointMetrics.totalTime += responseTime;
        
        if (statusCode >= 400) {
            endpointMetrics.errors++;
        }
        
        // Registrar por método
        if (!this.metrics.requests.byMethod.has(method)) {
            this.metrics.requests.byMethod.set(method, 0);
        }
        this.metrics.requests.byMethod.set(method, 
            this.metrics.requests.byMethod.get(method) + 1
        );
        
        // Manter apenas os últimos 1000 tempos de resposta
        this.metrics.requests.responseTime.push(responseTime);
        if (this.metrics.requests.responseTime.length > 1000) {
            this.metrics.requests.responseTime.shift();
        }
    }

    // Métricas do Sistema
    collectSystemMetrics() {
        const memUsage = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        this.metrics.system.memory = {
            used: Math.round(usedMem / 1024 / 1024), // MB
            total: Math.round(totalMem / 1024 / 1024), // MB
            percentage: Math.round((usedMem / totalMem) * 100),
            heap: {
                used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                total: Math.round(memUsage.heapTotal / 1024 / 1024) // MB
            }
        };
        
        this.metrics.system.cpu.loadAverage = os.loadavg();
        this.metrics.system.uptime = Math.round((Date.now() - this.startTime) / 1000);
    }

    // Métricas do Banco de Dados
    recordDatabaseMetrics(poolStats) {
        this.metrics.database.connections = {
            total: poolStats.total || 0,
            active: poolStats.active || 0,
            idle: poolStats.idle || 0
        };
    }

    recordDatabaseQuery(queryTime, isError = false, isSlow = false) {
        this.metrics.database.queries.total++;
        
        if (isError) {
            this.metrics.database.queries.errors++;
        }
        
        if (isSlow) {
            this.metrics.database.queries.slow++;
        }
        
        // Calcular tempo médio das queries
        const currentAvg = this.metrics.database.queries.averageTime;
        const totalQueries = this.metrics.database.queries.total;
        this.metrics.database.queries.averageTime = 
            ((currentAvg * (totalQueries - 1)) + queryTime) / totalQueries;
    }

    // Métricas de Negócio
    recordUserMetrics(userStats) {
        this.metrics.business.users = {
            total: userStats.total || 0,
            active: userStats.active || 0,
            registered: userStats.registered || 0
        };
    }

    recordOrderMetrics(orderStats) {
        this.metrics.business.orders = {
            total: orderStats.total || 0,
            completed: orderStats.completed || 0,
            pending: orderStats.pending || 0,
            revenue: orderStats.revenue || 0
        };
    }

    recordProductMetrics(action, productId = null) {
        switch (action) {
            case 'view':
                this.metrics.business.products.views++;
                break;
            case 'search':
                this.metrics.business.products.searches++;
                break;
            case 'cart_add':
                this.metrics.business.products.cartAdditions++;
                break;
        }
    }

    // Cálculos de Métricas Derivadas
    getAverageResponseTime() {
        const times = this.metrics.requests.responseTime;
        if (times.length === 0) return 0;
        
        const sum = times.reduce((a, b) => a + b, 0);
        return Math.round(sum / times.length);
    }

    getPercentile(percentile) {
        const times = [...this.metrics.requests.responseTime].sort((a, b) => a - b);
        if (times.length === 0) return 0;
        
        const index = Math.ceil((percentile / 100) * times.length) - 1;
        return times[index] || 0;
    }

    getErrorRate() {
        if (this.metrics.requests.total === 0) return 0;
        return Math.round((this.metrics.requests.errors / this.metrics.requests.total) * 100);
    }

    getRequestsPerSecond() {
        const uptimeSeconds = this.metrics.system.uptime;
        if (uptimeSeconds === 0) return 0;
        return Math.round(this.metrics.requests.total / uptimeSeconds);
    }

    // Alertas
    checkAlerts() {
        const alerts = [];
        
        // Alert: Alta taxa de erro
        const errorRate = this.getErrorRate();
        if (errorRate > 5) {
            alerts.push({
                type: 'error_rate',
                severity: errorRate > 10 ? 'critical' : 'warning',
                message: `Taxa de erro alta: ${errorRate}%`,
                value: errorRate,
                threshold: 5
            });
        }
        
        // Alert: Tempo de resposta alto
        const avgResponseTime = this.getAverageResponseTime();
        if (avgResponseTime > 1000) {
            alerts.push({
                type: 'response_time',
                severity: avgResponseTime > 2000 ? 'critical' : 'warning',
                message: `Tempo de resposta alto: ${avgResponseTime}ms`,
                value: avgResponseTime,
                threshold: 1000
            });
        }
        
        // Alert: Uso de memória alto
        const memoryUsage = this.metrics.system.memory.percentage;
        if (memoryUsage > 80) {
            alerts.push({
                type: 'memory_usage',
                severity: memoryUsage > 90 ? 'critical' : 'warning',
                message: `Uso de memória alto: ${memoryUsage}%`,
                value: memoryUsage,
                threshold: 80
            });
        }
        
        // Alert: Queries lentas do banco
        const slowQueries = this.metrics.database.queries.slow;
        const totalQueries = this.metrics.database.queries.total;
        if (totalQueries > 0) {
            const slowQueryRate = (slowQueries / totalQueries) * 100;
            if (slowQueryRate > 10) {
                alerts.push({
                    type: 'slow_queries',
                    severity: slowQueryRate > 20 ? 'critical' : 'warning',
                    message: `Taxa de queries lentas: ${slowQueryRate.toFixed(1)}%`,
                    value: slowQueryRate,
                    threshold: 10
                });
            }
        }
        
        return alerts;
    }

    // Exportar métricas
    getMetrics() {
        this.collectSystemMetrics();
        
        return {
            timestamp: new Date().toISOString(),
            uptime: this.metrics.system.uptime,
            requests: {
                ...this.metrics.requests,
                byEndpoint: Object.fromEntries(this.metrics.requests.byEndpoint),
                byMethod: Object.fromEntries(this.metrics.requests.byMethod),
                averageResponseTime: this.getAverageResponseTime(),
                p95ResponseTime: this.getPercentile(95),
                p99ResponseTime: this.getPercentile(99),
                errorRate: this.getErrorRate(),
                requestsPerSecond: this.getRequestsPerSecond()
            },
            system: this.metrics.system,
            database: this.metrics.database,
            business: this.metrics.business,
            alerts: this.checkAlerts()
        };
    }

    // Resetar métricas
    reset() {
        this.metrics.requests.total = 0;
        this.metrics.requests.success = 0;
        this.metrics.requests.errors = 0;
        this.metrics.requests.byEndpoint.clear();
        this.metrics.requests.byMethod.clear();
        this.metrics.requests.responseTime = [];
        
        this.metrics.database.queries.total = 0;
        this.metrics.database.queries.slow = 0;
        this.metrics.database.queries.errors = 0;
        this.metrics.database.queries.averageTime = 0;
        
        this.startTime = Date.now();
    }

    // Iniciar coleta automática
    startSystemMetricsCollection() {
        // Coletar métricas do sistema a cada 30 segundos
        const systemInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);
        
        this.intervals.push(systemInterval);
    }

    // Parar coleta automática
    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
    }
}

// Singleton instance
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;