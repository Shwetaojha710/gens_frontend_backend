/**
 * Send Meta-approved hello_world (agent welcome) template to an allowlisted number.
 * Usage: node scripts/send-test-wa-template.js [phone] [companyCode]
 * Example: node scripts/send-test-wa-template.js 917905217795 quaeretech
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const {
  getOrCreateAgent,
  sendAgentWelcomeTemplate,
} = require("../app/helper/aiAgentEngine");

const TO = process.argv[2] || "917905217795";
const COMPANY = process.argv[3] || "quaeretech";

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: COMPANY } },
  });
  if (!tenant) throw new Error(`tenant not found for companyCode=${COMPANY}`);

  const { agent, settings } = await getOrCreateAgent(tenant.id);
  if (!agent.isEnabled) {
    await agent.update({ isEnabled: true, status: "active" });
  }

  console.log("Tenant", tenant.companyCode, tenant.id);
  console.log("PhoneNumberId", settings.whatsappPhoneNumberId);
  console.log("Sending welcome template to", TO);

  const result = await sendAgentWelcomeTemplate({
    tenantId: tenant.id,
    agent,
    settings,
    phone: TO,
    customerName: null,
    userId: null,
  });

  if (result.skipped) {
    console.error("SKIPPED", result.reason, result.error || "");
    process.exit(1);
  }
  console.log("Template", result.template);
  console.log("Delivery", result.delivery);
  console.log("Conversation", result.conversation?.id);
  console.log("Message", result.message?.id);
  if (!result.delivery?.sent) process.exit(1);
  process.exit(0);
})().catch((e) => {
  console.error("FAIL", e?.response?.data || e.message || e);
  process.exit(1);
});
