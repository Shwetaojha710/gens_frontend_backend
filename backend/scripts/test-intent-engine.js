/**
 * Phase 3: Test intent decision engine with env AI_AGENT_LLM_KEY (no WhatsApp send).
 * Usage: node scripts/test-intent-engine.js [companyCode]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const AiAgentConversation = require("../app/models/ai_agent_conversations");
const { getOrCreateAgent, processInboundMessage } = require("../app/helper/aiAgentEngine");

const COMPANY = process.argv[2] || "quaeretech";
const WA_ID = `919999${String(Date.now()).slice(-6)}`; // fresh sim id each run (clean history)

const MESSAGES = [
  "Hi",
  "Tell me about GENS.Ai",
  "What is the pricing?",
  "I want to book a demo",
  "Please connect me to a human",
];

(async () => {
  if (!process.env.AI_AGENT_LLM_KEY) {
    console.error("AI_AGENT_LLM_KEY missing in .env — abort");
    process.exit(2);
  }

  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: COMPANY } },
  });
  if (!tenant) throw new Error(`tenant not found: ${COMPANY}`);

  const { agent, settings } = await getOrCreateAgent(tenant.id);
  await agent.update({ isEnabled: true, status: "active" });

  await AiAgentConversation.update(
    { aiEnabled: true, status: "active" },
    { where: { tenantId: tenant.id, waId: WA_ID } }
  );

  console.log("Running intent tests (skipWhatsAppSend=true)...");
  const out = [];
  for (const text of MESSAGES) {
    // Keep AI on for each prompt so handover from a prior turn does not hide later tests
    await AiAgentConversation.update(
      { aiEnabled: true, status: "active" },
      { where: { tenantId: tenant.id, waId: WA_ID } }
    );

    const r = await processInboundMessage(
      tenant.id,
      agent,
      settings,
      {
        phoneNumberId: settings.whatsappPhoneNumberId,
        waId: WA_ID,
        customerPhone: WA_ID,
        customerName: "Phase3 Tester",
        waMessageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(),
        messageType: "text",
        body: text,
      },
      { skipWhatsAppSend: true }
    );
    const row = {
      inbound: text,
      intent: r.intent,
      confidence: r.confidence,
      actions: r.actions?.map((a) => a.type) || [],
      reply: (r.reply || "").slice(0, 180),
      skipped: r.skipped || false,
      reason: r.reason || null,
      whatsappError: r.whatsappError || null,
    };
    out.push(row);
    console.log("—", JSON.stringify(row, null, 2));
  }

  const failed = out.filter(
    (r) =>
      !r.reply ||
      /trouble accessing my assistant/i.test(r.reply) ||
      r.skipped === true
  );
  console.log("SUMMARY", {
    total: out.length,
    withReply: out.filter((r) => r.reply).length,
    failedLooks: failed.length,
  });
  process.exit(failed.length ? 3 : 0);
})().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
