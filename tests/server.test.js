const request = require('supertest');
const path = require('path');

// Mock do database antes de importar o server
jest.mock('../database', () => ({
    connect: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    get: jest.fn(),
    run: jest.fn(),
    all: jest.fn(),
    getPoolStats: jest.fn().mockReturnValue({
        total: 2,
        active: 0,
        idle: 2,
        created: 2,
        acquired: 0,
        released: 0
    })
}));

const database = require('../database');

describe('Server API Tests', () => {
    let app;
    let server;

    beforeAll(async () => {
        // Importar o app após configurar os mocks
        app = require('../server');
        
        // Aguardar um pouco para o servidor inicializar
        await new Promise(resolve => setTimeout(resolve, 1000));
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
        await database.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Health Check', () => {
        test('GET /api/health should return server status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'OK');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('uptime');
        });
    });

    describe('Authentication Endpoints', () => {
        describe('POST /api/auth/register', () => {
            test('should register new user with valid data', async () => {
                const userData = {
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                    phone: '11999999999'
                };

                // Mock database responses
                database.get.mockResolvedValueOnce(null); // User doesn't exist
                database.run.mockResolvedValueOnce({ id: 1 }); // User created

                const response = await request(app)
                    .post('/api/auth/register')
                    .send(userData)
                    .expect(201);

                expect(response.body).toHaveProperty('message', 'Usuário registrado com sucesso');
                expect(response.body).toHaveProperty('token');
                expect(response.body).toHaveProperty('user');
                expect(response.body.user).not.toHaveProperty('password');
            });

            test('should reject registration with existing email', async () => {
                const userData = {
                    name: 'Test User',
                    email: 'existing@example.com',
                    password: 'password123',
                    phone: '11999999999'
                };

                // Mock database response - user exists
                database.get.mockResolvedValueOnce({ id: 1, email: 'existing@example.com' });

                const response = await request(app)
                    .post('/api/auth/register')
                    .send(userData)
                    .expect(400);

                expect(response.body).toHaveProperty('error', 'Email já está em uso');
            });

            test('should reject registration with invalid data', async () => {
                const invalidData = {
                    name: '',
                    email: 'invalid-email',
                    password: '123',
                    phone: 'invalid-phone'
                };

                const response = await request(app)
                    .post('/api/auth/register')
                    .send(invalidData)
                    .expect(400);

                expect(response.body).toHaveProperty('errors');
                expect(Array.isArray(response.body.errors)).toBe(true);
            });
        });

        describe('POST /api/auth/login', () => {
            test('should login with valid credentials', async () => {
                const loginData = {
                    email: 'test@example.com',
                    password: 'password123'
                };

                // Mock database response - user exists with hashed password
                database.get.mockResolvedValueOnce({
                    id: 1,
                    name: 'Test User',
                    email: 'test@example.com',
                    password: '$2b$10$hashedpassword' // Mock hashed password
                });

                // Mock bcrypt compare
                const bcrypt = require('bcrypt');
                jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);

                const response = await request(app)
                    .post('/api/auth/login')
                    .send(loginData)
                    .expect(200);

                expect(response.body).toHaveProperty('message', 'Login realizado com sucesso');
                expect(response.body).toHaveProperty('token');
                expect(response.body).toHaveProperty('user');
                expect(response.body.user).not.toHaveProperty('password');
            });

            test('should reject login with invalid credentials', async () => {
                const loginData = {
                    email: 'test@example.com',
                    password: 'wrongpassword'
                };

                // Mock database response - user exists
                database.get.mockResolvedValueOnce({
                    id: 1,
                    email: 'test@example.com',
                    password: '$2b$10$hashedpassword'
                });

                // Mock bcrypt compare - password doesn't match
                const bcrypt = require('bcrypt');
                jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);

                const response = await request(app)
                    .post('/api/auth/login')
                    .send(loginData)
                    .expect(401);

                expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
            });

            test('should reject login with non-existent user', async () => {
                const loginData = {
                    email: 'nonexistent@example.com',
                    password: 'password123'
                };

                // Mock database response - user doesn't exist
                database.get.mockResolvedValueOnce(null);

                const response = await request(app)
                    .post('/api/auth/login')
                    .send(loginData)
                    .expect(401);

                expect(response.body).toHaveProperty('error', 'Credenciais inválidas');
            });
        });
    });

    describe('Products Endpoints', () => {
        describe('GET /api/products', () => {
            test('should return products list', async () => {
                const mockProducts = [
                    {
                        id: 1,
                        name: 'Test Product 1',
                        description: 'Description 1',
                        price: 99.99,
                        category_name: 'Electronics'
                    },
                    {
                        id: 2,
                        name: 'Test Product 2',
                        description: 'Description 2',
                        price: 149.99,
                        category_name: 'Electronics'
                    }
                ];

                database.all.mockResolvedValueOnce(mockProducts);

                const response = await request(app)
                    .get('/api/products')
                    .expect(200);

                expect(Array.isArray(response.body)).toBe(true);
                expect(response.body).toHaveLength(2);
                expect(response.body[0]).toHaveProperty('name', 'Test Product 1');
            });

            test('should return filtered products by category', async () => {
                const mockProducts = [
                    {
                        id: 1,
                        name: 'Smartphone',
                        category_name: 'Electronics'
                    }
                ];

                database.all.mockResolvedValueOnce(mockProducts);

                const response = await request(app)
                    .get('/api/products?category=1')
                    .expect(200);

                expect(Array.isArray(response.body)).toBe(true);
            });
        });

        describe('GET /api/products/:id', () => {
            test('should return specific product', async () => {
                const mockProduct = {
                    id: 1,
                    name: 'Test Product',
                    description: 'Test Description',
                    price: 99.99,
                    category_name: 'Electronics'
                };

                database.get.mockResolvedValueOnce(mockProduct);

                const response = await request(app)
                    .get('/api/products/1')
                    .expect(200);

                expect(response.body).toHaveProperty('name', 'Test Product');
                expect(response.body).toHaveProperty('price', 99.99);
            });

            test('should return 404 for non-existent product', async () => {
                database.get.mockResolvedValueOnce(null);

                const response = await request(app)
                    .get('/api/products/999')
                    .expect(404);

                expect(response.body).toHaveProperty('error', 'Produto não encontrado');
            });
        });
    });

    describe('Categories Endpoints', () => {
        test('GET /api/categories should return categories list', async () => {
            const mockCategories = [
                { id: 1, name: 'Electronics', description: 'Electronic products' },
                { id: 2, name: 'Clothing', description: 'Clothing items' }
            ];

            database.all.mockResolvedValueOnce(mockCategories);

            const response = await request(app)
                .get('/api/categories')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('name', 'Electronics');
        });
    });

    describe('Rate Limiting', () => {
        test('should apply rate limiting to auth endpoints', async () => {
            // Fazer múltiplas requisições rapidamente
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/auth/login')
                        .send({ email: 'test@example.com', password: 'password' })
                );
            }

            const responses = await Promise.all(promises);
            
            // Pelo menos uma requisição deve ser limitada
            const rateLimitedResponses = responses.filter(res => res.status === 429);
            expect(rateLimitedResponses.length).toBeGreaterThan(0);
        });
    });

    describe('Security Headers', () => {
        test('should include security headers', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            // Verificar headers de segurança do Helmet
            expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
            expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
            expect(response.headers).toHaveProperty('x-xss-protection', '0');
        });
    });

    describe('Error Handling', () => {
        test('should handle database errors gracefully', async () => {
            database.all.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/products')
                .expect(500);

            expect(response.body).toHaveProperty('error');
        });

        test('should return 404 for non-existent endpoints', async () => {
            const response = await request(app)
                .get('/api/nonexistent')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Endpoint não encontrado');
        });
    });
});