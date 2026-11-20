require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const AiAgentSettings = require("../app/models/ai_agent_settings");

(async () => {
  const t = await Tenant.findOne({ where: { companyCode: { [Op.iLike]: "quaeretech" } } });
  const s = await AiAgentSettings.findOne({ where: { tenantId: t.id } });
  console.log(
    JSON.stringify(
      {
        tenantId: t.id,
        companyCode: t.companyCode,
        verifyToken: s?.whatsappVerifyToken || null,
        phoneNumberId: s?.whatsappPhoneNumberId || null,
        businessAccountId: s?.whatsappBusinessAccountId || null,
      },
      null,
      2
    )
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
