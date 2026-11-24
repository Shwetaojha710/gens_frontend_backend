/**
 * LLM client for AI Agent — Gemini and OpenAI via HTTP (no SDK).
 * Never logs API keys. Callers must pass decrypted keys.
 */
const axios = require("axios");

const ALLOWED_ACTIONS = new Set([
  "ANSWER_QUESTION",
  "ASK_FOLLOWUP",
  "COLLECT_LEAD_INFORMATION",
  "CREATE_LEAD",
  "UPDATE_LEAD",
  "SCHEDULE_DEMO",
  "LIST_DEMO_SLOTS",
  "BOOK_DEMO_SLOT",
  "SCHEDULE_FOLLOWUP",
  "STOP_OUTREACH",
  "CREATE_SUPPORT_TICKET",
  "TRANSFER_TO_HUMAN",
  "NO_REPLY",
]);

const SYSTEM_INTENTS = [
  "GENERAL_ENQUIRY",
  "PRODUCT_ENQUIRY",
  "SERVICE_ENQUIRY",
  "PRICING_ENQUIRY",
  "SALES_ENQUIRY",
  "DEMO_REQUEST",
  "FOLLOWUP_REQUEST",
  "DECLINED",
  "SUPPORT_REQUEST",
  "COMPLAINT",
  "PARTNERSHIP_ENQUIRY",
  "JOB_ENQUIRY",
  "HUMAN_AGENT_REQUEST",
];

const SALES_DISPOSITIONS = new Set(["interested", "not_ready", "declined"]);

function extractJson(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function validateDecision(raw) {
  const d = raw && typeof raw === "object" ? raw : {};
  const actions = Array.isArray(d.actions)
    ? d.actions
        .map((a) => {
          if (typeof a === "string") return { type: a, payload: {} };
          if (a && typeof a === "object" && a.type) {
            return { type: String(a.type).toUpperCase(), payload: a.payload || {} };
          }
          return null;
        })
        .filter((a) => a && ALLOWED_ACTIONS.has(a.type))
    : [{ type: "ANSWER_QUESTION", payload: {} }];

  let intent = String(d.intent || "GENERAL_ENQUIRY").toUpperCase().replace(/\s+/g, "_");
  if (!SYSTEM_INTENTS.includes(intent) && !/^[A-Z][A-Z0-9_]{2,79}$/.test(intent)) {
    intent = "GENERAL_ENQUIRY";
  }

  const confidence = Math.max(0, Math.min(1, Number(d.confidence ?? 0.5)));
  const reply = String(d.reply || "").trim().slice(0, 3500);
  const leadUpdates =
    d.leadUpdates && typeof d.leadUpdates === "object" && !Array.isArray(d.leadUpdates)
      ? d.leadUpdates
      : {};
  const memoryUpdates =
    d.memoryUpdates && typeof d.memoryUpdates === "object" && !Array.isArray(d.memoryUpdates)
      ? d.memoryUpdates
      : {};
  const needsHuman = Boolean(d.needsHuman) || actions.some((a) => a.type === "TRANSFER_TO_HUMAN");
  const handoverReason = d.handoverReason ? String(d.handoverReason).slice(0, 500) : null;
  const leadPriority = ["HOT", "WARM", "COLD"].includes(String(d.leadPriority || "").toUpperCase())
    ? String(d.leadPriority).toUpperCase()
    : null;

  const rawDisp = String(d.salesDisposition || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  const salesDisposition = SALES_DISPOSITIONS.has(rawDisp) ? rawDisp : null;

  return {
    intent,
    confidence,
    reply,
    actions,
    leadUpdates,
    memoryUpdates,
    needsHuman,
    handoverReason,
    leadPriority,
    salesDisposition,
    language: d.language === "hi" ? "hi" : "en",
  };
}

async function callOpenAI({ apiKey, model, system, user, temperature = 0.3 }) {
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: model || "gpt-4o-mini",
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      timeout: 45000,
    }
  );
  return res.data?.choices?.[0]?.message?.content || "";
}

async function callGemini({ apiKey, model, system, user, temperature = 0.3 }) {
  const m = model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await axios.post(
    url,
    {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    },
    { headers: { "Content-Type": "application/json" }, timeout: 45000 }
  );
  const parts = res.data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || "").join("");
}

async function generateDecision({
  provider,
  model,
  apiKey,
  systemPrompt,
  userPrompt,
  temperature,
}) {
  if (!apiKey) throw new Error("LLM API key is not configured");
  const p = String(provider || "gemini").toLowerCase();
  let text;
  if (p === "openai") {
    text = await callOpenAI({ apiKey, model, system: systemPrompt, user: userPrompt, temperature });
  } else {
    text = await callGemini({ apiKey, model, system: systemPrompt, user: userPrompt, temperature });
  }
  const parsed = extractJson(text);
  if (!parsed) {
    return validateDecision({
      intent: "GENERAL_ENQUIRY",
      confidence: 0.2,
      reply:
        "Thank you for your message. I want to make sure I help you correctly — could you share a bit more detail about what you need?",
      actions: [{ type: "ASK_FOLLOWUP", payload: {} }],
      needsHuman: false,
    });
  }
  return validateDecision(parsed);
}

module.exports = {
  ALLOWED_ACTIONS,
  SYSTEM_INTENTS,
  extractJson,
  validateDecision,
  generateDecision,
};
