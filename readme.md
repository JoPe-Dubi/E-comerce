# CompreAqui - E-commerce Platform

Um marketplace completo desenvolvido com tecnologias web modernas.

## 🚀 Funcionalidades

- ✅ **Interface moderna e responsiva** com identidade visual própria
- ✅ **Sistema de autenticação** com login/registro
- ✅ **Catálogo de produtos** com filtros e busca
- ✅ **Carrinho de compras** dinâmico
- ✅ **Painel administrativo** para gestão de catálogo
- ✅ **Sistema de notificações** em tempo real
- ✅ **Integração com APIs** para dados dinâmicos

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5** - Estrutura semântica
- **CSS3** - Estilos modernos e responsivos
- **JavaScript ES6+** - Funcionalidades interativas
- **Font Awesome** - Ícones

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite** - Banco de dados

### Ferramentas
- **Git** - Controle de versão
- **PowerShell** - Scripts de automação

## 📁 Estrutura do Projeto

```
Projeto pessoal/
├── css/
│   ├── styles.css          # Estilos principais
│   └── responsive.css      # Media queries
├── js/
│   ├── main.js            # Lógica principal
│   ├── auth.js            # Sistema de autenticação
│   ├── cart.js            # Carrinho de compras
│   ├── products.js        # Gestão de produtos
│   ├── search.js          # Sistema de busca
│   └── utils.js           # Utilitários
├── img/
│   ├── products/          # Imagens dos produtos
│   ├── avatars/           # Avatares de usuários
│   └── *.svg             # Ícones e ilustrações
├── pages/
│   └── admin-catalog.html # Painel administrativo
├── index.html             # Página principal
├── server.js              # Servidor Node.js
├── database.js            # Configuração do banco
└── package.json           # Dependências
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js (versão 14 ou superior)
- Git

### Instalação

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/compreaqui.git
   cd compreaqui
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure o banco de dados**
   ```bash
   node create-database.js
   ```

4. **Inicie o servidor**
   ```bash
   npm start
   ```

5. **Acesse a aplicação**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

### Servidor de Desenvolvimento (Alternativo)

Para desenvolvimento frontend apenas:
```powershell
.\server.ps1
```
Acesse: http://localhost:8080

## 👤 Credenciais de Teste

**Administrador:**
- Email: `odubiella@gmail.com`
- Senha: `@Trairagemtv19`

## 🎨 Design System

### Cores Principais
- **Vermelho Principal:** `#E63946`
- **Preto:** `#1E1E1E`
- **Branco:** `#FFFFFF`
- **Cinza Claro:** `#F8F9FA`

### Tipografia
- **Fonte Principal:** System fonts (Arial, sans-serif)
- **Ícones:** Font Awesome 5.15.4

## 📱 Funcionalidades Detalhadas

### Sistema de Autenticação
- Login/registro de usuários
- Validação de email
- Persistência de sessão
- Diferentes níveis de acesso (user/admin)

### Catálogo de Produtos
- Visualização por categorias
- Sistema de filtros avançados
- Busca em tempo real
- Imagens responsivas

### Carrinho de Compras
- Adição/remoção de produtos
- Cálculo automático de totais
- Persistência local
- Interface sidebar

### Painel Administrativo
- Gestão completa do catálogo
- Filtros e busca administrativa
- Exportação para CSV
- Função de impressão

## 🔧 Scripts Disponíveis

- `npm start` - Inicia o servidor de produção
- `npm run dev` - Inicia o servidor de desenvolvimento
- `node create-database.js` - Cria e popula o banco de dados
- `.\server.ps1` - Servidor PowerShell para desenvolvimento

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Contato

**Desenvolvedor:** Seu Nome
- Email: seu.email@exemplo.com
- LinkedIn: [seu-perfil](https://linkedin.com/in/seu-perfil)
- GitHub: [seu-usuario](https://github.com/seu-usuario)

---

⭐ **Se este projeto foi útil para você, considere dar uma estrela!**