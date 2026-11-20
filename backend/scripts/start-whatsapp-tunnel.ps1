# Starts a Cloudflare quick tunnel to local WhatsApp webhook backend (port 3002).
# Keep this window open while testing inbound WhatsApp replies.
# After start, run: node scripts/setup-meta-webhook.js https://YOUR-TUNNEL.trycloudflare.com

$ErrorActionPreference = "Stop"
$cloudflared = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
  $cloudflared = "C:\Program Files\cloudflared\cloudflared.exe"
}
if (-not (Test-Path $cloudflared)) {
  Write-Error "cloudflared not found. Install with: winget install Cloudflare.cloudflared"
}

Write-Host "Tunneling http://127.0.0.1:3002 ..."
Write-Host "When URL appears, register Meta webhook:"
Write-Host "  node scripts/setup-meta-webhook.js https://xxxx.trycloudflare.com"
Write-Host ""

& $cloudflared tunnel --url http://127.0.0.1:3002
