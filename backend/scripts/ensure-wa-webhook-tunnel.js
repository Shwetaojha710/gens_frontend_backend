/**
 * Start-friendly helper: given a public tunnel base URL, register it with Meta
 * as the WhatsApp webhook callback for QuaereTech.
 *
 * Usage:
 *   node scripts/ensure-wa-webhook-tunnel.js https://xxxx.trycloudflare.com
 *
 * Typical local flow:
 *   1) npm run dev                         (port 3002)
 *   2) cloudflared tunnel --url http://127.0.0.1:3002
 *   3) node scripts/ensure-wa-webhook-tunnel.js <printed-https-url>
 */
const { spawnSync } = require("child_process");
const path = require("path");

const base = String(process.argv[2] || "")
  .trim()
  .replace(/\/+$/, "");
if (!base.startsWith("https://")) {
  console.error("Usage: node scripts/ensure-wa-webhook-tunnel.js https://xxxx.trycloudflare.com");
  process.exit(1);
}

const setup = path.join(__dirname, "setup-meta-webhook.js");
const r = spawnSync(process.execPath, [setup, base], { stdio: "inherit" });
process.exit(r.status == null ? 1 : r.status);
