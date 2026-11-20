/**
 * Diagnose LLM key decrypt + live OpenAI/Gemini call for a tenant.
 * Usage: node scripts/diagnose-llm.js [companyCode]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const { getOrCreateAgent, safeDecrypt } = require("../app/helper/aiAgentEngine");
const { generateDecision } = require("../app/helper/aiAgentLlm");

const COMPANY = process.argv[2] || "quaeretech";

(async () => {
  const tenant = await Tenant.findOne({
    where: { companyCode: { [Op.iLike]: COMPANY } },
  });
  if (!tenant) throw new Error(`tenant not found: ${COMPANY}`);

  const { agent, settings } = await getOrCreateAgent(tenant.id);
  const hasEnc = Boolean(settings.llmApiKeyEnc);
  const llmKey = safeDecrypt(settings.llmApiKeyEnc);
  const envFallback = process.env.AI_AGENT_LLM_KEY || null;

  const info = {
    tenant: tenant.companyCode,
    agentEnabled: agent.isEnabled,
    status: agent.status,
    aiProvider: agent.aiProvider,
    aiModel: agent.aiModel,
    hasLlmEnc: hasEnc,
    llmEncLen: hasEnc ? String(settings.llmApiKeyEnc).length : 0,
    decryptOk: Boolean(llmKey),
    decryptedLen: llmKey ? llmKey.length : 0,
    keyPrefix: llmKey ? `${llmKey.slice(0, 7)}...` : null,
    looksLikeOpenAI: llmKey ? /^sk-/.test(llmKey) : false,
    looksLikeGemini: llmKey ? /^AIza/.test(llmKey) : false,
    hasEnvFallback: Boolean(envFallback),
    hasAiFaceSecret: Boolean(process.env.AI_FACE_SECRET),
    hasSecretKey: Boolean(process.env.SECRET_KEY),
  };
  console.log("DIAG", JSON.stringify(info, null, 2));

  if (!llmKey && !envFallback) {
    console.log("RESULT: NO_USABLE_KEY");
    console.log(
      "FIX: Open AI Agent → Configuration, paste a fresh OpenAI sk-... (or Gemini) key, Save."
    );
    console.log(
      "Cause: llmApiKeyEnc exists but decrypt failed with this process SECRET_KEY / AI_FACE_SECRET."
    );
    process.exit(2);
  }

  if (String(agent.aiProvider).toLowerCase() === "openai" && llmKey && !/^sk-/.test(llmKey)) {
    console.log("WARN: provider=openai but decrypted key does not look like sk-...");
  }
  if (String(agent.aiProvider).toLowerCase() === "gemini" && llmKey && /^sk-/.test(llmKey)) {
    console.log("WARN: provider=gemini but decrypted key looks like OpenAI sk-...");
  }

  const apiKey = llmKey || envFallback;
  try {
    const decision = await generateDecision({
      provider: agent.aiProvider,
      model: agent.aiModel,
      apiKey,
      systemPrompt: "You are a test assistant. Return only valid JSON for the schema requested.",
      userPrompt:
        'Customer said: Hi. Return JSON only with keys intent, confidence, reply, actions, leadUpdates, memoryUpdates, needsHuman, language. Example shape: {"intent":"GENERAL_ENQUIRY","confidence":0.9,"reply":"Hello! How can I help you today?","actions":[{"type":"ANSWER_QUESTION","payload":{}}],"leadUpdates":{},"memoryUpdates":{},"needsHuman":false,"language":"en"}',
    });
    console.log("LLM_OK", {
      intent: decision.intent,
      confidence: decision.confidence,
      replyPreview: String(decision.reply || "").slice(0, 160),
      actions: decision.actions.map((a) => a.type),
      needsHuman: decision.needsHuman,
    });
    process.exit(0);
  } catch (e) {
    console.log("LLM_FAIL", {
      message: e.message,
      status: e?.response?.status || null,
      errorType: e?.response?.data?.error?.type || e?.response?.data?.error?.code || null,
      errorMessage: e?.response?.data?.error?.message || null,
    });
    process.exit(3);
  }
})().catch((e) => {
  console.error("SCRIPT_FAIL", e.message || e);
  process.exit(1);
});
