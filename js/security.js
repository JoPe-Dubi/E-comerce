/**
 * Utilitários de Segurança
 * Funções para prevenir vulnerabilidades XSS e outras questões de segurança
 */

class SecurityUtils {
    /**
     * Sanitiza texto removendo tags HTML perigosas
     * @param {string} text - Texto a ser sanitizado
     * @returns {string} - Texto sanitizado
     */
    static sanitizeHTML(text) {
        if (!text || typeof text !== 'string') return '';
        
        // Remove scripts e outros elementos perigosos
        const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
            /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
            /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi, // Remove event handlers como onclick, onload, etc.
            /data:text\/html/gi
        ];
        
        let sanitized = text;
        dangerousPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });
        
        return sanitized;
    }
    
    /**
     * Escapa caracteres HTML especiais
     * @param {string} text - Texto a ser escapado
     * @returns {string} - Texto com caracteres escapados
     */
    static escapeHTML(text) {
        if (!text || typeof text !== 'string') return '';
        
        const htmlEscapes = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        return text.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
    }
    
    /**
     * Cria elemento DOM de forma segura
     * @param {string} tagName - Nome da tag
     * @param {Object} attributes - Atributos do elemento
     * @param {string} textContent - Conteúdo de texto (será escapado)
     * @returns {HTMLElement} - Elemento criado
     */
    static createElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        // Define atributos de forma segura
        Object.entries(attributes).forEach(([key, value]) => {
            if (key.startsWith('on')) {
                console.warn(`Atributo de evento ${key} ignorado por segurança`);
                return;
            }
            element.setAttribute(key, this.escapeHTML(String(value)));
        });
        
        // Define texto de forma segura
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }
    
    /**
     * Define innerHTML de forma segura
     * @param {HTMLElement} element - Elemento alvo
     * @param {string} html - HTML a ser inserido
     */
    static safeSetHTML(element, html) {
        if (!element || !html) return;
        
        const sanitizedHTML = this.sanitizeHTML(html);
        element.innerHTML = sanitizedHTML;
    }
    
    /**
     * Valida entrada de texto
     * @param {string} input - Entrada a ser validada
     * @param {Object} options - Opções de validação
     * @returns {Object} - Resultado da validação
     */
    static validateInput(input, options = {}) {
        const {
            minLength = 0,
            maxLength = 1000,
            allowHTML = false,
            required = false,
            pattern = null
        } = options;
        
        const errors = [];
        
        // Verifica se é obrigatório
        if (required && (!input || input.trim().length === 0)) {
            errors.push('Campo obrigatório');
        }
        
        if (input) {
            // Verifica comprimento
            if (input.length < minLength) {
                errors.push(`Mínimo de ${minLength} caracteres`);
            }
            
            if (input.length > maxLength) {
                errors.push(`Máximo de ${maxLength} caracteres`);
            }
            
            // Verifica HTML se não permitido
            if (!allowHTML && /<[^>]*>/g.test(input)) {
                errors.push('HTML não permitido');
            }
            
            // Verifica padrão personalizado
            if (pattern && !pattern.test(input)) {
                errors.push('Formato inválido');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            sanitized: allowHTML ? this.sanitizeHTML(input) : this.escapeHTML(input)
        };
    }
    
    /**
     * Valida email
     * @param {string} email - Email a ser validado
     * @returns {Object} - Resultado da validação
     */
    static validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return this.validateInput(email, {
            required: true,
            maxLength: 254,
            pattern: emailPattern
        });
    }
    
    /**
     * Valida senha
     * @param {string} password - Senha a ser validada
     * @returns {Object} - Resultado da validação
     */
    static validatePassword(password) {
        const errors = [];
        
        if (!password) {
            errors.push('Senha é obrigatória');
        } else {
            if (password.length < 8) {
                errors.push('Senha deve ter pelo menos 8 caracteres');
            }
            
            if (!/[A-Z]/.test(password)) {
                errors.push('Senha deve conter pelo menos uma letra maiúscula');
            }
            
            if (!/[a-z]/.test(password)) {
                errors.push('Senha deve conter pelo menos uma letra minúscula');
            }
            
            if (!/\d/.test(password)) {
                errors.push('Senha deve conter pelo menos um número');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

// Exporta para uso global
window.SecurityUtils = SecurityUtils;