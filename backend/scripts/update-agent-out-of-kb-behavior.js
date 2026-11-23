/**
 * Set out-of-context / no-KB behaviour: book a demo, team will support.
 * Usage: node scripts/update-agent-out-of-kb-behavior.js [companyCode]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const { getOrCreateAgent } = require("../app/helper/aiAgentEngine");

const COMPANY = process.argv[2] || "quaeretech";

const SYSTEM_INSTRUCTIONS =
  "Qualify leads politely. Answer from approved Knowledge Base only. For pricing use only approved figures. For demo/sales requests collect name, company, email, phone, preferred time. OUT OF CONTEXT / UNKNOWN: if the question is unrelated to GENS/HRMS/Quaere or not covered in knowledge, do not invent — politely say you do not have that detail, invite them to book a free product demo, and tell them our team will support them and help solve all their questions. Then collect demo contact details. For login/payslip/app bugs guide briefly from KB then offer support@quaeretech.com or human handover. For partnership/careers collect details and route to sales/info — do not invent commercial terms.";

const PERSONALITY =
  "You are a professional customer relationship executive for Quaere Etechnologies (GENS.Ai HRMS). Friendly, natural, concise. Support Hindi and English. Never invent pricing or features — use approved knowledge only. For unknown/out-of-context questions, invite a free demo and say our team will support and solve all queries.";

const INTRO =
  "Namaste! I am the virtual assistant for Quaere / GENS.Ai HRMS. I can help with product info, pricing, demos, and connecting you with our team. How can I help you today?";

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: COMPANY } },
  });
  if (!tenant) throw new Error(`tenant not found: ${COMPANY}`);
  const { agent } = await getOrCreateAgent(tenant.id);
  await agent.update({
    systemInstructions: SYSTEM_INSTRUCTIONS,
    personality: PERSONALITY,
    companyIntro:
      agent.companyIntro && !/virtual assistant for our company/i.test(agent.companyIntro)
        ? agent.companyIntro
        : INTRO,
  });
  await agent.reload();
  console.log("OK", {
    company: tenant.companyCode,
    systemInstructionsPreview: agent.systemInstructions.slice(0, 160) + "...",
  });
  process.exit(0);
})().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
