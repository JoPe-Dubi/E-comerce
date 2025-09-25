// CompreAqui E-commerce - Testes do Sistema de Banco de Dados
// Testa todas as operações CRUD e relacionamentos entre tabelas

const database = require('./database');
const crud = require('./database-crud');
const migrations = require('./database-migrations');

class DatabaseTester {
    constructor() {
        this.testResults = [];
        this.totalTests = 0;
        this.passedTests = 0;
        this.failedTests = 0;
    }

    // ==================== FRAMEWORK DE TESTES ====================

    async runTest(testName, testFunction) {
        this.totalTests++;
        const startTime = Date.now();
        
        try {
            console.log(`🧪 Executando: ${testName}`);
            await testFunction();
            
            const duration = Date.now() - startTime;
            this.passedTests++;
            
            this.testResults.push({
                name: testName,
                status: 'PASSED',
                duration,
                error: null
            });
            
            console.log(`✅ ${testName} - PASSOU (${duration}ms)`);
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this.failedTests++;
            
            this.testResults.push({
                name: testName,
                status: 'FAILED',
                duration,
                error: error.message
            });
            
            console.error(`❌ ${testName} - FALHOU (${duration}ms):`, error.message);
        }
    }

    async assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    async assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
        }
    }

    async assertNotNull(value, message) {
        if (value === null || value === undefined) {
            throw new Error(`${message} - Value should not be null/undefined`);
        }
    }

    // ==================== TESTES DE USUÁRIOS ====================

    async testUserCRUD() {
        // Criar usuário
        const userData = {
            name: 'João Silva',
            email: 'joao.teste@email.com',
            password: 'senha123',
            role: 'customer'
        };

        const userId = await crud.UserCRUD.create(userData);
        await this.assertNotNull(userId, 'User ID should be returned');

        // Buscar usuário por email
        const user = await crud.UserCRUD.getByEmail(userData.email);
        await this.assertNotNull(user, 'User should be found by email');
        await this.assertEqual(user.name, userData.name, 'User name should match');
        await this.assertEqual(user.email, userData.email, 'User email should match');

        // Buscar usuário por ID
        const userById = await crud.UserCRUD.getById(userId);
        await this.assertNotNull(userById, 'User should be found by ID');
        await this.assertEqual(userById.id, userId, 'User ID should match');

        // Atualizar usuário
        const updateData = { name: 'João Silva Santos' };
        const updated = await crud.UserCRUD.update(userId, updateData);
        await this.assert(updated, 'User should be updated');

        const updatedUser = await crud.UserCRUD.getById(userId);
        await this.assertEqual(updatedUser.name, updateData.name, 'User name should be updated');

        // Verificar senha
        const isValidPassword = await crud.UserCRUD.verifyPassword(userData.email, userData.password);
        await this.assert(isValidPassword, 'Password should be valid');

        // Deletar usuário
        const deleted = await crud.UserCRUD.delete(userId);
        await this.assert(deleted, 'User should be deleted');

        const deletedUser = await crud.UserCRUD.getById(userId);
        await this.assertEqual(deletedUser, null, 'Deleted user should not be found');
    }

    async testUserProfileCRUD() {
        // Primeiro criar um usuário
        const userId = await crud.UserCRUD.create({
            name: 'Maria Silva',
            email: 'maria.profile@email.com',
            password: 'senha123',
            role: 'customer'
        });

        // Criar perfil
        const profileData = {
            user_id: userId,
            cpf: '12345678901',
            phone: '11999887766',
            birth_date: '1990-05-15',
            gender: 'F',
            cep: '01234567',
            address: 'Rua das Flores, 123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            newsletter_opt_in: 1
        };

        const profileId = await crud.UserProfileCRUD.create(profileData);
        await this.assertNotNull(profileId, 'Profile ID should be returned');

        // Buscar perfil
        const profile = await crud.UserProfileCRUD.getByUserId(userId);
        await this.assertNotNull(profile, 'Profile should be found');
        await this.assertEqual(profile.cpf, profileData.cpf, 'CPF should match');
        await this.assertEqual(profile.phone, profileData.phone, 'Phone should match');

        // Atualizar perfil
        const updateData = { phone: '11888776655' };
        const updated = await crud.UserProfileCRUD.update(userId, updateData);
        await this.assert(updated, 'Profile should be updated');

        const updatedProfile = await crud.UserProfileCRUD.getByUserId(userId);
        await this.assertEqual(updatedProfile.phone, updateData.phone, 'Phone should be updated');

        // Limpar dados
        await crud.UserProfileCRUD.delete(userId);
        await crud.UserCRUD.delete(userId);
    }

    // ==================== TESTES DE PRODUTOS ====================

    async testProductCRUD() {
        // Primeiro criar uma categoria
        const categoryId = await crud.CategoryCRUD.create({
            name: 'Eletrônicos Teste',
            description: 'Categoria para testes',
            slug: 'eletronicos-teste'
        });

        // Criar produto
        const productData = {
            name: 'Smartphone Teste',
            description: 'Smartphone para testes',
            price: 999.99,
            category_id: categoryId,
            sku: 'SMART-TEST-001',
            stock_quantity: 50,
            is_active: 1
        };

        const productId = await crud.ProductCRUD.create(productData);
        await this.assertNotNull(productId, 'Product ID should be returned');

        // Buscar produto
        const product = await crud.ProductCRUD.getById(productId);
        await this.assertNotNull(product, 'Product should be found');
        await this.assertEqual(product.name, productData.name, 'Product name should match');
        await this.assertEqual(product.price, productData.price, 'Product price should match');

        // Buscar produtos por categoria
        const categoryProducts = await crud.ProductCRUD.getByCategory(categoryId);
        await this.assert(categoryProducts.length > 0, 'Should find products in category');

        // Pesquisar produtos
        const searchResults = await crud.ProductCRUD.search('Smartphone');
        await this.assert(searchResults.length > 0, 'Should find products by search');

        // Atualizar produto
        const updateData = { price: 899.99, stock_quantity: 45 };
        const updated = await crud.ProductCRUD.update(productId, updateData);
        await this.assert(updated, 'Product should be updated');

        const updatedProduct = await crud.ProductCRUD.getById(productId);
        await this.assertEqual(updatedProduct.price, updateData.price, 'Product price should be updated');

        // Limpar dados
        await crud.ProductCRUD.delete(productId);
        await crud.CategoryCRUD.delete(categoryId);
    }

    async testProductImageCRUD() {
        // Criar categoria e produto primeiro
        const categoryId = await crud.CategoryCRUD.create({
            name: 'Categoria Imagem',
            slug: 'categoria-imagem'
        });

        const productId = await crud.ProductCRUD.create({
            name: 'Produto com Imagem',
            price: 100.00,
            category_id: categoryId,
            sku: 'PROD-IMG-001'
        });

        // Criar imagem
        const imageData = {
            product_id: productId,
            image_url: '/images/produto-teste.jpg',
            alt_text: 'Produto de teste',
            is_primary: 1,
            sort_order: 1
        };

        const imageId = await crud.ProductImageCRUD.create(imageData);
        await this.assertNotNull(imageId, 'Image ID should be returned');

        // Buscar imagens do produto
        const images = await crud.ProductImageCRUD.getByProductId(productId);
        await this.assert(images.length > 0, 'Should find product images');
        await this.assertEqual(images[0].image_url, imageData.image_url, 'Image URL should match');

        // Limpar dados
        await crud.ProductImageCRUD.delete(imageId);
        await crud.ProductCRUD.delete(productId);
        await crud.CategoryCRUD.delete(categoryId);
    }

    // ==================== TESTES DE CARRINHO ====================

    async testCartCRUD() {
        // Criar usuário, categoria e produto
        const userId = await crud.UserCRUD.create({
            name: 'Cliente Carrinho',
            email: 'cliente.carrinho@email.com',
            password: 'senha123'
        });

        const categoryId = await crud.CategoryCRUD.create({
            name: 'Categoria Carrinho',
            slug: 'categoria-carrinho'
        });

        const productId = await crud.ProductCRUD.create({
            name: 'Produto Carrinho',
            price: 50.00,
            category_id: categoryId,
            sku: 'PROD-CART-001',
            stock_quantity: 100
        });

        // Adicionar ao carrinho
        const cartItemId = await crud.CartCRUD.addItem(userId, productId, 2);
        await this.assertNotNull(cartItemId, 'Cart item ID should be returned');

        // Buscar itens do carrinho
        const cartItems = await crud.CartCRUD.getItems(userId);
        await this.assert(cartItems.length > 0, 'Should find cart items');
        await this.assertEqual(cartItems[0].quantity, 2, 'Quantity should match');

        // Atualizar quantidade
        const updated = await crud.CartCRUD.updateQuantity(userId, productId, 3);
        await this.assert(updated, 'Cart item should be updated');

        const updatedItems = await crud.CartCRUD.getItems(userId);
        await this.assertEqual(updatedItems[0].quantity, 3, 'Quantity should be updated');

        // Calcular total
        const total = await crud.CartCRUD.getTotal(userId);
        await this.assertEqual(total, 150.00, 'Cart total should be correct');

        // Remover item
        const removed = await crud.CartCRUD.removeItem(userId, productId);
        await this.assert(removed, 'Cart item should be removed');

        const emptyCart = await crud.CartCRUD.getItems(userId);
        await this.assertEqual(emptyCart.length, 0, 'Cart should be empty');

        // Limpar dados
        await crud.ProductCRUD.delete(productId);
        await crud.CategoryCRUD.delete(categoryId);
        await crud.UserCRUD.delete(userId);
    }

    // ==================== TESTES DE RELACIONAMENTOS ====================

    async testRelationships() {
        // Criar dados relacionados
        const userId = await crud.UserCRUD.create({
            name: 'Cliente Relacionamento',
            email: 'cliente.rel@email.com',
            password: 'senha123'
        });

        const categoryId = await crud.CategoryCRUD.create({
            name: 'Categoria Relacionamento',
            slug: 'categoria-rel'
        });

        const productId = await crud.ProductCRUD.create({
            name: 'Produto Relacionamento',
            price: 100.00,
            category_id: categoryId,
            sku: 'PROD-REL-001'
        });

        // Testar relacionamento produto-categoria
        const product = await crud.ProductCRUD.getById(productId);
        await this.assertEqual(product.category_id, categoryId, 'Product should be linked to category');

        // Testar relacionamento usuário-carrinho
        await crud.CartCRUD.addItem(userId, productId, 1);
        const cartItems = await crud.CartCRUD.getItems(userId);
        await this.assert(cartItems.length > 0, 'User should have cart items');
        await this.assertEqual(cartItems[0].user_id, userId, 'Cart item should be linked to user');
        await this.assertEqual(cartItems[0].product_id, productId, 'Cart item should be linked to product');

        // Testar relacionamento usuário-perfil
        await crud.UserProfileCRUD.create({
            user_id: userId,
            cpf: '98765432100',
            phone: '11555444333'
        });

        const profile = await crud.UserProfileCRUD.getByUserId(userId);
        await this.assertEqual(profile.user_id, userId, 'Profile should be linked to user');

        // Limpar dados
        await crud.UserProfileCRUD.delete(userId);
        await crud.CartCRUD.clearCart(userId);
        await crud.ProductCRUD.delete(productId);
        await crud.CategoryCRUD.delete(categoryId);
        await crud.UserCRUD.delete(userId);
    }

    // ==================== TESTES DE PERFORMANCE ====================

    async testPerformance() {
        const startTime = Date.now();
        
        // Criar múltiplos registros para testar performance
        const categoryId = await crud.CategoryCRUD.create({
            name: 'Categoria Performance',
            slug: 'categoria-performance'
        });

        const productIds = [];
        for (let i = 0; i < 100; i++) {
            const productId = await crud.ProductCRUD.create({
                name: `Produto Performance ${i}`,
                price: Math.random() * 1000,
                category_id: categoryId,
                sku: `PERF-${i.toString().padStart(3, '0')}`
            });
            productIds.push(productId);
        }

        // Testar busca por categoria
        const searchStart = Date.now();
        const products = await crud.ProductCRUD.getByCategory(categoryId);
        const searchTime = Date.now() - searchStart;

        await this.assertEqual(products.length, 100, 'Should find all products');
        await this.assert(searchTime < 1000, `Search should be fast (${searchTime}ms)`);

        // Testar busca com paginação
        const paginatedProducts = await crud.ProductCRUD.getAll(1, 20);
        await this.assert(paginatedProducts.length <= 20, 'Pagination should limit results');

        // Limpar dados
        for (const productId of productIds) {
            await crud.ProductCRUD.delete(productId);
        }
        await crud.CategoryCRUD.delete(categoryId);

        const totalTime = Date.now() - startTime;
        console.log(`⚡ Performance test completed in ${totalTime}ms`);
    }

    // ==================== TESTES DE MIGRAÇÃO ====================

    async testMigrations() {
        // Testar inicialização do sistema de migração
        await migrations.initializeMigrationTable();
        
        const currentVersion = await migrations.getCurrentVersion();
        await this.assertNotNull(currentVersion, 'Should have current version');

        const schemaInfo = await migrations.getSchemaInfo();
        await this.assert(schemaInfo.tables > 0, 'Should have tables');
        await this.assert(schemaInfo.version, 'Should have version info');

        // Testar validação do schema
        const isValid = await migrations.validateSchema();
        await this.assert(isValid, 'Schema should be valid');
    }

    // ==================== EXECUTOR PRINCIPAL ====================

    async runAllTests() {
        console.log('🚀 Iniciando testes do sistema de banco de dados...\n');
        
        try {
            // Inicializar banco de dados
            await database.initialize();
            
            // Executar testes
            await this.runTest('User CRUD Operations', () => this.testUserCRUD());
            await this.runTest('User Profile CRUD Operations', () => this.testUserProfileCRUD());
            await this.runTest('Product CRUD Operations', () => this.testProductCRUD());
            await this.runTest('Product Image CRUD Operations', () => this.testProductImageCRUD());
            await this.runTest('Cart CRUD Operations', () => this.testCartCRUD());
            await this.runTest('Database Relationships', () => this.testRelationships());
            await this.runTest('Performance Tests', () => this.testPerformance());
            await this.runTest('Migration System', () => this.testMigrations());
            
        } catch (error) {
            console.error('❌ Erro crítico durante os testes:', error.message);
        }
        
        // Relatório final
        this.printTestReport();
    }

    printTestReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO DE TESTES');
        console.log('='.repeat(60));
        console.log(`Total de testes: ${this.totalTests}`);
        console.log(`✅ Passou: ${this.passedTests}`);
        console.log(`❌ Falhou: ${this.failedTests}`);
        console.log(`📈 Taxa de sucesso: ${((this.passedTests / this.totalTests) * 100).toFixed(1)}%`);
        console.log('='.repeat(60));
        
        if (this.failedTests > 0) {
            console.log('\n❌ TESTES QUE FALHARAM:');
            this.testResults
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`- ${test.name}: ${test.error}`);
                });
        }
        
        console.log('\n⏱️  TEMPO DE EXECUÇÃO:');
        this.testResults.forEach(test => {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            console.log(`${status} ${test.name}: ${test.duration}ms`);
        });
        
        console.log('\n🎉 Testes concluídos!');
    }
}

// Executar testes se chamado diretamente
if (require.main === module) {
    const tester = new DatabaseTester();
    tester.runAllTests().catch(console.error);
}

module.exports = DatabaseTester;