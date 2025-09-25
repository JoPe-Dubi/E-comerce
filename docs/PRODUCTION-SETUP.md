# Configuração de Produção

Este guia descreve como configurar e executar a aplicação em ambiente de produção com segurança HTTPS, SSL/TLS e monitoramento.

## 📋 Pré-requisitos

- Node.js 16+ 
- Domínio configurado com DNS
- Certificados SSL válidos (Let's Encrypt recomendado)
- Servidor com pelo menos 2GB RAM
- Acesso SSH ao servidor

## 🚀 Configuração Inicial

### 1. Executar Setup Automático

```bash
npm run setup:production
```

Este comando irá:
- ✅ Verificar pré-requisitos
- 📁 Criar diretórios necessários
- 🔐 Gerar segredos e chaves
- 📝 Criar arquivo `.env.production`
- 🔒 Configurar SSL (certificado auto-assinado para desenvolvimento)
- ✅ Validar configuração
- 📜 Criar script de inicialização

### 2. Configurar Variáveis de Ambiente

Edite o arquivo `.env.production` gerado:

```env
# Domínio e URLs
DOMAIN=seu-dominio.com
BASE_URL=https://seu-dominio.com
ALLOWED_ORIGINS=https://seu-dominio.com

# SSL/TLS
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
SSL_CA_PATH=./ssl/ca-bundle.crt
FORCE_HTTPS=true

# E-mail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@exemplo.com
SMTP_PASS=sua-senha-de-app

# Pagamentos Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 3. Configurar Certificados SSL

#### Opção A: Let's Encrypt (Recomendado)

```bash
# Instalar certbot
sudo apt-get install certbot

# Obter certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Copiar certificados
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem ./ssl/private.key
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem ./ssl/certificate.crt
sudo chown $USER:$USER ./ssl/*
```

#### Opção B: Certificado Comercial

Coloque os arquivos do certificado em:
- `./ssl/private.key` - Chave privada
- `./ssl/certificate.crt` - Certificado
- `./ssl/ca-bundle.crt` - Cadeia de certificação (opcional)

#### Opção C: Desenvolvimento (Auto-assinado)

```bash
npm run ssl:generate
```

## 🔧 Configuração do Servidor

### Nginx (Proxy Reverso)

Crie `/etc/nginx/sites-available/seu-app`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass https://localhost:3443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar site:
```bash
sudo ln -s /etc/nginx/sites-available/seu-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### PM2 (Process Manager)

```bash
# Instalar PM2
npm install -g pm2

# Criar arquivo ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'ecommerce-app',
    script: 'start-production.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HTTPS_PORT: 3443
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2.log',
    time: true
  }]
};
EOF

# Iniciar aplicação
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🏃‍♂️ Executar Aplicação

### Modo Direto

```bash
npm run start:production
```

### Com PM2 (Recomendado)

```bash
pm2 start ecosystem.config.js
```

## 🏥 Monitoramento e Health Checks

### Health Check Manual

```bash
npm run health:check
```

### Monitoramento Contínuo

```bash
npm run health:monitor
```

### Relatório de Segurança

```bash
npm run security:report
```

### Logs

```bash
# Ver logs da aplicação
tail -f logs/app.log

# Ver logs do PM2
pm2 logs

# Ver logs de health check
tail -f logs/health-check.log
```

## 🔒 Segurança

### Cabeçalhos de Segurança Aplicados

- **HSTS**: Força HTTPS por 1 ano
- **CSP**: Content Security Policy restritiva
- **X-Frame-Options**: Previne clickjacking
- **X-Content-Type-Options**: Previne MIME sniffing
- **X-XSS-Protection**: Proteção contra XSS
- **Referrer-Policy**: Controla informações de referrer

### Rate Limiting

- 100 requisições por 15 minutos por IP
- Proteção contra ataques de força bruta
- Whitelist para IPs confiáveis

### Validação SSL

```bash
# Verificar certificado
npm run ssl:check

# Renovar certificado
npm run ssl:renew
```

## 📊 Métricas e Alertas

### Métricas Coletadas

- Tempo de resposta das requisições
- Taxa de erro
- Uso de memória e CPU
- Conexões de banco de dados
- Métricas de negócio (usuários, pedidos)

### Alertas Configurados

- Taxa de erro > 5%
- Tempo de resposta > 2000ms
- Uso de memória > 80%
- Queries lentas > 1000ms

### Dashboard

Acesse: `https://seu-dominio.com/admin/monitoring`

## 🔄 Backup e Recuperação

### Backup Automático

```bash
# Configurar backup diário
crontab -e

# Adicionar linha:
0 2 * * * /path/to/backup-script.sh
```

### Backup Manual

```bash
# Backup do banco de dados
cp data/production.db backups/db-$(date +%Y%m%d).db

# Backup dos uploads
tar -czf backups/uploads-$(date +%Y%m%d).tar.gz uploads/
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Erro de Certificado SSL

```bash
# Verificar certificado
openssl x509 -in ssl/certificate.crt -text -noout

# Verificar chave privada
openssl rsa -in ssl/private.key -check
```

#### 2. Porta em Uso

```bash
# Verificar processos na porta
lsof -i :3443
netstat -tulpn | grep :3443

# Matar processo
kill -9 <PID>
```

#### 3. Permissões de Arquivo

```bash
# Corrigir permissões
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt
chown $USER:$USER ssl/*
```

#### 4. Erro de Memória

```bash
# Verificar uso de memória
free -h
ps aux --sort=-%mem | head

# Reiniciar aplicação
pm2 restart ecommerce-app
```

### Logs de Debug

```bash
# Ativar logs detalhados
export DEBUG=*
npm run start:production

# Ou via PM2
pm2 start ecosystem.config.js --env development
```

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique os logs: `logs/app.log`
2. Execute health check: `npm run health:check`
3. Consulte a documentação da API
4. Abra uma issue no repositório

## 🔄 Atualizações

### Deploy de Nova Versão

```bash
# 1. Backup
npm run backup

# 2. Atualizar código
git pull origin main

# 3. Instalar dependências
npm ci --production

# 4. Executar testes
npm test

# 5. Reiniciar aplicação
pm2 restart ecommerce-app

# 6. Verificar saúde
npm run health:check
```

### Rollback

```bash
# Voltar para versão anterior
git checkout <commit-anterior>
npm ci --production
pm2 restart ecommerce-app
```

## 📈 Performance

### Otimizações Aplicadas

- Compressão gzip/brotli
- Cache de arquivos estáticos
- Pool de conexões do banco
- Clustering com PM2
- CDN para assets (configurar externamente)

### Monitoramento de Performance

- Tempo de resposta < 200ms (média)
- Taxa de erro < 1%
- Uptime > 99.9%
- Uso de memória < 80%

---

**Importante**: Sempre teste as configurações em ambiente de staging antes de aplicar em produção.