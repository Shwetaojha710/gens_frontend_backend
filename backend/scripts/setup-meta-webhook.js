/**
 * Configure Meta WhatsApp webhook callback to a public tunnel URL
 * using the stored QuaereTech access token + app secret.
 *
 * Usage:
 *   node scripts/setup-meta-webhook.js https://xxxx.trycloudflare.com
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const axios = require("axios");
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const { getOrCreateAgent, safeDecrypt } = require("../app/helper/aiAgentEngine");

const publicBase = String(process.argv[2] || "")
  .trim()
  .replace(/\/+$/, "");
if (!publicBase.startsWith("https://")) {
  console.error("Usage: node scripts/setup-meta-webhook.js https://xxxx.trycloudflare.com");
  process.exit(1);
}

const callbackUrl = `${publicBase}/api/whatsapp/webhook`;

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: "quaeretech" } },
  });
  if (!tenant) throw new Error("QuaereTech tenant not found");
  const { settings } = await getOrCreateAgent(tenant.id);
  const accessToken = safeDecrypt(settings.whatsappAccessTokenEnc);
  const appSecret = safeDecrypt(settings.whatsappAppSecretEnc);
  const verifyToken = settings.whatsappVerifyToken;
  const phoneNumberId = settings.whatsappPhoneNumberId;
  const wabaId = settings.whatsappBusinessAccountId;

  if (!accessToken || !verifyToken) {
    throw new Error("Missing access token or verify token in agent settings");
  }

  console.log("Callback URL:", callbackUrl);
  console.log("Verify token:", verifyToken);
  console.log("Phone number ID:", phoneNumberId);
  console.log("WABA ID:", wabaId);

  // 1) Local/public verify simulation already done separately.
  // 2) Discover app_id from debug_token
  const debug = await axios.get("https://graph.facebook.com/v21.0/debug_token", {
    params: { input_token: accessToken, access_token: accessToken },
    validateStatus: () => true,
  });
  console.log("debug_token:", JSON.stringify(debug.data, null, 2));
  const appId = debug.data?.data?.app_id;
  if (!appId) {
    console.log(
      "\nCould not resolve app_id from token. Configure webhook manually in Meta Console:\n" +
        `  Callback URL: ${callbackUrl}\n` +
        `  Verify token: ${verifyToken}\n` +
        "  Subscribe field: messages\n"
    );
    process.exit(2);
  }

  // 3) Prefer app access token (app_id|app_secret) for subscription APIs when secret available
  const appAccessToken = appSecret ? `${appId}|${appSecret}` : accessToken;

  // Override webhook callback on the app
  // POST /{app-id}/subscriptions
  const subRes = await axios.post(
    `https://graph.facebook.com/v21.0/${appId}/subscriptions`,
    null,
    {
      params: {
        object: "whatsapp_business_account",
        callback_url: callbackUrl,
        verify_token: verifyToken,
        fields: "messages",
        access_token: appAccessToken,
      },
      validateStatus: () => true,
    }
  );
  console.log("subscriptions response:", subRes.status, JSON.stringify(subRes.data, null, 2));

  // Also try subscribed_apps on WABA if we have waba id
  if (wabaId) {
    const appsRes = await axios.post(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      null,
      {
        params: {
          access_token: accessToken,
          override_callback_uri: callbackUrl,
          verify_token: verifyToken,
        },
        validateStatus: () => true,
      }
    );
    console.log("subscribed_apps response:", appsRes.status, JSON.stringify(appsRes.data, null, 2));
  }

  if (subRes.data?.success || subRes.status === 200) {
    console.log("\nSUCCESS: Meta webhook callback set to", callbackUrl);
    process.exit(0);
  }

  console.log(
    "\nAPI could not fully set webhook (token permissions may be limited).",
    "\nDo this manually in Meta Developer Console → WhatsApp → Configuration:",
    `\n  Callback URL: ${callbackUrl}`,
    `\n  Verify token: ${verifyToken}`,
    "\n  Subscribe: messages"
  );
  process.exit(3);
})().catch((e) => {
  console.error("FAIL", e?.response?.data || e.message);
  process.exit(1);
});
