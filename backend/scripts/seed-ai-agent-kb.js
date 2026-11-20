/**
 * Phase 1+2: Seed approved sales Knowledge Base + polish agent config for Quaere.
 * Usage: node scripts/seed-ai-agent-kb.js [companyCode]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const AiAgentKnowledge = require("../app/models/ai_agent_knowledge");
const { getOrCreateAgent, DEFAULT_WELCOME_TEMPLATE } = require("../app/helper/aiAgentEngine");
const { buildSearchText } = require("../app/helper/aiAgentKnowledge");

const COMPANY = process.argv[2] || "quaeretech";

const KB_ENTRIES = [
  {
    category: "company",
    title: "About Quaere Etechnologies",
    content:
      "Quaere Etechnologies Pvt Ltd is an ISO 9001:2015 company based in Gomti Nagar, Lucknow. We build GENS.Ai, an AI-powered HRMS for Indian businesses covering attendance, payroll, leave, recruitment, assets, and workforce analytics. Website: www.quaeretech.com. Email: info@quaeretech.com. Phone: 0522-4067760. Sales: sales@quaeretech.com.",
    tags: ["quaere", "company", "gens", "about", "lucknow"],
  },
  {
    category: "product",
    title: "GENS.Ai HRMS Product Overview",
    content:
      "GENS.Ai is our flagship cloud HRMS. Modules include Employee Management, Attendance & Shift, Leave, Payroll, Recruitment ATS, Asset Management, Projects & Timesheets, Expenses, Performance, AI Insights, and AI Face Attendance. It supports multi-branch and multi-tenant setups. Suitable for SMEs and mid-size enterprises in India.",
    tags: ["gens", "hrms", "product", "modules", "cloud"],
  },
  {
    category: "feature",
    title: "Key Features of GENS.Ai",
    content:
      "Key features: biometric and AI face attendance, GPS tracking, automated payroll with statutory compliance (PF/ESI), leave workflows, candidate ATS scoring, employee self-service portal, role-based permissions, WhatsApp AI customer agent, document templates (offer/appointment/relieving), and real-time dashboards.",
    tags: ["features", "attendance", "payroll", "ats", "whatsapp"],
  },
  {
    category: "pricing",
    title: "GENS.Ai Pricing Plans",
    content:
      "Approved pricing (INR, exclusive of taxes): Basic plan starts at ₹99 per employee per month (core HR + attendance). Professional plan at ₹149 per employee per month (adds payroll + recruitment). Enterprise plan is custom quote based on modules and volume. Annual billing gets 2 months free. Demo is free for 14 days. Discounts require sales approval — do not invent other prices.",
    tags: ["pricing", "plans", "cost", "rupees", "demo"],
  },
  {
    category: "service",
    title: "Implementation and Support",
    content:
      "Implementation usually takes 1–3 weeks depending on employee count and integrations. Includes data migration assistance, admin training, and go-live support. Support hours: Mon–Sat 10:00–19:00 IST. Support email: support@quaeretech.com. Dedicated account manager for Enterprise.",
    tags: ["support", "implementation", "service", "training"],
  },
  {
    category: "faq",
    title: "FAQ - Demo and Onboarding",
    content:
      "Q: How do I book a demo? A: Share your name, company, email, phone and preferred time; our sales team will schedule a live demo. Q: Is data secure? A: Yes, tenant data is isolated and access is role-controlled. Q: Can we customize? A: Yes, workflows and templates can be configured per company. Q: Do you support Hindi? A: Yes, our WhatsApp assistant understands Hindi and English.",
    tags: ["faq", "demo", "onboarding", "security", "hindi"],
  },
  {
    category: "case_study",
    title: "Case Study - Mid-size IT Services",
    content:
      "A 250-employee IT services firm in Lucknow reduced payroll processing time by ~60% after adopting GENS.Ai payroll + attendance. Face attendance cut buddy-punching issues. Recruitment ATS helped shortlist candidates faster for high-volume hiring.",
    tags: ["case study", "success", "payroll", "attendance"],
  },
  {
    category: "product",
    title: "GENS.Ai Modules List",
    content:
      "GENS.Ai modules customers commonly ask about: 1) Employee Management 2) Attendance & Shift including AI Face Attendance 3) Leave 4) Payroll 5) Recruitment / ATS 6) Assets 7) Projects & Timesheets 8) Expenses 9) Performance 10) AI Insights 11) Reports & dashboards 12) HR document templates. Ask which module you want details on.",
    tags: ["modules", "list", "attendance", "payroll", "recruitment"],
  },
];

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: COMPANY } },
  });
  if (!tenant) throw new Error(`tenant not found: ${COMPANY}`);

  const { agent, settings } = await getOrCreateAgent(tenant.id);

  // Phase 2 — polish agent
  await agent.update({
    isEnabled: true,
    status: "active",
    aiProvider: agent.aiProvider || "openai",
    aiModel: agent.aiModel || "gpt-4o-mini",
    companyIntro:
      agent.companyIntro ||
      "Namaste! I am the virtual assistant for Quaere / GENS.Ai HRMS. I can help with product info, pricing, demos, and connecting you with our team. How can I help you today?",
    personality:
      agent.personality ||
      "You are a professional customer relationship executive for Quaere Etechnologies (GENS.Ai HRMS). Friendly, natural, concise. Support Hindi and English. Never invent pricing or features — use approved knowledge only.",
    systemInstructions:
      agent.systemInstructions ||
      "Qualify leads politely. For pricing use only approved knowledge. For demo requests collect name, company, email, phone, preferred time. Offer human handover for complaints or complex negotiation.",
  });

  const meta = {
    ...(settings.meta || {}),
    welcomeTemplate: {
      ...DEFAULT_WELCOME_TEMPLATE,
      ...(settings.meta?.welcomeTemplate || {}),
      name: settings.meta?.welcomeTemplate?.name || "hello_world",
      language: settings.meta?.welcomeTemplate?.language || "en_US",
      autoSend: settings.meta?.welcomeTemplate?.autoSend !== false,
    },
  };
  await settings.update({ meta });

  // Phase 1 — seed KB
  const results = [];
  for (const entry of KB_ENTRIES) {
    const existing = await AiAgentKnowledge.findOne({
      where: { tenantId: tenant.id, title: entry.title },
    });
    if (existing) {
      await existing.update({
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        isActive: true,
        isApproved: true,
        searchText: buildSearchText(entry),
        agentId: agent.id,
      });
      results.push({ title: entry.title, action: "updated", category: entry.category });
    } else {
      await AiAgentKnowledge.create({
        tenantId: tenant.id,
        agentId: agent.id,
        category: entry.category,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
        isActive: true,
        isApproved: true,
        searchText: buildSearchText(entry),
      });
      results.push({ title: entry.title, action: "created", category: entry.category });
    }
  }

  const count = await AiAgentKnowledge.count({
    where: { tenantId: tenant.id, isActive: true, isApproved: true },
  });

  console.log("TENANT", tenant.companyCode, tenant.id);
  console.log("AGENT", {
    name: agent.name,
    isEnabled: true,
    provider: agent.aiProvider || "openai",
    model: agent.aiModel || "gpt-4o-mini",
  });
  console.log("KB_SEED", results);
  console.log("APPROVED_ACTIVE_KB_COUNT", count);
  process.exit(0);
})().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
