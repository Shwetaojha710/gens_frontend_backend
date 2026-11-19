/**
 * Lead field merge + HOT/WARM/COLD priority scoring.
 */

const LEAD_FIELDS = [
  "fullName",
  "companyName",
  "email",
  "phone",
  "productInterest",
  "businessRequirements",
  "employeeCount",
  "budget",
  "purchaseTimeline",
];

function cleanValue(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || /^n\/?a$/i.test(s) || /^unknown$/i.test(s) || /^null$/i.test(s)) return null;
  return s.slice(0, 2000);
}

function mergeLeadFields(existing = {}, updates = {}) {
  const out = { ...(existing || {}) };
  for (const key of LEAD_FIELDS) {
    const next = cleanValue(updates[key]);
    if (next) out[key] = next;
  }
  return out;
}

function missingLeadFields(collected = {}) {
  const required = ["fullName", "companyName", "email", "phone", "productInterest", "businessRequirements"];
  return required.filter((k) => !cleanValue(collected[k]));
}

function nextLeadQuestion(collected = {}, language = "en") {
  const missing = missingLeadFields(collected);
  if (!missing.length) return null;
  const mapEn = {
    fullName: "May I have your full name?",
    companyName: "Which company are you representing?",
    email: "What is the best email to reach you?",
    phone: "What phone number should we use for follow-ups?",
    productInterest: "Which product or solution are you most interested in?",
    businessRequirements: "Could you briefly share your business requirements?",
    employeeCount: "Roughly how many employees does your organisation have?",
    budget: "Do you have a budget range in mind? (optional)",
    purchaseTimeline: "What is your expected purchase or go-live timeline?",
  };
  const mapHi = {
    fullName: "क्या आप अपना पूरा नाम बता सकते हैं?",
    companyName: "आप किस कंपनी से हैं?",
    email: "आपका ईमेल पता क्या है?",
    phone: "फॉलो-अप के लिए कौन सा फोन नंबर सही रहेगा?",
    productInterest: "आप किस प्रोडक्ट या समाधान में रुचि रखते हैं?",
    businessRequirements: "कृपया अपनी बिज़नेस आवश्यकताएँ संक्षेप में बताएँ?",
    employeeCount: "आपकी कंपनी में लगभग कितने कर्मचारी हैं?",
    budget: "क्या आपके पास कोई बजट रेंज है? (वैकल्पिक)",
    purchaseTimeline: "आपकी खरीद या गो-लाइव की समय-सीमा क्या है?",
  };
  const map = language === "hi" ? mapHi : mapEn;
  // Prefer core fields first; budget/timeline only after core present
  const order = [
    "fullName",
    "companyName",
    "phone",
    "email",
    "productInterest",
    "businessRequirements",
    "employeeCount",
    "purchaseTimeline",
    "budget",
  ];
  for (const k of order) {
    if (missing.includes(k) || (!cleanValue(collected[k]) && ["employeeCount", "purchaseTimeline", "budget"].includes(k) && missing.length <= 2)) {
      if (!cleanValue(collected[k])) return { field: k, question: map[k] };
    }
  }
  const first = missing[0];
  return { field: first, question: map[first] };
}

function calculateLeadPriority(collected = {}, intent = null) {
  let score = 0;
  const c = collected || {};
  if (cleanValue(c.fullName)) score += 10;
  if (cleanValue(c.companyName)) score += 10;
  if (cleanValue(c.email)) score += 10;
  if (cleanValue(c.phone)) score += 10;
  if (cleanValue(c.productInterest)) score += 15;
  if (cleanValue(c.businessRequirements)) score += 15;
  if (cleanValue(c.employeeCount)) score += 5;
  if (cleanValue(c.budget)) score += 10;
  if (cleanValue(c.purchaseTimeline)) {
    score += 10;
    const t = String(c.purchaseTimeline).toLowerCase();
    if (/immediate|asap|this week|this month|1 month|30 day|urgent/.test(t)) score += 15;
  }
  if (["DEMO_REQUEST", "SALES_ENQUIRY", "PRICING_ENQUIRY"].includes(String(intent || "").toUpperCase())) {
    score += 15;
  }
  if (["COMPLAINT", "JOB_ENQUIRY"].includes(String(intent || "").toUpperCase())) {
    score -= 10;
  }

  let priority = "COLD";
  if (score >= 70) priority = "HOT";
  else if (score >= 40) priority = "WARM";

  return { score: Math.max(0, Math.min(100, score)), priority };
}

module.exports = {
  LEAD_FIELDS,
  mergeLeadFields,
  missingLeadFields,
  nextLeadQuestion,
  calculateLeadPriority,
  cleanValue,
};
