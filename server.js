// CompreAqui E-commerce - Servidor Backend

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const database = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'compreaqui-secret-key';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token de acesso requerido' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token inválido' });
        }
        req.user = user;
        next();
    });
};

// Rotas de autenticação
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validações
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nome, email e senha são obrigatórios'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Senha deve ter pelo menos 6 caracteres'
            });
        }

        // Verificar se usuário já existe
        const existingUser = await database.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email já está em uso'
            });
        }

        // Criar usuário
        const result = await database.createUser(name, email, password);
        const user = await database.get('SELECT id, name, email, role FROM users WHERE id = ?', [result.id]);

        // Gerar token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Usuário criado com sucesso',
            user,
            token
        });
    } catch (error) {
        console.error('Erro no registro:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validações
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email e senha são obrigatórios'
            });
        }

        // Buscar usuário
        const user = await database.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Verificar senha
        const isValidPassword = await database.verifyPassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Email ou senha incorretos'
            });
        }

        // Gerar token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remover senha do retorno
        const { password_hash, ...userWithoutPassword } = user;

        res.json({
            success: true,
            message: 'Login realizado com sucesso',
            user: userWithoutPassword,
            token
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rotas de produtos
app.get('/api/products', async (req, res) => {
    try {
        const { page = 1, limit = 50, category, search } = req.query;
        const offset = (page - 1) * limit;

        let products;
        
        if (search) {
            products = await database.searchProducts(search);
        } else if (category) {
            products = await database.getProductsByCategory(category);
        } else {
            products = await database.getProducts(parseInt(limit), offset);
        }

        res.json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: products.length
            }
        });
    } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await database.getProductById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rotas do carrinho
app.get('/api/cart', async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.ip;

        const cartItems = await database.getCartItems(userId, sessionId);

        res.json({
            success: true,
            data: cartItems
        });
    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

app.post('/api/cart', async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.ip;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'ID do produto é obrigatório'
            });
        }

        // Verificar se produto existe
        const product = await database.getProductById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Produto não encontrado'
            });
        }

        await database.addToCart(userId, sessionId, productId, quantity);

        res.json({
            success: true,
            message: 'Produto adicionado ao carrinho'
        });
    } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

app.delete('/api/cart/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user?.id || null;
        const sessionId = req.headers['x-session-id'] || req.ip;

        await database.removeFromCart(userId, sessionId, productId);

        res.json({
            success: true,
            message: 'Produto removido do carrinho'
        });
    } catch (error) {
        console.error('Erro ao remover do carrinho:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para servir o frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// Rota 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada'
    });
});

// Inicializar servidor
async function startServer() {
    try {
        // Conectar ao banco
        await database.connect();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`\n🚀 Servidor CompreAqui rodando em http://localhost:${PORT}`);
            console.log(`📊 Banco de dados SQLite inicializado`);
            console.log(`🔐 Credenciais de teste: admin@compreaqui.com / 123456\n`);
        });
    } catch (error) {
        console.error('Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}

// Tratamento de encerramento gracioso
process.on('SIGINT', async () => {
    console.log('\nEncerrando servidor...');
    await database.close();
    process.exit(0);
});

// Iniciar aplicação
startServer();