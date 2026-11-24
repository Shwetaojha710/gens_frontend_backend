/**
 * Smoke-test sales demo email via MAIL_* SMTP.
 * Usage: node scripts/test-demo-sales-mail.js [to@email.com]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { notifySalesDemoScheduled } = require("../app/helper/aiAgentMail");

(async () => {
  const to = String(process.argv[2] || process.env.AI_AGENT_SALES_EMAIL || process.env.MAIL_USER || "")
    .trim();
  if (!to) {
    console.error("No recipient. Pass email arg or set AI_AGENT_SALES_EMAIL / MAIL_USER");
    process.exit(1);
  }

  const fakeLead = {
    id: "00000000-0000-0000-0000-000000000001",
    fullName: "Test Lead",
    companyName: "Demo Co",
    email: "lead@example.com",
    phone: "919999999999",
    productInterest: "GENS.Ai HRMS",
    businessRequirements: "Attendance + payroll",
    purchaseTimeline: "This week",
    leadPriority: "HOT",
    waId: "919999999999",
    meta: {},
    update: async () => {},
  };

  const result = await notifySalesDemoScheduled({
    settings: {
      notifyOnLead: true,
      meta: { salesNotifyEmail: to },
    },
    lead: fakeLead,
    conversation: { id: "00000000-0000-0000-0000-000000000002", customerPhone: "919999999999" },
    preferredTime: "Tomorrow 3 PM IST",
  });

  console.log("Result:", result);
  process.exit(result.skipped ? 2 : 0);
})().catch((e) => {
  console.error("FAIL:", e.message || e);
  process.exit(1);
});
