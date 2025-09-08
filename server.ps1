# Servidor HTTP simples em PowerShell para CompreAqui

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8080/')
$listener.Start()

Write-Host "Servidor HTTP iniciado em http://localhost:8080" -ForegroundColor Green
Write-Host "Servindo arquivos de: $PWD" -ForegroundColor Yellow
Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Cyan
Write-Host ""

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq '/') {
            $localPath = '/index.html'
        }
        
        $filePath = Join-Path $PWD $localPath.TrimStart('/')
        
        Write-Host "Requisicao: $($request.HttpMethod) $($request.Url.LocalPath)" -ForegroundColor Gray
        
        if (Test-Path $filePath) {
            $ext = [System.IO.Path]::GetExtension($filePath)
            $contentType = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.css'  { 'text/css; charset=utf-8' }
                '.js'   { 'application/javascript; charset=utf-8' }
                '.svg'  { 'image/svg+xml' }
                '.jpg'  { 'image/jpeg' }
                '.jpeg' { 'image/jpeg' }
                '.png'  { 'image/png' }
                '.gif'  { 'image/gif' }
                '.ico'  { 'image/x-icon' }
                '.json' { 'application/json' }
                default { 'text/plain; charset=utf-8' }
            }
            
            $response.ContentType = $contentType
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
            
            Write-Host "200 OK - $filePath" -ForegroundColor Green
        } else {
            $response.StatusCode = 404
            $errorContent = [System.Text.Encoding]::UTF8.GetBytes('404 - Arquivo nao encontrado')
            $response.OutputStream.Write($errorContent, 0, $errorContent.Length)
            
            Write-Host "404 NOT FOUND - $filePath" -ForegroundColor Red
        }
        
        $response.Close()
    }
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $listener.Stop()
    Write-Host "Servidor parado" -ForegroundColor Yellow
}