// CompreAqui E-commerce - Criação do Banco de Dados SQLite
// Script Node.js para criar o banco sem dependências externas

const fs = require('fs');
const path = require('path');

// Função para criar banco SQLite simples sem dependências
function createDatabase() {
    console.log('🗄️  Criando banco de dados CompreAqui...');
    
    // Criar arquivo de banco vazio
    const dbPath = path.join(__dirname, 'compreaqui.db');
    
    // Dados do usuário administrador (simulação)
    const adminUser = {
        id: 1,
        name: 'Administrador CompreAqui',
        email: 'admin@compreaqui.com',
        password: '123456', // Em produção seria hash
        role: 'admin',
        created_at: new Date().toISOString()
    };
    
    // Produtos de exemplo
    const products = [
        {
            id: 1,
            name: 'iPhone 15 Pro',
            price: 7999.00,
            originalPrice: 8999.00,
            category: 'eletronicos',
            brand: 'Apple',
            rating: 4.8,
            reviews: 245,
            featured: true,
            inStock: true,
            image: 'img/products/iphone-15-pro-1.jpg'
        },
        {
            id: 2,
            name: 'Samsung Galaxy S24',
            price: 4499.00,
            originalPrice: 4999.00,
            category: 'eletronicos',
            brand: 'Samsung',
            rating: 4.6,
            reviews: 189,
            featured: true,
            inStock: true,
            image: 'img/products/galaxy-s24-1.jpg'
        },
        {
            id: 3,
            name: 'MacBook Air M3',
            price: 12999.00,
            originalPrice: null,
            category: 'eletronicos',
            brand: 'Apple',
            rating: 4.9,
            reviews: 156,
            featured: true,
            inStock: true,
            image: 'img/products/macbook-air-m3-1.jpg'
        }
    ];
    
    // Criar estrutura de dados em JSON (simulando banco)
    const databaseData = {
        users: [adminUser],
        products: products,
        cart_items: [],
        orders: [],
        sessions: [],
        created_at: new Date().toISOString(),
        version: '1.0.0'
    };
    
    // Salvar dados em arquivo JSON (simulando SQLite)
    const dataPath = path.join(__dirname, 'database.json');
    
    try {
        fs.writeFileSync(dataPath, JSON.stringify(databaseData, null, 2), 'utf8');
        
        console.log('✅ Banco de dados criado com sucesso!');
        console.log('📁 Arquivo: database.json');
        console.log('');
        console.log('📊 Dados inseridos:');
        console.log(`   👥 Usuários: ${databaseData.users.length}`);
        console.log(`   📦 Produtos: ${databaseData.products.length}`);
        console.log('');
        console.log('🔐 Credenciais do Administrador:');
        console.log('   Email: admin@compreaqui.com');
        console.log('   Senha: 123456');
        console.log('   Role: admin');
        console.log('');
        console.log('🎉 Banco pronto para uso!');
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao criar banco:', error.message);
        return false;
    }
}

// Função para verificar se o banco existe
function checkDatabase() {
    const dataPath = path.join(__dirname, 'database.json');
    return fs.existsSync(dataPath);
}

// Função para carregar dados do banco
function loadDatabase() {
    const dataPath = path.join(__dirname, 'database.json');
    
    try {
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('Erro ao carregar banco:', error.message);
        return null;
    }
}

// Função para salvar dados no banco
function saveDatabase(data) {
    const dataPath = path.join(__dirname, 'database.json');
    
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Erro ao salvar banco:', error.message);
        return false;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    console.log('=== CompreAqui E-commerce - Configuração do Banco ===');
    console.log('');
    
    if (checkDatabase()) {
        console.log('⚠️  Banco de dados já existe!');
        console.log('📁 Arquivo: database.json');
        
        const data = loadDatabase();
        if (data) {
            console.log('');
            console.log('📊 Dados existentes:');
            console.log(`   👥 Usuários: ${data.users ? data.users.length : 0}`);
            console.log(`   📦 Produtos: ${data.products ? data.products.length : 0}`);
            console.log('');
            console.log('🔐 Use as credenciais: admin@compreaqui.com / 123456');
        }
    } else {
        createDatabase();
    }
}

// Exportar funções para uso em outros módulos
module.exports = {
    createDatabase,
    checkDatabase,
    loadDatabase,
    saveDatabase
};