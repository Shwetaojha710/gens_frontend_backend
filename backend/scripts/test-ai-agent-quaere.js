/**
 * Seed QuaereTech knowledge + run AI agent conversation flow test.
 * Usage: node scripts/test-ai-agent-quaere.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const axios = require("axios");
const cryptoJs = require("crypto-js");
const { Op } = require("sequelize");

const Tenant = require("../app/models/tenant");
const User = require("../app/models/users");
const AiAgentKnowledge = require("../app/models/ai_agent_knowledge");
const AiAgentLead = require("../app/models/ai_agent_leads");
const AiAgentConversation = require("../app/models/ai_agent_conversations");
const AiAgentMessage = require("../app/models/ai_agent_messages");
const { getOrCreateAgent } = require("../app/helper/aiAgentEngine");
const { buildSearchText } = require("../app/helper/aiAgentKnowledge");

const API = process.env.API_BASE_URL || "http://127.0.0.1:3002/api/";

const KB_ENTRIES = [
  {
    category: "company",
    title: "About Quaere Etechnologies",
    content:
      "Quaere Etechnologies Pvt Ltd is an ISO 9001:2015 company based in Gomti Nagar, Lucknow. We build GENS.Ai, an AI-powered HRMS for Indian businesses covering attendance, payroll, leave, recruitment, assets, and workforce analytics. Website: www.quaeretech.com. Email: info@quaeretech.com. Phone: 0522-4067760. Sales: sales@quaeretech.com.",
    tags: ["quaere", "company", "gens", "about"],
  },
  {
    category: "product",
    title: "GENS.Ai HRMS Product Overview",
    content:
      "GENS.Ai is our flagship cloud HRMS. Modules include Employee Management, Attendance & Shift, Leave, Payroll, Recruitment ATS, Asset Management, Projects & Timesheets, Expenses, Performance, AI Insights, and AI Face Attendance. It supports multi-branch and multi-tenant setups. Suitable for SMEs and mid-size enterprises in India.",
    tags: ["gens", "hrms", "product", "modules"],
  },
  {
    category: "feature",
    title: "Key Features of GENS.Ai",
    content:
      "Key features: biometric and AI face attendance, GPS tracking, automated payroll with statutory compliance (PF/ESI), leave workflows, candidate ATS scoring, employee self-service portal, role-based permissions, WhatsApp AI customer agent, document templates (offer/appointment/relieving), and real-time dashboards.",
    tags: ["features", "attendance", "payroll", "ats"],
  },
  {
    category: "pricing",
    title: "GENS.Ai Pricing Plans",
    content:
      "Approved pricing (INR, exclusive of taxes): Basic plan starts at ₹99 per employee per month (up to core HR + attendance). Professional plan at ₹149 per employee per month (adds payroll + recruitment). Enterprise plan is custom quote based on modules and volume. Annual billing gets 2 months free. Demo is free for 14 days. Discounts require sales approval — AI must not invent other prices.",
    tags: ["pricing", "plans", "cost", "₹"],
  },
  {
    category: "service",
    title: "Implementation and Support",
    content:
      "Implementation usually takes 1–3 weeks depending on employee count and integrations. Includes data migration assistance, admin training, and go-live support. Support hours: Mon–Sat 10:00–19:00 IST. Support email: support@quaeretech.com. Dedicated account manager for Enterprise.",
    tags: ["support", "implementation", "service"],
  },
  {
    category: "faq",
    title: "FAQ - Demo and Onboarding",
    content:
      "Q: How do I book a demo? A: Share your name, company, email, phone and preferred time; our sales team will schedule a live demo. Q: Is data secure? A: Yes, tenant data is isolated and access is role-controlled. Q: Can we customize? A: Yes, workflows and templates can be configured per company.",
    tags: ["faq", "demo", "onboarding"],
  },
  {
    category: "case_study",
    title: "Case Study - Mid-size IT Services",
    content:
      "A 250-employee IT services firm in Lucknow reduced payroll processing time by ~60% after adopting GENS.Ai payroll + attendance. Face attendance cut buddy-punching issues. Recruitment ATS helped shortlist candidates faster for high-volume hiring.",
    tags: ["case study", "success", "payroll"],
  },
];

async function findQuaereTenant() {
  const tenant =
    (await Tenant.findOne({
      where: {
        [Op.or]: [
          { companyName: { [Op.iLike]: "%quaer%" } },
          { companyCode: { [Op.iLike]: "%quaer%" } },
          { companyName: { [Op.iLike]: "%Quaere%" } },
        ],
      },
      order: [["createdAt", "ASC"]],
    })) ||
    (await Tenant.findOne({
      where: {
        [Op.or]: [
          { companyCode: { [Op.iLike]: "%gens%" } },
          { companyName: { [Op.iLike]: "%gens%" } },
        ],
      },
    }));
  return tenant;
}

async function findAdminUser(tenantId) {
  return User.findOne({
    where: { tenantId, role: { [Op.in]: ["admin", "hr", "superadmin"] } },
    order: [["createdAt", "ASC"]],
  });
}

async function login(companyCode, email, passwordPlain) {
  // Try common login endpoints used by this app
  const candidates = [
    { url: `${API}login`, body: { email, password: passwordPlain, companyCode } },
    { url: `${API}admin-login`, body: { email, password: passwordPlain, companyCode } },
    {
      url: `${API}login`,
      body: {
        email,
        password: cryptoJs.SHA256(passwordPlain).toString(),
        companyCode,
      },
    },
  ];
  for (const c of candidates) {
    try {
      const res = await axios.post(c.url, c.body, { timeout: 20000, validateStatus: () => true });
      if (res.data?.status === true && (res.data?.data?.token || res.data?.token)) {
        return res.data.data?.token || res.data.token;
      }
      console.log("login attempt", c.url, res.data?.message || res.status);
    } catch (e) {
      console.log("login error", c.url, e.message);
    }
  }
  return null;
}

async function seedKnowledge(tenantId, agentId) {
  const created = [];
  for (const entry of KB_ENTRIES) {
    const existing = await AiAgentKnowledge.findOne({
      where: { tenantId, title: entry.title },
    });
    if (existing) {
      await existing.update({
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        isActive: true,
        isApproved: true,
        searchText: buildSearchText(entry),
      });
      created.push({ id: existing.id, title: entry.title, action: "updated" });
    } else {
      const row = await AiAgentKnowledge.create({
        tenantId,
        agentId,
        category: entry.category,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
        isActive: true,
        isApproved: true,
        searchText: buildSearchText(entry),
      });
      created.push({ id: row.id, title: entry.title, action: "created" });
    }
  }
  return created;
}

async function apiPost(token, path, body = {}) {
  const res = await axios.post(`${API}${path}`, body, {
    headers: { Authorization: `Bearer ${token}`, branchid: "" },
    timeout: 90000,
    validateStatus: () => true,
  });
  return res.data;
}

async function runDirectSimulate(tenantId, messages) {
  const { processInboundMessage, getOrCreateAgent: goa } = require("../app/helper/aiAgentEngine");
  const AiAgentConversation = require("../app/models/ai_agent_conversations");
  const { agent, settings } = await goa(tenantId);
  // India mobile — Meta allow-list me 918687651183 add/verify hona chahiye
  const waId = "918687651183";

  // Re-enable AI if this number was previously handed over
  await AiAgentConversation.update(
    { aiEnabled: true, status: "active" },
    { where: { tenantId, waId: { [Op.in]: [waId, "8687651183"] } } }
  );

  const results = [];
  for (const text of messages) {
    const r = await processInboundMessage(
      tenantId,
      agent,
      settings,
      {
        phoneNumberId: settings.whatsappPhoneNumberId,
        waId,
        customerPhone: waId,
        customerName: "Test User",
        waMessageId: `flow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(),
        messageType: "text",
        body: text,
      },
      { skipWhatsAppSend: false }
    );
    results.push({ inbound: text, result: r });
  }
  return { waId, results };
}

async function main() {
  console.log("API=", API);
  const tenant = await findQuaereTenant();
  if (!tenant) {
    console.error("QuaereTech tenant not found in DB");
    process.exit(1);
  }
  console.log("TENANT", {
    id: tenant.id,
    companyName: tenant.companyName,
    companyCode: tenant.companyCode,
  });

  const { agent, settings } = await getOrCreateAgent(tenant.id);
  console.log("AGENT", {
    id: agent.id,
    name: agent.name,
    isEnabled: agent.isEnabled,
    aiProvider: agent.aiProvider,
    aiModel: agent.aiModel,
    hasLlmKey: Boolean(settings.llmApiKeyEnc),
    hasWaToken: Boolean(settings.whatsappAccessTokenEnc),
    phoneNumberId: settings.whatsappPhoneNumberId,
  });

  if (!agent.isEnabled) {
    await agent.update({ isEnabled: true, status: "active" });
    console.log("Enabled agent for testing");
  }

  const kb = await seedKnowledge(tenant.id, agent.id);
  console.log("KB_SEEDED", kb);

  const admin = await findAdminUser(tenant.id);
  console.log("ADMIN_USER", admin ? { id: admin.id, email: admin.email, role: admin.role } : null);

  const flowMessages = [
    "Hi, I want to know about GENS HRMS",
    "What is the pricing for Professional plan?",
    "We are Quaere partner inquiry actually I am Rahul Sharma from TechNova Pvt Ltd, 120 employees. Email rahul@technova.in phone 9876543210. Interested in payroll and attendance. Budget around 2 lakh per year, need within 1 month.",
    "Can I get a product demo?",
  ];

  console.log("\n=== Running direct engine simulation on QuaereTech ===\n");
  const sim = await runDirectSimulate(tenant.id, flowMessages);

  for (const step of sim.results) {
    console.log("---");
    console.log("IN :", step.inbound);
    console.log("OUT:", step.result?.reply || "(no reply)");
    console.log("intent=", step.result?.intent, "confidence=", step.result?.confidence);
    console.log("actions=", JSON.stringify(step.result?.actions || []));
    console.log("leadId=", step.result?.leadId, "handoverId=", step.result?.handoverId);
  }

  const lead = await AiAgentLead.findOne({
    where: { tenantId: tenant.id, waId: sim.waId },
    order: [["updatedAt", "DESC"]],
  });
  const conv = await AiAgentConversation.findOne({
    where: { tenantId: tenant.id, waId: sim.waId },
  });
  const msgCount = conv
    ? await AiAgentMessage.count({ where: { conversationId: conv.id } })
    : 0;

  console.log("\n=== FINAL STATE ===");
  console.log("conversation", conv && {
    id: conv.id,
    status: conv.status,
    aiEnabled: conv.aiEnabled,
    currentIntent: conv.currentIntent,
    leadId: conv.leadId,
  });
  console.log("lead", lead && {
    id: lead.id,
    fullName: lead.fullName,
    companyName: lead.companyName,
    email: lead.email,
    phone: lead.phone,
    productInterest: lead.productInterest,
    leadPriority: lead.leadPriority,
    leadStatus: lead.leadStatus,
    qualificationScore: lead.qualificationScore,
  });
  console.log("messages", msgCount);

  // Optional HTTP path if we know a password via env
  if (process.env.QUAERE_ADMIN_PASSWORD && admin) {
    const token = await login(tenant.companyCode, admin.email, process.env.QUAERE_ADMIN_PASSWORD);
    if (token) {
      const dash = await apiPost(token, "ai-agent/dashboard");
      console.log("HTTP dashboard status", dash.status, dash.message);
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
