/**
 * Diagnose + repair QuaereTech WhatsApp agent credentials decrypt/status.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const AiAgent = require("../app/models/ai_agent");
const AiAgentSettings = require("../app/models/ai_agent_settings");
const { getOrCreateAgent, safeDecrypt } = require("../app/helper/aiAgentEngine");

(async () => {
  const tenant = await Tenant.findOne({
    where: {
      [Op.or]: [
        { companyCode: { [Op.iLike]: "%quaer%" } },
        { companyName: { [Op.iLike]: "%quaer%" } },
      ],
    },
  });
  if (!tenant) {
    console.error("Quaere tenant not found");
    process.exit(1);
  }
  console.log("TENANT", tenant.id, tenant.companyCode, tenant.companyName);

  const { agent, settings } = await getOrCreateAgent(tenant.id);
  console.log("AGENT", {
    id: agent.id,
    isEnabled: agent.isEnabled,
    status: agent.status,
  });

  const tokenRaw = settings.whatsappAccessTokenEnc;
  const secretRaw = settings.whatsappAppSecretEnc;
  const llmRaw = settings.llmApiKeyEnc;
  const phoneId = settings.whatsappPhoneNumberId;
  const verify = settings.whatsappVerifyToken;

  console.log("SETTINGS_ROW", {
    id: settings.id,
    phoneId,
    verify,
    hasTokenEnc: Boolean(tokenRaw),
    tokenEncLen: tokenRaw ? String(tokenRaw).length : 0,
    hasAppSecretEnc: Boolean(secretRaw),
    hasLlmEnc: Boolean(llmRaw),
  });

  let token = null;
  let decryptErr = null;
  try {
    token = safeDecrypt(tokenRaw);
  } catch (e) {
    decryptErr = e.message;
  }
  console.log("DECRYPT", {
    ok: Boolean(token),
    tokenLen: token ? token.length : 0,
    tokenPrefix: token ? token.slice(0, 8) + "..." : null,
    decryptErr,
  });

  const canSend = Boolean(token && phoneId);
  console.log("CAN_SEND_WHATSAPP", canSend);

  if (!agent.isEnabled || agent.status !== "active") {
    await agent.update({ isEnabled: true, status: "active" });
    console.log("Enabled agent");
  }

  if (!verify) {
    await settings.update({ whatsappVerifyToken: `gens-wa-${String(tenant.id).slice(0, 8)}` });
    console.log("Set default verify token");
  }

  // List all tenants that have settings (in case user logged into wrong one)
  const all = await AiAgentSettings.findAll({
    attributes: ["tenantId", "whatsappPhoneNumberId", "whatsappVerifyToken"],
  });
  for (const s of all) {
    const t = await Tenant.findByPk(s.tenantId);
    const a = await AiAgent.findOne({ where: { tenantId: s.tenantId } });
    console.log("ALL_SETTINGS", {
      company: t?.companyCode,
      phoneId: s.whatsappPhoneNumberId,
      hasToken: Boolean((await AiAgentSettings.findByPk(s.id)).whatsappAccessTokenEnc),
      agentEnabled: a?.isEnabled,
    });
  }

  process.exit(canSend ? 0 : 2);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
