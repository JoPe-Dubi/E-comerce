// CompreAqui E-commerce - Sistema de Validação Frontend

// Configurações de validação
const ValidationConfig = {
    // Regras de senha
    PASSWORD: {
        MIN_LENGTH: 8,
        MAX_LENGTH: 128,
        REQUIRE_UPPERCASE: true,
        REQUIRE_LOWERCASE: true,
        REQUIRE_NUMBERS: true,
        REQUIRE_SPECIAL_CHARS: true,
        SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    },
    
    // Regras de email
    EMAIL: {
        MAX_LENGTH: 254,
        ALLOWED_DOMAINS: null // null = todos os domínios permitidos
    },
    
    // Regras de nome
    NAME: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 50,
        ALLOWED_CHARS: /^[a-zA-ZÀ-ÿ\s'-]+$/
    },
    
    // Regras de telefone
    PHONE: {
        PATTERNS: {
            BR: /^\(?([0-9]{2})\)?[-. ]?([0-9]{4,5})[-. ]?([0-9]{4})$/
        }
    },
    
    // Regras de CPF
    CPF: {
        PATTERN: /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/
    },
    
    // Regras de CEP
    CEP: {
        PATTERN: /^\d{5}-?\d{3}$/
    },
    
    // Regras de cartão de crédito
    CREDIT_CARD: {
        PATTERNS: {
            VISA: /^4[0-9]{12}(?:[0-9]{3})?$/,
            MASTERCARD: /^5[1-5][0-9]{14}$/,
            AMEX: /^3[47][0-9]{13}$/,
            DISCOVER: /^6(?:011|5[0-9]{2})[0-9]{12}$/
        }
    }
};

// Mensagens de erro
const ValidationMessages = {
    REQUIRED: 'Este campo é obrigatório',
    EMAIL_INVALID: 'Por favor, insira um email válido',
    PASSWORD_TOO_SHORT: `A senha deve ter pelo menos ${ValidationConfig.PASSWORD.MIN_LENGTH} caracteres`,
    PASSWORD_TOO_LONG: `A senha deve ter no máximo ${ValidationConfig.PASSWORD.MAX_LENGTH} caracteres`,
    PASSWORD_NO_UPPERCASE: 'A senha deve conter pelo menos uma letra maiúscula',
    PASSWORD_NO_LOWERCASE: 'A senha deve conter pelo menos uma letra minúscula',
    PASSWORD_NO_NUMBERS: 'A senha deve conter pelo menos um número',
    PASSWORD_NO_SPECIAL: 'A senha deve conter pelo menos um caractere especial',
    NAME_TOO_SHORT: `O nome deve ter pelo menos ${ValidationConfig.NAME.MIN_LENGTH} caracteres`,
    NAME_TOO_LONG: `O nome deve ter no máximo ${ValidationConfig.NAME.MAX_LENGTH} caracteres`,
    NAME_INVALID_CHARS: 'O nome contém caracteres inválidos',
    PHONE_INVALID: 'Por favor, insira um telefone válido',
    CPF_INVALID: 'Por favor, insira um CPF válido',
    CEP_INVALID: 'Por favor, insira um CEP válido',
    CREDIT_CARD_INVALID: 'Por favor, insira um número de cartão válido',
    PASSWORDS_DONT_MATCH: 'As senhas não coincidem'
};

// Sistema de Validação
const ValidationUtils = {
    // Validar email
    validateEmail: (email) => {
        const errors = [];
        
        if (!email || email.trim() === '') {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        email = email.trim();
        
        // Verificar comprimento
        if (email.length > ValidationConfig.EMAIL.MAX_LENGTH) {
            errors.push(`Email muito longo (máximo ${ValidationConfig.EMAIL.MAX_LENGTH} caracteres)`);
        }
        
        // Verificar formato
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push(ValidationMessages.EMAIL_INVALID);
        }
        
        // Verificar domínios permitidos (se configurado)
        if (ValidationConfig.EMAIL.ALLOWED_DOMAINS) {
            const domain = email.split('@')[1];
            if (!ValidationConfig.EMAIL.ALLOWED_DOMAINS.includes(domain)) {
                errors.push('Domínio de email não permitido');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: SecurityUtils.escapeHTML(email.toLowerCase())
        };
    },
    
    // Validar senha
    validatePassword: (password) => {
        const errors = [];
        
        if (!password) {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        // Verificar comprimento
        if (password.length < ValidationConfig.PASSWORD.MIN_LENGTH) {
            errors.push(ValidationMessages.PASSWORD_TOO_SHORT);
        }
        
        if (password.length > ValidationConfig.PASSWORD.MAX_LENGTH) {
            errors.push(ValidationMessages.PASSWORD_TOO_LONG);
        }
        
        // Verificar maiúsculas
        if (ValidationConfig.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
            errors.push(ValidationMessages.PASSWORD_NO_UPPERCASE);
        }
        
        // Verificar minúsculas
        if (ValidationConfig.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
            errors.push(ValidationMessages.PASSWORD_NO_LOWERCASE);
        }
        
        // Verificar números
        if (ValidationConfig.PASSWORD.REQUIRE_NUMBERS && !/\d/.test(password)) {
            errors.push(ValidationMessages.PASSWORD_NO_NUMBERS);
        }
        
        // Verificar caracteres especiais
        if (ValidationConfig.PASSWORD.REQUIRE_SPECIAL_CHARS) {
            const specialChars = ValidationConfig.PASSWORD.SPECIAL_CHARS;
            const hasSpecial = specialChars.split('').some(char => password.includes(char));
            if (!hasSpecial) {
                errors.push(ValidationMessages.PASSWORD_NO_SPECIAL);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            strength: ValidationUtils.calculatePasswordStrength(password)
        };
    },
    
    // Calcular força da senha
    calculatePasswordStrength: (password) => {
        let score = 0;
        
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^a-zA-Z\d]/.test(password)) score += 1;
        
        if (score <= 2) return 'weak';
        if (score <= 4) return 'medium';
        return 'strong';
    },
    
    // Validar nome
    validateName: (name) => {
        const errors = [];
        
        if (!name || name.trim() === '') {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        name = name.trim();
        
        // Verificar comprimento
        if (name.length < ValidationConfig.NAME.MIN_LENGTH) {
            errors.push(ValidationMessages.NAME_TOO_SHORT);
        }
        
        if (name.length > ValidationConfig.NAME.MAX_LENGTH) {
            errors.push(ValidationMessages.NAME_TOO_LONG);
        }
        
        // Verificar caracteres permitidos
        if (!ValidationConfig.NAME.ALLOWED_CHARS.test(name)) {
            errors.push(ValidationMessages.NAME_INVALID_CHARS);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: SecurityUtils.escapeHTML(name)
        };
    },
    
    // Validar telefone
    validatePhone: (phone) => {
        const errors = [];
        
        if (!phone || phone.trim() === '') {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        phone = phone.trim();
        
        // Verificar formato brasileiro
        if (!ValidationConfig.PHONE.PATTERNS.BR.test(phone)) {
            errors.push(ValidationMessages.PHONE_INVALID);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: phone.replace(/\D/g, '') // Apenas números
        };
    },
    
    // Validar CPF
    validateCPF: (cpf) => {
        const errors = [];
        
        if (!cpf || cpf.trim() === '') {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        cpf = cpf.trim().replace(/\D/g, '');
        
        // Verificar formato
        if (!ValidationConfig.CPF.PATTERN.test(cpf) && cpf.length !== 11) {
            errors.push(ValidationMessages.CPF_INVALID);
            return { isValid: false, errors };
        }
        
        // Verificar dígitos verificadores
        if (!ValidationUtils.isValidCPF(cpf)) {
            errors.push(ValidationMessages.CPF_INVALID);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: cpf
        };
    },
    
    // Verificar se CPF é válido (algoritmo)
    isValidCPF: (cpf) => {
        cpf = cpf.replace(/\D/g, '');
        
        if (cpf.length !== 11) return false;
        
        // Verificar se todos os dígitos são iguais
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        // Calcular primeiro dígito verificador
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let digit1 = 11 - (sum % 11);
        if (digit1 > 9) digit1 = 0;
        
        // Calcular segundo dígito verificador
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        let digit2 = 11 - (sum % 11);
        if (digit2 > 9) digit2 = 0;
        
        return digit1 === parseInt(cpf.charAt(9)) && digit2 === parseInt(cpf.charAt(10));
    },
    
    // Validar CEP
    validateCEP: (cep) => {
        const errors = [];
        
        if (!cep || cep.trim() === '') {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        cep = cep.trim();
        
        if (!ValidationConfig.CEP.PATTERN.test(cep)) {
            errors.push(ValidationMessages.CEP_INVALID);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: cep.replace(/\D/g, '')
        };
    },
    
    // Validar cartão de crédito
    validateCreditCard: (cardNumber) => {
        const errors = [];
        
        if (!cardNumber || cardNumber.trim() === '') {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        cardNumber = cardNumber.replace(/\D/g, '');
        
        // Verificar se corresponde a algum padrão conhecido
        const patterns = ValidationConfig.CREDIT_CARD.PATTERNS;
        const isValidPattern = Object.values(patterns).some(pattern => pattern.test(cardNumber));
        
        if (!isValidPattern) {
            errors.push(ValidationMessages.CREDIT_CARD_INVALID);
        }
        
        // Algoritmo de Luhn
        if (!ValidationUtils.luhnCheck(cardNumber)) {
            errors.push(ValidationMessages.CREDIT_CARD_INVALID);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            sanitized: cardNumber,
            type: ValidationUtils.getCreditCardType(cardNumber)
        };
    },
    
    // Algoritmo de Luhn para validação de cartão
    luhnCheck: (cardNumber) => {
        let sum = 0;
        let isEven = false;
        
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    },
    
    // Identificar tipo de cartão
    getCreditCardType: (cardNumber) => {
        const patterns = ValidationConfig.CREDIT_CARD.PATTERNS;
        
        if (patterns.VISA.test(cardNumber)) return 'visa';
        if (patterns.MASTERCARD.test(cardNumber)) return 'mastercard';
        if (patterns.AMEX.test(cardNumber)) return 'amex';
        if (patterns.DISCOVER.test(cardNumber)) return 'discover';
        
        return 'unknown';
    },
    
    // Validar confirmação de senha
    validatePasswordConfirmation: (password, confirmation) => {
        const errors = [];
        
        if (!confirmation || confirmation.trim() === '') {
            errors.push(ValidationMessages.REQUIRED);
            return { isValid: false, errors };
        }
        
        if (password !== confirmation) {
            errors.push(ValidationMessages.PASSWORDS_DONT_MATCH);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    // Validar formulário completo
    validateForm: (formData, rules) => {
        const results = {};
        let isFormValid = true;
        
        Object.keys(rules).forEach(field => {
            const rule = rules[field];
            const value = formData[field];
            
            let result;
            switch (rule.type) {
                case 'email':
                    result = ValidationUtils.validateEmail(value);
                    break;
                case 'password':
                    result = ValidationUtils.validatePassword(value);
                    break;
                case 'name':
                    result = ValidationUtils.validateName(value);
                    break;
                case 'phone':
                    result = ValidationUtils.validatePhone(value);
                    break;
                case 'cpf':
                    result = ValidationUtils.validateCPF(value);
                    break;
                case 'cep':
                    result = ValidationUtils.validateCEP(value);
                    break;
                case 'creditCard':
                    result = ValidationUtils.validateCreditCard(value);
                    break;
                case 'passwordConfirmation':
                    result = ValidationUtils.validatePasswordConfirmation(formData.password, value);
                    break;
                default:
                    result = { isValid: true, errors: [] };
            }
            
            results[field] = result;
            if (!result.isValid) {
                isFormValid = false;
            }
        });
        
        return {
            isValid: isFormValid,
            fields: results
        };
    }
};

// Gerenciador de Validação de Formulários
const FormValidationManager = {
    // Configurar validação em tempo real
    setupRealTimeValidation: (formId, rules) => {
        const form = document.getElementById(formId);
        if (!form) return;
        
        Object.keys(rules).forEach(fieldName => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;
            
            // Validação em tempo real
            field.addEventListener('blur', () => {
                FormValidationManager.validateField(field, rules[fieldName]);
            });
            
            // Limpar erros ao digitar
            field.addEventListener('input', () => {
                FormValidationManager.clearFieldErrors(field);
            });
        });
        
        // Validação no submit
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            FormValidationManager.validateAndSubmitForm(form, rules);
        });
    },
    
    // Validar campo individual
    validateField: (field, rule) => {
        const value = field.value;
        let result;
        
        switch (rule.type) {
            case 'email':
                result = ValidationUtils.validateEmail(value);
                break;
            case 'password':
                result = ValidationUtils.validatePassword(value);
                break;
            case 'name':
                result = ValidationUtils.validateName(value);
                break;
            case 'phone':
                result = ValidationUtils.validatePhone(value);
                break;
            case 'cpf':
                result = ValidationUtils.validateCPF(value);
                break;
            case 'cep':
                result = ValidationUtils.validateCEP(value);
                break;
            case 'creditCard':
                result = ValidationUtils.validateCreditCard(value);
                break;
            default:
                result = { isValid: true, errors: [] };
        }
        
        FormValidationManager.displayFieldValidation(field, result);
        return result;
    },
    
    // Exibir resultado da validação
    displayFieldValidation: (field, result) => {
        const container = field.parentElement;
        
        // Remover mensagens anteriores
        FormValidationManager.clearFieldErrors(field);
        
        if (!result.isValid) {
            field.classList.add('invalid');
            
            result.errors.forEach(error => {
                const errorElement = document.createElement('div');
                errorElement.className = 'field-error';
                errorElement.textContent = error;
                container.appendChild(errorElement);
            });
        } else {
            field.classList.remove('invalid');
            field.classList.add('valid');
        }
    },
    
    // Limpar erros do campo
    clearFieldErrors: (field) => {
        field.classList.remove('invalid', 'valid');
        const container = field.parentElement;
        const errors = container.querySelectorAll('.field-error');
        errors.forEach(error => error.remove());
    },
    
    // Validar e submeter formulário
    validateAndSubmitForm: (form, rules) => {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const validation = ValidationUtils.validateForm(data, rules);
        
        if (validation.isValid) {
            // Formulário válido - prosseguir com submit
            FormValidationManager.handleValidForm(form, data, validation);
        } else {
            // Exibir erros
            Object.keys(validation.fields).forEach(fieldName => {
                const field = form.querySelector(`[name="${fieldName}"]`);
                if (field) {
                    FormValidationManager.displayFieldValidation(field, validation.fields[fieldName]);
                }
            });
            
            Utils.showNotification('Por favor, corrija os erros no formulário', 'error');
        }
    },
    
    // Lidar com formulário válido
    handleValidForm: (form, data, validation) => {
        // Sanitizar dados
        const sanitizedData = {};
        Object.keys(validation.fields).forEach(field => {
            const result = validation.fields[field];
            sanitizedData[field] = result.sanitized || data[field];
        });
        
        // Disparar evento customizado
        const event = new CustomEvent('formValidated', {
            detail: { form, data: sanitizedData, validation }
        });
        form.dispatchEvent(event);
        
        Utils.showNotification('Formulário validado com sucesso!', 'success');
    }
};

// Exportar para uso global
window.ValidationUtils = ValidationUtils;
window.FormValidationManager = FormValidationManager;
window.ValidationConfig = ValidationConfig;
window.ValidationMessages = ValidationMessages;