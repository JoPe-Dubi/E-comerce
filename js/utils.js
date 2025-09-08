// CompreAqui E-commerce - Utilitários

const Utils = {
    // Mostrar notificação
    showNotification: (message, type = 'success') => {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                               type === 'error' ? 'fa-exclamation-circle' : 
                               type === 'info' ? 'fa-info-circle' : 
                               'fa-bell'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(notification);
        
        // Adicionar classe para animação
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    },
    
    // Formatar preço
    formatPrice: (price) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(price);
    },
    
    // Gerar URL amigável
    slugify: (text) => {
        return text
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/--+/g, '-');
    },
    
    // Persistência: salvar no localStorage
    saveToStorage: (key, value) => {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
        } catch (e) {
            console.error('Erro ao salvar no storage:', key, e);
        }
    },

    // Persistência: carregar do localStorage
    loadFromStorage: (key, defaultValue = null) => {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Erro ao ler do storage, retornando valor padrão para', key, e);
            return defaultValue;
        }
    },

    // Exibir overlay de carregamento
    showLoading: () => {
        if (document.getElementById('globalLoading')) return;
        const overlay = document.createElement('div');
        overlay.id = 'globalLoading';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.innerHTML = `
            <div style="background:#fff;padding:16px 20px;border-radius:8px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 20px rgba(0,0,0,.15)">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Carregando...</span>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    // Remover overlay de carregamento
    hideLoading: () => {
        const overlay = document.getElementById('globalLoading');
        if (overlay) overlay.remove();
    },

    // Função utilitária: debounce
    debounce: (fn, delay = 300) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(null, args), delay);
        };
    },

    // Validação de email
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    },

    // Scroll até elemento pelo id
    scrollToElement: (elementId) => {
        const el = document.getElementById(elementId);
        if (el && el.scrollIntoView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    // Gerar estrelas de avaliação (0-5, permite meia estrela)
    generateStars: (rating = 0) => {
        const r = Math.max(0, Math.min(5, Number(rating) || 0));
        const full = Math.floor(r);
        const half = r - full >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        const fullIcons = '<i class="fas fa-star"></i>'.repeat(full);
        const halfIcon = half ? '<i class="fas fa-star-half-alt"></i>' : '';
        const emptyIcons = '<i class="far fa-star"></i>'.repeat(empty);
        return `${fullIcons}${halfIcon}${emptyIcons}`;
    }
};