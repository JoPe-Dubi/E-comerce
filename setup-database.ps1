# CompreAqui E-commerce - Script de Configuração do Banco de Dados
# Este script inicializa o banco de dados SQLite com todas as tabelas e dados iniciais

Write-Host "=== CompreAqui E-commerce - Configuração do Banco ==" -ForegroundColor Green
Write-Host ""

# Verificar se o SQLite está disponível
$sqliteAvailable = $false

# Tentar usar sqlite3 do sistema
try {
    $null = sqlite3 -version 2>$null
    $sqliteAvailable = $true
    $sqliteCommand = "sqlite3"
    Write-Host "✅ SQLite encontrado no sistema" -ForegroundColor Green
} catch {
    Write-Host "⚠️  SQLite não encontrado no PATH do sistema" -ForegroundColor Yellow
}

# Se não encontrou SQLite, tentar baixar versão portátil
if (-not $sqliteAvailable) {
    Write-Host "📥 Tentando baixar SQLite portátil..." -ForegroundColor Yellow
    
    $sqliteUrl = "https://www.sqlite.org/2024/sqlite-tools-win32-x86-3450100.zip"
    $sqliteZip = "sqlite-tools.zip"
    $sqliteDir = "sqlite-tools"
    
    try {
        # Baixar SQLite
        Invoke-WebRequest -Uri $sqliteUrl -OutFile $sqliteZip -UseBasicParsing
        
        # Extrair
        Expand-Archive -Path $sqliteZip -DestinationPath $sqliteDir -Force
        
        # Encontrar o executável
        $sqliteExe = Get-ChildItem -Path $sqliteDir -Name "sqlite3.exe" -Recurse | Select-Object -First 1
        
        if ($sqliteExe) {
            $sqliteCommand = Join-Path $sqliteDir $sqliteExe.DirectoryName "sqlite3.exe"
            $sqliteAvailable = $true
            Write-Host "✅ SQLite baixado com sucesso" -ForegroundColor Green
        }
        
        # Limpar arquivo zip
        Remove-Item $sqliteZip -ErrorAction SilentlyContinue
        
    } catch {
        Write-Host "❌ Erro ao baixar SQLite: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Se ainda não tem SQLite, usar método alternativo
if (-not $sqliteAvailable) {
    Write-Host "📦 Usando método alternativo com System.Data.SQLite..." -ForegroundColor Yellow
    
    # Criar banco usando .NET SQLite (método alternativo)
    $dbPath = "compreaqui.db"
    
    try {
        # Carregar assembly SQLite (se disponível)
        Add-Type -Path "System.Data.SQLite.dll" -ErrorAction Stop
        
        $connectionString = "Data Source=$dbPath;Version=3;"
        $connection = New-Object System.Data.SQLite.SQLiteConnection($connectionString)
        $connection.Open()
        
        # Ler e executar SQL
        $sqlContent = Get-Content "init-database.sql" -Raw
        $command = $connection.CreateCommand()
        $command.CommandText = $sqlContent
        $command.ExecuteNonQuery()
        
        $connection.Close()
        
        Write-Host "✅ Banco criado usando System.Data.SQLite" -ForegroundColor Green
        $sqliteAvailable = $true
        
    } catch {
        Write-Host "⚠️  System.Data.SQLite não disponível" -ForegroundColor Yellow
    }
}

# Método principal usando SQLite command line
if ($sqliteAvailable -and $sqliteCommand) {
    $dbPath = "compreaqui.db"
    
    Write-Host "🗄️  Criando banco de dados: $dbPath" -ForegroundColor Cyan
    
    try {
        # Executar script SQL
        & $sqliteCommand $dbPath ".read init-database.sql"
        
        Write-Host "✅ Banco de dados criado com sucesso!" -ForegroundColor Green
        Write-Host ""
        
        # Verificar se foi criado corretamente
        Write-Host "📊 Verificando estrutura do banco..." -ForegroundColor Cyan
        
        # Listar tabelas
        $tables = & $sqliteCommand $dbPath ".tables"
        Write-Host "📋 Tabelas criadas: $tables" -ForegroundColor White
        
        # Contar usuários
        $userCount = & $sqliteCommand $dbPath "SELECT COUNT(*) FROM users;"
        Write-Host "👥 Usuários cadastrados: $userCount" -ForegroundColor White
        
        # Contar produtos
        $productCount = & $sqliteCommand $dbPath "SELECT COUNT(*) FROM products;"
        Write-Host "📦 Produtos cadastrados: $productCount" -ForegroundColor White
        
        Write-Host ""
        Write-Host "🔐 Credenciais do Administrador:" -ForegroundColor Yellow
        Write-Host "   Email: admin@compreaqui.com" -ForegroundColor White
        Write-Host "   Senha: 123456" -ForegroundColor White
        Write-Host "   Role: admin" -ForegroundColor White
        
    } catch {
        Write-Host "❌ Erro ao criar banco: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ SQLite não está disponível. Instale o SQLite ou use Node.js" -ForegroundColor Red
    Write-Host "💡 Alternativa: Execute 'npm install' e 'node -e \"require('./database.js').connect()\"'" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎉 Configuração concluída! O banco está pronto para uso." -ForegroundColor Green
Write-Host "🚀 Execute o servidor com: powershell -ExecutionPolicy Bypass -File server.ps1" -ForegroundColor Cyan
Write-Host ""