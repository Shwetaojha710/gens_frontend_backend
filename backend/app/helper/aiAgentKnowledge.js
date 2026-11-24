/**
 * Knowledge retrieval — approved KB only, keyword/token overlap scoring.
 * Never invents content; returns empty when nothing relevant is found.
 */
const fs = require("fs");
const path = require("path");
const AiAgentKnowledge = require("../models/ai_agent_knowledge");

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function scoreDoc(queryTokens, doc) {
  const hay = `${doc.title || ""} ${doc.content || ""} ${doc.searchText || ""} ${(doc.tags || []).join(" ")}`.toLowerCase();
  if (!queryTokens.length) return 0;
  let hits = 0;
  for (const t of queryTokens) {
    if (hay.includes(t)) hits += 1;
  }
  const titleHits = queryTokens.filter((t) => String(doc.title || "").toLowerCase().includes(t)).length;
  return hits / queryTokens.length + titleHits * 0.15;
}

async function searchKnowledge(tenantId, query, { limit = 5 } = {}) {
  const rows = await AiAgentKnowledge.findAll({
    where: {
      tenantId,
      isActive: true,
      isApproved: true,
    },
    order: [["updatedAt", "DESC"]],
    limit: 200,
    raw: true,
  });
  const tokens = tokenize(query);
  const ranked = rows
    .map((r) => ({ ...r, _score: scoreDoc(tokens, r) }))
    .filter((r) => r._score > 0.08)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);

  if (!ranked.length) {
    const q = String(query || "").toLowerCase();
    const cat =
      /price|pricing|cost|fee|charge|₹|rs\.?/.test(q)
        ? "pricing"
        : /product|feature|module|software|app/.test(q)
          ? "product"
          : /service|support|implement/.test(q)
            ? "service"
            : null;
    if (cat) {
      return rows.filter((r) => r.category === cat).slice(0, limit);
    }
  }
  return ranked;
}

function formatKnowledgeForPrompt(docs) {
  if (!docs?.length) {
    return (
      "NO_APPROVED_KNOWLEDGE_FOUND. Do not invent company facts, pricing, features, or timelines. " +
      "Reply politely that this query is outside your approved knowledge, invite them to book a free product demo, " +
      "and say our team will support them and help solve all their questions. " +
      "Ask for name, company, email, phone, and a preferred demo date (one question at a time if details missing). " +
      "Use LIST_DEMO_SLOTS / BOOK_DEMO_SLOT and COLLECT_LEAD_INFORMATION. Never invent available times."
    );
  }
  return docs
    .map(
      (d, i) =>
        `[KB${i + 1} | ${d.category} | ${d.title}]\n${String(d.content || "").slice(0, 2500)}`
    )
    .join("\n\n");
}

async function extractTextFromUpload(file) {
  if (!file) return "";
  const mime = file.mimetype || "";
  const ext = path.extname(file.originalname || "").toLowerCase();
  const fullPath = file.path || path.join(__dirname, "../../upload", file.filename);

  if (mime === "application/pdf" || ext === ".pdf") {
    try {
      // pdf-parse v2 API (same as receiptOcr.js)
      const { PDFParse } = require("pdf-parse");
      const buf = fs.readFileSync(fullPath);
      const parser = new PDFParse({ data: buf });
      const result = await parser.getText();
      await parser.destroy?.();
      return String(result?.text || "").trim();
    } catch (e) {
      console.error("aiAgentKnowledge.pdfParse:", e?.message || e);
      return "";
    }
  }

  if (
    mime.includes("word") ||
    ext === ".docx" ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const raw = fs.readFileSync(fullPath);
      const asStr = raw.toString("utf8");
      const texts = [...asStr.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
      if (texts.length) return texts.join(" ").replace(/\s+/g, " ").trim();
      return "";
    } catch {
      return "";
    }
  }

  if (mime.startsWith("text/") || ext === ".txt" || ext === ".md") {
    return fs.readFileSync(fullPath, "utf8").trim();
  }

  return "";
}

function buildSearchText({ title, content, tags }) {
  return [title, content, ...(tags || [])].filter(Boolean).join("\n").slice(0, 20000);
}

module.exports = {
  searchKnowledge,
  formatKnowledgeForPrompt,
  extractTextFromUpload,
  buildSearchText,
  tokenize,
};
