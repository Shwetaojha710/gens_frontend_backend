/** One-shot WhatsApp send to verify credentials on QuaereTech. */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const { getOrCreateAgent, safeDecrypt } = require("../app/helper/aiAgentEngine");
const { sendTextMessage, normalizeWhatsAppTo } = require("../app/helper/whatsappCloud");
const { encrypt } = require("../app/helper/aiFaceCrypto");

const TO = process.argv[2] || "918687651183";
const TEXT = process.argv[3] || "GENS test: WhatsApp credentials OK ✅";

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: "quaeretech" } },
  });
  if (!tenant) throw new Error("tenant not found");
  const { agent, settings } = await getOrCreateAgent(tenant.id);

  let token = safeDecrypt(settings.whatsappAccessTokenEnc);
  if (!token) throw new Error("decrypt failed / no token");

  // Re-encrypt with current key so server and scripts stay in sync
  await settings.update({
    whatsappAccessTokenEnc: encrypt(token),
    whatsappPhoneNumberId: settings.whatsappPhoneNumberId || "1503572016169734",
  });
  await agent.update({ isEnabled: true, status: "active" });

  const to = normalizeWhatsAppTo(TO);
  console.log("Sending to", to, "phoneNumberId", settings.whatsappPhoneNumberId);
  const res = await sendTextMessage({
    accessToken: token,
    phoneNumberId: settings.whatsappPhoneNumberId,
    to,
    text: TEXT,
  });
  console.log("OK", JSON.stringify(res));
  process.exit(0);
})().catch((e) => {
  console.error("FAIL", e?.response?.data || e.message);
  process.exit(1);
});
