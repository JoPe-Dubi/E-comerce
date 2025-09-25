// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configurações globais
Cypress.on('uncaught:exception', (err, runnable) => {
  // Retornar false aqui previne que o Cypress falhe o teste
  // em exceções não capturadas
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  return true;
});

// Configurar interceptadores globais
beforeEach(() => {
  // Interceptar chamadas de API para melhor controle nos testes
  cy.intercept('GET', '/api/health', { fixture: 'health.json' }).as('healthCheck');
  
  // Configurar viewport padrão
  cy.viewport(1280, 720);
  
  // Limpar localStorage e sessionStorage antes de cada teste
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Configurar timeout padrão para elementos
  Cypress.config('defaultCommandTimeout', 10000);
});

// Comandos personalizados para autenticação
Cypress.Commands.add('loginViaAPI', (email, password) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      email: email || Cypress.env('testUser').email,
      password: password || Cypress.env('testUser').password
    }
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('token');
    
    // Armazenar token no localStorage
    window.localStorage.setItem('authToken', response.body.token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

Cypress.Commands.add('registerViaAPI', (userData) => {
  const user = userData || Cypress.env('testUser');
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: user,
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 201) {
      // Usuário criado com sucesso
      window.localStorage.setItem('authToken', response.body.token);
      window.localStorage.setItem('user', JSON.stringify(response.body.user));
    }
    return response;
  });
});

// Comandos para manipulação de produtos
Cypress.Commands.add('addToCart', (productId, quantity = 1) => {
  const token = window.localStorage.getItem('authToken');
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/cart/add`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: {
      product_id: productId,
      quantity: quantity
    }
  });
});

// Comandos para navegação
Cypress.Commands.add('visitWithAuth', (url) => {
  cy.visit(url);
  
  // Aguardar a página carregar completamente
  cy.get('body').should('be.visible');
  
  // Verificar se o usuário está autenticado
  cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    if (token) {
      cy.get('[data-cy="user-menu"]', { timeout: 10000 }).should('be.visible');
    }
  });
});

// Comandos para aguardar elementos
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-cy="loading-spinner"]', { timeout: 1000 }).should('not.exist');
  cy.get('body').should('be.visible');
});

// Comandos para formulários
Cypress.Commands.add('fillForm', (formData) => {
  Object.keys(formData).forEach(field => {
    cy.get(`[data-cy="${field}"]`).clear().type(formData[field]);
  });
});

// Comandos para verificações de acessibilidade
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y(null, null, (violations) => {
    violations.forEach(violation => {
      cy.task('log', `${violation.id}: ${violation.description}`);
    });
  });
});

// Comandos para captura de screenshots
Cypress.Commands.add('takeScreenshot', (name) => {
  cy.screenshot(name || `screenshot-${Date.now()}`);
});

// Comandos para manipulação de dados de teste
Cypress.Commands.add('cleanupTestData', () => {
  cy.task('clearTestData');
});

Cypress.Commands.add('seedTestData', () => {
  cy.task('seedTestData');
});

// Configurar relatórios de cobertura
after(() => {
  cy.task('log', 'Testes E2E concluídos');
});