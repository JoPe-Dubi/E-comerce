# 🚀 Guia de Instalação do Node.js

## ⚠️ Pré-requisito Necessário

Para executar o sistema de pagamento, você precisa ter o **Node.js** instalado no seu computador. Atualmente, o Node.js não foi detectado no seu sistema.

## 📥 Como Instalar o Node.js

### Opção 1: Download Oficial (Recomendado)

1. **Acesse o site oficial**: https://nodejs.org/
2. **Baixe a versão LTS** (Long Term Support) - versão estável recomendada
3. **Execute o instalador** baixado
4. **Siga o assistente de instalação** (aceite as configurações padrão)
5. **Reinicie o terminal/PowerShell** após a instalação

### Opção 2: Via Chocolatey (Windows)

Se você tem o Chocolatey instalado:

```powershell
# Instalar Node.js via Chocolatey
choco install nodejs

# Verificar instalação
node --version
npm --version
```

### Opção 3: Via Winget (Windows 10/11)

```powershell
# Instalar Node.js via Winget
winget install OpenJS.NodeJS

# Verificar instalação
node --version
npm --version
```

## ✅ Verificar Instalação

Após instalar, abra um novo terminal/PowerShell e execute:

```powershell
# Verificar versão do Node.js
node --version

# Verificar versão do NPM
npm --version
```

**Versões recomendadas:**
- Node.js: 16.x ou superior
- NPM: 8.x ou superior

## 🚀 Após Instalar o Node.js

Quando o Node.js estiver instalado, você poderá executar o sistema de pagamento:

### 1. Instalar Dependências
```powershell
npm install
```

### 2. Configurar Sistema
```powershell
npm run setup:payment
```

### 3. Executar Testes
```powershell
npm run test:payment
```

### 4. Iniciar Servidor
```powershell
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🔧 Solução de Problemas

### Erro: "npm não é reconhecido"
- **Causa**: Node.js não foi instalado corretamente ou PATH não foi atualizado
- **Solução**: Reinstale o Node.js e reinicie o terminal

### Erro de Permissão no Windows
- **Causa**: Política de execução do PowerShell
- **Solução**: Execute como administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Versão Muito Antiga
- **Causa**: Node.js desatualizado
- **Solução**: Desinstale a versão antiga e instale a versão LTS mais recente

## 📋 Checklist de Instalação

- [ ] Node.js instalado (versão 16+)
- [ ] NPM funcionando
- [ ] Terminal reiniciado
- [ ] Comando `node --version` funciona
- [ ] Comando `npm --version` funciona

## 🎯 Próximos Passos

Após instalar o Node.js com sucesso:

1. ✅ **Volte para este projeto**
2. ✅ **Execute**: `npm install`
3. ✅ **Configure**: `npm run setup:payment`
4. ✅ **Teste**: `npm run test:payment`
5. ✅ **Inicie**: `npm start`

## 📞 Suporte

Se encontrar problemas na instalação:

1. **Verifique a documentação oficial**: https://nodejs.org/en/docs/
2. **Reinicie o computador** após a instalação
3. **Execute o terminal como administrador**
4. **Verifique se o antivírus não está bloqueando**

---

**💡 Dica**: Após instalar o Node.js, o sistema de pagamento estará 100% funcional e pronto para uso!