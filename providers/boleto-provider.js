const crypto = require('crypto');
const { logger } = require('../utils/logger');

/**
 * Provedor de Pagamento com Boleto Bancário
 * Gerencia a geração e processamento de boletos bancários
 */
class BoletoProvider {
    constructor() {
        this.bankCode = process.env.BOLETO_BANK_CODE || '001'; // Banco do Brasil
        this.agencyCode = process.env.BOLETO_AGENCY_CODE || '1234';
        this.accountCode = process.env.BOLETO_ACCOUNT_CODE || '56789';
        this.beneficiaryDocument = process.env.BENEFICIARY_DOCUMENT || '12345678000199';
        this.beneficiaryName = process.env.BENEFICIARY_NAME || 'Sua Empresa LTDA';
        this.beneficiaryAddress = process.env.BENEFICIARY_ADDRESS || 'Rua Exemplo, 123 - São Paulo/SP';
        this.apiKey = process.env.BOLETO_API_KEY || 'test_boleto_api_key';
        this.apiUrl = process.env.BOLETO_API_URL || 'https://api.boleto.com';
    }

    /**
     * Gerar boleto bancário
     */
    async generateBoleto(boletoData) {
        try {
            const {
                amount,
                dueDate,
                description,
                transactionId,
                customer
            } = boletoData;

            // Validar dados do boleto
            this.validateBoletoData(boletoData);

            // Gerar número do boleto
            const boletoNumber = this.generateBoletoNumber();

            // Gerar nosso número
            const ourNumber = this.generateOurNumber(transactionId);

            // Gerar código de barras
            const barcode = this.generateBarcode({
                amount,
                dueDate,
                ourNumber,
                boletoNumber
            });

            // Gerar linha digitável
            const digitableLine = this.generateDigitableLine(barcode);

            // Gerar URL do boleto (PDF)
            const boletoUrl = await this.generateBoletoUrl({
                boletoNumber,
                barcode,
                digitableLine,
                amount,
                dueDate,
                description,
                customer,
                ourNumber
            });

            logger.info('Boleto gerado com sucesso:', {
                transactionId,
                boletoNumber,
                ourNumber,
                amount,
                dueDate
            });

            return {
                boletoNumber,
                ourNumber,
                barcode,
                digitableLine,
                boletoUrl,
                dueDate: dueDate.toISOString(),
                amount,
                description,
                customer
            };

        } catch (error) {
            logger.error('Erro ao gerar boleto:', error);
            throw new Error('Falha ao gerar boleto bancário');
        }
    }

    /**
     * Consultar status do boleto
     */
    async checkBoletoStatus(boletoNumber) {
        try {
            // Em um ambiente real, você consultaria a API do banco
            // Simulação de consulta de status
            const mockStatus = this.simulateBoletoStatus();

            logger.info('Status do boleto consultado:', {
                boletoNumber,
                status: mockStatus
            });

            return {
                boletoNumber,
                status: mockStatus,
                paidAt: mockStatus === 'paid' ? new Date().toISOString() : null
            };

        } catch (error) {
            logger.error('Erro ao consultar status do boleto:', error);
            throw new Error('Falha ao consultar status do boleto');
        }
    }

    /**
     * Processar webhook de boleto
     */
    async processBoletoWebhook(webhookData) {
        try {
            const { boletoNumber, status, paidAt, amount, paidAmount } = webhookData;

            // Validar dados do webhook
            if (!boletoNumber || !status) {
                throw new Error('Dados do webhook de boleto inválidos');
            }

            logger.info('Webhook de boleto recebido:', {
                boletoNumber,
                status,
                paidAt,
                amount,
                paidAmount
            });

            return {
                boletoNumber,
                status,
                paidAt,
                amount: parseFloat(amount),
                paidAmount: paidAmount ? parseFloat(paidAmount) : null
            };

        } catch (error) {
            logger.error('Erro ao processar webhook de boleto:', error);
            throw error;
        }
    }

    /**
     * Cancelar boleto
     */
    async cancelBoleto(boletoNumber) {
        try {
            // Simular cancelamento do boleto
            await new Promise(resolve => setTimeout(resolve, 500));

            logger.info('Boleto cancelado:', { boletoNumber });

            return {
                boletoNumber,
                status: 'cancelled',
                cancelledAt: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Erro ao cancelar boleto:', error);
            throw error;
        }
    }

    /**
     * Validar dados do boleto
     */
    validateBoletoData(data) {
        const { amount, dueDate, customer } = data;

        if (!amount || amount <= 0) {
            throw new Error('Valor do boleto deve ser positivo');
        }

        if (amount < 2.50) {
            throw new Error('Valor mínimo do boleto é R$ 2,50');
        }

        if (amount > 99999999.99) {
            throw new Error('Valor máximo do boleto é R$ 99.999.999,99');
        }

        if (!dueDate || dueDate <= new Date()) {
            throw new Error('Data de vencimento deve ser futura');
        }

        // Verificar se a data de vencimento não é muito distante
        const maxDueDate = new Date();
        maxDueDate.setFullYear(maxDueDate.getFullYear() + 1);
        
        if (dueDate > maxDueDate) {
            throw new Error('Data de vencimento não pode ser superior a 1 ano');
        }

        if (!customer || !customer.name || !customer.document) {
            throw new Error('Dados do cliente são obrigatórios');
        }

        if (!customer.address || !customer.address.street || !customer.address.city) {
            throw new Error('Endereço completo do cliente é obrigatório');
        }
    }

    /**
     * Gerar número do boleto
     */
    generateBoletoNumber() {
        const timestamp = Date.now().toString();
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${this.bankCode}${timestamp.slice(-8)}${random}`;
    }

    /**
     * Gerar nosso número
     */
    generateOurNumber(transactionId) {
        // Usar parte do transaction ID para garantir unicidade
        const hash = crypto.createHash('md5').update(transactionId).digest('hex');
        const number = parseInt(hash.substring(0, 8), 16).toString().padStart(11, '0');
        
        // Calcular dígito verificador
        const digit = this.calculateOurNumberDigit(number);
        
        return `${number}${digit}`;
    }

    /**
     * Calcular dígito verificador do nosso número
     */
    calculateOurNumberDigit(number) {
        const weights = [4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        let sum = 0;

        for (let i = 0; i < number.length; i++) {
            sum += parseInt(number[i]) * weights[i];
        }

        const remainder = sum % 11;
        
        if (remainder === 0 || remainder === 1) {
            return '0';
        } else {
            return (11 - remainder).toString();
        }
    }

    /**
     * Gerar código de barras
     */
    generateBarcode(data) {
        const { amount, dueDate, ourNumber } = data;

        // Código do banco (3 dígitos)
        let barcode = this.bankCode;

        // Código da moeda (1 dígito) - Real = 9
        barcode += '9';

        // Dígito verificador (será calculado depois)
        barcode += '0';

        // Fator de vencimento (4 dígitos)
        const dueFactor = this.calculateDueFactor(dueDate);
        barcode += dueFactor.toString().padStart(4, '0');

        // Valor (10 dígitos)
        const amountCents = Math.round(amount * 100);
        barcode += amountCents.toString().padStart(10, '0');

        // Campo livre (25 dígitos)
        const freeField = this.generateFreeField(ourNumber);
        barcode += freeField;

        // Calcular e inserir dígito verificador
        const digit = this.calculateBarcodeDigit(barcode);
        barcode = barcode.substring(0, 4) + digit + barcode.substring(5);

        return barcode;
    }

    /**
     * Calcular fator de vencimento
     */
    calculateDueFactor(dueDate) {
        const baseDate = new Date('1997-10-07'); // Data base do sistema bancário
        const diffTime = dueDate.getTime() - baseDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    /**
     * Gerar campo livre
     */
    generateFreeField(ourNumber) {
        // Agência (4 dígitos)
        let freeField = this.agencyCode.padStart(4, '0');

        // Nosso número (11 dígitos + 1 DV)
        freeField += ourNumber;

        // Conta (7 dígitos)
        freeField += this.accountCode.padStart(7, '0');

        // Completar com zeros até 25 dígitos
        freeField = freeField.padEnd(25, '0');

        return freeField.substring(0, 25);
    }

    /**
     * Calcular dígito verificador do código de barras
     */
    calculateBarcodeDigit(barcode) {
        // Remover o dígito verificador (posição 4)
        const code = barcode.substring(0, 4) + barcode.substring(5);
        
        const weights = [2, 3, 4, 5, 6, 7, 8, 9];
        let sum = 0;
        let weightIndex = 0;

        // Calcular da direita para a esquerda
        for (let i = code.length - 1; i >= 0; i--) {
            sum += parseInt(code[i]) * weights[weightIndex % weights.length];
            weightIndex++;
        }

        const remainder = sum % 11;
        
        if (remainder === 0 || remainder === 1) {
            return '1';
        } else {
            return (11 - remainder).toString();
        }
    }

    /**
     * Gerar linha digitável
     */
    generateDigitableLine(barcode) {
        // Campo 1: Posições 0-3 e 32-42 do código de barras
        const field1 = barcode.substring(0, 4) + barcode.substring(32, 37);
        const digit1 = this.calculateFieldDigit(field1);
        const formattedField1 = `${field1.substring(0, 5)}.${field1.substring(5)}${digit1}`;

        // Campo 2: Posições 37-47 do código de barras
        const field2 = barcode.substring(37, 47);
        const digit2 = this.calculateFieldDigit(field2);
        const formattedField2 = `${field2.substring(0, 5)}.${field2.substring(5)}${digit2}`;

        // Campo 3: Posições 47-56 do código de barras
        const field3 = barcode.substring(47, 57);
        const digit3 = this.calculateFieldDigit(field3);
        const formattedField3 = `${field3.substring(0, 5)}.${field3.substring(5)}${digit3}`;

        // Campo 4: Dígito verificador do código de barras (posição 4)
        const field4 = barcode.substring(4, 5);

        // Campo 5: Posições 5-19 do código de barras (fator de vencimento + valor)
        const field5 = barcode.substring(5, 19);

        return `${formattedField1} ${formattedField2} ${formattedField3} ${field4} ${field5}`;
    }

    /**
     * Calcular dígito verificador dos campos da linha digitável
     */
    calculateFieldDigit(field) {
        const weights = [2, 1];
        let sum = 0;

        for (let i = field.length - 1; i >= 0; i--) {
            let product = parseInt(field[i]) * weights[(field.length - 1 - i) % 2];
            
            if (product > 9) {
                product = Math.floor(product / 10) + (product % 10);
            }
            
            sum += product;
        }

        const remainder = sum % 10;
        return remainder === 0 ? '0' : (10 - remainder).toString();
    }

    /**
     * Gerar URL do boleto (simulação)
     */
    async generateBoletoUrl(boletoData) {
        try {
            // Em produção, isso geraria um PDF real do boleto
            // Por enquanto, retornamos uma URL simulada
            
            const { boletoNumber } = boletoData;
            
            // Simular geração de PDF
            await new Promise(resolve => setTimeout(resolve, 1000));

            return `${this.apiUrl}/boletos/${boletoNumber}/pdf`;

        } catch (error) {
            logger.error('Erro ao gerar URL do boleto:', error);
            throw new Error('Falha ao gerar PDF do boleto');
        }
    }

    /**
     * Simular status do boleto (para desenvolvimento)
     */
    simulateBoletoStatus() {
        const statuses = ['pending', 'paid', 'expired', 'cancelled'];
        const weights = [0.4, 0.3, 0.2, 0.1]; // 30% chance de estar pago
        
        const random = Math.random();
        let cumulative = 0;
        
        for (let i = 0; i < statuses.length; i++) {
            cumulative += weights[i];
            if (random <= cumulative) {
                return statuses[i];
            }
        }
        
        return 'pending';
    }

    /**
     * Formatar valor para exibição
     */
    formatAmount(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    }

    /**
     * Formatar data para exibição
     */
    formatDate(date) {
        return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    }

    /**
     * Validar linha digitável
     */
    validateDigitableLine(digitableLine) {
        // Remover espaços e pontos
        const cleanLine = digitableLine.replace(/[\s.]/g, '');
        
        if (cleanLine.length !== 47) {
            return false;
        }

        // Validar cada campo
        const field1 = cleanLine.substring(0, 10);
        const field2 = cleanLine.substring(10, 21);
        const field3 = cleanLine.substring(21, 32);
        
        const digit1 = this.calculateFieldDigit(field1.substring(0, 9));
        const digit2 = this.calculateFieldDigit(field2.substring(0, 10));
        const digit3 = this.calculateFieldDigit(field3.substring(0, 10));

        return (
            field1.substring(9, 10) === digit1 &&
            field2.substring(10, 11) === digit2 &&
            field3.substring(10, 11) === digit3
        );
    }

    /**
     * Extrair informações da linha digitável
     */
    parseDigitableLine(digitableLine) {
        const cleanLine = digitableLine.replace(/[\s.]/g, '');
        
        if (!this.validateDigitableLine(digitableLine)) {
            throw new Error('Linha digitável inválida');
        }

        // Extrair banco
        const bankCode = cleanLine.substring(0, 3);
        
        // Extrair valor
        const valueField = cleanLine.substring(37, 47);
        const amount = parseInt(valueField) / 100;
        
        // Extrair data de vencimento
        const dueFactor = parseInt(cleanLine.substring(33, 37));
        const baseDate = new Date('1997-10-07');
        const dueDate = new Date(baseDate.getTime() + dueFactor * 24 * 60 * 60 * 1000);

        return {
            bankCode,
            amount,
            dueDate: dueDate.toISOString(),
            digitableLine: cleanLine
        };
    }

    /**
     * Calcular juros e multa
     */
    calculateLateFees(amount, dueDate, paymentDate = new Date()) {
        const due = new Date(dueDate);
        const payment = new Date(paymentDate);
        
        if (payment <= due) {
            return {
                originalAmount: amount,
                lateDays: 0,
                interest: 0,
                fine: 0,
                totalAmount: amount
            };
        }

        const lateDays = Math.ceil((payment.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        
        // Multa de 2% após vencimento
        const fine = amount * 0.02;
        
        // Juros de 1% ao mês (0.033% ao dia)
        const dailyInterestRate = 0.01 / 30;
        const interest = amount * dailyInterestRate * lateDays;
        
        const totalAmount = amount + fine + interest;

        return {
            originalAmount: amount,
            lateDays,
            interest,
            fine,
            totalAmount
        };
    }

    /**
     * Obter informações do banco
     */
    getBankInfo(bankCode) {
        const banks = {
            '001': { name: 'Banco do Brasil', code: '001' },
            '033': { name: 'Santander', code: '033' },
            '104': { name: 'Caixa Econômica Federal', code: '104' },
            '237': { name: 'Bradesco', code: '237' },
            '341': { name: 'Itaú', code: '341' },
            '356': { name: 'Banco Real', code: '356' },
            '399': { name: 'HSBC', code: '399' },
            '422': { name: 'Banco Safra', code: '422' }
        };

        return banks[bankCode] || { name: 'Banco Desconhecido', code: bankCode };
    }
}

module.exports = BoletoProvider;