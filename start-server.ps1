# Servidor HTTP simples para o e-commerce CompreAqui
# Porta 8080

$port = 8080
$url = "http://localhost:$port/"

try {
    # Criar listener HTTP
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
    
    Write-Host "Servidor CompreAqui iniciado em $url" -ForegroundColor Green
    Write-Host "Servindo arquivos de: $PWD" -ForegroundColor Cyan
    Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
    Write-Host ""
    
    # Abrir navegador automaticamente
    Start-Process $url
    
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            # Obter caminho do arquivo
            $path = $request.Url.LocalPath
            if ($path -eq '/') {
                $path = '/index.html'
            }
            
            $filePath = Join-Path $PWD $path.TrimStart('/')
            
            if (Test-Path $filePath -PathType Leaf) {
                # Determinar tipo de conteudo
                $contentType = 'text/html; charset=utf-8'
                $extension = [System.IO.Path]::GetExtension($filePath).ToLower()
                
                switch ($extension) {
                    '.css' { $contentType = 'text/css; charset=utf-8' }
                    '.js' { $contentType = 'application/javascript; charset=utf-8' }
                    '.json' { $contentType = 'application/json; charset=utf-8' }
                    '.png' { $contentType = 'image/png' }
                    '.jpg' { $contentType = 'image/jpeg' }
                    '.jpeg' { $contentType = 'image/jpeg' }
                    '.gif' { $contentType = 'image/gif' }
                    '.svg' { $contentType = 'image/svg+xml' }
                    '.ico' { $contentType = 'image/x-icon' }
                    '.woff' { $contentType = 'font/woff' }
                    '.woff2' { $contentType = 'font/woff2' }
                }
                
                # Adicionar headers de cache para recursos estaticos
                if ($extension -in @('.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2')) {
                    $response.Headers.Add('Cache-Control', 'public, max-age=3600')
                }
                
                $response.ContentType = $contentType
                $response.StatusCode = 200
                
                $content = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $content.Length
                $response.OutputStream.Write($content, 0, $content.Length)
                
                Write-Host "OK $($request.HttpMethod) $($request.Url.LocalPath) - 200" -ForegroundColor Green
            } else {
                # Arquivo nao encontrado
                $response.StatusCode = 404
                $response.ContentType = 'text/html; charset=utf-8'
                
                $errorHtml = @'
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <title>404 - Pagina nao encontrada</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #E63946; }
        a { color: #E63946; text-decoration: none; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>404 - Pagina nao encontrada</h1>
    <p>O arquivo solicitado nao foi encontrado.</p>
    <a href="/">Voltar para a pagina inicial</a>
</body>
</html>
'@
                
                $errorContent = [System.Text.Encoding]::UTF8.GetBytes($errorHtml)
                $response.ContentLength64 = $errorContent.Length
                $response.OutputStream.Write($errorContent, 0, $errorContent.Length)
                
                Write-Host "ERRO $($request.HttpMethod) $($request.Url.LocalPath) - 404" -ForegroundColor Red
            }
            
        } catch {
            Write-Host "Erro ao processar requisicao: $($_.Exception.Message)" -ForegroundColor Yellow
        } finally {
            if ($response) {
                $response.Close()
            }
        }
    }
} catch {
    Write-Host "Erro ao iniciar servidor: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Tente executar como administrador ou use uma porta diferente" -ForegroundColor Yellow
} finally {
    if ($listener) {
        $listener.Stop()
        Write-Host "Servidor parado" -ForegroundColor Yellow
    }
}