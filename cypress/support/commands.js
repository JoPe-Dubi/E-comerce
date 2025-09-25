// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Comando para login via UI
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-cy="email-input"]').type(email || Cypress.env('testUser').email);
  cy.get('[data-cy="password-input"]').type(password || Cypress.env('testUser').password);
  cy.get('[data-cy="login-button"]').click();
  
  // Aguardar redirecionamento após login
  cy.url().should('not.include', '/login');
  cy.get('[data-cy="user-menu"]').should('be.visible');
});

// Comando para registro via UI
Cypress.Commands.add('register', (userData) => {
  const user = userData || Cypress.env('testUser');
  
  cy.visit('/register');
  cy.get('[data-cy="name-input"]').type(user.name);
  cy.get('[data-cy="email-input"]').type(user.email);
  cy.get('[data-cy="password-input"]').type(user.password);
  cy.get('[data-cy="phone-input"]').type(user.phone);
  cy.get('[data-cy="register-button"]').click();
  
  // Aguardar redirecionamento após registro
  cy.url().should('not.include', '/register');
});

// Comando para logout
Cypress.Commands.add('logout', () => {
  cy.get('[data-cy="user-menu"]').click();
  cy.get('[data-cy="logout-button"]').click();
  
  // Verificar se foi redirecionado para página inicial
  cy.url().should('eq', Cypress.config().baseUrl + '/');
  cy.get('[data-cy="login-link"]').should('be.visible');
});

// Comando para buscar produtos
Cypress.Commands.add('searchProduct', (searchTerm) => {
  cy.get('[data-cy="search-input"]').clear().type(searchTerm);
  cy.get('[data-cy="search-button"]').click();
  
  // Aguardar resultados da busca
  cy.get('[data-cy="search-results"]').should('be.visible');
});

// Comando para adicionar produto ao carrinho via UI
Cypress.Commands.add('addProductToCart', (productName) => {
  cy.contains('[data-cy="product-card"]', productName).within(() => {
    cy.get('[data-cy="add-to-cart-button"]').click();
  });
  
  // Verificar se foi adicionado ao carrinho
  cy.get('[data-cy="cart-notification"]').should('be.visible');
  cy.get('[data-cy="cart-count"]').should('contain', '1');
});

// Comando para ir ao carrinho
Cypress.Commands.add('goToCart', () => {
  cy.get('[data-cy="cart-button"]').click();
  cy.url().should('include', '/cart');
  cy.get('[data-cy="cart-items"]').should('be.visible');
});

// Comando para finalizar compra
Cypress.Commands.add('checkout', (paymentMethod = 'credit_card') => {
  cy.get('[data-cy="checkout-button"]').click();
  cy.url().should('include', '/checkout');
  
  // Preencher informações de entrega
  cy.get('[data-cy="address-input"]').type('Rua Teste, 123');
  cy.get('[data-cy="city-input"]').type('São Paulo');
  cy.get('[data-cy="zipcode-input"]').type('01234-567');
  
  // Selecionar método de pagamento
  cy.get(`[data-cy="payment-${paymentMethod}"]`).click();
  
  // Finalizar pedido
  cy.get('[data-cy="place-order-button"]').click();
  
  // Verificar confirmação
  cy.get('[data-cy="order-confirmation"]').should('be.visible');
});

// Comando para navegar por categorias
Cypress.Commands.add('selectCategory', (categoryName) => {
  cy.get('[data-cy="categories-menu"]').click();
  cy.contains('[data-cy="category-item"]', categoryName).click();
  
  // Verificar se a categoria foi selecionada
  cy.get('[data-cy="category-title"]').should('contain', categoryName);
  cy.get('[data-cy="products-grid"]').should('be.visible');
});

// Comando para filtrar produtos
Cypress.Commands.add('filterProducts', (filters) => {
  if (filters.priceRange) {
    cy.get('[data-cy="price-min"]').clear().type(filters.priceRange.min);
    cy.get('[data-cy="price-max"]').clear().type(filters.priceRange.max);
  }
  
  if (filters.brand) {
    cy.get(`[data-cy="brand-${filters.brand}"]`).check();
  }
  
  if (filters.rating) {
    cy.get(`[data-cy="rating-${filters.rating}"]`).click();
  }
  
  cy.get('[data-cy="apply-filters"]').click();
  
  // Aguardar aplicação dos filtros
  cy.get('[data-cy="loading-spinner"]').should('not.exist');
});

// Comando para verificar produto específico
Cypress.Commands.add('viewProduct', (productName) => {
  cy.contains('[data-cy="product-card"]', productName).click();
  cy.url().should('include', '/product/');
  cy.get('[data-cy="product-title"]').should('contain', productName);
  cy.get('[data-cy="product-price"]').should('be.visible');
  cy.get('[data-cy="product-description"]').should('be.visible');
});

// Comando para avaliar produto
Cypress.Commands.add('rateProduct', (rating, comment) => {
  cy.get('[data-cy="rating-stars"]').within(() => {
    cy.get(`[data-rating="${rating}"]`).click();
  });
  
  if (comment) {
    cy.get('[data-cy="review-comment"]').type(comment);
  }
  
  cy.get('[data-cy="submit-review"]').click();
  cy.get('[data-cy="review-success"]').should('be.visible');
});

// Comando para gerenciar perfil
Cypress.Commands.add('updateProfile', (profileData) => {
  cy.get('[data-cy="user-menu"]').click();
  cy.get('[data-cy="profile-link"]').click();
  
  if (profileData.name) {
    cy.get('[data-cy="profile-name"]').clear().type(profileData.name);
  }
  
  if (profileData.phone) {
    cy.get('[data-cy="profile-phone"]').clear().type(profileData.phone);
  }
  
  if (profileData.address) {
    cy.get('[data-cy="profile-address"]').clear().type(profileData.address);
  }
  
  cy.get('[data-cy="save-profile"]').click();
  cy.get('[data-cy="profile-success"]').should('be.visible');
});

// Comando para verificar responsividade
Cypress.Commands.add('testResponsive', (breakpoints = ['mobile', 'tablet', 'desktop']) => {
  const viewports = {
    mobile: [375, 667],
    tablet: [768, 1024],
    desktop: [1280, 720]
  };
  
  breakpoints.forEach(breakpoint => {
    const [width, height] = viewports[breakpoint];
    cy.viewport(width, height);
    
    // Verificar elementos essenciais em cada breakpoint
    cy.get('[data-cy="header"]').should('be.visible');
    cy.get('[data-cy="main-content"]').should('be.visible');
    cy.get('[data-cy="footer"]').should('be.visible');
    
    // Aguardar um pouco para o layout se ajustar
    cy.wait(500);
  });
});

// Comando para verificar performance
Cypress.Commands.add('checkPerformance', () => {
  cy.window().then((win) => {
    const performance = win.performance;
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    
    // Verificar se a página carregou em menos de 3 segundos
    expect(loadTime).to.be.lessThan(3000);
    
    cy.task('log', `Tempo de carregamento: ${loadTime}ms`);
  });
});

// Comando para simular conexão lenta
Cypress.Commands.add('simulateSlowConnection', () => {
  cy.intercept('**/*', (req) => {
    req.reply((res) => {
      // Adicionar delay de 2 segundos
      return new Promise(resolve => {
        setTimeout(() => resolve(res), 2000);
      });
    });
  });
});