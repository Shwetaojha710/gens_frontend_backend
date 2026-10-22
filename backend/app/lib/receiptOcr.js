/**
 * Receipt / invoice OCR.
 *  - Images (jpg/png): Tesseract (tesseract.js, runs in-process).
 *  - PDFs: embedded text layer via pdf-parse (scanned PDFs without text return nothing).
 * parseReceiptText() turns raw text into { amount, date, merchant, invoiceNo, gstin }.
 *
 * Tesseract downloads its English model on first use and caches it in
 * OCR_CACHE_PATH (default backend/.ocr-cache). Set OCR_LANG_PATH to serve the
 * model from your own server when the backend has no internet access.
 */
const fs = require("fs");
const path = require("path");

const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS || 45000);
const CACHE_PATH = process.env.OCR_CACHE_PATH || path.join(__dirname, "../../.ocr-cache");

let workerPromise = null;
// Tesseract workers process one image at a time; chain jobs so they never overlap.
let queue = Promise.resolve();

function getWorker() {
  if (!workerPromise) {
    const { createWorker } = require("tesseract.js");
    fs.mkdirSync(CACHE_PATH, { recursive: true });
    const options = { cachePath: CACHE_PATH };
    if (process.env.OCR_LANG_PATH) options.langPath = process.env.OCR_LANG_PATH;
    workerPromise = createWorker("eng", 1, options).catch((err) => {
      workerPromise = null; // allow a retry on the next request
      throw err;
    });
  }
  return workerPromise;
}

function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("OCR timed out")), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function imageText(filePath) {
  const job = queue.then(async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(filePath);
    return data.text || "";
  });
  queue = job.catch(() => {});
  return withTimeout(job, OCR_TIMEOUT_MS);
}

async function pdfText(filePath) {
  const { PDFParse } = require("pdf-parse");
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });
  try {
    const result = await withTimeout(parser.getText(), OCR_TIMEOUT_MS);
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

/** Raw text of a receipt file, or "" when the type isn't supported. */
async function extractText(filePath, mimeType) {
  if (/^image\/(jpe?g|png)$/i.test(mimeType || "")) return imageText(filePath);
  if (mimeType === "application/pdf") return pdfText(filePath);
  return "";
}

// ───────────────────────────── text parsing ─────────────────────────────

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

// Ordered best-first: a "grand total" line beats a plain "total" line.
const TOTAL_KEYWORDS = [
  /grand\s*total/i,
  /(net|total)\s*(amount\s*)?payable/i,
  /amount\s*payable/i,
  /total\s*amount/i,
  /net\s*amount/i,
  /amount\s*due|balance\s*due/i,
  /\btotal\b/i,
];

// 1,23,456.78 | 123456.78 | 1,234 — optional ₹ / Rs / INR prefix
const AMOUNT_RE = /(?:₹|rs\.?|inr)?\s*((?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?)/gi;

function toNumber(s) {
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function amountsIn(line) {
  const out = [];
  for (const m of line.matchAll(AMOUNT_RE)) {
    const n = toNumber(m[1]);
    // Skip things that look like years, phone numbers or ids
    if (n !== null && n > 0 && n < 10000000 && !/^\d{10,}$/.test(m[1].replace(/[,.]/g, ""))) out.push(n);
  }
  return out;
}

function parseAmount(lines) {
  for (const re of TOTAL_KEYWORDS) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!re.test(line) || /sub\s*-?\s*total/i.test(line)) continue;
      const nums = amountsIn(line.replace(re, " "));
      if (nums.length) return nums[nums.length - 1];
      // Amount sometimes lands on the next line
      const next = lines[i + 1] && amountsIn(lines[i + 1]);
      if (next && next.length) return next[next.length - 1];
    }
  }
  // Fallback: largest value written with paise (e.g. 1,250.00)
  const decimals = lines.flatMap((l) => [...l.matchAll(/((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})\b/g)].map((m) => toNumber(m[1])));
  const valid = decimals.filter((n) => n !== null && n > 0 && n < 10000000);
  return valid.length ? Math.max(...valid) : null;
}

const pad = (n) => String(n).padStart(2, "0");

function validDate(y, m, d) {
  if (y < 100) y += 2000;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** First plausible date; numeric dates are read day-first (Indian format). */
function parseDate(text, today = new Date()) {
  const candidates = [];
  for (const m of text.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    candidates.push(validDate(+m[1], +m[2], +m[3]));
  }
  for (const m of text.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/g)) {
    candidates.push(validDate(+m[3], +m[2], +m[1]));
  }
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-/,]*([a-z]{3,9})[\s\-/,']*(\d{2,4})\b/gi)) {
    const mon = MONTHS[m[2].toLowerCase().slice(0, m[2].toLowerCase().startsWith("sept") ? 4 : 3)];
    if (mon) candidates.push(validDate(+m[3], mon, +m[1]));
  }
  for (const m of text.matchAll(/\b([a-z]{3,9})[\s\-.]+(\d{1,2})(?:st|nd|rd|th)?,?[\s\-]+(\d{4})\b/gi)) {
    const mon = MONTHS[m[1].toLowerCase().slice(0, 3)];
    if (mon) candidates.push(validDate(+m[3], mon, +m[2]));
  }
  const todayIso = today.toISOString().slice(0, 10);
  const minIso = `${today.getUTCFullYear() - 3}-01-01`;
  return candidates.find((d) => d && d <= todayIso && d >= minIso) || null;
}

const NOT_MERCHANT = /\b(tax\s*invoice|invoice|receipt|bill(\s*of\s*supply)?|cash\s*memo|gstin?|date|phone|tel|mob(ile)?|e-?mail|original|duplicate|customer|page\s*\d)\b|www\.|http/i;

function parseMerchant(lines) {
  for (const line of lines.slice(0, 8)) {
    const clean = line.replace(/[^a-z0-9&.,'()\- ]/gi, " ").replace(/\s+/g, " ").trim();
    const letters = (clean.match(/[a-z]/gi) || []).length;
    if (letters >= 3 && letters / clean.length > 0.5 && !NOT_MERCHANT.test(clean)) return clean.slice(0, 120);
  }
  return null;
}

function parseInvoiceNo(text) {
  const m = text.match(/\b(?:invoice|inv|bill|receipt)\s*(?:no|number|num|#)\.?\s*[:\-#]?\s*([a-z0-9][a-z0-9\-\/]{2,30})/i);
  return m ? m[1].toUpperCase() : null;
}

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const B36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Characters OCR commonly confuses, keyed by what was read
const AS_DIGIT = { O: ["0"], D: ["0"], Q: ["0"], I: ["1"], L: ["1"], Z: ["2"], S: ["5"], B: ["8"], G: ["6", "0"], T: ["7"] };
const AS_LETTER = { 0: ["O"], 1: ["I"], 2: ["Z"], 5: ["S"], 6: ["G"], 8: ["B"] };
const GSTIN_DIGIT_POS = [0, 1, 7, 8, 9, 10];
const GSTIN_LETTER_POS = [2, 3, 4, 5, 6, 11];

function gstinChecksumOk(g) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = B36.indexOf(g[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return B36[(36 - (sum % 36)) % 36] === g[14];
}

/** GSTIN with OCR misreads repaired; prefers a correction whose check character is valid. */
function parseGstin(text) {
  const tokens = text.toUpperCase().match(/\b[A-Z0-9]{15}\b/g) || [];
  let formatOnly = null;
  for (const token of tokens) {
    let variants = [""];
    for (let i = 0; i < 15 && variants.length <= 256; i++) {
      const ch = token[i];
      let options = [ch];
      if (GSTIN_DIGIT_POS.includes(i) && AS_DIGIT[ch]) options = AS_DIGIT[ch];
      else if (GSTIN_LETTER_POS.includes(i) && AS_LETTER[ch]) options = AS_LETTER[ch];
      else if (i === 13 && ch === "2") options = ["Z"];
      variants = variants.flatMap((v) => options.map((o) => v + o));
    }
    for (const v of variants) {
      if (!GSTIN_RE.test(v)) continue;
      if (gstinChecksumOk(v)) return v;
      formatOnly = formatOnly || v;
    }
  }
  return formatOnly;
}

/** Structured fields from raw OCR text; any field may be null. */
function parseReceiptText(text, today) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return {
    amount: parseAmount(lines),
    date: parseDate(lines.join("\n"), today),
    merchant: parseMerchant(lines),
    invoiceNo: parseInvoiceNo(lines.join("\n")),
    gstin: parseGstin(lines.join("\n")),
  };
}

module.exports = { extractText, parseReceiptText };
