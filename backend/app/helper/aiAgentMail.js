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
async function notifySalesDemoScheduled({
  settings,
  lead,
  conversation,
  preferredTime,
  confirmedSlotLabel = null,
  scheduledAt = null,
}) {
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
  const confirmed =
    confirmedSlotLabel ||
    lead?.meta?.demoScheduledLabel ||
    preferredTime ||
    lead?.purchaseTimeline ||
    lead?.collectedFields?.purchaseTimeline ||
    lead?.collectedFields?.preferredDemoTime ||
    "To be confirmed";
  const priority = lead?.leadPriority || "—";
  const waId = lead?.waId || conversation?.waId || "—";
  const iso =
    (scheduledAt && new Date(scheduledAt).toISOString()) ||
    lead?.meta?.demoScheduledAt ||
    null;

  const subject = `[GENS] Demo booked — ${company !== "—" ? company : name} — ${confirmed}`;
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.5">
      <h2 style="margin:0 0 12px;color:#008f84">Demo confirmed (WhatsApp AI Agent)</h2>
      <p>A customer booked a product demo slot via the GENS WhatsApp agent.</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        <tr><td style="padding:6px 0;width:160px"><b>Name</b></td><td>${esc(name)}</td></tr>
        <tr><td style="padding:6px 0"><b>Company</b></td><td>${esc(company)}</td></tr>
        <tr><td style="padding:6px 0"><b>Phone / WhatsApp</b></td><td>${esc(phone)}</td></tr>
        <tr><td style="padding:6px 0"><b>Email</b></td><td>${esc(email)}</td></tr>
        <tr><td style="padding:6px 0"><b>Confirmed slot (IST)</b></td><td><b>${esc(confirmed)}</b></td></tr>
        <tr><td style="padding:6px 0"><b>UTC / ISO</b></td><td>${esc(iso || "—")}</td></tr>
        <tr><td style="padding:6px 0"><b>Product interest</b></td><td>${esc(interest)}</td></tr>
        <tr><td style="padding:6px 0"><b>Requirements</b></td><td>${esc(requirements)}</td></tr>
        <tr><td style="padding:6px 0"><b>Lead priority</b></td><td>${esc(priority)}</td></tr>
        <tr><td style="padding:6px 0"><b>WA ID</b></td><td>${esc(waId)}</td></tr>
        <tr><td style="padding:6px 0"><b>Lead ID</b></td><td>${esc(lead?.id)}</td></tr>
        <tr><td style="padding:6px 0"><b>Conversation ID</b></td><td>${esc(conversation?.id)}</td></tr>
        <tr><td style="padding:6px 0"><b>Demo slot ID</b></td><td>${esc(lead?.meta?.demoSlotId)}</td></tr>
      </table>
      <p style="margin-top:16px;color:#666">Please join / follow up at the confirmed IST time.</p>
    </div>
  `;

  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || `"GENS AI Agent" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
    text: [
      "Demo confirmed (WhatsApp AI Agent)",
      `Name: ${name}`,
      `Company: ${company}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Confirmed slot (IST): ${confirmed}`,
      `ISO: ${iso || ""}`,
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

/**
 * Email sales when a WhatsApp lead asks to follow up later (not ready).
 */
async function notifySalesFollowUp({
  settings,
  lead,
  conversation,
  followUpAt = null,
  followUpLabel = null,
  note = null,
}) {
  if (settings && settings.notifyOnLead === false) {
    return { skipped: true, reason: "notify_on_lead_disabled" };
  }

  const to = resolveSalesNotifyEmail(settings);
  if (!to) {
    return { skipped: true, reason: "no_sales_email" };
  }

  if (lead?.meta?.followUpEmailSentAt && lead?.meta?.followUpAt === (followUpAt?.toISOString?.() || followUpAt)) {
    return { skipped: true, reason: "already_sent", to };
  }

  const transporter = createTransporter();
  const name = lead?.fullName || conversation?.customerName || "WhatsApp lead";
  const phone = lead?.phone || lead?.waId || conversation?.customerPhone || conversation?.waId || "—";
  const company = lead?.companyName || "—";
  const email = lead?.email || "—";
  const interest = lead?.productInterest || "—";
  const when =
    followUpLabel ||
    (followUpAt
      ? new Date(followUpAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "—");
  const noteText = note || lead?.meta?.followUpNote || "—";

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject: `[AI Agent] Follow-up requested — ${name}`,
    text: [
      "WhatsApp lead asked to follow up later (not ready for demo).",
      "",
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Company: ${company}`,
      `Email: ${email}`,
      `Follow-up (IST): ${when}`,
      `Note: ${noteText}`,
      `Interest: ${interest}`,
      `Lead ID: ${lead?.id || ""}`,
    ].join("\n"),
    html: `
      <h2>Follow-up requested (not ready)</h2>
      <p>WhatsApp lead asked to follow up later.</p>
      <ul>
        <li><b>Name:</b> ${esc(name)}</li>
        <li><b>Phone:</b> ${esc(phone)}</li>
        <li><b>Company:</b> ${esc(company)}</li>
        <li><b>Email:</b> ${esc(email)}</li>
        <li><b>Follow-up (IST):</b> ${esc(when)}</li>
        <li><b>Note:</b> ${esc(noteText)}</li>
        <li><b>Interest:</b> ${esc(interest)}</li>
        <li><b>Lead ID:</b> ${esc(lead?.id || "")}</li>
      </ul>
    `,
  });

  if (lead?.update) {
    await lead.update({
      meta: {
        ...(lead.meta || {}),
        followUpEmailSentAt: new Date().toISOString(),
        followUpEmailTo: to,
        followUpEmailMessageId: info.messageId || null,
      },
    });
  }

  return { skipped: false, to, messageId: info.messageId || null };
}

module.exports = {
  createTransporter,
  resolveSalesNotifyEmail,
  notifySalesDemoScheduled,
  notifySalesFollowUp,
};
