# Abre o app no Expo Go de qualquer lugar (outra cidade, 4G), sem login no
# Expo: túnel gratuito da Cloudflare em vez do túnel do Expo (ngrok).
# Uso, no CMD, na pasta do projeto:  tunel
# Requisito: cloudflared.exe em %USERPROFILE%\tools (oficial, assinado pela
# Cloudflare: github.com/cloudflare/cloudflared/releases).

$ErrorActionPreference = 'Stop'
$port = 8090  # porta própria: não briga com um "npx expo start" comum (8081)
$exe = Join-Path $env:USERPROFILE 'tools\cloudflared.exe'
if (-not (Test-Path $exe)) {
  Write-Host "Não achei $exe. Baixe o cloudflared-windows-amd64.exe e salve com esse nome." -ForegroundColor Red
  exit 1
}

# Outra janela com o app aberto nesta porta faria o Expo pular para a 8091,
# e o túnel ficaria apontando para o servidor errado.
if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
  Write-Host "A porta $port já está em uso: feche a outra janela do app (Ctrl + C) e rode de novo." -ForegroundColor Red
  exit 1
}

# Túnel esquecido de uma vez anterior (janela fechada no X).
Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force

$log = Join-Path $env:TEMP 'igreja-tunel.log'
Remove-Item $log -ErrorAction SilentlyContinue
Write-Host 'Abrindo o túnel da Cloudflare...' -ForegroundColor Cyan
$tunnel = Start-Process $exe -ArgumentList 'tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$port" `
  -RedirectStandardError $log -WindowStyle Hidden -PassThru

try {
  $url = $null
  for ($i = 0; $i -lt 60 -and -not $url; $i++) {
    Start-Sleep 1
    if (Test-Path $log) {
      $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1
      if ($m) { $url = $m.Matches[0].Value }
    }
  }
  if (-not $url) { throw "O túnel não abriu. Veja $log" }

  # O endereço novo leva alguns segundos para existir na internet.
  Write-Host 'Esperando o endereço ficar disponível...' -ForegroundColor Cyan
  $hostName = $url -replace '^https://', ''
  for ($i = 0; $i -lt 40; $i++) {
    try { [void][Net.Dns]::GetHostAddresses($hostName); break } catch { Start-Sleep 2 }
  }

  # O Expo passa a escrever esse endereço no QR code e nos links do app.
  # http, não https: com https o Expo monta "exp://...:443", que o Expo Go
  # tentaria abrir sem criptografia na porta do https. A Cloudflare atende
  # http também; é o mesmo formato do túnel do próprio Expo.
  $env:EXPO_PACKAGER_PROXY_URL = "http://$hostName"
  Write-Host ''
  Write-Host '================================================================' -ForegroundColor Green
  Write-Host ' Mande este link (WhatsApp). Funciona enquanto esta janela'      -ForegroundColor Green
  Write-Host ' estiver aberta:'                                               -ForegroundColor Green
  Write-Host ''
  Write-Host "   exp://$hostName"                                             -ForegroundColor Yellow
  Write-Host ''
  Write-Host ' Ou leia o QR code abaixo. Para parar: Ctrl + C.'               -ForegroundColor Green
  Write-Host '================================================================' -ForegroundColor Green
  Write-Host ''

  # Versão compactada: abre bem mais rápido no 4G.
  npx expo start --port $port --no-dev --minify @args
}
finally {
  if ($tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force }
}
