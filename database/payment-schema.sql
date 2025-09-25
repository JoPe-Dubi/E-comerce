-- Schema para Sistema de Pagamentos
-- Criado para suportar múltiplas formas de pagamento: PIX, Cartão de Crédito, Débito e Boleto

-- Tabela de métodos de pagamento disponíveis
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'pix', 'credit_card', 'debit_card', 'boleto'
    display_name VARCHAR(100) NOT NULL, -- Nome para exibição
    is_active BOOLEAN DEFAULT 1,
    processing_fee DECIMAL(5,4) DEFAULT 0.0000, -- Taxa de processamento (ex: 0.0299 = 2.99%)
    min_amount DECIMAL(10,2) DEFAULT 0.01,
    max_amount DECIMAL(10,2) DEFAULT 999999.99,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela principal de transações
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id VARCHAR(100) UNIQUE NOT NULL, -- ID único da transação
    user_id INTEGER NOT NULL,
    order_id INTEGER,
    payment_method_id INTEGER NOT NULL,
    
    -- Valores
    amount DECIMAL(10,2) NOT NULL, -- Valor principal
    processing_fee DECIMAL(10,2) DEFAULT 0.00, -- Taxa de processamento
    total_amount DECIMAL(10,2) NOT NULL, -- Valor total (amount + processing_fee)
    
    -- Status da transação
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled, refunded
    
    -- Dados do pagamento
    payment_data TEXT, -- JSON com dados específicos do método de pagamento
    
    -- Informações de processamento
    processor_transaction_id VARCHAR(200), -- ID da transação no processador (Stripe, PagSeguro, etc.)
    processor_response TEXT, -- Resposta completa do processador
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    completed_at DATETIME,
    
    -- Índices e constraints
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
);

-- Tabela específica para pagamentos PIX
CREATE TABLE IF NOT EXISTS pix_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    
    -- Dados PIX
    pix_key VARCHAR(200), -- Chave PIX do recebedor
    pix_key_type VARCHAR(20), -- 'cpf', 'cnpj', 'email', 'phone', 'random'
    qr_code TEXT, -- Código QR para pagamento
    qr_code_image TEXT, -- Base64 da imagem do QR Code
    copy_paste_code TEXT, -- Código copia e cola
    
    -- Informações do pagador
    payer_name VARCHAR(200),
    payer_document VARCHAR(20),
    payer_email VARCHAR(200),
    
    -- Status específico PIX
    pix_status VARCHAR(20) DEFAULT 'waiting', -- waiting, paid, expired
    expires_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Tabela específica para pagamentos com cartão
CREATE TABLE IF NOT EXISTS card_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    
    -- Dados do cartão (criptografados)
    card_token VARCHAR(200), -- Token do cartão (nunca armazenar número real)
    card_brand VARCHAR(20), -- visa, mastercard, elo, etc.
    card_last_digits VARCHAR(4), -- Últimos 4 dígitos
    
    -- Dados do portador
    holder_name VARCHAR(200),
    holder_document VARCHAR(20),
    
    -- Informações de cobrança
    billing_address TEXT, -- JSON com endereço de cobrança
    
    -- Parcelamento
    installments INTEGER DEFAULT 1,
    installment_amount DECIMAL(10,2),
    
    -- Dados de autorização
    authorization_code VARCHAR(50),
    nsu VARCHAR(50), -- Número Sequencial Único
    tid VARCHAR(50), -- Transaction ID
    
    -- Status específico do cartão
    card_status VARCHAR(20) DEFAULT 'pending', -- pending, authorized, captured, failed
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Tabela específica para boletos bancários
CREATE TABLE IF NOT EXISTS boleto_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    
    -- Dados do boleto
    barcode VARCHAR(100), -- Código de barras
    digitable_line VARCHAR(100), -- Linha digitável
    boleto_url TEXT, -- URL para visualizar/imprimir boleto
    
    -- Dados do pagador
    payer_name VARCHAR(200),
    payer_document VARCHAR(20),
    payer_email VARCHAR(200),
    payer_address TEXT, -- JSON com endereço completo
    
    -- Informações bancárias
    bank_code VARCHAR(10),
    agency VARCHAR(10),
    account VARCHAR(20),
    
    -- Datas
    due_date DATE NOT NULL,
    expires_at DATETIME,
    
    -- Instruções
    instructions TEXT,
    
    -- Status específico do boleto
    boleto_status VARCHAR(20) DEFAULT 'issued', -- issued, paid, expired, cancelled
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Tabela de logs de transações para auditoria
CREATE TABLE IF NOT EXISTS transaction_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    
    -- Informações do log
    event_type VARCHAR(50) NOT NULL, -- created, updated, processed, completed, failed, etc.
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    
    -- Dados do evento
    event_data TEXT, -- JSON com dados específicos do evento
    error_message TEXT,
    
    -- Metadados
    user_agent TEXT,
    ip_address VARCHAR(45),
    user_id INTEGER,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

-- Tabela de configurações de pagamento
CREATE TABLE IF NOT EXISTS payment_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);

CREATE INDEX IF NOT EXISTS idx_pix_payments_transaction_id ON pix_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(pix_status);

CREATE INDEX IF NOT EXISTS idx_card_payments_transaction_id ON card_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_card_payments_status ON card_payments(card_status);

CREATE INDEX IF NOT EXISTS idx_boleto_payments_transaction_id ON boleto_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_boleto_payments_due_date ON boleto_payments(due_date);

CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_event_type ON transaction_logs(event_type);

-- Inserir métodos de pagamento padrão
INSERT OR IGNORE INTO payment_methods (name, display_name, processing_fee, min_amount, max_amount) VALUES
('pix', 'PIX', 0.0000, 0.01, 50000.00),
('credit_card', 'Cartão de Crédito', 0.0399, 1.00, 10000.00),
('debit_card', 'Cartão de Débito', 0.0199, 1.00, 5000.00),
('boleto', 'Boleto Bancário', 3.50, 5.00, 50000.00);

-- Inserir configurações padrão
INSERT OR IGNORE INTO payment_settings (setting_key, setting_value, description) VALUES
('pix_key', '', 'Chave PIX para recebimento'),
('pix_key_type', 'random', 'Tipo da chave PIX (cpf, cnpj, email, phone, random)'),
('stripe_public_key', '', 'Chave pública do Stripe'),
('stripe_secret_key', '', 'Chave secreta do Stripe (criptografada)'),
('boleto_bank_code', '001', 'Código do banco para boletos'),
('boleto_agency', '', 'Agência para boletos'),
('boleto_account', '', 'Conta para boletos'),
('payment_timeout', '1800', 'Timeout para pagamentos em segundos (30 min)'),
('max_installments', '12', 'Número máximo de parcelas'),
('min_installment_amount', '10.00', 'Valor mínimo da parcela');

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_transactions_updated_at 
    AFTER UPDATE ON transactions
    BEGIN
        UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_payment_methods_updated_at 
    AFTER UPDATE ON payment_methods
    BEGIN
        UPDATE payment_methods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_pix_payments_updated_at 
    AFTER UPDATE ON pix_payments
    BEGIN
        UPDATE pix_payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_card_payments_updated_at 
    AFTER UPDATE ON card_payments
    BEGIN
        UPDATE card_payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_boleto_payments_updated_at 
    AFTER UPDATE ON boleto_payments
    BEGIN
        UPDATE boleto_payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;