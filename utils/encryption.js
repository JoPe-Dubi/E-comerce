const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * Utilitários de Criptografia para Sistema de Pagamentos
 * Gerencia criptografia de dados sensíveis, hashing e tokenização
 */

class EncryptionUtils {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32; // 256 bits
        this.ivLength = 16; // 128 bits
        this.tagLength = 16; // 128 bits
        this.saltRounds = 12;
        
        // Chave mestra para criptografia (deve vir do ambiente)
        this.masterKey = this.getMasterKey();
    }

    /**
     * Obter chave mestra do ambiente
     */
    getMasterKey() {
        const key = process.env.ENCRYPTION_KEY;
        
        if (!key) {
            throw new Error('ENCRYPTION_KEY não definida no ambiente');
        }

        if (key.length !== 64) { // 32 bytes em hex = 64 caracteres
            throw new Error('ENCRYPTION_KEY deve ter 64 caracteres (32 bytes em hex)');
        }

        return Buffer.from(key, 'hex');
    }

    /**
     * Criptografar dados sensíveis
     */
    encrypt(plaintext) {
        try {
            if (!plaintext) {
                throw new Error('Texto para criptografia não pode estar vazio');
            }

            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, this.masterKey, { iv });
            
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            // Combinar IV + tag + dados criptografados
            const result = iv.toString('hex') + tag.toString('hex') + encrypted;
            
            return result;
        } catch (error) {
            throw new Error(`Erro na criptografia: ${error.message}`);
        }
    }

    /**
     * Descriptografar dados
     */
    decrypt(encryptedData) {
        try {
            if (!encryptedData || encryptedData.length < (this.ivLength + this.tagLength) * 2) {
                throw new Error('Dados criptografados inválidos');
            }

            // Extrair IV, tag e dados criptografados
            const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
            const tag = Buffer.from(encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2), 'hex');
            const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
            
            const decipher = crypto.createDecipher(this.algorithm, this.masterKey, { iv });
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`Erro na descriptografia: ${error.message}`);
        }
    }

    /**
     * Criptografar dados do cartão
     */
    encryptCardData(cardData) {
        try {
            const sensitiveData = {
                number: cardData.number,
                cvv: cardData.cvv,
                expiryMonth: cardData.expiryMonth,
                expiryYear: cardData.expiryYear
            };

            const encrypted = this.encrypt(JSON.stringify(sensitiveData));
            
            return {
                encryptedData: encrypted,
                maskedNumber: this.maskCardNumber(cardData.number),
                brand: this.detectCardBrand(cardData.number),
                lastFourDigits: cardData.number.slice(-4)
            };
        } catch (error) {
            throw new Error(`Erro ao criptografar dados do cartão: ${error.message}`);
        }
    }

    /**
     * Descriptografar dados do cartão
     */
    decryptCardData(encryptedData) {
        try {
            const decrypted = this.decrypt(encryptedData);
            return JSON.parse(decrypted);
        } catch (error) {
            throw new Error(`Erro ao descriptografar dados do cartão: ${error.message}`);
        }
    }

    /**
     * Mascarar número do cartão
     */
    maskCardNumber(cardNumber) {
        if (!cardNumber || cardNumber.length < 8) {
            return '****';
        }

        const firstFour = cardNumber.slice(0, 4);
        const lastFour = cardNumber.slice(-4);
        const middle = '*'.repeat(cardNumber.length - 8);
        
        return `${firstFour}${middle}${lastFour}`;
    }

    /**
     * Detectar bandeira do cartão
     */
    detectCardBrand(cardNumber) {
        const number = cardNumber.replace(/\D/g, '');
        
        const patterns = {
            visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
            mastercard: /^5[1-5][0-9]{14}$/,
            amex: /^3[47][0-9]{13}$/,
            elo: /^((((636368)|(438935)|(504175)|(451416)|(636297))\d{0,10})|((5067)|(4576)|(4011))\d{0,12})$/,
            hipercard: /^(606282\d{10}(\d{3})?)|(3841\d{15})$/,
            diners: /^3[0689][0-9]{11,16}$/
        };

        for (const [brand, pattern] of Object.entries(patterns)) {
            if (pattern.test(number)) {
                return brand;
            }
        }

        return 'unknown';
    }

    /**
     * Gerar hash seguro para senhas
     */
    async hashPassword(password) {
        try {
            if (!password || password.length < 6) {
                throw new Error('Senha deve ter pelo menos 6 caracteres');
            }

            return await bcrypt.hash(password, this.saltRounds);
        } catch (error) {
            throw new Error(`Erro ao gerar hash da senha: ${error.message}`);
        }
    }

    /**
     * Verificar senha com hash
     */
    async verifyPassword(password, hash) {
        try {
            return await bcrypt.compare(password, hash);
        } catch (error) {
            throw new Error(`Erro ao verificar senha: ${error.message}`);
        }
    }

    /**
     * Gerar token seguro
     */
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Gerar ID único
     */
    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}_${random}`;
    }

    /**
     * Gerar chave PIX aleatória
     */
    generatePixKey() {
        return crypto.randomUUID();
    }

    /**
     * Hash para dados não sensíveis (identificação)
     */
    hashData(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Gerar HMAC para verificação de integridade
     */
    generateHMAC(data, secret = null) {
        const key = secret || process.env.HMAC_SECRET || 'default_hmac_secret';
        return crypto.createHmac('sha256', key).update(data).digest('hex');
    }

    /**
     * Verificar HMAC
     */
    verifyHMAC(data, signature, secret = null) {
        const expectedSignature = this.generateHMAC(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Criptografar dados com chave específica
     */
    encryptWithKey(plaintext, key) {
        try {
            const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
            
            if (keyBuffer.length !== this.keyLength) {
                throw new Error(`Chave deve ter ${this.keyLength} bytes`);
            }

            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipher(this.algorithm, keyBuffer, { iv });
            
            let encrypted = cipher.update(plaintext, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            return iv.toString('hex') + tag.toString('hex') + encrypted;
        } catch (error) {
            throw new Error(`Erro na criptografia com chave: ${error.message}`);
        }
    }

    /**
     * Descriptografar dados com chave específica
     */
    decryptWithKey(encryptedData, key) {
        try {
            const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
            
            if (keyBuffer.length !== this.keyLength) {
                throw new Error(`Chave deve ter ${this.keyLength} bytes`);
            }

            const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
            const tag = Buffer.from(encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2), 'hex');
            const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
            
            const decipher = crypto.createDecipher(this.algorithm, keyBuffer, { iv });
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            throw new Error(`Erro na descriptografia com chave: ${error.message}`);
        }
    }

    /**
     * Gerar par de chaves RSA
     */
    generateRSAKeyPair() {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });
    }

    /**
     * Criptografar com chave pública RSA
     */
    encryptRSA(plaintext, publicKey) {
        try {
            return crypto.publicEncrypt(publicKey, Buffer.from(plaintext)).toString('base64');
        } catch (error) {
            throw new Error(`Erro na criptografia RSA: ${error.message}`);
        }
    }

    /**
     * Descriptografar com chave privada RSA
     */
    decryptRSA(encryptedData, privateKey) {
        try {
            return crypto.privateDecrypt(privateKey, Buffer.from(encryptedData, 'base64')).toString();
        } catch (error) {
            throw new Error(`Erro na descriptografia RSA: ${error.message}`);
        }
    }

    /**
     * Assinar dados com chave privada RSA
     */
    signRSA(data, privateKey) {
        try {
            const sign = crypto.createSign('SHA256');
            sign.update(data);
            return sign.sign(privateKey, 'base64');
        } catch (error) {
            throw new Error(`Erro na assinatura RSA: ${error.message}`);
        }
    }

    /**
     * Verificar assinatura com chave pública RSA
     */
    verifyRSA(data, signature, publicKey) {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            return verify.verify(publicKey, signature, 'base64');
        } catch (error) {
            throw new Error(`Erro na verificação RSA: ${error.message}`);
        }
    }

    /**
     * Derivar chave usando PBKDF2
     */
    deriveKey(password, salt, iterations = 100000) {
        return crypto.pbkdf2Sync(password, salt, iterations, this.keyLength, 'sha256');
    }

    /**
     * Gerar salt aleatório
     */
    generateSalt(length = 16) {
        return crypto.randomBytes(length);
    }

    /**
     * Validar força da senha
     */
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const score = [
            password.length >= minLength,
            hasUpperCase,
            hasLowerCase,
            hasNumbers,
            hasSpecialChar
        ].filter(Boolean).length;

        const strength = {
            0: 'muito_fraca',
            1: 'fraca',
            2: 'regular',
            3: 'boa',
            4: 'forte',
            5: 'muito_forte'
        };

        return {
            score,
            strength: strength[score],
            isValid: score >= 3,
            requirements: {
                minLength: password.length >= minLength,
                hasUpperCase,
                hasLowerCase,
                hasNumbers,
                hasSpecialChar
            }
        };
    }
}

// Instância singleton
const encryptionUtils = new EncryptionUtils();

module.exports = encryptionUtils;