/**
 * Seed approved sales Knowledge Base + polish agent config for Quaere / GENS.Ai.
 * Includes the GENS.Ai Customer Question Bank (general → careers).
 *
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
  // ── Core product docs ──
  {
    category: "company",
    title: "About Quaere Etechnologies",
    content:
      "Quaere Etechnologies Pvt Ltd is an ISO 9001:2015 company based in Gomti Nagar, Lucknow. We build GENS.Ai, an AI-powered HRMS for Indian businesses covering attendance, payroll, leave, recruitment, assets, and workforce analytics. Website: www.quaeretech.com. Email: info@quaeretech.com. Phone: 0522-4067760. Sales: sales@quaeretech.com. Support: support@quaeretech.com.",
    tags: ["quaere", "company", "gens", "about", "lucknow", "what does your company do"],
  },
  {
    category: "product",
    title: "GENS.Ai HRMS Product Overview",
    content:
      "GENS.Ai (also called GENS HRMS) is our flagship cloud HRMS / workforce platform. It helps companies manage employees, attendance, leave, payroll, recruitment, assets, projects/timesheets, performance, and AI-powered insights in one place. Modules include Employee Management, Attendance & Shift, AI Face Attendance, Leave, Payroll, Recruitment ATS, Asset Management, Projects & Timesheets, Expenses, Performance, AI Insights, Reports, and HR document templates. It supports multi-branch and multi-tenant setups. Suitable for small businesses, SMEs, and mid-size enterprises in India (including teams of hundreds of employees, e.g. 500+).",
    tags: ["gens", "gens.ai", "hrms", "product", "what is gens", "explain gens", "small business"],
  },
  {
    category: "feature",
    title: "Key Features of GENS.Ai",
    content:
      "What makes GENS different: AI Face Attendance, GPS-based attendance, biometric options, automated payroll with Indian statutory compliance (PF/ESI), leave workflows, recruitment ATS with candidate scoring, employee self-service, role-based permissions, multi-branch support, WhatsApp AI customer agent, HR document templates (offer/appointment/relieving), and real-time dashboards. Problems it solves: manual attendance errors, buddy-punching, slow payroll, scattered HR data, weak recruitment tracking, and lack of self-service for employees.",
    tags: ["features", "different", "problems", "solve", "attendance", "payroll", "ats", "whatsapp"],
  },
  {
    category: "pricing",
    title: "GENS.Ai Pricing Plans",
    content:
      "Approved pricing (INR, exclusive of taxes). Yes, pricing is typically per employee per month. Plans: Basic starts at ₹99 per employee per month (core HR + attendance). Professional at ₹149 per employee per month (adds payroll + recruitment). Enterprise is a custom quote based on modules and volume. Annual billing gets 2 months free. Free trial / demo: 14-day free demo available. Implementation charge: standard implementation is included in onboarding for typical setups; complex enterprise integrations may have a separate implementation quote — ask sales for a customized quotation. Do not invent other prices. For discounts or custom quotes, collect lead details and connect with sales (sales@quaeretech.com).",
    tags: ["pricing", "plans", "cost", "price", "per employee", "trial", "implementation", "quotation", "rupees"],
  },
  {
    category: "service",
    title: "Implementation and Support",
    content:
      "Implementation usually takes 1–3 weeks depending on employee count and integrations. Includes data migration assistance, admin training, and go-live support. You can replace an existing HRMS with GENS — sales and implementation help with migration planning. Support hours: Mon–Sat 10:00–19:00 IST. Support email: support@quaeretech.com. Phone: 0522-4067760. Dedicated account manager for Enterprise.",
    tags: ["support", "implementation", "replace", "migration", "service", "training"],
  },
  {
    category: "product",
    title: "GENS.Ai Modules List",
    content:
      "GENS.Ai modules: 1) Employee Management 2) Attendance & Shift including AI Face Attendance 3) Leave 4) Payroll 5) Recruitment / ATS 6) Assets 7) Projects & Timesheets 8) Expenses 9) Performance 10) AI Insights 11) Reports & dashboards 12) HR document templates. Who can use it: HR teams, admins, managers, and employees (self-service). Ask which module the customer wants details on.",
    tags: ["modules", "list", "who can use", "attendance", "payroll", "recruitment"],
  },
  {
    category: "case_study",
    title: "Case Study - Mid-size IT Services",
    content:
      "A 250-employee IT services firm in Lucknow reduced payroll processing time by ~60% after adopting GENS.Ai payroll + attendance. Face attendance cut buddy-punching issues. Recruitment ATS helped shortlist candidates faster for high-volume hiring. GENS can scale to larger headcounts (e.g. 500 employees) via Enterprise plans.",
    tags: ["case study", "success", "500 employees", "payroll", "attendance"],
  },

  // ── Question bank: General ──
  {
    category: "faq",
    title: "FAQ - General Enquiries",
    content: `Q1: What is GENS.Ai?
A: GENS.Ai is Quaere's AI-powered cloud HRMS / workforce platform for Indian businesses.

Q2: What is GENS HRMS?
A: GENS HRMS is the same product family — a complete HR management system covering employees, attendance, leave, payroll, recruitment, assets, projects, and more.

Q3: What does your company do?
A: Quaere Etechnologies builds GENS.Ai and related HR/workforce solutions. We are ISO 9001:2015, based in Lucknow. Website: www.quaeretech.com.

Q4: Who can use GENS HRMS?
A: HR admins, managers, employees (self-service), and multi-branch organizations — from small businesses to mid-size and larger enterprises.

Q5: What problems does GENS solve?
A: Manual attendance mistakes, buddy-punching, delayed payroll, scattered employee records, weak leave tracking, and slow recruitment pipelines.

Q6: What makes GENS different from other HRMS software?
A: AI Face Attendance, GPS attendance, WhatsApp AI agent, Indian statutory payroll focus, multi-branch support, and modular plans from Basic to Enterprise.

Q7: Is GENS suitable for small businesses?
A: Yes. Basic plan starts affordably per employee/month and covers core HR + attendance; you can upgrade modules as you grow.

Q8: Can you explain GENS HRMS?
A: It is a cloud platform where you manage the full employee lifecycle — join to exit — with attendance, leave, payroll, recruitment, assets, performance, and reports in one place.`,
    tags: ["faq", "general", "what is gens", "hrms", "different", "small business", "explain"],
  },

  // ── Employee Management ──
  {
    category: "faq",
    title: "FAQ - Employee Management",
    content: `Q9: Can I manage all my employees through GENS?
A: Yes. Centralized employee directory for the whole organization.

Q10: Can I maintain employee records?
A: Yes. Store personal, job, documents, and employment history in employee profiles.

Q11: Can I manage multiple company branches?
A: Yes. Multi-branch / multi-location support is available.

Q12: Can I assign different roles and permissions?
A: Yes. Role-based access control for Admin, HR, Manager, Employee, and custom roles.

Q13: Can employees access their profiles?
A: Yes. Employee self-service portal/app for profile, attendance, leave, and payslips.

Q14: Can I manage employee onboarding?
A: Yes. Onboarding workflows and HR document templates (offer, appointment, etc.) help new joiners.`,
    tags: ["faq", "employee", "records", "branches", "roles", "permissions", "onboarding", "profile"],
  },

  // ── Attendance ──
  {
    category: "faq",
    title: "FAQ - Attendance Management",
    content: `Q15: How does attendance management work?
A: Employees mark attendance via mobile/web/face/biometric as configured; admins see live status, shifts, late marks, and reports.

Q16: Can employees mark attendance through mobile?
A: Yes. Mobile attendance is supported.

Q17: Does GENS support GPS-based attendance?
A: Yes. GPS-based attendance/tracking is available for field and location-based marking.

Q18: Can I track late arrivals?
A: Yes. Late arrival tracking and attendance reports are available.

Q19: Can I manage multiple shifts?
A: Yes. Multi-shift configuration is supported.

Q20: Can I view monthly attendance reports?
A: Yes. Monthly and custom attendance reports/dashboards are available.

Q21: Can employees request attendance regularization?
A: Yes. Employees can raise attendance regularization requests for manager/HR approval.`,
    tags: ["faq", "attendance", "mobile", "gps", "late", "shift", "reports", "regularization", "face"],
  },

  // ── Leave ──
  {
    category: "faq",
    title: "FAQ - Leave Management",
    content: `Q22: Can employees apply for leave online?
A: Yes. Online leave application via self-service.

Q23: Can managers approve leave requests?
A: Yes. Manager/HR approval workflows are supported.

Q24: Can I configure different leave types?
A: Yes. Configure leave types (casual, sick, earned, etc.) per company policy.

Q25: Can employees check their leave balance?
A: Yes. Leave balance is visible to employees in self-service.

Q26: Can HR view upcoming employee leaves?
A: Yes. HR/managers can view leave calendars and upcoming leaves.`,
    tags: ["faq", "leave", "approve", "balance", "leave types", "calendar"],
  },

  // ── Payroll ──
  {
    category: "faq",
    title: "FAQ - Payroll Management",
    content: `Q27: How does payroll processing work?
A: Attendance and salary structure feed into payroll runs. Process monthly payroll with earnings, deductions, and statutory components (e.g. PF/ESI as configured), then generate payslips and reports.

Q28: Can I manage employee salary structures?
A: Yes. Configure salary components and structures per employee/grade.

Q29: Can GENS generate payslips?
A: Yes. Payslips are generated after payroll processing.

Q30: Can employees download their payslips?
A: Yes. Employees can view/download payslips from self-service.

Q31: Can I generate monthly payroll reports?
A: Yes. Monthly payroll and related statutory/summary reports are available.

Q32: Can I manage salary deductions?
A: Yes. Configure and process salary deductions as part of payroll.`,
    tags: ["faq", "payroll", "salary", "payslip", "deductions", "pf", "esi", "reports"],
  },

  // ── Recruitment ──
  {
    category: "faq",
    title: "FAQ - Recruitment Management",
    content: `Q33: Does GENS support recruitment management?
A: Yes. Recruitment / ATS module is available (typically on Professional/Enterprise plans).

Q34: Can I manage job applications?
A: Yes. Capture and manage candidate applications in one place.

Q35: Can I track candidates through recruitment stages?
A: Yes. Move candidates through stages (applied, screening, interview, offer, hired).

Q36: Can I schedule interviews?
A: Yes. Interview scheduling is supported in the recruitment flow.

Q37: Can I manage interview feedback?
A: Yes. Collect and store interview feedback for hiring decisions.`,
    tags: ["faq", "recruitment", "ats", "candidates", "interview", "applications", "hiring"],
  },

  // ── Performance ──
  {
    category: "faq",
    title: "FAQ - Performance Management",
    content: `Q38: Can I set employee performance goals?
A: Yes. Set goals/KRAs as part of performance management.

Q39: Can managers evaluate employee performance?
A: Yes. Managers can evaluate performance against goals.

Q40: Can employees submit self-assessments?
A: Yes. Employee self-assessment is supported in the performance cycle.

Q41: Can I collect employee feedback?
A: Yes. Feedback collection is part of performance/review workflows.`,
    tags: ["faq", "performance", "goals", "appraisal", "feedback", "self assessment"],
  },

  // ── Projects & Timesheets ──
  {
    category: "faq",
    title: "FAQ - Projects and Timesheets",
    content: `Q42: Can I assign projects to employees?
A: Yes. Assign projects/tasks to employees.

Q43: Can employees submit timesheets?
A: Yes. Employees can submit timesheets against projects.

Q44: Can I track project working hours?
A: Yes. Track hours logged per project via timesheets.

Q45: Can managers monitor project progress?
A: Yes. Managers can monitor project hours and progress from project/timesheet views.`,
    tags: ["faq", "projects", "timesheets", "hours", "progress"],
  },

  // ── Assets ──
  {
    category: "faq",
    title: "FAQ - Asset Management",
    content: `Q46: Can I manage company assets?
A: Yes. Asset Management module tracks company assets.

Q47: Can I assign laptops to employees?
A: Yes. Assign assets such as laptops/phones to employees.

Q48: Can I track assigned assets?
A: Yes. See which assets are assigned to whom and their status.

Q49: Can employees request asset returns?
A: Yes. Asset return/request workflows are supported for recovery at exit or transfer.`,
    tags: ["faq", "assets", "laptop", "assign", "return"],
  },

  // ── Sales & Demo ──
  {
    category: "faq",
    title: "FAQ - Sales Demo and Purchase",
    content: `Q56: Can I schedule a product demo?
A: Yes. Share name, company, email, phone, and preferred time — sales will schedule a live demo. 14-day free demo is available.

Q57: Can someone explain the software?
A: Yes. This WhatsApp assistant can explain modules; for a deep walkthrough, schedule a demo with sales.

Q58: Can GENS handle 500 employees?
A: Yes. GENS scales for mid-size and larger teams; Enterprise plans fit higher headcounts like 500 employees.

Q59: Can I replace my existing HRMS with GENS?
A: Yes. Implementation includes migration assistance for typical setups.

Q60: Can you arrange a meeting with your sales team?
A: Yes. Collect name, company, email, phone, preferred time and create/update the lead; offer human handover. Sales: sales@quaeretech.com, Phone: 0522-4067760.

Q61: How can I purchase GENS HRMS?
A: Choose a plan (Basic/Professional/Enterprise), complete a demo/quote with sales, then onboard. For purchase, connect with sales@quaeretech.com.`,
    tags: ["faq", "demo", "sales", "purchase", "meeting", "500", "replace", "buy"],
  },

  // ── Technical Support ──
  {
    category: "faq",
    title: "FAQ - Technical Support",
    content: `Q62: I cannot log in. Can you help?
A: Try password reset from the login page. If still blocked, contact support@quaeretech.com or 0522-4067760 with your registered email/company code. Offer human handover for account issues.

Q63: How can I reset my password?
A: Use "Forgot password" on the GENS login screen; reset link/OTP goes to your registered email/phone as configured.

Q64: My attendance is not getting recorded. What should I do?
A: Check internet/GPS/camera permissions, correct shift location, and retry. If it still fails, share employee ID + time with support@quaeretech.com or ask for human support.

Q65: I cannot download my payslip.
A: Confirm payroll for that month is processed and published. Try another browser/app refresh. If still failing, contact HR admin or support@quaeretech.com.

Q66: The mobile application is not working. Can you help?
A: Update the app, clear cache, check OS permissions (camera/location). If issue continues, contact support with device model and screenshot.

Q67: How can I contact technical support?
A: Email support@quaeretech.com, Phone 0522-4067760, Mon–Sat 10:00–19:00 IST. For urgent account issues, offer transfer to a human agent.`,
    tags: ["faq", "support", "login", "password", "payslip", "mobile", "attendance not recorded", "technical"],
  },

  // ── Hindi / Hinglish ──
  {
    category: "faq",
    title: "FAQ - Hindi and Hinglish",
    content: `Q68: GENS.Ai kya hai?
A: GENS.Ai Quaere ka AI-powered cloud HRMS hai — attendance, leave, payroll, recruitment aur workforce management ek platform par.

Q69: Aapka HRMS software kya kaam karta hai?
A: Employees, attendance, leave, payroll, hiring, assets, projects aur reports manage karta hai.

Q70: Attendance mobile se mark kar sakte hain?
A: Haan. Mobile attendance support hai; GPS aur AI Face Attendance bhi available hain.

Q71: 500 employees ke liye suitable rahega kya?
A: Haan. Mid-size aur badi teams ke liye suitable hai; Enterprise plan high headcount ke liye.

Q72: Aapke software ka price kya hai?
A: Approved pricing: Basic ₹99/employee/month, Professional ₹149/employee/month, Enterprise custom quote. 14-day free demo. Anya price invent mat karo.

Q73: Payroll automatically manage ho jayega?
A: Haan. Salary structure + attendance se payroll process hota hai; payslips generate hote hain. PF/ESI jaise statutory components configure kiye ja sakte hain.

Q74: Demo kab mil sakta hai?
A: Naam, company, email, phone aur preferred time share karein — sales live demo schedule karegi. 14-day free demo available hai.

Q75: Meri salary slip download nahi ho rahi.
A: Confirm karein payroll publish ho chuka hai. App/browser refresh karein. Phir bhi issue ho to support@quaeretech.com ya human agent.

Q76: Mujhe sales team se baat karni hai.
A: Zaroor — naam, company, email, phone lein aur sales se connect / handover karein. sales@quaeretech.com | 0522-4067760.

Q77: Kya multiple branches manage kar sakte hain?
A: Haan. Multi-branch / multi-location support available hai.`,
    tags: ["faq", "hindi", "hinglish", "kya hai", "price", "demo", "salary slip", "sales", "branches"],
  },

  // ── Partnership & Careers ──
  {
    category: "faq",
    title: "FAQ - Partnership and Careers",
    content: `Q78: Can we become your business partner?
A: Yes, partnership enquiries are welcome. Share company name, contact, and region; we will connect you with the partnership/sales team at sales@quaeretech.com or info@quaeretech.com.

Q79: Do you offer reseller partnerships?
A: Reseller/partner discussions are handled by the business team. Collect details and route to sales@quaeretech.com — do not invent commission terms.

Q80: Do you provide white-label solutions?
A: White-label / custom branding is evaluated case-by-case on Enterprise/custom deals. Collect requirements and connect with sales — do not promise white-label without sales confirmation.

Q81: Are you currently hiring?
A: For open roles, check www.quaeretech.com or email HR/careers via info@quaeretech.com. If unsure of current openings, offer to connect with HR.

Q82: Where can I apply for a job?
A: Apply via the company website careers section if listed, or email your CV to info@quaeretech.com with the role name.

Q83: How can I contact your HR department?
A: Email info@quaeretech.com (mention HR) or call 0522-4067760. For product sales use sales@quaeretech.com; for product support use support@quaeretech.com.`,
    tags: ["faq", "partner", "reseller", "white-label", "hiring", "careers", "job", "hr department"],
  },

  // ── Demo FAQ (kept + expanded) ──
  {
    category: "faq",
    title: "FAQ - Demo and Onboarding",
    content:
      "Q: How do I book a demo? A: Share your name, company, email, phone and preferred time; our sales team will schedule a live demo. Q: Is there a free trial? A: Yes, 14-day free demo. Q: Is data secure? A: Yes, tenant data is isolated and access is role-controlled. Q: Can we customize? A: Yes, workflows and templates can be configured per company. Q: Do you support Hindi? A: Yes, our WhatsApp assistant understands Hindi and English. Q: How do I purchase? A: After demo/quote, sales completes commercial onboarding — sales@quaeretech.com.",
    tags: ["faq", "demo", "onboarding", "security", "hindi", "trial", "purchase"],
  },
];

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: COMPANY } },
  });
  if (!tenant) throw new Error(`tenant not found: ${COMPANY}`);

  const { agent, settings } = await getOrCreateAgent(tenant.id);

  await agent.update({
    isEnabled: true,
    status: "active",
    aiProvider: agent.aiProvider || "openai",
    aiModel: agent.aiModel || "gpt-4o-mini",
    companyIntro:
      agent.companyIntro ||
      "Namaste! I am the virtual assistant for Quaere / GENS.Ai HRMS. I can help with product info, pricing, demos, and connecting you with our team. How can I help you today?",
    personality:
      "You are a professional customer relationship executive for Quaere Etechnologies (GENS.Ai HRMS). Friendly, natural, concise. Support Hindi and English. Never invent pricing or features — use approved knowledge only. For unknown/out-of-context questions, invite a free demo and say our team will support and solve all queries.",
    systemInstructions:
      "Qualify leads politely. Answer from approved Knowledge Base only. For pricing use only approved figures. For demo/sales requests collect name, company, email, phone, preferred time. OUT OF CONTEXT / UNKNOWN: if the question is unrelated to GENS/HRMS/Quaere or not covered in knowledge, do not invent — politely say you do not have that detail, invite them to book a free product demo, and tell them our team will support them and help solve all their questions. Then collect demo contact details. For login/payslip/app bugs guide briefly from KB then offer support@quaeretech.com or human handover. For partnership/careers collect details and route to sales/info — do not invent commercial terms.",
  });

  const meta = {
    ...(settings.meta || {}),
    welcomeTemplate: {
      ...DEFAULT_WELCOME_TEMPLATE,
      ...(settings.meta?.welcomeTemplate || {}),
    },
  };
  await settings.update({ meta });

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
  console.log(
    "KB_SEED",
    results.map((r) => `${r.action}:${r.category}:${r.title}`)
  );
  console.log("APPROVED_ACTIVE_KB_COUNT", count);
  process.exit(0);
})().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
