const express = require("express");
const { Admin } = require("../middleware/auth");
const upload = require("../middleware/aiAgentUpload");
const ctrl = require("../controller/tenant/aiAgent");

const router = express.Router();

// ── WhatsApp webhook (public; verified by Meta token / signature) ──
router.get("/whatsapp/webhook", ctrl.webhookVerify);
router.post("/whatsapp/webhook", ctrl.webhookReceive);

// ── Admin APIs ──
router.post("/ai-agent/dashboard", Admin, ctrl.dashboard);
router.post("/ai-agent/analytics", Admin, ctrl.analytics);

router.post("/ai-agent/config", Admin, ctrl.getConfig);
router.post("/ai-agent/config/save", Admin, ctrl.saveConfig);

router.post("/ai-agent/knowledge/list", Admin, ctrl.listKnowledge);
router.post(
  "/ai-agent/knowledge/save",
  Admin,
  upload.single("file"),
  ctrl.saveKnowledge
);
router.post("/ai-agent/knowledge/toggle", Admin, ctrl.toggleKnowledge);
router.post("/ai-agent/knowledge/delete", Admin, ctrl.deleteKnowledge);

router.post("/ai-agent/inbox/wipe", Admin, ctrl.wipeInbox);

router.post("/ai-agent/leads/list", Admin, ctrl.listLeads);
router.post("/ai-agent/leads/get", Admin, ctrl.getLead);
router.post("/ai-agent/leads/create", Admin, ctrl.createLead);
router.post("/ai-agent/leads/outreach", Admin, ctrl.outreachLead);
router.post("/ai-agent/leads/update", Admin, ctrl.updateLead);

router.post("/ai-agent/conversations/list", Admin, ctrl.listConversations);
router.post("/ai-agent/conversations/get", Admin, ctrl.getConversation);
router.post("/ai-agent/conversations/start", Admin, ctrl.startConversation);
router.post("/ai-agent/conversations/toggle-ai", Admin, ctrl.toggleAi);
router.post("/ai-agent/conversations/assign", Admin, ctrl.assignConversation);
router.post("/ai-agent/conversations/reply", Admin, ctrl.sendHumanReply);
router.post("/ai-agent/conversations/handover", Admin, ctrl.handover);

router.post("/ai-agent/handovers/list", Admin, ctrl.listHandovers);
router.post("/ai-agent/handovers/resolve", Admin, ctrl.resolveHandover);

router.post("/ai-agent/simulate", Admin, ctrl.simulateInbound);

module.exports = router;
