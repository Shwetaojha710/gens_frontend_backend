require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const AiAgentMessage = require("../app/models/ai_agent_messages");
const AiAgentConversation = require("../app/models/ai_agent_conversations");

(async () => {
  const conv = await AiAgentConversation.findOne({
    where: { waId: { [Op.in]: ["918687651183", "8687651183"] } },
    order: [["updatedAt", "DESC"]],
  });
  if (!conv) {
    console.log("No conversation");
    process.exit(0);
  }
  console.log("CONV", { id: conv.id, waId: conv.waId, phone: conv.customerPhone, status: conv.status });
  const msgs = await AiAgentMessage.findAll({
    where: { conversationId: conv.id, direction: "outbound" },
    order: [["createdAt", "DESC"]],
    limit: 6,
  });
  for (const m of msgs) {
    console.log({
      at: m.createdAt,
      body: String(m.body || "").slice(0, 80),
      waMessageId: m.waMessageId,
      meta: m.meta,
    });
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
