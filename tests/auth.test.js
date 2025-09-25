const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { authenticateToken, validateRegistration, validateLogin } = require('../middleware/auth');

describe('Authentication Middleware Tests', () => {
    describe('authenticateToken', () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                headers: {},
                user: null
            };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        test('should authenticate valid token', () => {
            const payload = { id: 1, email: 'test@example.com' };
            const token = jwt.sign(payload, process.env.JWT_SECRET);
            
            req.headers.authorization = `Bearer ${token}`;

            authenticateToken(req, res, next);

            expect(req.user).toEqual(expect.objectContaining(payload));
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should reject request without token', () => {
            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token de acesso requerido' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject invalid token', () => {
            req.headers.authorization = 'Bearer invalid-token';

            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject expired token', () => {
            const payload = { id: 1, email: 'test@example.com' };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });
            
            req.headers.authorization = `Bearer ${token}`;

            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
            expect(next).not.toHaveBeenCalled();
        });

        test('should handle malformed authorization header', () => {
            req.headers.authorization = 'InvalidFormat';

            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ error: 'Token de acesso requerido' });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('validateRegistration', () => {
        let req, res, next;

        beforeEach(() => {
            req = { body: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        test('should validate correct registration data', () => {
            req.body = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                phone: '11999999999'
            };

            validateRegistration(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should reject empty name', () => {
            req.body = {
                name: '',
                email: 'john@example.com',
                password: 'password123',
                phone: '11999999999'
            };

            validateRegistration(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Nome é obrigatório')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject invalid email', () => {
            req.body = {
                name: 'John Doe',
                email: 'invalid-email',
                password: 'password123',
                phone: '11999999999'
            };

            validateRegistration(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Email deve ter um formato válido')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject short password', () => {
            req.body = {
                name: 'John Doe',
                email: 'john@example.com',
                password: '123',
                phone: '11999999999'
            };

            validateRegistration(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Senha deve ter pelo menos 6 caracteres')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject invalid phone', () => {
            req.body = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'password123',
                phone: 'invalid-phone'
            };

            validateRegistration(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Telefone deve ter formato válido')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should collect multiple validation errors', () => {
            req.body = {
                name: '',
                email: 'invalid-email',
                password: '123',
                phone: 'invalid-phone'
            };

            validateRegistration(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Nome é obrigatório'),
                    expect.stringContaining('Email deve ter um formato válido'),
                    expect.stringContaining('Senha deve ter pelo menos 6 caracteres'),
                    expect.stringContaining('Telefone deve ter formato válido')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('validateLogin', () => {
        let req, res, next;

        beforeEach(() => {
            req = { body: {} };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        test('should validate correct login data', () => {
            req.body = {
                email: 'john@example.com',
                password: 'password123'
            };

            validateLogin(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should reject missing email', () => {
            req.body = {
                password: 'password123'
            };

            validateLogin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Email é obrigatório')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject missing password', () => {
            req.body = {
                email: 'john@example.com'
            };

            validateLogin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Senha é obrigatória')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject invalid email format', () => {
            req.body = {
                email: 'invalid-email',
                password: 'password123'
            };

            validateLogin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: expect.arrayContaining([
                    expect.stringContaining('Email deve ter um formato válido')
                ])
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Password Hashing', () => {
        test('should hash password correctly', async () => {
            const password = 'testpassword123';
            const hashedPassword = await bcrypt.hash(password, 10);

            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword.length).toBeGreaterThan(50);
            expect(hashedPassword.startsWith('$2b$')).toBe(true);
        });

        test('should verify password correctly', async () => {
            const password = 'testpassword123';
            const hashedPassword = await bcrypt.hash(password, 10);

            const isValid = await bcrypt.compare(password, hashedPassword);
            expect(isValid).toBe(true);

            const isInvalid = await bcrypt.compare('wrongpassword', hashedPassword);
            expect(isInvalid).toBe(false);
        });
    });

    describe('JWT Token Generation', () => {
        test('should generate valid JWT token', () => {
            const payload = { id: 1, email: 'test@example.com' };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.id).toBe(payload.id);
            expect(decoded.email).toBe(payload.email);
        });

        test('should include expiration in token', () => {
            const payload = { id: 1, email: 'test@example.com' };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.exp).toBeDefined();
            expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });
    });
});