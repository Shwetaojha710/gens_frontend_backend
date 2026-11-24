# LOCAL DEV ONLY — Cloudflare quick tunnel to localhost:3002.
# Keep this window open while testing inbound WhatsApp replies on your laptop.
# After start, run: node scripts/setup-meta-webhook.js https://YOUR-TUNNEL.trycloudflare.com
#
# PRODUCTION: do NOT use this. Point Meta at the live domain instead:
#   node scripts/setup-production-webhook.js
#   → https://gens.demoquaeretech.in/api/whatsapp/webhook
# Tunnel URLs die on sleep/restart; live domain stays permanent with pm2.

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
