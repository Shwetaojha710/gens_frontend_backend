/**
 * AI WhatsApp Customer Relationship Agent — HR/admin + webhook handlers.
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const { encrypt } = require("../../helper/aiFaceCrypto");
const {
  getOrCreateAgent,
  maskSettings,
  findTenantByPhoneNumberId,
  processInboundMessage,
  executeHandover,
  ensureSystemIntents,
  safeDecrypt,
} = require("../../helper/aiAgentEngine");
const { extractTextFromUpload, buildSearchText } = require("../../helper/aiAgentKnowledge");
const {
  verifyWebhookSignature,
  parseInboundMessages,
  sendTextMessage,
  formatWhatsAppSendError,
} = require("../../helper/whatsappCloud");

const AiAgent = require("../../models/ai_agent");
const AiAgentSettings = require("../../models/ai_agent_settings");
const AiAgentKnowledge = require("../../models/ai_agent_knowledge");
const AiAgentConversation = require("../../models/ai_agent_conversations");
const AiAgentMessage = require("../../models/ai_agent_messages");
const AiAgentLead = require("../../models/ai_agent_leads");
const AiAgentHandover = require("../../models/ai_agent_handover");
const AiAgentAction = require("../../models/ai_agent_actions");
const AiAgentMemory = require("../../models/ai_agent_memory");

const HR_ROLES = ["admin", "hr", "superadmin"];

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

const hr = (name, fn) => async (req, res) => {
  try {
    if (!HR_ROLES.includes(req.users?.role)) return fail(res, "Only HR or admin can perform this action");
    return await fn(req, res);
  } catch (error) {
    console.error(`aiAgent.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

// ───────────────────────────── dashboard ─────────────────────────────

exports.dashboard = hr("dashboard", async (req, res) => {
  const tenantId = req.users.tenantId;
  const [
    totalConversations,
    activeConversations,
    totalLeads,
    hotLeads,
    pendingHandovers,
    totalMessages,
    aiMessages,
  ] = await Promise.all([
    AiAgentConversation.count({ where: { tenantId } }),
    AiAgentConversation.count({ where: { tenantId, status: { [Op.in]: ["active", "waiting"] } } }),
    AiAgentLead.count({ where: { tenantId } }),
    AiAgentLead.count({ where: { tenantId, leadPriority: "HOT" } }),
    AiAgentHandover.count({ where: { tenantId, status: "pending" } }),
    AiAgentMessage.count({ where: { tenantId } }),
    AiAgentMessage.count({ where: { tenantId, senderType: "ai" } }),
  ]);

  const recentLeads = await AiAgentLead.findAll({
    where: { tenantId },
    order: [["createdAt", "DESC"]],
    limit: 5,
    raw: true,
  });
  const recentHandovers = await AiAgentHandover.findAll({
    where: { tenantId, status: "pending" },
    order: [["createdAt", "DESC"]],
    limit: 5,
    raw: true,
  });

  return Helper.response(
    true,
    "Dashboard fetched",
    {
      totalConversations,
      activeConversations,
      totalLeads,
      hotLeads,
      pendingHandovers,
      totalMessages,
      aiMessages,
      humanMessages: Math.max(0, totalMessages - aiMessages),
      recentLeads,
      recentHandovers,
    },
    res,
    200
  );
});

// ───────────────────────────── agent config ─────────────────────────────

exports.getConfig = hr("getConfig", async (req, res) => {
  const { agent, settings } = await getOrCreateAgent(req.users.tenantId, req.users.id);
  await ensureSystemIntents();
  return Helper.response(
    true,
    "Config fetched",
    { agent, settings: maskSettings(settings) },
    res,
    200
  );
});

exports.saveConfig = hr("saveConfig", async (req, res) => {
  const tenantId = req.users.tenantId;
  const b = req.body || {};
  const { agent, settings } = await getOrCreateAgent(tenantId, req.users.id);

  const agentPatch = {};
  if (b.name != null) agentPatch.name = String(b.name).trim().slice(0, 120) || agent.name;
  if (b.personality != null) agentPatch.personality = String(b.personality);
  if (b.systemInstructions != null) agentPatch.systemInstructions = String(b.systemInstructions);
  if (b.companyIntro != null) agentPatch.companyIntro = String(b.companyIntro);
  if (Array.isArray(b.languages)) agentPatch.languages = b.languages;
  if (b.aiProvider) agentPatch.aiProvider = String(b.aiProvider).toLowerCase() === "openai" ? "openai" : "gemini";
  if (b.aiModel) agentPatch.aiModel = String(b.aiModel).slice(0, 80);
  if (["short", "medium", "long"].includes(b.responseLength)) agentPatch.responseLength = b.responseLength;
  if (typeof b.isEnabled === "boolean") agentPatch.isEnabled = b.isEnabled;
  if (["active", "inactive"].includes(b.status)) agentPatch.status = b.status;
  agentPatch.updatedBy = req.users.id;
  await agent.update(agentPatch);

  const settingsPatch = { updatedBy: req.users.id };
  if (b.whatsappPhoneNumberId != null) settingsPatch.whatsappPhoneNumberId = String(b.whatsappPhoneNumberId).trim() || null;
  if (b.whatsappBusinessAccountId != null) settingsPatch.whatsappBusinessAccountId = String(b.whatsappBusinessAccountId).trim() || null;
  if (b.whatsappVerifyToken != null) settingsPatch.whatsappVerifyToken = String(b.whatsappVerifyToken).trim() || null;
  if (b.defaultAssigneeId !== undefined) settingsPatch.defaultAssigneeId = b.defaultAssigneeId || null;
  if (typeof b.notifyOnLead === "boolean") settingsPatch.notifyOnLead = b.notifyOnLead;
  if (typeof b.notifyOnHandover === "boolean") settingsPatch.notifyOnHandover = b.notifyOnHandover;
  if (b.whatsappAccessToken) settingsPatch.whatsappAccessTokenEnc = encrypt(String(b.whatsappAccessToken));
  if (b.whatsappAppSecret) settingsPatch.whatsappAppSecretEnc = encrypt(String(b.whatsappAppSecret));
  if (b.llmApiKey) settingsPatch.llmApiKeyEnc = encrypt(String(b.llmApiKey));
  await settings.update(settingsPatch);

  const fresh = await getOrCreateAgent(tenantId, req.users.id);
  return Helper.response(
    true,
    "Config saved",
    { agent: fresh.agent, settings: maskSettings(fresh.settings) },
    res,
    200
  );
});

// ───────────────────────────── knowledge ─────────────────────────────

exports.listKnowledge = hr("listKnowledge", async (req, res) => {
  const tenantId = req.users.tenantId;
  const b = req.body || {};
  const where = { tenantId };
  if (b.category) where.category = b.category;
  if (typeof b.isActive === "boolean") where.isActive = b.isActive;
  if (b.q) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${b.q}%` } },
      { content: { [Op.iLike]: `%${b.q}%` } },
    ];
  }
  const rows = await AiAgentKnowledge.findAll({
    where,
    order: [["updatedAt", "DESC"]],
    limit: Math.min(Number(b.limit) || 100, 300),
  });
  return Helper.response(true, "Knowledge fetched", rows, res, 200);
});

exports.saveKnowledge = hr("saveKnowledge", async (req, res) => {
  const tenantId = req.users.tenantId;
  const b = req.body || {};
  const title = String(b.title || "").trim();
  let content = String(b.content || "").trim();
  if (!title) return fail(res, "Title is required");

  let fileName = null;
  let filePath = null;
  let mimeType = null;
  if (req.file) {
    fileName = req.file.originalname;
    filePath = req.file.filename;
    mimeType = req.file.mimetype;
    const extracted = await extractTextFromUpload(req.file);
    if (extracted) content = content ? `${content}\n\n${extracted}` : extracted;
  }
  if (!content) return fail(res, "Content is required (or upload a PDF/text file with extractable text)");

  const tags = Array.isArray(b.tags)
    ? b.tags
    : String(b.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

  const payload = {
    tenantId,
    category: b.category || "other",
    title,
    content,
    tags,
    metadata: b.metadata && typeof b.metadata === "object" ? b.metadata : {},
    fileName,
    filePath,
    mimeType,
    isApproved: b.isApproved !== false && b.isApproved !== "false",
    isActive: b.isActive !== false && b.isActive !== "false",
    searchText: buildSearchText({ title, content, tags }),
    updatedBy: req.users.id,
  };

  let row;
  if (b.id) {
    row = await AiAgentKnowledge.findOne({ where: { id: b.id, tenantId } });
    if (!row) return fail(res, "Knowledge entry not found");
    await row.update(payload);
  } else {
    payload.createdBy = req.users.id;
    row = await AiAgentKnowledge.create(payload);
  }
  return Helper.response(true, "Knowledge saved", row, res, 200);
});

exports.toggleKnowledge = hr("toggleKnowledge", async (req, res) => {
  const row = await AiAgentKnowledge.findOne({
    where: { id: req.body?.id, tenantId: req.users.tenantId },
  });
  if (!row) return fail(res, "Not found");
  const patch = {};
  if (typeof req.body.isActive === "boolean") patch.isActive = req.body.isActive;
  if (typeof req.body.isApproved === "boolean") patch.isApproved = req.body.isApproved;
  patch.updatedBy = req.users.id;
  await row.update(patch);
  return Helper.response(true, "Updated", row, res, 200);
});

exports.deleteKnowledge = hr("deleteKnowledge", async (req, res) => {
  const row = await AiAgentKnowledge.findOne({
    where: { id: req.body?.id, tenantId: req.users.tenantId },
  });
  if (!row) return fail(res, "Not found");
  await row.destroy();
  return Helper.response(true, "Deleted", {}, res, 200);
});

// ───────────────────────────── leads ─────────────────────────────

exports.listLeads = hr("listLeads", async (req, res) => {
  const tenantId = req.users.tenantId;
  const b = req.body || {};
  const where = { tenantId };
  if (b.leadPriority) where.leadPriority = b.leadPriority;
  if (b.leadStatus) where.leadStatus = b.leadStatus;
  if (b.q) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${b.q}%` } },
      { companyName: { [Op.iLike]: `%${b.q}%` } },
      { email: { [Op.iLike]: `%${b.q}%` } },
      { phone: { [Op.iLike]: `%${b.q}%` } },
    ];
  }
  const rows = await AiAgentLead.findAll({
    where,
    order: [["updatedAt", "DESC"]],
    limit: Math.min(Number(b.limit) || 100, 300),
  });
  return Helper.response(true, "Leads fetched", rows, res, 200);
});

exports.getLead = hr("getLead", async (req, res) => {
  const lead = await AiAgentLead.findOne({
    where: { id: req.body?.id, tenantId: req.users.tenantId },
  });
  if (!lead) return fail(res, "Lead not found");
  let messages = [];
  if (lead.conversationId) {
    messages = await AiAgentMessage.findAll({
      where: { conversationId: lead.conversationId, tenantId: req.users.tenantId },
      order: [["createdAt", "ASC"]],
      limit: 200,
    });
  }
  return Helper.response(true, "Lead fetched", { lead, messages }, res, 200);
});

exports.updateLead = hr("updateLead", async (req, res) => {
  const lead = await AiAgentLead.findOne({
    where: { id: req.body?.id, tenantId: req.users.tenantId },
  });
  if (!lead) return fail(res, "Lead not found");
  const b = req.body || {};
  const patch = { updatedBy: req.users.id };
  for (const k of [
    "fullName",
    "companyName",
    "email",
    "phone",
    "productInterest",
    "businessRequirements",
    "employeeCount",
    "budget",
    "purchaseTimeline",
    "leadStatus",
    "leadPriority",
    "assignedTo",
  ]) {
    if (b[k] !== undefined) patch[k] = b[k];
  }
  await lead.update(patch);
  return Helper.response(true, "Lead updated", lead, res, 200);
});

// ───────────────────────────── conversations ─────────────────────────────

exports.listConversations = hr("listConversations", async (req, res) => {
  const tenantId = req.users.tenantId;
  const b = req.body || {};
  const where = { tenantId };
  if (b.status) where.status = b.status;
  if (typeof b.aiEnabled === "boolean") where.aiEnabled = b.aiEnabled;
  if (b.q) {
    where[Op.or] = [
      { customerName: { [Op.iLike]: `%${b.q}%` } },
      { customerPhone: { [Op.iLike]: `%${b.q}%` } },
      { waId: { [Op.iLike]: `%${b.q}%` } },
    ];
  }
  const rows = await AiAgentConversation.findAll({
    where,
    order: [["lastMessageAt", "DESC NULLS LAST"], ["updatedAt", "DESC"]],
    limit: Math.min(Number(b.limit) || 100, 300),
  });
  return Helper.response(true, "Conversations fetched", rows, res, 200);
});

exports.getConversation = hr("getConversation", async (req, res) => {
  const tenantId = req.users.tenantId;
  const conv = await AiAgentConversation.findOne({
    where: { id: req.body?.id, tenantId },
  });
  if (!conv) return fail(res, "Conversation not found");
  const messages = await AiAgentMessage.findAll({
    where: { conversationId: conv.id, tenantId },
    order: [["createdAt", "ASC"]],
    limit: 500,
  });
  const memory = await AiAgentMemory.findOne({ where: { tenantId, waId: conv.waId } });
  const lead = conv.leadId
    ? await AiAgentLead.findOne({ where: { id: conv.leadId, tenantId } })
    : null;
  const handovers = await AiAgentHandover.findAll({
    where: { conversationId: conv.id, tenantId },
    order: [["createdAt", "DESC"]],
  });
  return Helper.response(
    true,
    "Conversation fetched",
    { conversation: conv, messages, memory, lead, handovers },
    res,
    200
  );
});

exports.toggleAi = hr("toggleAi", async (req, res) => {
  const conv = await AiAgentConversation.findOne({
    where: { id: req.body?.id, tenantId: req.users.tenantId },
  });
  if (!conv) return fail(res, "Conversation not found");
  const aiEnabled = Boolean(req.body.aiEnabled);
  await conv.update({
    aiEnabled,
    status: aiEnabled && conv.status === "handed_over" ? "active" : conv.status,
    updatedBy: req.users.id,
  });
  return Helper.response(true, "AI toggle updated", conv, res, 200);
});

exports.assignConversation = hr("assignConversation", async (req, res) => {
  const conv = await AiAgentConversation.findOne({
    where: { id: req.body?.id, tenantId: req.users.tenantId },
  });
  if (!conv) return fail(res, "Conversation not found");
  await conv.update({
    assignedTo: req.body.assignedTo || null,
    updatedBy: req.users.id,
  });
  return Helper.response(true, "Assigned", conv, res, 200);
});

exports.sendHumanReply = hr("sendHumanReply", async (req, res) => {
  const tenantId = req.users.tenantId;
  const text = String(req.body?.text || "").trim();
  if (!text) return fail(res, "Message text is required");
  const conv = await AiAgentConversation.findOne({
    where: { id: req.body?.id, tenantId },
  });
  if (!conv) return fail(res, "Conversation not found");

  const { settings } = await getOrCreateAgent(tenantId, req.users.id);
  const accessToken = safeDecrypt(settings.whatsappAccessTokenEnc);
  let waResponse = null;
  let delivery = { sent: false, error: null };
  if (accessToken && settings.whatsappPhoneNumberId) {
    try {
      waResponse = await sendTextMessage({
        accessToken,
        phoneNumberId: settings.whatsappPhoneNumberId,
        to: conv.customerPhone || conv.waId,
        text,
      });
      delivery.sent = true;
    } catch (e) {
      delivery.error = formatWhatsAppSendError(e);
      console.error("aiAgent.sendHumanReply WhatsApp:", delivery.error);
    }
  } else {
    delivery.error = { code: null, message: "WhatsApp credentials not configured" };
  }

  const msg = await AiAgentMessage.create({
    tenantId,
    conversationId: conv.id,
    direction: "outbound",
    senderType: "human",
    senderId: req.users.id,
    waMessageId: waResponse?.messages?.[0]?.id || null,
    messageType: "text",
    body: text,
    createdBy: req.users.id,
    meta: { delivery },
  });
  await conv.update({
    lastMessageAt: new Date(),
    aiEnabled: false,
    status: conv.status === "active" ? "waiting" : conv.status,
    updatedBy: req.users.id,
  });

  if (!delivery.sent) {
    // Still save inbox message; surface Meta allow-list clearly
    return Helper.response(
      true,
      delivery.error?.message || "Saved in inbox, but WhatsApp delivery failed",
      { message: msg, conversation: conv, delivery },
      res,
      200
    );
  }
  return Helper.response(true, "Message sent on WhatsApp", { message: msg, conversation: conv, delivery }, res, 200);
});

exports.handover = hr("handover", async (req, res) => {
  const tenantId = req.users.tenantId;
  const conv = await AiAgentConversation.findOne({
    where: { id: req.body?.id, tenantId },
  });
  if (!conv) return fail(res, "Conversation not found");
  const { settings } = await getOrCreateAgent(tenantId, req.users.id);
  const handover = await executeHandover({
    tenantId,
    conversation: conv,
    settings,
    reason: req.body?.reason || "Manual handover",
    triggerType: "manual",
    createdBy: req.users.id,
  });
  if (req.body?.assignedTo) {
    await handover.update({ assignedTo: req.body.assignedTo });
    await conv.update({ assignedTo: req.body.assignedTo });
  }
  return Helper.response(true, "Handed over", handover, res, 200);
});

exports.listHandovers = hr("listHandovers", async (req, res) => {
  const where = { tenantId: req.users.tenantId };
  if (req.body?.status) where.status = req.body.status;
  const rows = await AiAgentHandover.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
  return Helper.response(true, "Handovers fetched", rows, res, 200);
});

exports.resolveHandover = hr("resolveHandover", async (req, res) => {
  const row = await AiAgentHandover.findOne({
    where: { id: req.body?.id, tenantId: req.users.tenantId },
  });
  if (!row) return fail(res, "Not found");
  await row.update({
    status: req.body?.status || "resolved",
    notes: req.body?.notes || row.notes,
    resolvedAt: new Date(),
    updatedBy: req.users.id,
  });
  return Helper.response(true, "Handover updated", row, res, 200);
});

exports.analytics = hr("analytics", async (req, res) => {
  const tenantId = req.users.tenantId;
  const totalLeads = await AiAgentLead.count({ where: { tenantId } });
  const won = await AiAgentLead.count({ where: { tenantId, leadStatus: "won" } });
  const handovers = await AiAgentHandover.count({ where: { tenantId } });
  const conversations = await AiAgentConversation.count({ where: { tenantId } });
  const intents = await AiAgentMessage.findAll({
    where: { tenantId, direction: "inbound", intent: { [Op.ne]: null } },
    attributes: ["intent", [AiAgentMessage.sequelize.fn("COUNT", AiAgentMessage.sequelize.col("id")), "count"]],
    group: ["intent"],
    raw: true,
  });
  // Approximate response time: avg gap between inbound and next outbound AI message is expensive; return placeholder stats
  return Helper.response(
    true,
    "Analytics fetched",
    {
      totalLeads,
      wonLeads: won,
      conversionRate: totalLeads ? Number(((won / totalLeads) * 100).toFixed(1)) : 0,
      handoverRate: conversations ? Number(((handovers / conversations) * 100).toFixed(1)) : 0,
      commonIntents: intents
        .map((i) => ({ intent: i.intent, count: Number(i.count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      totalHandovers: handovers,
      totalConversations: conversations,
    },
    res,
    200
  );
});

// ───────────────────────────── WhatsApp webhook ─────────────────────────────

exports.webhookVerify = async (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode !== "subscribe" || !token) return res.status(403).send("Forbidden");

    const settings = await AiAgentSettings.findOne({ where: { whatsappVerifyToken: String(token) } });
    if (!settings) return res.status(403).send("Forbidden");
    return res.status(200).send(String(challenge || ""));
  } catch (e) {
    console.error("aiAgent.webhookVerify:", e);
    return res.status(500).send("Error");
  }
};

exports.webhookReceive = async (req, res) => {
  // Always ack quickly; process async
  res.status(200).json({ status: "ok" });

  try {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const signature = req.headers["x-hub-signature-256"];
    const messages = parseInboundMessages(req.body);

    for (const inbound of messages) {
      const mapped = await findTenantByPhoneNumberId(inbound.phoneNumberId);
      if (!mapped?.tenantId || !mapped.agent || !mapped.settings) {
        console.warn("aiAgent.webhook: unknown phone_number_id", inbound.phoneNumberId);
        continue;
      }

      const appSecret = safeDecrypt(mapped.settings.whatsappAppSecretEnc);
      if (appSecret && signature) {
        const ok = verifyWebhookSignature(rawBody, signature, appSecret);
        if (!ok) {
          console.warn("aiAgent.webhook: invalid signature");
          continue;
        }
      }

      await processInboundMessage(mapped.tenantId, mapped.agent, mapped.settings, inbound);
    }
  } catch (e) {
    console.error("aiAgent.webhookReceive:", e);
  }
};

// Test harness: simulate inbound without WhatsApp (admin only)
exports.simulateInbound = hr("simulateInbound", async (req, res) => {
  const tenantId = req.users.tenantId;
  const text = String(req.body?.text || "").trim();
  const waId = String(req.body?.waId || req.body?.phone || "").replace(/\D/g, "");
  if (!text || !waId) return fail(res, "text and waId/phone are required");
  const { agent, settings } = await getOrCreateAgent(tenantId, req.users.id);
  if (!agent.isEnabled) return fail(res, "Enable the AI agent first");

  const result = await processInboundMessage(
    tenantId,
    agent,
    settings,
    {
      phoneNumberId: settings.whatsappPhoneNumberId,
      waId,
      customerPhone: waId,
      customerName: req.body?.customerName || null,
      waMessageId: `sim_${Date.now()}`,
      timestamp: new Date(),
      messageType: "text",
      body: text,
    },
    { skipWhatsAppSend: true }
  );
  return Helper.response(true, "Processed", result, res, 200);
});

