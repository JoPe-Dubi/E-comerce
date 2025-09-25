describe('Authentication E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.cleanupTestData();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      const testUser = {
        name: 'João Silva',
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        phone: '11999999999'
      };

      cy.visit('/register');
      
      // Verificar se a página de registro carregou
      cy.get('[data-cy="register-form"]').should('be.visible');
      cy.get('h1').should('contain', 'Criar Conta');

      // Preencher formulário de registro
      cy.get('[data-cy="name-input"]').type(testUser.name);
      cy.get('[data-cy="email-input"]').type(testUser.email);
      cy.get('[data-cy="password-input"]').type(testUser.password);
      cy.get('[data-cy="phone-input"]').type(testUser.phone);

      // Submeter formulário
      cy.get('[data-cy="register-button"]').click();

      // Verificar redirecionamento e sucesso
      cy.url().should('not.include', '/register');
      cy.get('[data-cy="welcome-message"]').should('be.visible');
      cy.get('[data-cy="user-menu"]').should('contain', testUser.name);
    });

    it('should show validation errors for invalid data', () => {
      cy.visit('/register');

      // Tentar submeter formulário vazio
      cy.get('[data-cy="register-button"]').click();

      // Verificar mensagens de erro
      cy.get('[data-cy="name-error"]').should('contain', 'Nome é obrigatório');
      cy.get('[data-cy="email-error"]').should('contain', 'Email é obrigatório');
      cy.get('[data-cy="password-error"]').should('contain', 'Senha é obrigatória');
      cy.get('[data-cy="phone-error"]').should('contain', 'Telefone é obrigatório');
    });

    it('should reject registration with existing email', () => {
      const existingUser = Cypress.env('testUser');

      // Primeiro, registrar um usuário
      cy.registerViaAPI(existingUser);

      // Tentar registrar novamente com o mesmo email
      cy.visit('/register');
      cy.get('[data-cy="name-input"]').type('Outro Nome');
      cy.get('[data-cy="email-input"]').type(existingUser.email);
      cy.get('[data-cy="password-input"]').type('password123');
      cy.get('[data-cy="phone-input"]').type('11888888888');
      cy.get('[data-cy="register-button"]').click();

      // Verificar mensagem de erro
      cy.get('[data-cy="error-message"]').should('contain', 'Email já está em uso');
    });

    it('should validate password strength', () => {
      cy.visit('/register');

      cy.get('[data-cy="name-input"]').type('Test User');
      cy.get('[data-cy="email-input"]').type('test@example.com');
      cy.get('[data-cy="phone-input"]').type('11999999999');

      // Testar senha muito curta
      cy.get('[data-cy="password-input"]').type('123');
      cy.get('[data-cy="register-button"]').click();
      cy.get('[data-cy="password-error"]').should('contain', 'pelo menos 6 caracteres');

      // Testar senha válida
      cy.get('[data-cy="password-input"]').clear().type('password123');
      cy.get('[data-cy="password-error"]').should('not.exist');
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Criar usuário de teste
      cy.registerViaAPI();
    });

    it('should login with valid credentials', () => {
      const testUser = Cypress.env('testUser');

      cy.visit('/login');
      
      // Verificar se a página de login carregou
      cy.get('[data-cy="login-form"]').should('be.visible');
      cy.get('h1').should('contain', 'Entrar');

      // Fazer login
      cy.get('[data-cy="email-input"]').type(testUser.email);
      cy.get('[data-cy="password-input"]').type(testUser.password);
      cy.get('[data-cy="login-button"]').click();

      // Verificar sucesso do login
      cy.url().should('not.include', '/login');
      cy.get('[data-cy="user-menu"]').should('be.visible');
      cy.get('[data-cy="welcome-message"]').should('contain', 'Bem-vindo');
    });

    it('should reject login with invalid credentials', () => {
      cy.visit('/login');

      // Tentar login com credenciais inválidas
      cy.get('[data-cy="email-input"]').type('invalid@example.com');
      cy.get('[data-cy="password-input"]').type('wrongpassword');
      cy.get('[data-cy="login-button"]').click();

      // Verificar mensagem de erro
      cy.get('[data-cy="error-message"]').should('contain', 'Credenciais inválidas');
      cy.url().should('include', '/login');
    });

    it('should show validation errors for empty fields', () => {
      cy.visit('/login');

      // Tentar submeter formulário vazio
      cy.get('[data-cy="login-button"]').click();

      // Verificar mensagens de erro
      cy.get('[data-cy="email-error"]').should('contain', 'Email é obrigatório');
      cy.get('[data-cy="password-error"]').should('contain', 'Senha é obrigatória');
    });

    it('should remember user session after page refresh', () => {
      const testUser = Cypress.env('testUser');

      // Fazer login
      cy.login(testUser.email, testUser.password);

      // Recarregar página
      cy.reload();

      // Verificar se o usuário ainda está logado
      cy.get('[data-cy="user-menu"]').should('be.visible');
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      cy.registerViaAPI();
      cy.loginViaAPI();
      cy.visit('/');
    });

    it('should logout successfully', () => {
      // Verificar que está logado
      cy.get('[data-cy="user-menu"]').should('be.visible');

      // Fazer logout
      cy.logout();

      // Verificar que foi deslogado
      cy.get('[data-cy="login-link"]').should('be.visible');
      cy.get('[data-cy="user-menu"]').should('not.exist');
    });

    it('should clear user data on logout', () => {
      // Fazer logout
      cy.logout();

      // Verificar se os dados foram limpos do localStorage
      cy.window().then((win) => {
        expect(win.localStorage.getItem('authToken')).to.be.null;
        expect(win.localStorage.getItem('user')).to.be.null;
      });
    });
  });

  describe('Protected Routes', () => {
    it('should redirect to login when accessing protected route without authentication', () => {
      cy.visit('/profile');
      
      // Deve ser redirecionado para login
      cy.url().should('include', '/login');
      cy.get('[data-cy="login-form"]').should('be.visible');
    });

    it('should allow access to protected route when authenticated', () => {
      // Fazer login
      cy.registerViaAPI();
      cy.loginViaAPI();

      // Acessar rota protegida
      cy.visit('/profile');
      
      // Deve conseguir acessar
      cy.url().should('include', '/profile');
      cy.get('[data-cy="profile-form"]').should('be.visible');
    });
  });

  describe('Password Recovery', () => {
    it('should show forgot password form', () => {
      cy.visit('/login');
      
      cy.get('[data-cy="forgot-password-link"]').click();
      cy.url().should('include', '/forgot-password');
      cy.get('[data-cy="forgot-password-form"]').should('be.visible');
    });

    it('should handle password recovery request', () => {
      cy.visit('/forgot-password');
      
      cy.get('[data-cy="email-input"]').type('test@example.com');
      cy.get('[data-cy="reset-button"]').click();
      
      cy.get('[data-cy="success-message"]').should('contain', 'instruções enviadas');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible on login page', () => {
      cy.visit('/login');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should be accessible on register page', () => {
      cy.visit('/register');
      cy.injectAxe();
      cy.checkA11y();
    });

    it('should support keyboard navigation', () => {
      cy.visit('/login');
      
      // Navegar usando Tab
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'email-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'password-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'login-button');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x');
      cy.visit('/login');
      
      cy.get('[data-cy="login-form"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="password-input"]').should('be.visible');
      cy.get('[data-cy="login-button"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2');
      cy.visit('/register');
      
      cy.get('[data-cy="register-form"]').should('be.visible');
      cy.get('[data-cy="name-input"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
    });
  });
});