describe('Shopping E2E Tests', () => {
  beforeEach(() => {
    cy.cleanupTestData();
    cy.registerViaAPI();
    cy.loginViaAPI();
    cy.visit('/');
  });

  describe('Product Browsing', () => {
    it('should display products on homepage', () => {
      cy.get('[data-cy="products-grid"]').should('be.visible');
      cy.get('[data-cy="product-card"]').should('have.length.greaterThan', 0);
      
      // Verificar elementos do card de produto
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="product-image"]').should('be.visible');
        cy.get('[data-cy="product-name"]').should('be.visible');
        cy.get('[data-cy="product-price"]').should('be.visible');
        cy.get('[data-cy="add-to-cart-button"]').should('be.visible');
      });
    });

    it('should filter products by category', () => {
      cy.selectCategory('Eletrônicos');
      
      cy.get('[data-cy="category-title"]').should('contain', 'Eletrônicos');
      cy.get('[data-cy="product-card"]').should('have.length.greaterThan', 0);
      
      // Verificar se todos os produtos são da categoria selecionada
      cy.get('[data-cy="product-category"]').each(($el) => {
        cy.wrap($el).should('contain', 'Eletrônicos');
      });
    });

    it('should search for products', () => {
      const searchTerm = 'smartphone';
      
      cy.searchProduct(searchTerm);
      
      cy.get('[data-cy="search-results"]').should('be.visible');
      cy.get('[data-cy="search-term"]').should('contain', searchTerm);
      cy.get('[data-cy="product-card"]').should('have.length.greaterThan', 0);
      
      // Verificar se os resultados contêm o termo pesquisado
      cy.get('[data-cy="product-name"]').each(($el) => {
        cy.wrap($el).invoke('text').should('match', new RegExp(searchTerm, 'i'));
      });
    });

    it('should show no results message for invalid search', () => {
      cy.searchProduct('produtoinexistente123');
      
      cy.get('[data-cy="no-results"]').should('be.visible');
      cy.get('[data-cy="no-results"]').should('contain', 'Nenhum produto encontrado');
    });

    it('should apply price filters', () => {
      cy.filterProducts({
        priceRange: { min: '50', max: '200' }
      });
      
      cy.get('[data-cy="product-card"]').should('have.length.greaterThan', 0);
      
      // Verificar se todos os produtos estão na faixa de preço
      cy.get('[data-cy="product-price"]').each(($el) => {
        const price = parseFloat($el.text().replace('R$', '').replace(',', '.'));
        expect(price).to.be.at.least(50);
        expect(price).to.be.at.most(200);
      });
    });

    it('should sort products by price', () => {
      cy.get('[data-cy="sort-select"]').select('price-asc');
      
      cy.get('[data-cy="product-price"]').then(($prices) => {
        const prices = Array.from($prices).map(el => 
          parseFloat(el.textContent.replace('R$', '').replace(',', '.'))
        );
        
        // Verificar se está ordenado crescente
        for (let i = 1; i < prices.length; i++) {
          expect(prices[i]).to.be.at.least(prices[i - 1]);
        }
      });
    });
  });

  describe('Product Details', () => {
    it('should view product details', () => {
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="product-name"]').invoke('text').as('productName');
      });
      
      cy.get('@productName').then((productName) => {
        cy.viewProduct(productName);
        
        cy.get('[data-cy="product-title"]').should('contain', productName);
        cy.get('[data-cy="product-images"]').should('be.visible');
        cy.get('[data-cy="product-price"]').should('be.visible');
        cy.get('[data-cy="product-description"]').should('be.visible');
        cy.get('[data-cy="add-to-cart-button"]').should('be.visible');
        cy.get('[data-cy="quantity-selector"]').should('be.visible');
      });
    });

    it('should change product quantity', () => {
      cy.get('[data-cy="product-card"]').first().click();
      
      // Aumentar quantidade
      cy.get('[data-cy="quantity-increase"]').click();
      cy.get('[data-cy="quantity-input"]').should('have.value', '2');
      
      // Diminuir quantidade
      cy.get('[data-cy="quantity-decrease"]').click();
      cy.get('[data-cy="quantity-input"]').should('have.value', '1');
    });

    it('should show product reviews', () => {
      cy.get('[data-cy="product-card"]').first().click();
      
      cy.get('[data-cy="reviews-section"]').should('be.visible');
      cy.get('[data-cy="average-rating"]').should('be.visible');
      cy.get('[data-cy="reviews-list"]').should('be.visible');
    });
  });

  describe('Shopping Cart', () => {
    it('should add product to cart', () => {
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="product-name"]').invoke('text').as('productName');
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      // Verificar notificação
      cy.get('[data-cy="cart-notification"]').should('be.visible');
      cy.get('[data-cy="cart-notification"]').should('contain', 'adicionado ao carrinho');
      
      // Verificar contador do carrinho
      cy.get('[data-cy="cart-count"]').should('contain', '1');
    });

    it('should view cart contents', () => {
      // Adicionar produto ao carrinho
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      cy.goToCart();
      
      cy.get('[data-cy="cart-items"]').should('be.visible');
      cy.get('[data-cy="cart-item"]').should('have.length', 1);
      cy.get('[data-cy="cart-total"]').should('be.visible');
      cy.get('[data-cy="checkout-button"]').should('be.visible');
    });

    it('should update cart item quantity', () => {
      // Adicionar produto ao carrinho
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      cy.goToCart();
      
      // Aumentar quantidade
      cy.get('[data-cy="cart-item"]').first().within(() => {
        cy.get('[data-cy="quantity-increase"]').click();
        cy.get('[data-cy="quantity-input"]').should('have.value', '2');
      });
      
      // Verificar se o total foi atualizado
      cy.get('[data-cy="cart-total"]').should('not.contain', 'R$ 0,00');
    });

    it('should remove item from cart', () => {
      // Adicionar produto ao carrinho
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      cy.goToCart();
      
      // Remover item
      cy.get('[data-cy="cart-item"]').first().within(() => {
        cy.get('[data-cy="remove-item-button"]').click();
      });
      
      // Confirmar remoção
      cy.get('[data-cy="confirm-remove"]').click();
      
      // Verificar se o carrinho está vazio
      cy.get('[data-cy="empty-cart"]').should('be.visible');
      cy.get('[data-cy="cart-count"]').should('contain', '0');
    });

    it('should calculate cart total correctly', () => {
      // Adicionar múltiplos produtos
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="product-price"]').invoke('text').as('price1');
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      cy.get('[data-cy="product-card"]').eq(1).within(() => {
        cy.get('[data-cy="product-price"]').invoke('text').as('price2');
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      
      cy.goToCart();
      
      // Verificar total
      cy.get('@price1').then((price1) => {
        cy.get('@price2').then((price2) => {
          const total = parseFloat(price1.replace('R$', '').replace(',', '.')) +
                       parseFloat(price2.replace('R$', '').replace(',', '.'));
          
          cy.get('[data-cy="cart-total"]').should('contain', total.toFixed(2).replace('.', ','));
        });
      });
    });
  });

  describe('Checkout Process', () => {
    beforeEach(() => {
      // Adicionar produto ao carrinho
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="add-to-cart-button"]').click();
      });
      cy.goToCart();
    });

    it('should complete checkout process', () => {
      cy.checkout('credit_card');
      
      cy.get('[data-cy="order-confirmation"]').should('be.visible');
      cy.get('[data-cy="order-number"]').should('be.visible');
      cy.get('[data-cy="order-total"]').should('be.visible');
    });

    it('should validate required checkout fields', () => {
      cy.get('[data-cy="checkout-button"]').click();
      
      // Tentar finalizar sem preencher campos
      cy.get('[data-cy="place-order-button"]').click();
      
      // Verificar mensagens de erro
      cy.get('[data-cy="address-error"]').should('contain', 'Endereço é obrigatório');
      cy.get('[data-cy="city-error"]').should('contain', 'Cidade é obrigatória');
      cy.get('[data-cy="zipcode-error"]').should('contain', 'CEP é obrigatório');
    });

    it('should calculate shipping costs', () => {
      cy.get('[data-cy="checkout-button"]').click();
      
      // Preencher CEP
      cy.get('[data-cy="zipcode-input"]').type('01234-567');
      cy.get('[data-cy="calculate-shipping"]').click();
      
      // Verificar opções de frete
      cy.get('[data-cy="shipping-options"]').should('be.visible');
      cy.get('[data-cy="shipping-option"]').should('have.length.greaterThan', 0);
      
      // Selecionar opção de frete
      cy.get('[data-cy="shipping-option"]').first().click();
      
      // Verificar se o total foi atualizado
      cy.get('[data-cy="order-total"]').should('be.visible');
    });

    it('should apply discount coupon', () => {
      cy.get('[data-cy="checkout-button"]').click();
      
      // Aplicar cupom
      cy.get('[data-cy="coupon-input"]').type('DESCONTO10');
      cy.get('[data-cy="apply-coupon"]').click();
      
      // Verificar desconto aplicado
      cy.get('[data-cy="discount-applied"]').should('be.visible');
      cy.get('[data-cy="discount-amount"]').should('contain', 'R$');
    });
  });

  describe('Order History', () => {
    it('should view order history', () => {
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="orders-link"]').click();
      
      cy.url().should('include', '/orders');
      cy.get('[data-cy="orders-list"]').should('be.visible');
    });

    it('should view order details', () => {
      cy.visit('/orders');
      
      cy.get('[data-cy="order-item"]').first().within(() => {
        cy.get('[data-cy="view-order"]').click();
      });
      
      cy.get('[data-cy="order-details"]').should('be.visible');
      cy.get('[data-cy="order-status"]').should('be.visible');
      cy.get('[data-cy="order-items"]').should('be.visible');
    });
  });

  describe('Wishlist', () => {
    it('should add product to wishlist', () => {
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="wishlist-button"]').click();
      });
      
      cy.get('[data-cy="wishlist-notification"]').should('be.visible');
      cy.get('[data-cy="wishlist-count"]').should('contain', '1');
    });

    it('should view wishlist', () => {
      // Adicionar produto à wishlist
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="wishlist-button"]').click();
      });
      
      cy.get('[data-cy="wishlist-link"]').click();
      
      cy.url().should('include', '/wishlist');
      cy.get('[data-cy="wishlist-items"]').should('be.visible');
      cy.get('[data-cy="wishlist-item"]').should('have.length', 1);
    });

    it('should move item from wishlist to cart', () => {
      // Adicionar produto à wishlist
      cy.get('[data-cy="product-card"]').first().within(() => {
        cy.get('[data-cy="wishlist-button"]').click();
      });
      
      cy.visit('/wishlist');
      
      // Mover para carrinho
      cy.get('[data-cy="wishlist-item"]').first().within(() => {
        cy.get('[data-cy="move-to-cart"]').click();
      });
      
      // Verificar se foi adicionado ao carrinho
      cy.get('[data-cy="cart-count"]').should('contain', '1');
    });
  });

  describe('Performance', () => {
    it('should load products quickly', () => {
      cy.visit('/');
      
      // Verificar se os produtos carregam em menos de 3 segundos
      cy.get('[data-cy="products-grid"]', { timeout: 3000 }).should('be.visible');
      cy.checkPerformance();
    });

    it('should handle slow connections gracefully', () => {
      cy.simulateSlowConnection();
      cy.visit('/');
      
      // Verificar se o loading spinner aparece
      cy.get('[data-cy="loading-spinner"]').should('be.visible');
      
      // Aguardar carregamento
      cy.get('[data-cy="products-grid"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-cy="loading-spinner"]').should('not.exist');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.testResponsive(['mobile']);
      
      // Verificar elementos específicos do mobile
      cy.get('[data-cy="mobile-menu"]').should('be.visible');
      cy.get('[data-cy="products-grid"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.testResponsive(['tablet']);
      
      // Verificar layout do tablet
      cy.get('[data-cy="products-grid"]').should('be.visible');
      cy.get('[data-cy="sidebar-filters"]').should('be.visible');
    });
  });
});