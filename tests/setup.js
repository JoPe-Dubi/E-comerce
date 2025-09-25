// Setup global para testes Jest
const path = require('path');

// Configurar timeout global para testes
jest.setTimeout(30000);

// Mock do console para testes mais limpos
global.console = {
    ...console,
    // Manter apenas logs importantes durante os testes
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: console.error,
};

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.BCRYPT_ROUNDS = '1'; // Usar menos rounds para testes mais rápidos
process.env.PORT = '0'; // Usar porta aleatória para testes

// Mock de funções globais comuns
global.fetch = jest.fn();

// Configurar mocks para APIs externas
beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    jest.clearAllMocks();
    
    // Reset do fetch mock
    if (global.fetch) {
        global.fetch.mockClear();
    }
});

// Configurar cleanup após todos os testes
afterAll(async () => {
    // Aguardar um pouco para garantir que todas as operações assíncronas terminem
    await new Promise(resolve => setTimeout(resolve, 100));
});

// Helper functions para testes
global.testHelpers = {
    // Criar usuário de teste
    createTestUser: () => ({
        name: 'Test User',
        email: 'test@example.com',
        password: 'testpassword123',
        phone: '11999999999'
    }),
    
    // Criar produto de teste
    createTestProduct: () => ({
        name: 'Produto Teste',
        description: 'Descrição do produto teste',
        price: 99.99,
        category_id: 1,
        stock_quantity: 10,
        sku: 'TEST-001'
    }),
    
    // Aguardar um tempo específico
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Gerar email único para testes
    generateUniqueEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`
};