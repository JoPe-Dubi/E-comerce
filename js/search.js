// CompreAqui E-commerce - Sistema de Busca Inteligente

// Configurações de busca
const SearchConfig = {
    MIN_SEARCH_LENGTH: 2,
    MAX_SUGGESTIONS: 8,
    MAX_RECENT_SEARCHES: 10,
    DEBOUNCE_DELAY: 300,
    STORAGE_KEYS: {
        RECENT_SEARCHES: 'compreaqui_recent_searches',
        POPULAR_SEARCHES: 'compreaqui_popular_searches'
    },
    ENABLE_VOICE_SEARCH: true,
    ENABLE_AUTOCOMPLETE: true
};

// Estado da busca
const SearchState = {
    currentQuery: '',
    suggestions: [],
    recentSearches: [],
    popularSearches: [],
    isSearching: false,
    searchHistory: [],
    filters: {
        category: null,
        priceRange: null,
        brand: null
    }
};

// Dados de busca populares (simulados)
const POPULAR_SEARCHES = [
    'iPhone', 'Samsung Galaxy', 'MacBook', 'Nike', 'PlayStation',
    'Smart TV', 'Notebook', 'Tênis', 'Smartphone', 'Tablet'
];

// Categorias para sugestões
const SEARCH_CATEGORIES = {
    'eletronicos': ['smartphone', 'notebook', 'tablet', 'tv', 'computador'],
    'moda': ['tênis', 'camiseta', 'calça', 'vestido', 'sapato'],
    'casa': ['sofá', 'mesa', 'cadeira', 'decoração', 'cozinha'],
    'games': ['playstation', 'xbox', 'nintendo', 'jogo', 'console'],
    'esportes': ['tênis', 'bola', 'equipamento', 'fitness', 'corrida'],
    'livros': ['romance', 'ficção', 'biografia', 'técnico', 'infantil']
};

// Gerenciador de Busca
const SearchManager = {
    // Inicializar sistema de busca
    init: () => {
        SearchManager.loadFromStorage();
        SearchManager.bindEvents();
        SearchManager.initVoiceSearch();
        SearchManager.setupAutocomplete();
    },

    // Carregar dados do localStorage
    loadFromStorage: () => {
        SearchState.recentSearches = Utils.loadFromStorage(
            SearchConfig.STORAGE_KEYS.RECENT_SEARCHES, 
            []
        );
        SearchState.popularSearches = Utils.loadFromStorage(
            SearchConfig.STORAGE_KEYS.POPULAR_SEARCHES, 
            POPULAR_SEARCHES
        );
    },

    // Salvar no localStorage
    saveToStorage: () => {
        Utils.saveToStorage(
            SearchConfig.STORAGE_KEYS.RECENT_SEARCHES, 
            SearchState.recentSearches
        );
        Utils.saveToStorage(
            SearchConfig.STORAGE_KEYS.POPULAR_SEARCHES, 
            SearchState.popularSearches
        );
    },

    // Realizar busca
    performSearch: (query, addToHistory = true) => {
        if (!query || query.trim().length < SearchConfig.MIN_SEARCH_LENGTH) {
            Utils.showNotification('Digite pelo menos 2 caracteres para buscar', 'warning');
            return;
        }

        const searchQuery = query.trim().toLowerCase();
        SearchState.currentQuery = searchQuery;
        SearchState.isSearching = true;

        // Adicionar ao histórico
        if (addToHistory) {
            SearchManager.addToSearchHistory(searchQuery);
        }

        // Esconder sugestões
        SearchManager.hideSuggestions();

        // Mostrar loading
        SearchManager.showSearchLoading();

        // Simular delay de busca
        setTimeout(() => {
            // Buscar produtos
            const results = SearchManager.searchProducts(searchQuery);
            
            // Renderizar resultados
            SearchManager.renderSearchResults(results, searchQuery);
            
            // Esconder loading
            SearchManager.hideSearchLoading();
            
            SearchState.isSearching = false;
            
            // Atualizar estatísticas
            SearchManager.updateSearchStats(searchQuery, results.length);
            
            // Mostrar notificação
            Utils.showNotification(
                `${results.length} produto${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''} para "${query}"`
            );
        }, 500);
    },

    // Buscar produtos
    searchProducts: (query) => {
        if (!window.MainProductManager) {
            console.error('MainProductManager não encontrado');
            return [];
        }

        // Usar o MainProductManager para buscar
        return window.MainProductManager.searchProducts(query, SearchState.filters.category, {
            priceRange: SearchState.filters.priceRange,
            brands: SearchState.filters.brand ? [SearchState.filters.brand] : [],
            rating: 0
        });
    },

    // Gerar sugestões
    generateSuggestions: (query) => {
        if (!query || query.length < SearchConfig.MIN_SEARCH_LENGTH) {
            return SearchManager.getDefaultSuggestions();
        }

        const suggestions = [];
        const queryLower = query.toLowerCase();

        // Sugestões de produtos
        if (window.MainProductManager && window.AppState.products) {
            const productSuggestions = window.AppState.products
                .filter(product => 
                    product.name.toLowerCase().includes(queryLower) ||
                    product.brand.toLowerCase().includes(queryLower) ||
                    product.tags.some(tag => tag.toLowerCase().includes(queryLower))
                )
                .slice(0, 4)
                .map(product => ({
                    type: 'product',
                    text: product.name,
                    subtitle: product.brand,
                    image: product.images[0],
                    id: product.id
                }));
            
            suggestions.push(...productSuggestions);
        }

        // Sugestões de categorias
        Object.keys(SEARCH_CATEGORIES).forEach(category => {
            const categoryTerms = SEARCH_CATEGORIES[category];
            if (categoryTerms.some(term => term.includes(queryLower))) {
                suggestions.push({
                    type: 'category',
                    text: SearchManager.getCategoryDisplayName(category),
                    subtitle: 'Categoria',
                    category: category
                });
            }
        });

        // Sugestões de marcas
        const brands = SearchManager.getBrandSuggestions(queryLower);
        brands.forEach(brand => {
            suggestions.push({
                type: 'brand',
                text: brand,
                subtitle: 'Marca'
            });
        });

        // Sugestões populares
        const popularMatches = SearchState.popularSearches
            .filter(search => search.toLowerCase().includes(queryLower))
            .slice(0, 2)
            .map(search => ({
                type: 'popular',
                text: search,
                subtitle: 'Busca popular'
            }));
        
        suggestions.push(...popularMatches);

        // Limitar número de sugestões
        return suggestions.slice(0, SearchConfig.MAX_SUGGESTIONS);
    },

    // Obter sugestões padrão
    getDefaultSuggestions: () => {
        const suggestions = [];

        // Buscas recentes
        SearchState.recentSearches.slice(0, 3).forEach(search => {
            suggestions.push({
                type: 'recent',
                text: search,
                subtitle: 'Busca recente'
            });
        });

        // Buscas populares
        SearchState.popularSearches.slice(0, 5).forEach(search => {
            suggestions.push({
                type: 'popular',
                text: search,
                subtitle: 'Busca popular'
            });
        });

        return suggestions;
    },

    // Obter sugestões de marcas
    getBrandSuggestions: (query) => {
        const brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'LG', 'Dell', 'HP'];
        return brands.filter(brand => brand.toLowerCase().includes(query)).slice(0, 2);
    },

    // Obter nome de exibição da categoria
    getCategoryDisplayName: (category) => {
        const categoryNames = {
            'eletronicos': 'Eletrônicos',
            'moda': 'Moda',
            'casa': 'Casa & Decoração',
            'games': 'Games',
            'esportes': 'Esportes',
            'livros': 'Livros'
        };
        return categoryNames[category] || category;
    },

    // Mostrar sugestões
    showSuggestions: (suggestions) => {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) return;

        if (suggestions.length === 0) {
            SearchManager.hideSuggestions();
            return;
        }

        const suggestionsHTML = suggestions.map(suggestion => {
            const iconClass = SearchManager.getSuggestionIcon(suggestion.type);
            const imageHTML = suggestion.image ? 
                `<img src="${suggestion.image}" alt="${suggestion.text}" class="suggestion-image">` : 
                `<i class="${iconClass} suggestion-icon"></i>`;

            return `
                <div class="suggestion-item" onclick="SearchManager.selectSuggestion('${suggestion.text}', '${suggestion.type}')">
                    ${imageHTML}
                    <div class="suggestion-content">
                        <div class="suggestion-text">${suggestion.text}</div>
                        <div class="suggestion-subtitle">${suggestion.subtitle}</div>
                    </div>
                    <i class="fas fa-arrow-up-right suggestion-arrow"></i>
                </div>
            `;
        }).join('');

        suggestionsContainer.innerHTML = suggestionsHTML;
        suggestionsContainer.style.display = 'block';
    },

    // Esconder sugestões
    hideSuggestions: () => {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    },

    // Obter ícone da sugestão
    getSuggestionIcon: (type) => {
        const icons = {
            'product': 'fas fa-box',
            'category': 'fas fa-tags',
            'brand': 'fas fa-trademark',
            'popular': 'fas fa-fire',
            'recent': 'fas fa-history'
        };
        return icons[type] || 'fas fa-search';
    },

    // Selecionar sugestão
    selectSuggestion: (text, type) => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = text;
        }

        // Aplicar filtros baseados no tipo
        switch (type) {
            case 'category':
                SearchState.filters.category = text.toLowerCase();
                break;
            case 'brand':
                SearchState.filters.brand = text;
                break;
            default:
                SearchState.filters = { category: null, priceRange: null, brand: null };
        }

        SearchManager.performSearch(text);
    },

    // Adicionar ao histórico de buscas
    addToSearchHistory: (query) => {
        // Remover se já existe
        const index = SearchState.recentSearches.indexOf(query);
        if (index !== -1) {
            SearchState.recentSearches.splice(index, 1);
        }

        // Adicionar no início
        SearchState.recentSearches.unshift(query);

        // Manter apenas as últimas buscas
        if (SearchState.recentSearches.length > SearchConfig.MAX_RECENT_SEARCHES) {
            SearchState.recentSearches = SearchState.recentSearches.slice(0, SearchConfig.MAX_RECENT_SEARCHES);
        }

        SearchManager.saveToStorage();
    },

    // Renderizar resultados da busca
    renderSearchResults: (results, query) => {
        // Verificar se existe container de resultados
        let resultsContainer = document.getElementById('searchResults');
        
        if (!resultsContainer) {
            // Criar container se não existir
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'searchResults';
            resultsContainer.className = 'search-results-container';
            
            // Inserir após a seção de categorias
            const categoriesSection = document.querySelector('.categories-section');
            if (categoriesSection) {
                categoriesSection.insertAdjacentElement('afterend', resultsContainer);
            }
        }

        // Mostrar cabeçalho dos resultados
        const headerHTML = `
            <div class="search-results-header">
                <h2>Resultados para "${query}"</h2>
                <div class="search-results-info">
                    <span>${results.length} produto${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}</span>
                    <button class="clear-search-btn" onclick="SearchManager.clearSearch()">
                        <i class="fas fa-times"></i> Limpar busca
                    </button>
                </div>
            </div>
        `;

        // Renderizar produtos usando MainProductManager
        if (window.MainProductManager) {
            resultsContainer.innerHTML = headerHTML + '<div class="products-grid" id="searchProductsGrid"></div>';
            window.MainProductManager.renderProductList(results, 'searchProductsGrid');
        } else {
            resultsContainer.innerHTML = headerHTML + '<p>Erro ao carregar produtos</p>';
        }

        // Scroll para os resultados
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    },

    // Limpar busca
    clearSearch: () => {
        const searchInput = document.getElementById('searchInput');
        const resultsContainer = document.getElementById('searchResults');
        
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (resultsContainer) {
            resultsContainer.remove();
        }
        
        SearchState.currentQuery = '';
        SearchState.filters = { category: null, priceRange: null, brand: null };
        
        SearchManager.hideSuggestions();
        Utils.showNotification('Busca limpa');
    },

    // Mostrar loading da busca
    showSearchLoading: () => {
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            searchBtn.disabled = true;
        }
    },

    // Esconder loading da busca
    hideSearchLoading: () => {
        const searchBtn = document.querySelector('.search-btn');
        if (searchBtn) {
            searchBtn.innerHTML = '<i class="fas fa-search"></i>';
            searchBtn.disabled = false;
        }
    },

    // Atualizar estatísticas de busca
    updateSearchStats: (query, resultCount) => {
        // Aqui você pode enviar dados para analytics
        console.log(`Busca: "${query}" - ${resultCount} resultados`);
    },

    // Configurar autocomplete
    setupAutocomplete: () => {
        if (!SearchConfig.ENABLE_AUTOCOMPLETE) return;

        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // Debounced function para gerar sugestões
        const debouncedSuggestions = Utils.debounce((query) => {
            if (query.length >= SearchConfig.MIN_SEARCH_LENGTH) {
                const suggestions = SearchManager.generateSuggestions(query);
                SearchManager.showSuggestions(suggestions);
            } else if (query.length === 0) {
                const defaultSuggestions = SearchManager.getDefaultSuggestions();
                SearchManager.showSuggestions(defaultSuggestions);
            } else {
                SearchManager.hideSuggestions();
            }
        }, SearchConfig.DEBOUNCE_DELAY);

        // Event listeners
        searchInput.addEventListener('input', (e) => {
            debouncedSuggestions(e.target.value);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length === 0) {
                const defaultSuggestions = SearchManager.getDefaultSuggestions();
                SearchManager.showSuggestions(defaultSuggestions);
            }
        });

        // Navegação por teclado nas sugestões
        let selectedSuggestionIndex = -1;
        
        searchInput.addEventListener('keydown', (e) => {
            const suggestions = document.querySelectorAll('.suggestion-item');
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
                    SearchManager.highlightSuggestion(selectedSuggestionIndex);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                    SearchManager.highlightSuggestion(selectedSuggestionIndex);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                        suggestions[selectedSuggestionIndex].click();
                    } else {
                        SearchManager.performSearch(searchInput.value);
                    }
                    break;
                    
                case 'Escape':
                    SearchManager.hideSuggestions();
                    selectedSuggestionIndex = -1;
                    break;
            }
        });
    },

    // Destacar sugestão
    highlightSuggestion: (index) => {
        const suggestions = document.querySelectorAll('.suggestion-item');
        suggestions.forEach((suggestion, i) => {
            suggestion.classList.toggle('highlighted', i === index);
        });
    },

    // Busca por voz removida conforme solicitado
    initVoiceSearch: () => {
        // Funcionalidade de busca por voz desabilitada
        return;
    },

    // Vincular eventos
    bindEvents: () => {
        // Evento de busca
        const searchBtn = document.querySelector('.search-btn');
        const searchInput = document.getElementById('searchInput');
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                if (searchInput) {
                    SearchManager.performSearch(searchInput.value);
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    SearchManager.performSearch(searchInput.value);
                }
            });
        }

        // Fechar sugestões ao clicar fora
        document.addEventListener('click', (e) => {
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer && !searchContainer.contains(e.target)) {
                SearchManager.hideSuggestions();
            }
        });
    },

    // Obter histórico de buscas
    getSearchHistory: () => {
        return SearchState.recentSearches;
    },

    // Limpar histórico
    clearSearchHistory: () => {
        SearchState.recentSearches = [];
        SearchManager.saveToStorage();
        Utils.showNotification('Histórico de buscas limpo');
    }
};

// Funções globais
window.SearchManager = SearchManager;

window.performSearch = (query) => {
    if (query) {
        SearchManager.performSearch(query);
    } else {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            SearchManager.performSearch(searchInput.value);
        }
    }
};

window.selectSuggestion = (text, type) => {
    SearchManager.selectSuggestion(text, type);
};

// CSS adicional para busca
const searchStyles = `
    .search-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        max-height: 400px;
        overflow-y: auto;
        z-index: 1001;
        display: none;
        margin-top: 5px;
    }
    
    .suggestion-item {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid var(--light-gray);
        transition: var(--transition);
        gap: 12px;
    }
    
    .suggestion-item:hover,
    .suggestion-item.highlighted {
        background: var(--light-gray);
    }
    
    .suggestion-item:last-child {
        border-bottom: none;
    }
    
    .suggestion-image {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 6px;
    }
    
    .suggestion-icon {
        width: 40px;
        text-align: center;
        color: var(--dark-gray);
        font-size: 1.2rem;
    }
    
    .suggestion-content {
        flex: 1;
    }
    
    .suggestion-text {
        font-weight: 500;
        color: var(--primary-black);
        margin-bottom: 2px;
    }
    
    .suggestion-subtitle {
        font-size: 0.85rem;
        color: var(--dark-gray);
    }
    
    .suggestion-arrow {
        color: var(--medium-gray);
        font-size: 0.9rem;
    }
    

    
    .search-results-container {
        padding: 40px 0;
        background: var(--light-gray);
    }
    
    .search-results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 30px;
        padding: 0 20px;
    }
    
    .search-results-header h2 {
        color: var(--primary-black);
        font-size: 1.8rem;
        margin: 0;
    }
    
    .search-results-info {
        display: flex;
        align-items: center;
        gap: 15px;
        color: var(--dark-gray);
    }
    
    .clear-search-btn {
        background: var(--primary-red);
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: var(--transition);
    }
    
    .clear-search-btn:hover {
        background: #d32f2f;
        transform: translateY(-1px);
    }
`;

// Adicionar estilos ao documento
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = searchStyles;
    document.head.appendChild(styleSheet);
}

// Inicializar quando o DOM estiver pronto
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', SearchManager.init);
    } else {
        SearchManager.init();
    }
}