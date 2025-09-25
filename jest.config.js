module.exports = {
    // Ambiente de teste
    testEnvironment: 'node',
    
    // Padrões de arquivos de teste
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js',
        '**/__tests__/**/*.js'
    ],
    
    // Diretórios a serem ignorados
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/coverage/'
    ],
    
    // Configuração de cobertura
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: [
        'text',
        'lcov',
        'html',
        'json'
    ],
    
    // Arquivos para análise de cobertura
    collectCoverageFrom: [
        'server.js',
        'database.js',
        'js/**/*.js',
        '!js/main.js', // Excluir arquivo principal do frontend
        '!**/node_modules/**',
        '!**/dist/**',
        '!**/coverage/**'
    ],
    
    // Limites de cobertura
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    
    // Setup e teardown
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Timeout para testes
    testTimeout: 10000,
    
    // Configurações de mock
    clearMocks: true,
    restoreMocks: true,
    
    // Transformações
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // Módulos a serem ignorados na transformação
    transformIgnorePatterns: [
        '/node_modules/(?!(supertest)/)'
    ],
    
    // Configuração de módulos
    moduleFileExtensions: ['js', 'json'],
    
    // Variáveis de ambiente para testes
    setupFiles: ['<rootDir>/tests/env.js'],
    
    // Configuração de relatórios
    reporters: [
        'default',
        ['jest-html-reporters', {
            publicPath: './coverage',
            filename: 'test-report.html',
            expand: true
        }]
    ],
    
    // Configuração para testes em paralelo
    maxWorkers: '50%',
    
    // Configuração de cache
    cache: true,
    cacheDirectory: '<rootDir>/.jest-cache',
    
    // Configuração de verbose
    verbose: true,
    
    // Configuração de bail (parar nos primeiros erros)
    bail: false,
    
    // Configuração de watch
    watchPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/coverage/',
        '/.git/'
    ]
};