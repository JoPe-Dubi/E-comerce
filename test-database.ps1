# CompreAqui E-commerce - Script de Teste do Banco de Dados
# Executa os testes do sistema de banco de dados integrado

Write-Host "🚀 Iniciando testes do sistema de banco de dados..." -ForegroundColor Green
Write-Host ""

# Verificar se o Node.js está instalado
$nodeVersion = $null
try {
    $nodeVersion = & node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Node.js não encontrado no PATH" -ForegroundColor Red
}

# Verificar se o npm está instalado
$npmVersion = $null
try {
    $npmVersion = & npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ npm não encontrado no PATH" -ForegroundColor Red
}

Write-Host ""

# Se Node.js não estiver disponível, tentar alternativas
if (-not $nodeVersion) {
    Write-Host "🔍 Procurando instalações do Node.js..." -ForegroundColor Yellow
    
    # Locais comuns de instalação do Node.js
    $possiblePaths = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "$env:ProgramFiles(x86)\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        "$env:APPDATA\npm\node.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            Write-Host "✅ Node.js encontrado em: $path" -ForegroundColor Green
            $nodeVersion = & $path --version
            Write-Host "   Versão: $nodeVersion" -ForegroundColor Green
            
            # Executar os testes
            Write-Host ""
            Write-Host "🧪 Executando testes do banco de dados..." -ForegroundColor Cyan
            & $path "database-test.js"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "🎉 Testes executados com sucesso!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "❌ Alguns testes falharam. Código de saída: $LASTEXITCODE" -ForegroundColor Red
            }
            
            exit $LASTEXITCODE
        }
    }
    
    Write-Host "❌ Node.js não foi encontrado em nenhum local padrão" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Para executar os testes, você precisa:" -ForegroundColor Yellow
    Write-Host "   1. Instalar o Node.js (https://nodejs.org/)" -ForegroundColor White
    Write-Host "   2. Ou adicionar o Node.js ao PATH do sistema" -ForegroundColor White
    Write-Host "   3. Executar: node database-test.js" -ForegroundColor White
    Write-Host ""
    
    # Mostrar informações sobre os arquivos criados
    Write-Host "Arquivos do sistema de banco de dados criados:" -ForegroundColor Cyan
    Write-Host "   database.js - Configuracao centralizada do banco SQLite" -ForegroundColor Green
    Write-Host "   database-crud.js - Funcoes CRUD para todas as tabelas" -ForegroundColor Green
    Write-Host "   database-migrations.js - Sistema de migracao e versionamento" -ForegroundColor Green
    Write-Host "   database-test.js - Testes completos do sistema" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Estrutura do banco de dados:" -ForegroundColor Cyan
    Write-Host "   13 tabelas principais criadas" -ForegroundColor White
    Write-Host "   Relacionamentos e chaves estrangeiras configurados" -ForegroundColor White
    Write-Host "   Indices para otimizacao de performance" -ForegroundColor White
    Write-Host "   Sistema de migracao com versionamento" -ForegroundColor White
    Write-Host "   Testes automatizados para validacao" -ForegroundColor White
    Write-Host ""
    
    exit 1
}

# Se chegou até aqui, Node.js está disponível
Write-Host "🧪 Executando testes do banco de dados..." -ForegroundColor Cyan
& node "database-test.js"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 Todos os testes foram executados!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ Alguns testes podem ter falhado. Verifique os logs acima." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Sistema de banco de dados integrado concluido!" -ForegroundColor Green
Write-Host "   Estrutura centralizada e escalavel" -ForegroundColor White
Write-Host "   Funcoes CRUD organizadas" -ForegroundColor White
Write-Host "   Sistema de migracao implementado" -ForegroundColor White
Write-Host "   Testes automatizados criados" -ForegroundColor White

exit $LASTEXITCODE