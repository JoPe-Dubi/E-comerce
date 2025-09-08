// CompreAqui E-commerce - Sistema de Autenticação

// Configurações de autenticação
const AuthConfig = {
    API_BASE_URL: '/api',
    STORAGE_KEYS: {
        USER: 'compreaqui_user',
        TOKEN: 'compreaqui_token'
    }
};

// Estado da autenticação
const AuthState = {
    user: null,
    isAuthenticated: false,
    currentMode: 'login' // 'login', 'register'
};

// Gerenciador de Autenticação
const AuthManager = {
    // Inicializar sistema de autenticação
    init: () => {
        AuthManager.loadUserFromStorage();
        AuthManager.bindEvents();
        AuthManager.updateUI();
    },

    // Carregar usuário do localStorage
    loadUserFromStorage: () => {
        const userData = Utils.loadFromStorage(AuthConfig.STORAGE_KEYS.USER);
        const token = Utils.loadFromStorage(AuthConfig.STORAGE_KEYS.TOKEN);
        
        if (userData && token) {
            AuthState.user = userData;
            AuthState.isAuthenticated = true;
        }
    },

    // Fazer login
    login: async (email, password) => {
        if (!AuthManager.validateEmail(email)) {
            Utils.showNotification('Email inválido', 'error');
            return false;
        }

        if (!password || password.length < 6) {
            Utils.showNotification('Senha deve ter pelo menos 6 caracteres', 'error');
            return false;
        }

        Utils.showLoading();

        try {
            // Sistema de autenticação local (sem backend)
            if (email === 'odubiella@gmail.com' && password === '@Trairagemtv19') {
                const mockUser = {
                    id: 1,
                    name: 'Administrador',
                    email: email,
                    role: 'admin'
                };
                
                AuthState.user = mockUser;
                AuthState.isAuthenticated = true;
                
                Utils.saveToStorage(AuthConfig.STORAGE_KEYS.USER, mockUser);
                Utils.saveToStorage(AuthConfig.STORAGE_KEYS.TOKEN, 'mock-token-123');
                
                AuthManager.updateUI();
                AuthManager.closeModal();
                
                Utils.showNotification(`Bem-vindo(a), ${mockUser.name}!`);
                return true;
            } else {
                Utils.showNotification('Email ou senha incorretos', 'error');
                return false;
            }
        } catch (error) {
            console.error('Erro no login:', error);
            Utils.showNotification('Erro interno do sistema', 'error');
            return false;
        } finally {
            Utils.hideLoading();
        }
    },

    // Fazer registro
    register: async (name, email, password, confirmPassword) => {
        // Validações
        if (!name || name.trim().length < 2) {
            Utils.showNotification('Nome deve ter pelo menos 2 caracteres', 'error');
            return false;
        }

        if (!AuthManager.validateEmail(email)) {
            Utils.showNotification('Email inválido', 'error');
            return false;
        }

        if (!password || password.length < 6) {
            Utils.showNotification('Senha deve ter pelo menos 6 caracteres', 'error');
            return false;
        }

        if (password !== confirmPassword) {
            Utils.showNotification('Senhas não coincidem', 'error');
            return false;
        }

        Utils.showLoading();

        try {
            // Sistema de registro local (sem backend)
            const mockUser = {
                id: Date.now(),
                name: name.trim(),
                email: email,
                role: 'user'
            };
            
            AuthState.user = mockUser;
            AuthState.isAuthenticated = true;
            
            Utils.saveToStorage(AuthConfig.STORAGE_KEYS.USER, mockUser);
            Utils.saveToStorage(AuthConfig.STORAGE_KEYS.TOKEN, `mock-token-${Date.now()}`);
            
            AuthManager.updateUI();
            AuthManager.closeModal();
            
            Utils.showNotification(`Conta criada com sucesso! Bem-vindo(a), ${mockUser.name}!`);
            return true;
        } catch (error) {
            console.error('Erro no registro:', error);
            Utils.showNotification('Erro interno do sistema', 'error');
            return false;
        } finally {
            Utils.hideLoading();
        }
    },

    // Fazer logout
    logout: () => {
        AuthState.user = null;
        AuthState.isAuthenticated = false;
        
        // Limpar dados salvos
        localStorage.removeItem(AuthConfig.STORAGE_KEYS.USER);
        localStorage.removeItem(AuthConfig.STORAGE_KEYS.TOKEN);
        
        AuthManager.updateUI();
        Utils.showNotification('Logout realizado com sucesso');
    },

    // Validar email
    validateEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Atualizar interface do usuário
    updateUI: () => {
        const userBtn = document.querySelector('.user-btn');
        
        if (AuthState.isAuthenticated && AuthState.user) {
            if (userBtn) {
                userBtn.innerHTML = `
                    <img src="img/avatars/avatar1.svg" alt="Avatar" class="avatar">
                    <span>Olá, ${AuthState.user.name.split(' ')[0]}</span>
                    <i class="fas fa-chevron-down"></i>
                `;
                userBtn.setAttribute('aria-label', 'Abrir menu do usuário');
                userBtn.onclick = () => {
                    AuthManager.showUserMenu();
                };
            }
        } else {
            if (userBtn) {
                userBtn.innerHTML = `
                    <i class="fas fa-user"></i>
                    <span>Entrar</span>
                `;
                userBtn.setAttribute('aria-label', 'Abrir modal de login');
                userBtn.onclick = () => AuthManager.openModal();
            }
        }
    },

    // Mostrar menu do usuário
    showUserMenu: () => {
        // Remover menu existente se houver
        const existingMenu = document.querySelector('.user-dropdown-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        // Verificar se é administrador
        const isAdmin = AuthState.user && AuthState.user.role === 'admin';

        // Criar menu dropdown
        const menu = document.createElement('div');
        menu.className = 'user-dropdown-menu';
        
        // Menu base
        let menuHTML = `
            <div class="dropdown-item" onclick="AuthManager.showProfile()">
                <i class="fas fa-user"></i>
                <span>Perfil</span>
            </div>
            <div class="dropdown-item" onclick="AuthManager.showOrders()">
                <i class="fas fa-shopping-bag"></i>
                <span>Seus Pedidos</span>
            </div>
        `;
        
        // Adicionar opções de administrador
        if (isAdmin) {
            menuHTML += `
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" onclick="AuthManager.showAdminCatalog()">
                    <i class="fas fa-table"></i>
                    <span>Catálogo de Produtos</span>
                </div>
            `;
        }
        
        // Adicionar opção de logout
        menuHTML += `
            <div class="dropdown-divider"></div>
            <div class="dropdown-item logout" onclick="AuthManager.logout()">
                <i class="fas fa-sign-out-alt"></i>
                <span>Sair da Conta</span>
            </div>
        `;
        
        menu.innerHTML = menuHTML;

        // Posicionar menu
        const userBtn = document.querySelector('.user-btn');
        const rect = userBtn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 5) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
        menu.style.zIndex = '9999';

        // Adicionar ao DOM
        document.body.appendChild(menu);

        // Fechar menu ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && !userBtn.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    },

    // Mostrar perfil do usuário
    showProfile: () => {
        document.querySelector('.user-dropdown-menu')?.remove();
        Utils.showNotification('Página de perfil em desenvolvimento', 'info');
    },

    // Mostrar pedidos do usuário
    showOrders: () => {
        document.querySelector('.user-dropdown-menu')?.remove();
        Utils.showNotification('Página de pedidos em desenvolvimento', 'info');
    },
    
    // Mostrar catálogo de produtos para administradores
    showAdminCatalog: () => {
        document.querySelector('.user-dropdown-menu')?.remove();
        window.location.href = 'pages/admin-catalog.html';
    },

    // Abrir modal de autenticação
    openModal: () => {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'block';
            AuthManager.setMode('login');
        }
    },

    // Fechar modal
    closeModal: () => {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.style.display = 'none';
            AuthManager.resetForm();
        }
    },

    // Definir modo do modal
    setMode: (mode) => {
        AuthState.currentMode = mode;
        
        const modalTitle = document.getElementById('modalTitle');
        const modalSubtitle = document.getElementById('modalSubtitle');
        const nameGroup = document.getElementById('nameGroup');
        const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const switchAuthMode = document.getElementById('switchAuthMode');
        
        if (mode === 'login') {
            if (modalTitle) modalTitle.textContent = 'Entrar';
            if (modalSubtitle) modalSubtitle.textContent = 'Acesse sua conta';
            if (nameGroup) nameGroup.style.display = 'none';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'none';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Entrar';
            if (switchAuthMode) {
                switchAuthMode.innerHTML = 'Não tem conta? <a href="#" onclick="AuthManager.setMode(\'register\')">Cadastre-se</a>';
            }
        } else if (mode === 'register') {
            if (modalTitle) modalTitle.textContent = 'Criar Conta';
            if (modalSubtitle) modalSubtitle.textContent = 'Cadastre-se gratuitamente';
            if (nameGroup) nameGroup.style.display = 'block';
            if (confirmPasswordGroup) confirmPasswordGroup.style.display = 'block';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Criar Conta';
            if (switchAuthMode) {
                switchAuthMode.innerHTML = 'Já tem conta? <a href="#" onclick="AuthManager.setMode(\'login\')">Entrar</a>';
            }
        }
    },

    // Resetar formulário
    resetForm: () => {
        const form = document.getElementById('authForm');
        if (form) {
            form.reset();
        }
    },

    // Vincular eventos
    bindEvents: () => {
        // Evento de submit do formulário
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                AuthManager.handleFormSubmit();
            });
        }

        // Fechar modal ao clicar fora
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    AuthManager.closeModal();
                }
            });
        }

        // Tecla ESC para fechar modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                AuthManager.closeModal();
            }
        });
    },

    // Processar submit do formulário
    handleFormSubmit: () => {
        const name = document.getElementById('name')?.value || '';
        const email = document.getElementById('email')?.value || '';
        const password = document.getElementById('password')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';
        
        if (AuthState.currentMode === 'login') {
            AuthManager.login(email, password);
        } else if (AuthState.currentMode === 'register') {
            AuthManager.register(name, email, password, confirmPassword);
        }
    },

    // Obter usuário atual
    getCurrentUser: () => {
        return AuthState.user;
    },

    // Verificar se usuário está autenticado
    isAuthenticated: () => {
        return AuthState.isAuthenticated;
    }
};

// Funções globais
window.AuthManager = AuthManager;

window.openLoginModal = () => {
    AuthManager.openModal();
};

window.closeLoginModal = () => {
    AuthManager.closeModal();
};

window.switchToRegister = () => {
    AuthManager.setMode('register');
};

// Inicializar quando o DOM estiver pronto
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', AuthManager.init);
    } else {
        AuthManager.init();
    }
}

// Função para alternar visibilidade da senha
window.togglePasswordVisibility = (inputId) => {
    const input = document.getElementById(inputId);
    const eyeIcon = document.getElementById(inputId + '-eye');
    
    if (!input || !eyeIcon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        eyeIcon.className = 'fas fa-eye';
    }
};

// Credenciais de teste:
// Email: odubiella@gmail.com | Senha: @Trairagemtv19
console.log('Sistema de autenticação inicializado. Credenciais de teste: odubiella@gmail.com / @Trairagemtv19');