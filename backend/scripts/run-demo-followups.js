/**
 * Cron-friendly: send due WhatsApp soft follow-ups for nurturing (not_ready) leads.
 *
 * Usage:
 *   node scripts/run-demo-followups.js
 *   node scripts/run-demo-followups.js --dry-run
 *   node scripts/run-demo-followups.js --tenant=<uuid>
 *   node scripts/run-demo-followups.js --limit=20
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const { sequelize } = require("../app/models");
const { runDueFollowUps } = require("../app/helper/aiAgentFollowups");

function parseArgs(argv) {
  const out = { dryRun: false, tenantId: null, limit: 50 };
  for (const a of argv.slice(2)) {
    if (a === "--dry-run" || a === "--dryRun") out.dryRun = true;
    else if (a.startsWith("--tenant=")) out.tenantId = a.slice("--tenant=".length).trim() || null;
    else if (a.startsWith("--limit=")) out.limit = Math.max(1, parseInt(a.slice("--limit=".length), 10) || 50);
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv);
  await sequelize.authenticate();
  const summary = await runDueFollowUps({
    tenantId: opts.tenantId,
    limit: opts.limit,
    dryRun: opts.dryRun,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun: opts.dryRun,
        dueCount: summary.dueCount,
        sent: summary.sent,
        skipped: summary.skipped,
        results: summary.results,
      },
      null,
      2
    )
  );
  await sequelize.close();
}

main().catch(async (e) => {
  console.error("run-demo-followups failed:", e?.message || e);
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
