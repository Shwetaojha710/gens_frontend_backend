/**
 * Sales disposition classifiers — interested / not_ready / declined.
 * Does not replace product Q&A or demo slot logic; only clear buying signals.
 */
const { wantsDemoScheduling, isProductInfoQuery } = require("./aiAgentDemoSlots");
const moment = require("moment-timezone");

const TZ = "Asia/Kolkata";

function isDeclinedIntent(text) {
  const t = String(text || "").toLowerCase();
  return /\b(not interested|no interest|mat bhejo|mat\s*bhejo|unsubscribe|stop(\s+messages?)?|don't\s*message|dont\s*message|nahi chahiye|nahi\s*chahiye|no thanks|no\s*thank\s*you|leave me alone|remove me)\b/i.test(
    t
  );
}

function isNotReadyIntent(text) {
  const t = String(text || "").toLowerCase();
  if (isDeclinedIntent(t) || wantsDemoScheduling(t)) return false;
  return /\b(baad me|baad mein|later|next month|next week|abhi nahi|abhi\s*nahi|not now|not ready|phir kabhi|follow[\s-]?up|followup|baad mein baat|call me later|remind me)\b/i.test(
    t
  );
}

function isInterestedIntent(text) {
  const t = String(text || "").toLowerCase();
  if (isDeclinedIntent(t) || isNotReadyIntent(t)) return false;
  return (
    wantsDemoScheduling(t) ||
    /\b(interested|i am interested|main interested|haan\s*demo|yes\s*demo|demo\s*chahiye|book\s*karo|schedule\s*karo)\b/i.test(
      t
    )
  );
}

/**
 * Prefer explicit phrases over LLM; product Q&A → null.
 */
function detectSalesDisposition(text, llmDisposition = null) {
  if (isProductInfoQuery(text) && !wantsDemoScheduling(text) && !isDeclinedIntent(text) && !isNotReadyIntent(text)) {
    return null;
  }
  if (isDeclinedIntent(text)) return "declined";
  if (isNotReadyIntent(text)) return "not_ready";
  if (isInterestedIntent(text)) return "interested";
  const d = String(llmDisposition || "").toLowerCase();
  if (d === "interested" || d === "not_ready" || d === "declined") return d;
  return null;
}

/**
 * Parse follow-up moment from payload or free text (IST).
 */
function parseFollowUpAt(payload = {}, inboundText = "") {
  const raw =
    payload.followUpAt ||
    payload.datetime ||
    payload.date ||
    payload.when ||
    null;
  if (raw) {
    const m = moment.tz(String(raw).trim(), ["YYYY-MM-DD", "YYYY-MM-DD HH:mm", moment.ISO_8601], true, TZ);
    if (m.isValid()) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw).trim())) {
        return m.hour(10).minute(0).second(0).millisecond(0);
      }
      return m.second(0).millisecond(0);
    }
  }
  const t = String(inboundText || "").toLowerCase();
  const now = moment().tz(TZ);
  if (/\bnext week|agli\s*hafte|agle\s*hafte\b/i.test(t)) {
    return now.clone().add(7, "days").hour(10).minute(0).second(0).millisecond(0);
  }
  if (/\bnext month|agle\s*mahine|agli\s*mahine\b/i.test(t)) {
    return now.clone().add(1, "month").hour(10).minute(0).second(0).millisecond(0);
  }
  if (/\b(kal|tomorrow)\b/i.test(t)) {
    return now.clone().add(1, "day").hour(10).minute(0).second(0).millisecond(0);
  }
  // Default: 3 days later 10:00 IST when user said "baad me" without date
  if (isNotReadyIntent(t)) {
    return now.clone().add(3, "days").hour(10).minute(0).second(0).millisecond(0);
  }
  return null;
}

function formatFollowUpLabel(m) {
  if (!m || !m.isValid()) return null;
  return m.clone().tz(TZ).format("dddd, D MMM YYYY, h:mm A") + " IST";
}

function leadBlocksProactive(lead, conversation = null) {
  if (conversation?.context?.doNotContact) return true;
  if (lead?.meta?.doNotContact) return true;
  if (lead?.leadStatus === "lost") return true;
  return false;
}

module.exports = {
  isDeclinedIntent,
  isNotReadyIntent,
  isInterestedIntent,
  detectSalesDisposition,
  parseFollowUpAt,
  formatFollowUpLabel,
  leadBlocksProactive,
  TZ,
};
