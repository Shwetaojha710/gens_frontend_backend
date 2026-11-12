/**
 * Bulk-enroll face photos named by empPersonals.id.
 *
 * File names: <empPersonalId>.<ext>  or  <empPersonalId>_<anything>.<ext>
 * Multiple files for the same employee are enrolled together.
 *
 * Usage (from backend folder):
 *   node scripts/bulk-enroll-faces.js --tenant <tenantId> --dir <folder> [--dry-run] [--replace]
 *
 *   --dry-run  only report what would happen (no face service / DB writes)
 *   --replace  re-enroll employees who already have active embeddings
 *              (default: skip them)
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sequelize = require("../app/connection/connection");
const empPersonal = require("../app/models/empPersonal");
const aiFaceEmbedding = require("../app/models/aiFaceEmbedding");
const aiProcessingConfig = require("../app/models/aiProcessingConfig");

const AI_FACE_URL = process.env.AI_FACE_SERVICE_URL || "http://127.0.0.1:8090";
const AI_FACE_KEY = process.env.AI_FACE_SERVICE_KEY || "dev-ai-face-key";
const EVIDENCE_DIR = path.join(__dirname, "../upload/ai-face");
const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp"]);
const UUID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (k) => {
    const i = a.indexOf(k);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    tenantId: get("--tenant"),
    dir: get("--dir"),
    dryRun: a.includes("--dry-run"),
    replace: a.includes("--replace"),
  };
}

function face(method, urlPath, data) {
  return axios({
    method,
    url: `${AI_FACE_URL}${urlPath}`,
    headers: { "X-AI-Service-Key": AI_FACE_KEY, "Content-Type": "application/json" },
    timeout: 180000,
    data,
    validateStatus: () => true,
  });
}

const toBuf = (arr) => Buffer.from(Float32Array.from(arr).buffer);
const fromBuf = (b) =>
  Array.from(new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)));

async function rebuild(tenantId) {
  const rows = await aiFaceEmbedding.findAll({
    where: { tenantId, isActive: true },
    attributes: ["id", "employeeId", "embedding"],
  });
  const r = await face("post", "/v1/faiss/rebuild", {
    tenant_id: tenantId,
    items: rows.map((x) => ({
      embedding_id: x.id,
      employee_id: x.employeeId,
      embedding: fromBuf(x.embedding),
    })),
  });
  if (r.status >= 400) throw new Error(`FAISS rebuild failed: ${JSON.stringify(r.data)}`);
  return r.data?.vectors;
}

async function run() {
  const { tenantId, dir, dryRun, replace } = parseArgs();
  if (!tenantId || !dir) {
    console.error("Usage: --tenant <tenantId> --dir <folder> [--dry-run] [--replace]");
    process.exit(1);
  }

  // Group files by employee id
  const groups = new Map();
  const ignored = [];
  for (const f of fs.readdirSync(dir).sort()) {
    const ext = path.extname(f).toLowerCase();
    const m = f.match(UUID_RE);
    if (!IMG_EXT.has(ext) || !m) {
      ignored.push(f);
      continue;
    }
    const id = m[1].toLowerCase();
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(f);
  }

  await sequelize.authenticate();

  const emps = await empPersonal.findAll({
    where: { tenantId, id: [...groups.keys()] },
    attributes: ["id", "firstName", "empCode", "branchId", "status"],
  });
  const empById = new Map(emps.map((e) => [e.id, e]));

  const enrolledRows = await aiFaceEmbedding.findAll({
    where: { tenantId, isActive: true },
    attributes: ["employeeId"],
  });
  const alreadyEnrolled = new Set(enrolledRows.map((r) => r.employeeId));

  const cfgs = await aiProcessingConfig.findAll({ where: { tenantId } });
  const thresholdFor = (branchId) =>
    cfgs.find((c) => c.branchId === branchId)?.matchThreshold ?? cfgs[0]?.matchThreshold ?? 0.48;

  const report = { enrolled: [], skipped: [], failed: [], ignored };
  if (!dryRun) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  let n = 0;
  for (const [employeeId, files] of groups) {
    n++;
    const tag = `[${n}/${groups.size}] ${employeeId}`;
    const emp = empById.get(employeeId);
    if (!emp) {
      report.skipped.push({ employeeId, files, reason: "not found in empPersonals for tenant" });
      console.log(`${tag} SKIP not found`);
      continue;
    }
    const who = `${emp.firstName || ""} (${emp.empCode || "-"})`;
    if (emp.status !== "active") {
      report.skipped.push({ employeeId, who, files, reason: `status=${emp.status}` });
      console.log(`${tag} ${who} SKIP status=${emp.status}`);
      continue;
    }
    if (alreadyEnrolled.has(employeeId) && !replace) {
      report.skipped.push({ employeeId, who, files, reason: "already enrolled" });
      console.log(`${tag} ${who} SKIP already enrolled`);
      continue;
    }
    if (dryRun) {
      report.enrolled.push({ employeeId, who, files, dryRun: true });
      console.log(`${tag} ${who} WOULD ENROLL ${files.length} file(s)`);
      continue;
    }

    try {
      const images = files.map((f) => ({
        filename: f,
        content_base64: fs.readFileSync(path.join(dir, f)).toString("base64"),
      }));
      const ml = await face("post", "/v1/enroll", { employee_id: employeeId, tenant_id: tenantId, images });
      const accepted = ml.data?.accepted || [];
      const rejected = ml.data?.rejected || [];
      if (ml.status >= 400 || !accepted.length) {
        const reason = rejected.map((r) => `${r.filename}: ${r.reason}`).join("; ") || JSON.stringify(ml.data);
        report.failed.push({ employeeId, who, files, reason });
        console.log(`${tag} ${who} FAIL ${reason}`);
        continue;
      }
      // accepted[] keeps order of successful images; map back to file names
      const rejectedNames = new Set(rejected.map((r) => r.filename));
      const acceptedFiles = files.filter((f) => !rejectedNames.has(f));

      // Duplicate check against other employees already in FAISS
      let dup = null;
      for (const item of accepted) {
        const mr = await face("post", "/v1/match", {
          tenant_id: tenantId,
          embedding: item.embedding,
          threshold: thresholdFor(emp.branchId),
        });
        const m = mr.data?.match;
        if (m?.employee_id && m.employee_id !== employeeId) {
          dup = m;
          break;
        }
      }
      if (dup) {
        const reason = `duplicate face: matches employee ${dup.employee_id} (sim ${Number(dup.similarity).toFixed(3)})`;
        report.failed.push({ employeeId, who, files, reason });
        console.log(`${tag} ${who} FAIL ${reason}`);
        continue;
      }

      await sequelize.transaction(async (t) => {
        if (replace) {
          await aiFaceEmbedding.update(
            { isActive: false },
            { where: { tenantId, employeeId, isActive: true }, transaction: t }
          );
        }
        for (let i = 0; i < accepted.length; i++) {
          const destName = `enroll_${employeeId.slice(0, 8)}_${Date.now()}_${i}.jpg`;
          const src = acceptedFiles[i] && path.join(dir, acceptedFiles[i]);
          if (src && fs.existsSync(src)) fs.copyFileSync(src, path.join(EVIDENCE_DIR, destName));
          await aiFaceEmbedding.create(
            {
              tenantId,
              branchId: emp.branchId || null,
              employeeId,
              embedding: toBuf(accepted[i].embedding),
              sourceType: "bulk",
              sourcePath: destName,
              qualityScore: accepted[i].quality_score ?? null,
              isActive: true,
            },
            { transaction: t }
          );
        }
      });
      report.enrolled.push({ employeeId, who, files: acceptedFiles, rejected });
      console.log(`${tag} ${who} OK ${accepted.length} face(s)${rejected.length ? `, ${rejected.length} rejected` : ""}`);
    } catch (err) {
      report.failed.push({ employeeId, who, files, reason: err.message });
      console.log(`${tag} ${who} ERROR ${err.message}`);
    }
  }

  if (!dryRun && report.enrolled.length) {
    const vectors = await rebuild(tenantId);
    console.log(`FAISS rebuilt: ${vectors} vectors`);
  }

  const out = path.join(__dirname, `bulk-enroll-report-${Date.now()}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(
    `\n${dryRun ? "DRY RUN " : ""}Done. enrolled=${report.enrolled.length} skipped=${report.skipped.length} ` +
      `failed=${report.failed.length} ignored=${report.ignored.length}\nReport: ${out}`
  );
  await sequelize.close();
}

run().catch(async (e) => {
  console.error(e);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
