const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SSLManager {
    constructor(options = {}) {
        this.options = {
            // Diretórios
            certsDir: options.certsDir || process.env.CERTS_DIR || './certs',
            backupDir: options.backupDir || process.env.CERTS_BACKUP_DIR || './certs/backup',
            
            // Configurações de certificado
            keySize: options.keySize || 2048,
            validityDays: options.validityDays || 365,
            renewalThresholdDays: options.renewalThresholdDays || 30,
            
            // Informações do certificado
            country: options.country || process.env.SSL_COUNTRY || 'BR',
            state: options.state || process.env.SSL_STATE || 'SP',
            city: options.city || process.env.SSL_CITY || 'São Paulo',
            organization: options.organization || process.env.SSL_ORGANIZATION || 'CompreAqui',
            organizationalUnit: options.organizationalUnit || process.env.SSL_OU || 'IT Department',
            commonName: options.commonName || process.env.SSL_COMMON_NAME || 'localhost',
            
            // Configurações Let's Encrypt (para produção)
            useLetEncrypt: options.useLetEncrypt || process.env.USE_LETS_ENCRYPT === 'true',
            acmeEmail: options.acmeEmail || process.env.ACME_EMAIL,
            acmeServer: options.acmeServer || process.env.ACME_SERVER || 'https://acme-v02.api.letsencrypt.org/directory',
            
            // Domínios
            domains: options.domains || (process.env.SSL_DOMAINS ? process.env.SSL_DOMAINS.split(',') : ['localhost']),
            
            ...options
        };
        
        this.certificateInfo = null;
    }

    // Inicializar gerenciador SSL
    async initialize() {
        try {
            console.log('🔐 Inicializando gerenciador SSL...');
            
            // Criar diretórios necessários
            await this.ensureDirectories();
            
            // Verificar certificados existentes
            await this.checkExistingCertificates();
            
            console.log('✅ Gerenciador SSL inicializado');
            return true;
        } catch (error) {
            console.error('❌ Erro ao inicializar gerenciador SSL:', error);
            return false;
        }
    }

    // Garantir que os diretórios existem
    async ensureDirectories() {
        const dirs = [this.options.certsDir, this.options.backupDir];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    // Verificar certificados existentes
    async checkExistingCertificates() {
        try {
            const keyPath = path.join(this.options.certsDir, 'private-key.pem');
            const certPath = path.join(this.options.certsDir, 'certificate.pem');
            
            const keyExists = await this.fileExists(keyPath);
            const certExists = await this.fileExists(certPath);
            
            if (keyExists && certExists) {
                console.log('🔍 Certificados existentes encontrados, verificando validade...');
                const certInfo = await this.getCertificateInfo(certPath);
                
                if (certInfo.valid) {
                    console.log(`✅ Certificado válido até ${certInfo.validTo}`);
                    this.certificateInfo = certInfo;
                    
                    // Verificar se precisa renovar
                    if (this.needsRenewal(certInfo)) {
                        console.log('⚠️ Certificado precisa ser renovado em breve');
                        await this.scheduleRenewal();
                    }
                } else {
                    console.log('❌ Certificado inválido ou expirado, gerando novo...');
                    await this.generateCertificates();
                }
            } else {
                console.log('📝 Nenhum certificado encontrado, gerando novos...');
                await this.generateCertificates();
            }
        } catch (error) {
            console.error('Erro ao verificar certificados existentes:', error);
            throw error;
        }
    }

    // Verificar se arquivo existe
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Gerar certificados
    async generateCertificates() {
        try {
            console.log('🔧 Gerando novos certificados SSL...');
            
            if (this.options.useLetEncrypt && process.env.NODE_ENV === 'production') {
                await this.generateLetsEncryptCertificates();
            } else {
                await this.generateSelfSignedCertificates();
            }
            
            // Verificar certificados gerados
            const certPath = path.join(this.options.certsDir, 'certificate.pem');
            this.certificateInfo = await this.getCertificateInfo(certPath);
            
            console.log('✅ Certificados gerados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao gerar certificados:', error);
            throw error;
        }
    }

    // Gerar certificados Let's Encrypt
    async generateLetsEncryptCertificates() {
        try {
            if (!this.options.acmeEmail) {
                throw new Error('Email ACME é obrigatório para Let\'s Encrypt');
            }

            console.log('🌐 Gerando certificados Let\'s Encrypt...');
            
            // Usar certbot ou acme.sh
            const domains = this.options.domains.join(',');
            const command = `certbot certonly --standalone --email ${this.options.acmeEmail} --agree-tos --no-eff-email -d ${domains}`;
            
            execSync(command, { stdio: 'inherit' });
            
            // Copiar certificados para o diretório correto
            const letsEncryptDir = `/etc/letsencrypt/live/${this.options.domains[0]}`;
            await this.copyLetsEncryptCertificates(letsEncryptDir);
            
        } catch (error) {
            console.error('Erro ao gerar certificados Let\'s Encrypt:', error);
            console.log('🔄 Fallback para certificados auto-assinados...');
            await this.generateSelfSignedCertificates();
        }
    }

    // Copiar certificados Let's Encrypt
    async copyLetsEncryptCertificates(letsEncryptDir) {
        const files = [
            { src: 'privkey.pem', dest: 'private-key.pem' },
            { src: 'fullchain.pem', dest: 'certificate.pem' },
            { src: 'chain.pem', dest: 'ca-bundle.pem' }
        ];

        for (const file of files) {
            const srcPath = path.join(letsEncryptDir, file.src);
            const destPath = path.join(this.options.certsDir, file.dest);
            
            try {
                const content = await fs.readFile(srcPath, 'utf8');
                await fs.writeFile(destPath, content);
            } catch (error) {
                console.error(`Erro ao copiar ${file.src}:`, error);
            }
        }
    }

    // Gerar certificados auto-assinados
    async generateSelfSignedCertificates() {
        try {
            console.log('🔧 Gerando certificados auto-assinados...');
            
            const keyPath = path.join(this.options.certsDir, 'private-key.pem');
            const certPath = path.join(this.options.certsDir, 'certificate.pem');
            const csrPath = path.join(this.options.certsDir, 'certificate.csr');
            
            // Gerar chave privada
            const keyCommand = `openssl genrsa -out "${keyPath}" ${this.options.keySize}`;
            execSync(keyCommand, { stdio: 'pipe' });
            
            // Criar arquivo de configuração para o certificado
            const configPath = await this.createOpenSSLConfig();
            
            // Gerar CSR
            const csrCommand = `openssl req -new -key "${keyPath}" -out "${csrPath}" -config "${configPath}"`;
            execSync(csrCommand, { stdio: 'pipe' });
            
            // Gerar certificado auto-assinado
            const certCommand = `openssl x509 -req -in "${csrPath}" -signkey "${keyPath}" -out "${certPath}" -days ${this.options.validityDays} -extensions v3_req -extfile "${configPath}"`;
            execSync(certCommand, { stdio: 'pipe' });
            
            // Limpar arquivo CSR
            await fs.unlink(csrPath).catch(() => {});
            await fs.unlink(configPath).catch(() => {});
            
            console.log('✅ Certificados auto-assinados gerados');
        } catch (error) {
            console.error('Erro ao gerar certificados auto-assinados:', error);
            throw error;
        }
    }

    // Criar arquivo de configuração OpenSSL
    async createOpenSSLConfig() {
        const configPath = path.join(this.options.certsDir, 'openssl.conf');
        
        const altNames = this.options.domains.map((domain, index) => 
            `DNS.${index + 1} = ${domain}`
        ).join('\n');
        
        const config = `
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = ${this.options.country}
ST = ${this.options.state}
L = ${this.options.city}
O = ${this.options.organization}
OU = ${this.options.organizationalUnit}
CN = ${this.options.commonName}

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
${altNames}
        `.trim();
        
        await fs.writeFile(configPath, config);
        return configPath;
    }

    // Obter informações do certificado
    async getCertificateInfo(certPath) {
        try {
            const certContent = await fs.readFile(certPath, 'utf8');
            
            // Usar OpenSSL para obter informações do certificado
            const command = `openssl x509 -in "${certPath}" -text -noout`;
            const output = execSync(command, { encoding: 'utf8' });
            
            // Extrair datas de validade
            const validFromMatch = output.match(/Not Before: (.+)/);
            const validToMatch = output.match(/Not After : (.+)/);
            
            const validFrom = validFromMatch ? new Date(validFromMatch[1]) : null;
            const validTo = validToMatch ? new Date(validToMatch[1]) : null;
            
            // Extrair subject e issuer
            const subjectMatch = output.match(/Subject: (.+)/);
            const issuerMatch = output.match(/Issuer: (.+)/);
            
            // Calcular fingerprint
            const fingerprintCommand = `openssl x509 -in "${certPath}" -fingerprint -noout`;
            const fingerprintOutput = execSync(fingerprintCommand, { encoding: 'utf8' });
            const fingerprintMatch = fingerprintOutput.match(/SHA1 Fingerprint=(.+)/);
            
            const now = new Date();
            const isValid = validTo && validTo > now;
            const daysUntilExpiry = validTo ? Math.ceil((validTo - now) / (1000 * 60 * 60 * 24)) : 0;
            
            return {
                valid: isValid,
                validFrom: validFrom,
                validTo: validTo,
                daysUntilExpiry: daysUntilExpiry,
                subject: subjectMatch ? subjectMatch[1] : 'Unknown',
                issuer: issuerMatch ? issuerMatch[1] : 'Unknown',
                fingerprint: fingerprintMatch ? fingerprintMatch[1] : 'Unknown',
                isSelfSigned: this.isSelfSigned(output),
                domains: this.extractDomains(output)
            };
        } catch (error) {
            console.error('Erro ao obter informações do certificado:', error);
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Verificar se certificado é auto-assinado
    isSelfSigned(certOutput) {
        const subjectMatch = certOutput.match(/Subject: (.+)/);
        const issuerMatch = certOutput.match(/Issuer: (.+)/);
        
        return subjectMatch && issuerMatch && subjectMatch[1] === issuerMatch[1];
    }

    // Extrair domínios do certificado
    extractDomains(certOutput) {
        const domains = [];
        
        // Extrair CN
        const cnMatch = certOutput.match(/CN\s*=\s*([^,\n]+)/);
        if (cnMatch) {
            domains.push(cnMatch[1].trim());
        }
        
        // Extrair SANs
        const sanMatch = certOutput.match(/X509v3 Subject Alternative Name:\s*\n\s*(.+)/);
        if (sanMatch) {
            const sans = sanMatch[1].split(',').map(san => 
                san.trim().replace(/^DNS:/, '')
            );
            domains.push(...sans);
        }
        
        return [...new Set(domains)]; // Remover duplicatas
    }

    // Verificar se certificado precisa ser renovado
    needsRenewal(certInfo) {
        if (!certInfo || !certInfo.valid) {
            return true;
        }
        
        return certInfo.daysUntilExpiry <= this.options.renewalThresholdDays;
    }

    // Agendar renovação automática
    async scheduleRenewal() {
        console.log('📅 Agendando renovação automática de certificados...');
        
        // Em um ambiente real, isso seria configurado com cron ou similar
        // Por enquanto, apenas logamos a necessidade
        console.log(`⏰ Certificado deve ser renovado em ${this.certificateInfo.daysUntilExpiry} dias`);
    }

    // Renovar certificados
    async renewCertificates() {
        try {
            console.log('🔄 Renovando certificados...');
            
            // Fazer backup dos certificados atuais
            await this.backupCurrentCertificates();
            
            // Gerar novos certificados
            await this.generateCertificates();
            
            console.log('✅ Certificados renovados com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao renovar certificados:', error);
            
            // Restaurar backup em caso de erro
            await this.restoreBackup();
            return false;
        }
    }

    // Fazer backup dos certificados atuais
    async backupCurrentCertificates() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupSubDir = path.join(this.options.backupDir, timestamp);
            
            await fs.mkdir(backupSubDir, { recursive: true });
            
            const files = ['private-key.pem', 'certificate.pem', 'ca-bundle.pem'];
            
            for (const file of files) {
                const srcPath = path.join(this.options.certsDir, file);
                const destPath = path.join(backupSubDir, file);
                
                try {
                    await fs.copyFile(srcPath, destPath);
                } catch (error) {
                    // Arquivo pode não existir, continuar
                }
            }
            
            console.log(`📦 Backup criado em: ${backupSubDir}`);
        } catch (error) {
            console.error('Erro ao fazer backup:', error);
        }
    }

    // Restaurar backup
    async restoreBackup() {
        try {
            console.log('🔄 Restaurando backup dos certificados...');
            
            // Encontrar backup mais recente
            const backups = await fs.readdir(this.options.backupDir);
            if (backups.length === 0) {
                throw new Error('Nenhum backup encontrado');
            }
            
            const latestBackup = backups.sort().pop();
            const backupPath = path.join(this.options.backupDir, latestBackup);
            
            const files = ['private-key.pem', 'certificate.pem', 'ca-bundle.pem'];
            
            for (const file of files) {
                const srcPath = path.join(backupPath, file);
                const destPath = path.join(this.options.certsDir, file);
                
                try {
                    await fs.copyFile(srcPath, destPath);
                } catch (error) {
                    // Arquivo pode não existir no backup
                }
            }
            
            console.log('✅ Backup restaurado com sucesso');
        } catch (error) {
            console.error('❌ Erro ao restaurar backup:', error);
        }
    }

    // Validar certificados
    async validateCertificates() {
        try {
            const keyPath = path.join(this.options.certsDir, 'private-key.pem');
            const certPath = path.join(this.options.certsDir, 'certificate.pem');
            
            // Verificar se arquivos existem
            const keyExists = await this.fileExists(keyPath);
            const certExists = await this.fileExists(certPath);
            
            if (!keyExists || !certExists) {
                return {
                    valid: false,
                    error: 'Arquivos de certificado não encontrados'
                };
            }
            
            // Verificar se chave privada corresponde ao certificado
            const keyModulus = execSync(`openssl rsa -in "${keyPath}" -modulus -noout`, { encoding: 'utf8' });
            const certModulus = execSync(`openssl x509 -in "${certPath}" -modulus -noout`, { encoding: 'utf8' });
            
            if (keyModulus !== certModulus) {
                return {
                    valid: false,
                    error: 'Chave privada não corresponde ao certificado'
                };
            }
            
            // Obter informações do certificado
            const certInfo = await this.getCertificateInfo(certPath);
            
            return {
                valid: certInfo.valid,
                info: certInfo,
                needsRenewal: this.needsRenewal(certInfo)
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    // Obter status dos certificados
    getStatus() {
        return {
            certificatesLoaded: !!this.certificateInfo,
            certificateInfo: this.certificateInfo,
            needsRenewal: this.certificateInfo ? this.needsRenewal(this.certificateInfo) : false,
            useLetEncrypt: this.options.useLetEncrypt,
            domains: this.options.domains,
            certsDirectory: this.options.certsDir
        };
    }

    // Limpar backups antigos
    async cleanupOldBackups(daysToKeep = 30) {
        try {
            const backups = await fs.readdir(this.options.backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            for (const backup of backups) {
                const backupPath = path.join(this.options.backupDir, backup);
                const stats = await fs.stat(backupPath);
                
                if (stats.isDirectory() && stats.mtime < cutoffDate) {
                    await fs.rmdir(backupPath, { recursive: true });
                    console.log(`🗑️ Backup antigo removido: ${backup}`);
                }
            }
        } catch (error) {
            console.error('Erro ao limpar backups antigos:', error);
        }
    }
}

module.exports = SSLManager;