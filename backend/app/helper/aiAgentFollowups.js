/**
 * Soft WhatsApp follow-ups for nurturing (not_ready) leads.
 * Cron / script entry: runDueFollowUps.
 */
const { Op } = require("sequelize");
const AiAgentLead = require("../models/ai_agent_leads");
const AiAgentConversation = require("../models/ai_agent_conversations");
const AiAgentMessage = require("../models/ai_agent_messages");
const AiAgentSettings = require("../models/ai_agent_settings");
const { sendTextMessage, normalizeWhatsAppTo, formatWhatsAppSendError } = require("./whatsappCloud");
const { decrypt } = require("./aiFaceCrypto");
const { leadBlocksProactive, formatFollowUpLabel } = require("./aiAgentDisposition");
const moment = require("moment-timezone");

const TZ = "Asia/Kolkata";

function resolveAccessToken(settings) {
  try {
    const enc = settings?.whatsappAccessTokenEnc;
    if (enc) {
      const fromDb = decrypt(enc);
      if (fromDb) return fromDb;
    }
  } catch {
    /* fall through to env */
  }
  return String(process.env.AI_AGENT_WHATSAPP_TOKEN || "").trim() || null;
}

/**
 * Find nurturing leads whose followUpAt is due and follow-up not yet sent.
 */
async function findDueFollowUpLeads({ tenantId = null, now = new Date(), limit = 50 } = {}) {
  const where = {
    leadStatus: "nurturing",
  };
  if (tenantId) where.tenantId = tenantId;

  const leads = await AiAgentLead.findAll({
    where,
    order: [["updatedAt", "ASC"]],
    limit: Math.min(Number(limit) || 50, 200),
  });

  const nowMs = now.getTime();
  return leads.filter((lead) => {
    if (leadBlocksProactive(lead)) return false;
    const meta = lead.meta || {};
    if (meta.followUpSentAt) return false;
    if (!meta.followUpAt) return false;
    const at = new Date(meta.followUpAt).getTime();
    if (Number.isNaN(at)) return false;
    return at <= nowMs;
  });
}

async function sendFollowUpToLead(lead, { dryRun = false } = {}) {
  if (leadBlocksProactive(lead)) {
    return { skipped: true, reason: "do_not_contact", leadId: lead.id };
  }
  const meta = lead.meta || {};
  if (meta.followUpSentAt) {
    return { skipped: true, reason: "already_sent", leadId: lead.id };
  }

  const phone = normalizeWhatsAppTo(lead.phone || lead.waId);
  if (!phone) {
    return { skipped: true, reason: "invalid_phone", leadId: lead.id };
  }

  const settings = await AiAgentSettings.findOne({ where: { tenantId: lead.tenantId } });
  if (!settings) {
    return { skipped: true, reason: "settings_missing", leadId: lead.id };
  }
  const accessToken = resolveAccessToken(settings);
  if (!settings.whatsappPhoneNumberId || !accessToken) {
    return { skipped: true, reason: "whatsapp_credentials_missing", leadId: lead.id };
  }

  const label = meta.followUpAt
    ? formatFollowUpLabel(moment(meta.followUpAt).tz(TZ))
    : null;
  const body = label
    ? `Hi${lead.fullName ? ` ${lead.fullName}` : ""} — checking in as planned (${label}). Still exploring GENS, or want to book a quick demo? Reply anytime.`
    : `Hi${lead.fullName ? ` ${lead.fullName}` : ""} — just following up as you preferred. Still exploring GENS, or want to book a quick demo? Reply anytime.`;

  if (dryRun) {
    return { skipped: false, dryRun: true, leadId: lead.id, phone, body };
  }

  let waResponse = null;
  let delivery = { sent: false, error: null };
  try {
    waResponse = await sendTextMessage({
      accessToken,
      phoneNumberId: settings.whatsappPhoneNumberId,
      to: phone,
      body,
    });
    delivery.sent = true;
  } catch (e) {
    delivery.error = formatWhatsAppSendError(e);
    console.error("aiAgentFollowups.sendFollowUpToLead:", delivery.error);
    return { skipped: false, sent: false, leadId: lead.id, error: delivery.error };
  }

  const sentAt = new Date().toISOString();
  await lead.update({
    meta: {
      ...meta,
      followUpSentAt: sentAt,
      lastFollowUpWaMessageId: waResponse?.messages?.[0]?.id || null,
    },
  });

  let conversation = null;
  if (lead.conversationId) {
    conversation = await AiAgentConversation.findOne({
      where: { id: lead.conversationId, tenantId: lead.tenantId },
    });
  }
  if (!conversation) {
    conversation = await AiAgentConversation.findOne({
      where: { tenantId: lead.tenantId, waId: phone },
      order: [["updatedAt", "DESC"]],
    });
  }

  if (conversation) {
    await AiAgentMessage.create({
      tenantId: lead.tenantId,
      conversationId: conversation.id,
      direction: "outbound",
      senderType: "ai",
      waMessageId: waResponse?.messages?.[0]?.id || null,
      messageType: "text",
      body,
      meta: { autoFollowUp: true, delivery },
    });
    await conversation.update({
      lastMessageAt: new Date(),
      context: {
        ...(conversation.context || {}),
        lastFollowUpSentAt: sentAt,
      },
    });
  }

  return { skipped: false, sent: true, leadId: lead.id, phone, messageId: waResponse?.messages?.[0]?.id || null };
}

/**
 * Process all due nurturing follow-ups.
 */
async function runDueFollowUps({ tenantId = null, limit = 50, dryRun = false } = {}) {
  const due = await findDueFollowUpLeads({ tenantId, limit });
  const results = [];
  for (const lead of due) {
    try {
      const r = await sendFollowUpToLead(lead, { dryRun });
      results.push(r);
    } catch (e) {
      results.push({ skipped: false, sent: false, leadId: lead.id, error: e.message || String(e) });
    }
  }
  return {
    dueCount: due.length,
    results,
    sent: results.filter((r) => r.sent).length,
    skipped: results.filter((r) => r.skipped).length,
  };
}

module.exports = {
  findDueFollowUpLeads,
  sendFollowUpToLead,
  runDueFollowUps,
};
