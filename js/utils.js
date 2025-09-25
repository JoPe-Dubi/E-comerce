// CompreAqui E-commerce - Utilitários

const Utils = {
    // Mostrar notificação
    showNotification: (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Cria conteúdo de forma segura
        const notificationContent = document.createElement('div');
        notificationContent.className = 'notification-content';
        
        const icon = type === 'success' ? 'check-circle' : 
                     type === 'error' ? 'exclamation-circle' : 
                     type === 'info' ? 'info-circle' : 'bell';
        
        const iconElement = document.createElement('i');
        iconElement.className = `fas fa-${icon}`;
        
        const messageElement = document.createElement('span');
        messageElement.textContent = message;
        
        notificationContent.appendChild(iconElement);
        notificationContent.appendChild(messageElement);
        notification.appendChild(notificationContent);
        
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
        
        // Criar conteúdo de forma segura
        const loadingContent = document.createElement('div');
        loadingContent.style.background = '#fff';
        loadingContent.style.padding = '16px 20px';
        loadingContent.style.borderRadius = '8px';
        loadingContent.style.display = 'flex';
        loadingContent.style.alignItems = 'center';
        loadingContent.style.gap = '10px';
        loadingContent.style.boxShadow = '0 4px 20px rgba(0,0,0,.15)';
        
        const spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin';
        
        const text = document.createElement('span');
        text.textContent = 'Carregando...';
        
        loadingContent.appendChild(spinner);
        loadingContent.appendChild(text);
        overlay.appendChild(loadingContent);
        
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

    // Scroll até elemento pelo id ou seletor
    scrollToElement: (elementIdOrSelector) => {
        try {
            let el;
            // Tentar primeiro como ID
            if (typeof elementIdOrSelector === 'string') {
                el = document.getElementById(elementIdOrSelector);
                // Se não encontrar por ID, tentar como seletor CSS
                if (!el) {
                    el = document.querySelector(elementIdOrSelector);
                }
            }
            
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                return true;
            }
            return false;
        } catch (error) {
            console.warn('Erro ao fazer scroll para elemento:', elementIdOrSelector, error);
            return false;
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
    },

    // Gerar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Configurar lazy loading avançado
    setupLazyLoading: () => {
        if ('IntersectionObserver' in window) {
            // Observer para imagens
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-loading');
                        img.classList.add('lazy-loaded');
                        observer.unobserve(img);
                        
                        // Callback de sucesso
                        img.onload = () => {
                            img.classList.add('fade-in');
                        };
                        
                        // Callback de erro
                        img.onerror = () => {
                            img.src = 'img/placeholder.svg';
                            img.alt = 'Imagem não disponível';
                        };
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            // Observer para conteúdo dinâmico
            const contentObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        const loadFunction = element.dataset.loadFunction;
                        
                        if (loadFunction && window[loadFunction]) {
                            window[loadFunction](element);
                            observer.unobserve(element);
                        }
                    }
                });
            }, {
                rootMargin: '100px 0px',
                threshold: 0.1
            });

            // Aplicar observers
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.classList.add('lazy-loading');
                imageObserver.observe(img);
            });

            document.querySelectorAll('[data-load-function]').forEach(element => {
                contentObserver.observe(element);
            });

            // Lazy loading para iframes
            const iframeObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const iframe = entry.target;
                        iframe.src = iframe.dataset.src;
                        observer.unobserve(iframe);
                    }
                });
            });

            document.querySelectorAll('iframe[data-src]').forEach(iframe => {
                iframeObserver.observe(iframe);
            });
        } else {
            // Fallback para navegadores sem suporte
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
            });
            document.querySelectorAll('iframe[data-src]').forEach(iframe => {
                iframe.src = iframe.dataset.src;
            });
        }
    },

    // Lazy loading para componentes específicos
    lazyLoadProducts: (container) => {
        const productCards = container.querySelectorAll('.product-card[data-product-id]');
        productCards.forEach(card => {
            const productId = card.dataset.productId;
            // Carregar dados do produto sob demanda
            if (window.ProductManager && window.ProductManager.loadProductDetails) {
                window.ProductManager.loadProductDetails(productId, card);
            }
        });
    },

    // Preload inteligente baseado em interação do usuário
    setupIntelligentPreload: () => {
        let preloadTimer;
        
        // Preload ao hover em links
        document.addEventListener('mouseover', (e) => {
            if (e.target.matches('a[href]') && !e.target.dataset.preloaded) {
                clearTimeout(preloadTimer);
                preloadTimer = setTimeout(() => {
                    const href = e.target.href;
                    if (href && !href.startsWith('#')) {
                        Utils.preloadResource(href, 'document');
                        e.target.dataset.preloaded = 'true';
                    }
                }, 100);
            }
        });

        // Preload de imagens em produtos próximos
        const productObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const product = entry.target;
                    const nextProducts = product.parentElement.querySelectorAll('.product-card:not([data-preloaded])');
                    
                    Array.from(nextProducts).slice(0, 3).forEach(nextProduct => {
                        const img = nextProduct.querySelector('img[data-src]');
                        if (img && !img.dataset.preloaded) {
                            const preloadImg = new Image();
                            preloadImg.src = img.dataset.src;
                            img.dataset.preloaded = 'true';
                        }
                    });
                }
            });
        }, { rootMargin: '200px' });

        document.querySelectorAll('.product-card').forEach(product => {
            productObserver.observe(product);
        });
    },

    // Otimizar performance de scroll
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Preload de recursos críticos
    preloadResource: (href, as = 'script') => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        document.head.appendChild(link);
    }
};

function showModal(title, content, actions = []) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    // Cria modal de forma segura
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => overlay.remove();
    
    header.appendChild(titleElement);
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    if (typeof content === 'string') {
        // Se for string, sanitiza e adiciona
        const contentDiv = document.createElement('div');
        SecurityUtils.safeSetHTML(contentDiv, content);
        body.appendChild(contentDiv);
    } else {
        // Se for elemento DOM, adiciona diretamente
        body.appendChild(content);
    }
    
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `btn ${action.class || 'btn-secondary'}`;
        button.textContent = action.text;
        button.onclick = () => {
            if (action.handler) action.handler();
            overlay.remove();
        };
        footer.appendChild(button);
    });
    
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    
    document.body.appendChild(overlay);
    
    // Fechar ao clicar fora
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    return overlay;
}