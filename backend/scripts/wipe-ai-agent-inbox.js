/**
 * Wipe AI Agent leads + conversations (+ messages/handovers/actions/memory) for a tenant.
 * Keeps agent config, settings, and knowledge intact.
 *
 * Usage: node scripts/wipe-ai-agent-inbox.js [companyCode]
 * Example: node scripts/wipe-ai-agent-inbox.js quaeretech
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const AiAgentLead = require("../app/models/ai_agent_leads");
const AiAgentConversation = require("../app/models/ai_agent_conversations");
const AiAgentMessage = require("../app/models/ai_agent_messages");
const AiAgentHandover = require("../app/models/ai_agent_handover");
const AiAgentAction = require("../app/models/ai_agent_actions");
const AiAgentMemory = require("../app/models/ai_agent_memory");

const COMPANY = process.argv[2] || "quaeretech";

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: COMPANY } },
  });
  if (!tenant) throw new Error(`tenant not found for companyCode=${COMPANY}`);

  const tenantId = tenant.id;
  console.log("Wiping AI Agent inbox for", tenant.companyCode, tenantId);

  const where = { tenantId };
  const counts = {};

  // Child rows first
  counts.messages = await AiAgentMessage.destroy({ where });
  counts.actions = await AiAgentAction.destroy({ where });
  counts.handovers = await AiAgentHandover.destroy({ where });
  counts.memory = await AiAgentMemory.destroy({ where });

  // Detach then delete leads / conversations
  await AiAgentLead.update({ conversationId: null }, { where });
  await AiAgentConversation.update({ leadId: null }, { where });

  counts.leads = await AiAgentLead.destroy({ where });
  counts.conversations = await AiAgentConversation.destroy({ where });

  console.log("Deleted:", counts);
  process.exit(0);
})().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
