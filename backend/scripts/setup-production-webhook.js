/**
 * Point Meta WhatsApp webhook at the permanent live HTTPS API
 * (no Cloudflare quick tunnel).
 *
 * Usage:
 *   node scripts/setup-production-webhook.js
 *   node scripts/setup-production-webhook.js https://gens.demoquaeretech.in
 *
 * Requires AI_AGENT_WHATSAPP_TOKEN (and verify token in agent settings).
 * Production server .env must also have AI_AGENT_WHATSAPP_TOKEN + AI_AGENT_LLM_KEY
 * so inbound messages can be answered after Meta delivers them.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const DEFAULT_LIVE = "https://gens.demoquaeretech.in";
const base = String(process.argv[2] || process.env.AI_AGENT_PUBLIC_BASE_URL || DEFAULT_LIVE)
  .trim()
  .replace(/\/+$/, "");

if (!base.startsWith("https://")) {
  console.error("Usage: node scripts/setup-production-webhook.js https://gens.demoquaeretech.in");
  process.exit(1);
}

if (/trycloudflare\.com|ngrok|localhost|127\.0\.0\.1|192\.168\./i.test(base)) {
  console.error(
    "Refusing temporary/local URL. Use the permanent live domain, e.g.\n" +
      `  node scripts/setup-production-webhook.js ${DEFAULT_LIVE}`
  );
  process.exit(1);
}

console.log("Registering permanent Meta webhook →", `${base}/api/whatsapp/webhook`);
const setup = path.join(__dirname, "setup-meta-webhook.js");
const r = spawnSync(process.execPath, [setup, base], { stdio: "inherit" });
process.exit(r.status == null ? 1 : r.status);
