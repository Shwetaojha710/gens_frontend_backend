/**
 * Sales disposition unit + light engine checks (no live WhatsApp required for classifiers).
 * Usage: node scripts/test-disposition.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const assert = require("assert");
const { validateDecision } = require("../app/helper/aiAgentLlm");
const {
  detectSalesDisposition,
  isDeclinedIntent,
  isNotReadyIntent,
  isInterestedIntent,
  parseFollowUpAt,
  leadBlocksProactive,
} = require("../app/helper/aiAgentDisposition");
const { isProductInfoQuery, wantsDemoScheduling } = require("../app/helper/aiAgentDemoSlots");

let failed = 0;
function check(name, fn) {
  try {
    fn();
    console.log("OK ", name);
  } catch (e) {
    failed += 1;
    console.error("FAIL", name, e.message || e);
  }
}

check("LLM validateDecision accepts salesDisposition + new actions", () => {
  const d = validateDecision({
    intent: "FOLLOWUP_REQUEST",
    confidence: 0.9,
    language: "hi",
    salesDisposition: "not_ready",
    reply: "Theek hai",
    actions: [{ type: "SCHEDULE_FOLLOWUP", payload: { followUpAt: "2026-12-01" } }],
  });
  assert.strictEqual(d.salesDisposition, "not_ready");
  assert.ok(d.actions.some((a) => a.type === "SCHEDULE_FOLLOWUP"));

  const d2 = validateDecision({
    intent: "DECLINED",
    salesDisposition: "declined",
    reply: "Ok",
    actions: [{ type: "STOP_OUTREACH", payload: {} }],
  });
  assert.strictEqual(d2.salesDisposition, "declined");
  assert.ok(d2.actions.some((a) => a.type === "STOP_OUTREACH"));

  const d3 = validateDecision({
    salesDisposition: "bogus",
    actions: [{ type: "ANSWER_QUESTION", payload: {} }],
  });
  assert.strictEqual(d3.salesDisposition, null);
});

check("product Q → no disposition", () => {
  const q = "GENS me payroll kaise kaam karta hai?";
  assert.ok(isProductInfoQuery(q));
  assert.strictEqual(detectSalesDisposition(q, "interested"), null);
  assert.strictEqual(detectSalesDisposition(q, "not_ready"), null);
  assert.ok(!isDeclinedIntent(q));
  assert.ok(!isNotReadyIntent(q));
});

check("not_ready phrases", () => {
  for (const t of ["baad me batana", "not now please", "next month follow up", "abhi nahi"]) {
    assert.strictEqual(detectSalesDisposition(t), "not_ready", t);
    assert.ok(isNotReadyIntent(t), t);
  }
});

check("declined phrases", () => {
  for (const t of ["not interested", "mat bhejo", "unsubscribe", "nahi chahiye", "stop messages"]) {
    assert.strictEqual(detectSalesDisposition(t), "declined", t);
    assert.ok(isDeclinedIntent(t), t);
  }
});

check("interested / demo phrases", () => {
  for (const t of ["I want to book a demo", "demo schedule karo", "interested in demo"]) {
    assert.ok(wantsDemoScheduling(t) || isInterestedIntent(t), t);
    assert.strictEqual(detectSalesDisposition(t), "interested", t);
  }
});

check("parseFollowUpAt defaults for not_ready", () => {
  const m = parseFollowUpAt({}, "baad me");
  assert.ok(m && m.isValid());
  assert.ok(m.diff(require("moment")(), "days") >= 2);
});

check("leadBlocksProactive on lost / doNotContact", () => {
  assert.ok(leadBlocksProactive({ leadStatus: "lost", meta: {} }));
  assert.ok(leadBlocksProactive({ leadStatus: "nurturing", meta: { doNotContact: true } }));
  assert.ok(leadBlocksProactive(null, { context: { doNotContact: true } }));
  assert.ok(!leadBlocksProactive({ leadStatus: "qualified", meta: {} }));
});

async function engineSmoke() {
  if (!process.env.AI_AGENT_LLM_KEY) {
    console.log("SKIP engine smoke (no AI_AGENT_LLM_KEY)");
    return;
  }
  const { Op } = require("sequelize");
  const Tenant = require("../app/models/tenant");
  const AiAgentLead = require("../app/models/ai_agent_leads");
  const AiAgentConversation = require("../app/models/ai_agent_conversations");
  const { getOrCreateAgent, processInboundMessage, sendAgentWelcomeTemplate } = require("../app/helper/aiAgentEngine");

  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: "quaeretech" } },
  });
  if (!tenant) {
    console.log("SKIP engine smoke (tenant quaeretech missing)");
    return;
  }

  const { agent, settings } = await getOrCreateAgent(tenant.id);
  await agent.update({ isEnabled: true, status: "active" });

  const run = async (waId, body) => {
    await AiAgentConversation.update(
      { aiEnabled: true, status: "active" },
      { where: { tenantId: tenant.id, waId } }
    );
    return processInboundMessage(
      tenant.id,
      agent,
      settings,
      {
        phoneNumberId: settings.whatsappPhoneNumberId,
        waId,
        customerPhone: waId,
        customerName: "Disposition Tester",
        waMessageId: `sim_disp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(),
        messageType: "text",
        body,
      },
      { skipWhatsAppSend: true }
    );
  };

  // Product Q — no disposition actions
  const waProd = `919880${String(Date.now()).slice(-6)}`;
  const rProd = await run(waProd, "GENS me attendance feature kya hai?");
  const prodActions = (rProd.actions || []).map((a) => a.type);
  assert.ok(!prodActions.includes("SCHEDULE_FOLLOWUP"), "product should not SCHEDULE_FOLLOWUP");
  assert.ok(!prodActions.includes("STOP_OUTREACH"), "product should not STOP_OUTREACH");
  assert.ok(!prodActions.includes("LIST_DEMO_SLOTS"), "product should not LIST_DEMO_SLOTS");
  console.log("OK  engine product Q has no disposition/demo actions", prodActions);

  // Not ready → nurturing + followUpAt
  const waNurture = `919881${String(Date.now()).slice(-6)}`;
  const rNurture = await run(waNurture, "Abhi nahi, baad me follow up karna");
  assert.ok(
    (rNurture.actions || []).some((a) => a.type === "SCHEDULE_FOLLOWUP"),
    "expected SCHEDULE_FOLLOWUP"
  );
  const leadN = await AiAgentLead.findOne({
    where: { tenantId: tenant.id, waId: waNurture },
    order: [["updatedAt", "DESC"]],
  });
  assert.ok(leadN, "nurture lead missing");
  assert.strictEqual(leadN.leadStatus, "nurturing");
  assert.ok(leadN.meta?.followUpAt, "followUpAt missing");
  console.log("OK  not_ready → nurturing", leadN.meta.followUpAt);

  // Declined → lost + doNotContact; welcome skipped
  const waLost = `919882${String(Date.now()).slice(-6)}`;
  const rLost = await run(waLost, "Not interested, mat bhejo");
  assert.ok((rLost.actions || []).some((a) => a.type === "STOP_OUTREACH"), "expected STOP_OUTREACH");
  const leadL = await AiAgentLead.findOne({
    where: { tenantId: tenant.id, waId: waLost },
    order: [["updatedAt", "DESC"]],
  });
  assert.ok(leadL);
  assert.strictEqual(leadL.leadStatus, "lost");
  assert.strictEqual(leadL.meta?.doNotContact, true);
  const welcome = await sendAgentWelcomeTemplate({
    tenantId: tenant.id,
    agent,
    settings,
    phone: waLost,
    customerName: "Should Skip",
  });
  assert.strictEqual(welcome.skipped, true);
  assert.strictEqual(welcome.reason, "do_not_contact");
  console.log("OK  declined → lost + welcome skipped");
}

(async () => {
  try {
    await engineSmoke();
  } catch (e) {
    failed += 1;
    console.error("FAIL engine smoke", e.message || e);
  }
  if (failed) {
    console.error(`\n${failed} test(s) failed`);
    process.exit(1);
  }
  console.log("\nAll disposition checks passed");
  process.exit(0);
})();
