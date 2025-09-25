const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    env: {
      apiUrl: 'http://localhost:3000/api',
      testUser: {
        name: 'Test User',
        email: 'test@cypress.com',
        password: 'cypress123',
        phone: '11999999999'
      }
    },

    setupNodeEvents(on, config) {
      // Implementar plugins do node aqui
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        // Task para limpar dados de teste
        clearTestData() {
          // Implementar limpeza de dados de teste se necessário
          return null;
        },

        // Task para criar dados de teste
        seedTestData() {
          // Implementar criação de dados de teste se necessário
          return null;
        }
      });

      // Configurações específicas por ambiente
      if (config.env.environment === 'staging') {
        config.baseUrl = 'https://staging.compreaqui.com';
        config.env.apiUrl = 'https://staging.compreaqui.com/api';
      }

      return config;
    },
  },

  component: {
    devServer: {
      framework: 'create-react-app',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js',
  },

  // Configurações globais
  retries: {
    runMode: 2,
    openMode: 0
  },
  
  watchForFileChanges: false,
  chromeWebSecurity: false,
  
  // Configurações de relatórios
  reporter: 'mochawesome',
  reporterOptions: {
    reportDir: 'cypress/reports',
    overwrite: false,
    html: false,
    json: true
  }
});