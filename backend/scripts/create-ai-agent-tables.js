/**
 * One-off: sync AI Agent tables.
 * Usage: node scripts/create-ai-agent-tables.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const models = [
  require("../app/models/ai_agent"),
  require("../app/models/ai_agent_settings"),
  require("../app/models/ai_agent_knowledge"),
  require("../app/models/ai_agent_conversations"),
  require("../app/models/ai_agent_messages"),
  require("../app/models/ai_agent_memory"),
  require("../app/models/ai_agent_intents"),
  require("../app/models/ai_agent_leads"),
  require("../app/models/ai_agent_actions"),
  require("../app/models/ai_agent_handover"),
];

(async () => {
  for (const model of models) {
    await model.sync({ alter: true });
    console.log("OK", model.getTableName());
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
