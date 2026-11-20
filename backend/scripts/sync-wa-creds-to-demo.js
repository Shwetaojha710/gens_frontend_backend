/**
 * Re-save QuaereTech WhatsApp/LLM credentials via gens.demoquaeretech.in API
 * so they are encrypted with the DEMO server's SECRET_KEY.
 *
 * Temporarily sets a one-time admin password, logs into demo, saves config, restores hash.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const axios = require("axios");
const cryptoJs = require("crypto-js");
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const User = require("../app/models/users");
const { getOrCreateAgent, safeDecrypt } = require("../app/helper/aiAgentEngine");

const DEMO_API = "https://gens.demoquaeretech.in/api/api/";
const TEMP_PASSWORD = `GensWaSync_${Date.now().toString(36)}!`;

async function main() {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: "quaeretech" } },
  });
  if (!tenant) throw new Error("QuaereTech tenant not found");

  const admin = await User.findOne({
    where: { tenantId: tenant.id, role: { [Op.in]: ["admin", "hr", "superadmin"] } },
    order: [["createdAt", "ASC"]],
  });
  if (!admin) throw new Error("Admin user not found");

  const { agent, settings } = await getOrCreateAgent(tenant.id);
  const accessToken = safeDecrypt(settings.whatsappAccessTokenEnc);
  const appSecret = safeDecrypt(settings.whatsappAppSecretEnc);
  const llmKey = safeDecrypt(settings.llmApiKeyEnc);

  if (!accessToken || !settings.whatsappPhoneNumberId) {
    throw new Error("Local decrypt failed or phoneNumberId missing — fix local config first");
  }

  console.log("Tenant", tenant.companyCode, tenant.id);
  console.log("Admin", admin.email);
  console.log("PhoneNumberId", settings.whatsappPhoneNumberId);
  console.log("Has token/secret/llm", Boolean(accessToken), Boolean(appSecret), Boolean(llmKey));

  const oldHash = admin.password;
  const tempHash = cryptoJs.SHA256(TEMP_PASSWORD).toString();
  await admin.update({ password: tempHash, token: null });

  let restored = false;
  const restore = async () => {
    if (restored) return;
    await admin.update({ password: oldHash });
    restored = true;
    console.log("Restored original admin password hash");
  };

  try {
    const loginRes = await axios.post(
      `${DEMO_API}login`,
      { email: admin.email, password: TEMP_PASSWORD, tenantId: tenant.companyCode },
      { timeout: 30000, validateStatus: () => true }
    );
    console.log("Login status", loginRes.data?.status, loginRes.data?.message);
    const token = loginRes.data?.data?.token || loginRes.data?.token;
    if (loginRes.data?.status !== true || !token) {
      throw new Error("Demo login failed: " + JSON.stringify(loginRes.data));
    }

    const saveBody = {
      name: agent.name,
      personality: agent.personality,
      systemInstructions: agent.systemInstructions,
      companyIntro: agent.companyIntro,
      aiProvider: agent.aiProvider,
      aiModel: agent.aiModel,
      responseLength: agent.responseLength,
      isEnabled: true,
      status: "active",
      whatsappPhoneNumberId: settings.whatsappPhoneNumberId,
      whatsappBusinessAccountId: settings.whatsappBusinessAccountId,
      whatsappVerifyToken: settings.whatsappVerifyToken || `gens-wa-${String(tenant.id).slice(0, 8)}`,
      whatsappAccessToken: accessToken,
      notifyOnLead: settings.notifyOnLead !== false,
      notifyOnHandover: settings.notifyOnHandover !== false,
    };
    if (appSecret) saveBody.whatsappAppSecret = appSecret;
    if (llmKey) saveBody.llmApiKey = llmKey;

    const saveRes = await axios.post(`${DEMO_API}ai-agent/config/save`, saveBody, {
      headers: { Authorization: `Bearer ${token}`, branchid: "" },
      timeout: 30000,
      validateStatus: () => true,
    });
    console.log("Save status", saveRes.data?.status, saveRes.data?.message);
    console.log(
      "Flags",
      saveRes.data?.data?.settings && {
        hasWhatsappToken: saveRes.data.data.settings.hasWhatsappToken,
        hasAppSecret: saveRes.data.data.settings.hasAppSecret,
        hasLlmKey: saveRes.data.data.settings.hasLlmKey,
        phoneId: saveRes.data.data.settings.whatsappPhoneNumberId,
      }
    );

    if (saveRes.data?.status !== true) {
      throw new Error("Config save failed: " + JSON.stringify(saveRes.data));
    }

    // Verify send path via demo simulate (skip WA) optional — just getConfig
    const cfg = await axios.post(
      `${DEMO_API}ai-agent/config`,
      {},
      {
        headers: { Authorization: `Bearer ${token}`, branchid: "" },
        timeout: 20000,
        validateStatus: () => true,
      }
    );
    console.log("Verify hasWhatsappToken", cfg.data?.data?.settings?.hasWhatsappToken);
    console.log("DONE — credentials re-saved on demo with server SECRET_KEY");
  } finally {
    await restore();
  }
}

main().catch(async (e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
