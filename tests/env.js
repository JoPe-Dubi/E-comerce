// Configuração de variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-do-not-use-in-production';
process.env.BCRYPT_ROUNDS = '1';
process.env.PORT = '0';
process.env.DB_PATH = ':memory:'; // Usar banco em memória para testes
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.RATE_LIMIT_WINDOW = '900000';
process.env.RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_AUTH_WINDOW = '900000';
process.env.RATE_LIMIT_AUTH_MAX = '5';