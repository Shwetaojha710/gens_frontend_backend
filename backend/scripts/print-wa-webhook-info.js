/**
 * Print WhatsApp webhook verify token + phone id for QuaereTech.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const { getOrCreateAgent } = require("../app/helper/aiAgentEngine");

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: "quaeretech" } },
  });
  if (!tenant) throw new Error("tenant not found");
  const { agent, settings } = await getOrCreateAgent(tenant.id);
  process.stdout.write(
    JSON.stringify(
      {
        verifyToken: settings.whatsappVerifyToken,
        phoneNumberId: settings.whatsappPhoneNumberId,
        wabaId: settings.whatsappBusinessAccountId,
        agentEnabled: Boolean(agent?.isEnabled),
        agentStatus: agent?.status,
        publicWebhookUrl: settings.meta?.publicWebhookUrl || null,
      },
      null,
      2
    )
  );
  process.exit(0);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
