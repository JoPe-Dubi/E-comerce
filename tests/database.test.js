const database = require('../database');

describe('Database Connection Pool', () => {
    beforeAll(async () => {
        await database.connect();
    });

    afterAll(async () => {
        await database.close();
    });

    describe('Connection Pool Stats', () => {
        test('should return pool statistics', () => {
            const stats = database.getPoolStats();
            expect(stats).toHaveProperty('total');
            expect(stats).toHaveProperty('active');
            expect(stats).toHaveProperty('idle');
            expect(stats).toHaveProperty('created');
            expect(stats).toHaveProperty('acquired');
            expect(stats).toHaveProperty('released');
        });

        test('should have minimum connections initialized', () => {
            const stats = database.getPoolStats();
            expect(stats.total).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Basic Database Operations', () => {
        test('should execute SELECT query', async () => {
            const result = await database.get('SELECT 1 as test');
            expect(result).toEqual({ test: 1 });
        });

        test('should execute INSERT and return lastID', async () => {
            const result = await database.run(
                'INSERT INTO categories (name, description) VALUES (?, ?)',
                ['Test Category', 'Test Description']
            );
            expect(result).toHaveProperty('id');
            expect(result.id).toBeGreaterThan(0);
        });

        test('should execute SELECT ALL query', async () => {
            const results = await database.all('SELECT * FROM categories WHERE name = ?', ['Test Category']);
            expect(Array.isArray(results)).toBe(true);
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('Transaction Support', () => {
        test('should execute successful transaction', async () => {
            const result = await database.transaction(async (tx) => {
                const category = await tx.run(
                    'INSERT INTO categories (name, description) VALUES (?, ?)',
                    ['Transaction Test', 'Test transaction']
                );
                
                const product = await tx.run(
                    'INSERT INTO products (name, description, price, category_id) VALUES (?, ?, ?, ?)',
                    ['Test Product', 'Test Description', 99.99, category.id]
                );
                
                return { categoryId: category.id, productId: product.id };
            });

            expect(result).toHaveProperty('categoryId');
            expect(result).toHaveProperty('productId');
            
            // Verificar se os dados foram inseridos
            const category = await database.get('SELECT * FROM categories WHERE id = ?', [result.categoryId]);
            const product = await database.get('SELECT * FROM products WHERE id = ?', [result.productId]);
            
            expect(category.name).toBe('Transaction Test');
            expect(product.name).toBe('Test Product');
        });

        test('should rollback failed transaction', async () => {
            let errorThrown = false;
            
            try {
                await database.transaction(async (tx) => {
                    await tx.run(
                        'INSERT INTO categories (name, description) VALUES (?, ?)',
                        ['Rollback Test', 'Test rollback']
                    );
                    
                    // Forçar erro
                    throw new Error('Test error');
                });
            } catch (error) {
                errorThrown = true;
                expect(error.message).toBe('Test error');
            }
            
            expect(errorThrown).toBe(true);
            
            // Verificar se o rollback funcionou
            const category = await database.get('SELECT * FROM categories WHERE name = ?', ['Rollback Test']);
            expect(category).toBeUndefined();
        });
    });

    describe('User Operations', () => {
        const testUser = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'hashedpassword123',
            phone: '11999999999'
        };

        test('should insert user', async () => {
            const result = await database.run(
                'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
                [testUser.name, testUser.email, testUser.password, testUser.phone]
            );
            
            expect(result.id).toBeGreaterThan(0);
            testUser.id = result.id;
        });

        test('should retrieve user by email', async () => {
            const user = await database.get('SELECT * FROM users WHERE email = ?', [testUser.email]);
            
            expect(user).toBeDefined();
            expect(user.name).toBe(testUser.name);
            expect(user.email).toBe(testUser.email);
        });

        test('should update user', async () => {
            const newName = 'Updated Test User';
            const result = await database.run(
                'UPDATE users SET name = ? WHERE id = ?',
                [newName, testUser.id]
            );
            
            expect(result.changes).toBe(1);
            
            const updatedUser = await database.get('SELECT * FROM users WHERE id = ?', [testUser.id]);
            expect(updatedUser.name).toBe(newName);
        });
    });

    describe('Product Operations', () => {
        let categoryId;
        
        beforeAll(async () => {
            const category = await database.run(
                'INSERT INTO categories (name, description) VALUES (?, ?)',
                ['Electronics', 'Electronic products']
            );
            categoryId = category.id;
        });

        test('should insert product with category', async () => {
            const product = {
                name: 'Test Smartphone',
                description: 'A test smartphone',
                price: 999.99,
                category_id: categoryId,
                stock_quantity: 10,
                sku: 'TEST-PHONE-001'
            };

            const result = await database.run(
                'INSERT INTO products (name, description, price, category_id, stock_quantity, sku) VALUES (?, ?, ?, ?, ?, ?)',
                [product.name, product.description, product.price, product.category_id, product.stock_quantity, product.sku]
            );

            expect(result.id).toBeGreaterThan(0);
        });

        test('should retrieve products with category', async () => {
            const products = await database.all(`
                SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                WHERE p.name LIKE ?
            `, ['%Test%']);

            expect(products.length).toBeGreaterThan(0);
            expect(products[0]).toHaveProperty('category_name');
        });

        test('should search products by name', async () => {
            const products = await database.all(
                'SELECT * FROM products WHERE name LIKE ? OR description LIKE ?',
                ['%smartphone%', '%smartphone%']
            );

            expect(products.length).toBeGreaterThan(0);
        });
    });

    describe('Cart Operations', () => {
        let userId, productId;

        beforeAll(async () => {
            // Criar usuário de teste
            const user = await database.run(
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                ['Cart User', 'cart@example.com', 'hashedpass']
            );
            userId = user.id;

            // Criar produto de teste
            const product = await database.run(
                'INSERT INTO products (name, description, price, stock_quantity) VALUES (?, ?, ?, ?)',
                ['Cart Product', 'Product for cart test', 49.99, 5]
            );
            productId = product.id;
        });

        test('should add item to cart', async () => {
            const result = await database.run(
                'INSERT INTO cart_items (user_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [userId, productId, 2, 49.99]
            );

            expect(result.id).toBeGreaterThan(0);
        });

        test('should retrieve cart items', async () => {
            const cartItems = await database.all(`
                SELECT ci.*, p.name as product_name, p.description 
                FROM cart_items ci 
                JOIN products p ON ci.product_id = p.id 
                WHERE ci.user_id = ?
            `, [userId]);

            expect(cartItems.length).toBeGreaterThan(0);
            expect(cartItems[0]).toHaveProperty('product_name');
            expect(cartItems[0].quantity).toBe(2);
        });

        test('should update cart item quantity', async () => {
            const result = await database.run(
                'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
                [3, userId, productId]
            );

            expect(result.changes).toBe(1);

            const updatedItem = await database.get(
                'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
                [userId, productId]
            );
            expect(updatedItem.quantity).toBe(3);
        });
    });
});