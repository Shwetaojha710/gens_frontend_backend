/**
 * AI Agent → sales team email notifications (demo scheduled, etc.).
 * Uses existing MAIL_* SMTP env (same as interview / superadmin mail).
 */
const nodemailer = require("nodemailer");

function createTransporter() {
  const user = String(process.env.MAIL_USER || "").trim();
  const pass = String(process.env.MAIL_PASS || "").trim();
  if (!user || !pass) {
    const err = new Error("MAIL_USER / MAIL_PASS not configured");
    err.code = "MAIL_NOT_CONFIGURED";
    throw err;
  }
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT || "587", 10),
    secure: false,
    auth: { user, pass },
  });
}

function resolveSalesNotifyEmail(settings) {
  const fromMeta = String(settings?.meta?.salesNotifyEmail || "").trim();
  const fromEnv = String(process.env.AI_AGENT_SALES_EMAIL || "").trim();
  const fromMailUser = String(process.env.MAIL_USER || "").trim();
  return fromMeta || fromEnv || fromMailUser || null;
}

function esc(v) {
  return String(v == null || v === "" ? "—" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Email sales when a WhatsApp lead confirms / schedules a demo.
 * Duplicate-safe via lead.meta.demoEmailSentAt.
 */
async function notifySalesDemoScheduled({ settings, lead, conversation, preferredTime }) {
  if (settings && settings.notifyOnLead === false) {
    return { skipped: true, reason: "notify_on_lead_disabled" };
  }

  const already = lead?.meta?.demoEmailSentAt;
  if (already) {
    return { skipped: true, reason: "already_sent", sentAt: already };
  }

  const to = resolveSalesNotifyEmail(settings);
  if (!to) {
    return { skipped: true, reason: "no_sales_recipient" };
  }

  const name = lead?.fullName || conversation?.customerName || "—";
  const company = lead?.companyName || "—";
  const phone = lead?.phone || conversation?.customerPhone || conversation?.waId || "—";
  const email = lead?.email || "—";
  const interest = lead?.productInterest || "—";
  const requirements = lead?.businessRequirements || "—";
  const timeline =
    preferredTime ||
    lead?.purchaseTimeline ||
    lead?.collectedFields?.purchaseTimeline ||
    lead?.collectedFields?.preferredDemoTime ||
    "To be confirmed";
  const priority = lead?.leadPriority || "—";
  const waId = lead?.waId || conversation?.waId || "—";

  const subject = `[GENS] Demo scheduled — ${company !== "—" ? company : name}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">
      <h2 style="margin:0 0 12px;color:#008f84">New demo scheduled (WhatsApp AI Agent)</h2>
      <p>A customer confirmed interest in a product demo via the GENS WhatsApp agent.</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        <tr><td style="padding:6px 0;width:160px"><b>Name</b></td><td>${esc(name)}</td></tr>
        <tr><td style="padding:6px 0"><b>Company</b></td><td>${esc(company)}</td></tr>
        <tr><td style="padding:6px 0"><b>Phone / WhatsApp</b></td><td>${esc(phone)}</td></tr>
        <tr><td style="padding:6px 0"><b>Email</b></td><td>${esc(email)}</td></tr>
        <tr><td style="padding:6px 0"><b>Preferred demo time</b></td><td>${esc(timeline)}</td></tr>
        <tr><td style="padding:6px 0"><b>Product interest</b></td><td>${esc(interest)}</td></tr>
        <tr><td style="padding:6px 0"><b>Requirements</b></td><td>${esc(requirements)}</td></tr>
        <tr><td style="padding:6px 0"><b>Lead priority</b></td><td>${esc(priority)}</td></tr>
        <tr><td style="padding:6px 0"><b>WA ID</b></td><td>${esc(waId)}</td></tr>
        <tr><td style="padding:6px 0"><b>Lead ID</b></td><td>${esc(lead?.id)}</td></tr>
        <tr><td style="padding:6px 0"><b>Conversation ID</b></td><td>${esc(conversation?.id)}</td></tr>
      </table>
      <p style="margin-top:16px;color:#666">Please follow up and confirm the demo slot.</p>
    </div>
  `;

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || `"GENS AI Agent" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
    text: [
      "New demo scheduled (WhatsApp AI Agent)",
      `Name: ${name}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Preferred demo time: ${timeline}`,
      `Interest: ${interest}`,
      `Lead ID: ${lead?.id || ""}`,
    ].join("\n"),
  });

  if (lead?.update) {
    await lead.update({
      meta: {
        ...(lead.meta || {}),
        demoEmailSentAt: new Date().toISOString(),
        demoEmailTo: to,
        demoEmailMessageId: info.messageId || null,
      },
    });
  }

  return { skipped: false, to, messageId: info.messageId || null };
}

module.exports = {
  createTransporter,
  resolveSalesNotifyEmail,
  notifySalesDemoScheduled,
};
