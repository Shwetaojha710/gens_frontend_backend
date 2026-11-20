const { Op } = require("sequelize");
const LandingSiteContent = require("../models/landing_site_content");
const LandingContactSubmission = require("../models/landing_contact_submission");
const Tenant = require("../models/tenant");
const AiAgentLead = require("../models/ai_agent_leads");
const { mergeLandingPayload } = require("../lib/landingMerge");
const { sanitizePlainText, sanitizeEmail } = require("../lib/inputSanitize");
const Helper = require("../helper/helper");
const { normalizeWhatsAppTo } = require("../helper/whatsappCloud");
const {
  getOrCreateAgent,
  getWelcomeTemplate,
  outreachLeadWelcome,
} = require("../helper/aiAgentEngine");

const MAX_NAME = 200;
const MAX_MESSAGE = 8000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_WINDOW = 12;
const rateState = new Map();

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim().slice(0, 64);
  }
  const ra = req.socket?.remoteAddress || req.ip || "";
  return String(ra).slice(0, 64);
}

/** Sliding window bucket; increment only after a successful save so invalid payloads do not consume quota. */
function rateBucket(ip) {
  const now = Date.now();
  let row = rateState.get(ip);
  if (!row || row.resetAt < now) {
    row = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateState.set(ip, row);
  }
  return row;
}

/** Build WhatsApp "to" digits from country code + local number. */
function buildWhatsAppPhone(countryCode, phone) {
  const cc = String(countryCode || "").replace(/\D/g, "");
  const local = String(phone || "").replace(/\D/g, "");
  if (!local && !cc) return "";
  if (local.length >= 11) return normalizeWhatsAppTo(local);
  if (local.length === 10 && cc) return `${cc}${local}`;
  if (local) return normalizeWhatsAppTo(local);
  return "";
}

/**
 * Parse legacy composed message:
 * Company: …\nPhone: …\nNumber of Employees: …\nNotes: …
 */
function parseComposedMessage(message) {
  const text = String(message || "");
  const pick = (label) => {
    const re = new RegExp(`${label}\\s*:\\s*(.+)`, "i");
    const m = text.match(re);
    return m ? String(m[1]).trim() : "";
  };
  return {
    company: pick("Company"),
    phoneLine: pick("Phone"),
    employees: pick("Number of Employees"),
    notes: pick("Notes"),
  };
}

async function resolvePublicAgentTenant() {
  const code = String(process.env.AI_AGENT_PUBLIC_TENANT_CODE || "quaeretech").trim();
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: code } },
  });
  return tenant;
}

/**
 * Same behavior as AI Agent → Leads → create + auto welcome template.
 * Never throws to the contact form — returns outreach result for response meta.
 */
async function createLeadAndWelcomeFromContact({
  tenantId,
  fullName,
  email,
  companyName,
  phone,
  employeeCount,
  notes,
}) {
  const { agent, settings } = await getOrCreateAgent(tenantId);
  const welcome = getWelcomeTemplate(settings);
  const autoSend = welcome.autoSend !== false;

  const lead = await AiAgentLead.create({
    tenantId,
    waId: phone,
    phone,
    fullName: fullName || null,
    companyName: companyName || null,
    email: email || null,
    employeeCount: employeeCount || null,
    businessRequirements: notes && notes !== "(none)" ? notes : null,
    productInterest: "GENS.Ai demo request",
    leadSource: "website_contact",
    leadStatus: "new",
    leadPriority: "WARM",
    meta: {
      createdVia: "public_contact",
      autoSendRequested: autoSend,
    },
  });

  let outreach = null;
  if (autoSend) {
    if (!agent.isEnabled || agent.status !== "active") {
      outreach = {
        skipped: true,
        reason: "agent_disabled",
        error: { message: "Lead created, but agent is disabled." },
      };
    } else {
      outreach = await outreachLeadWelcome({
        tenantId,
        agent,
        settings,
        lead,
        userId: null,
        force: true,
      });
    }
  }

  await lead.reload();
  return { lead, outreach, welcome, autoSend };
}

/** POST /api/public/contact — no auth */
exports.postPublicContact = async (req, res) => {
  try {
    const row = await LandingSiteContent.findOne({ where: { slug: "default" }, raw: true });
    const content = mergeLandingPayload(row?.payload || {});
    if (content.contact && content.contact.formEnabled === false) {
      return Helper.response(false, "The contact form is not accepting submissions right now.", {}, res, 200);
    }

    const ipKey = clientIp(req) || "unknown";
    const bucket = rateBucket(ipKey);
    if (bucket.count >= RATE_MAX_PER_WINDOW) {
      return Helper.response(
        false,
        "Too many submissions from this address. Please try again later.",
        {},
        res,
        429
      );
    }

    const body = req.body || {};
    const fullName = sanitizePlainText(body.fullName ?? body.name, MAX_NAME);
    const email = sanitizeEmail(body.email);
    let company = sanitizePlainText(body.company ?? body.companyName, MAX_NAME);
    let employees = sanitizePlainText(body.employees ?? body.employeeCount, 80);
    let notes = sanitizePlainText(body.notes ?? body.message, MAX_MESSAGE);
    let countryCode = sanitizePlainText(body.countryCode, 12);
    let phoneLocal = sanitizePlainText(body.phone, 20);

    // Legacy clients still send only composed `message`
    if ((!company || !phoneLocal) && body.message) {
      const parsed = parseComposedMessage(body.message);
      if (!company && parsed.company) company = sanitizePlainText(parsed.company, MAX_NAME);
      if (!employees && parsed.employees) employees = sanitizePlainText(parsed.employees, 80);
      if ((!notes || notes.length < 3) && parsed.notes) {
        notes = sanitizePlainText(parsed.notes, MAX_MESSAGE);
      }
      if (!phoneLocal && parsed.phoneLine) {
        const digits = String(parsed.phoneLine).replace(/\D/g, "");
        if (digits.length >= 10) {
          phoneLocal = digits.slice(-10);
          if (!countryCode && digits.length > 10) {
            countryCode = `+${digits.slice(0, digits.length - 10)}`;
          }
        }
      }
    }

    if (!fullName || fullName.length < 2) {
      return Helper.response(false, "Please enter your full name (at least 2 characters).", {}, res, 200);
    }
    if (!email) {
      return Helper.response(false, "Please enter a valid work email address.", {}, res, 200);
    }
    if (!company || company.length < 2) {
      return Helper.response(false, "Please enter your company name.", {}, res, 200);
    }

    const waPhone = buildWhatsAppPhone(countryCode || "+91", phoneLocal);
    if (!waPhone || waPhone.length < 11) {
      return Helper.response(
        false,
        "Please enter a valid mobile number with country code.",
        {},
        res,
        200
      );
    }

    const composedMessage = [
      `Company: ${company}`,
      `Phone: ${countryCode || "+91"} ${phoneLocal}`.trim(),
      `Number of Employees: ${employees || "(not provided)"}`,
      `Notes: ${notes && notes !== "(none)" ? notes : "(none)"}`,
    ].join("\n");

    const ua = sanitizePlainText(req.headers["user-agent"] || "", 512);

    const submission = await LandingContactSubmission.create({
      fullName,
      email,
      message: composedMessage,
      ipAddress: ipKey === "unknown" ? null : ipKey,
      userAgent: ua || null,
    });

    bucket.count += 1;

    // AI Agent lead + welcome (same as Leads → create + auto welcome)
    let agentResult = null;
    try {
      const tenant = await resolvePublicAgentTenant();
      if (!tenant) {
        console.warn(
          "publicContact: AI agent tenant not found — set AI_AGENT_PUBLIC_TENANT_CODE in .env"
        );
      } else {
        agentResult = await createLeadAndWelcomeFromContact({
          tenantId: tenant.id,
          fullName,
          email,
          companyName: company,
          phone: waPhone,
          employeeCount: employees || null,
          notes: notes || null,
        });
      }
    } catch (agentErr) {
      console.error("publicContact.agentLead:", agentErr?.message || agentErr);
    }

    const delivered = agentResult?.outreach?.delivery?.sent === true;
    const welcomeMsg = !agentResult
      ? "Thank you — your message has been received."
      : delivered
        ? "Thank you — your request was received and our WhatsApp assistant will message you shortly."
        : "Thank you — your request was received. Our team will contact you soon.";

    return Helper.response(
      true,
      welcomeMsg,
      {
        submissionId: submission.id,
        leadId: agentResult?.lead?.id || null,
        welcomeDelivery: agentResult?.outreach?.delivery || null,
        welcomeSkipped: agentResult?.outreach?.skipped || false,
      },
      res,
      200
    );
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};
