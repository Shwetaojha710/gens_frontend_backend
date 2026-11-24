/**
 * Verify per-key FIFO inbound queue ordering.
 * Usage: node scripts/test-inbound-queue.js
 */
const { enqueueInbound, queueKey } = require("../app/helper/aiAgentInboundQueue");

(async () => {
  const order = [];
  const key = queueKey("t1", { waId: "919999999999" });

  const jobs = [1, 2, 3].map((n) =>
    enqueueInbound(key, async () => {
      order.push(`start-${n}`);
      await new Promise((r) => setTimeout(r, 30 * (4 - n))); // 1 slowest
      order.push(`end-${n}`);
      return n;
    })
  );

  const results = await Promise.all(jobs);
  const expected = ["start-1", "end-1", "start-2", "end-2", "start-3", "end-3"];
  if (JSON.stringify(order) !== JSON.stringify(expected)) {
    console.error("FAIL order", order, "expected", expected);
    process.exit(1);
  }
  if (JSON.stringify(results) !== JSON.stringify([1, 2, 3])) {
    console.error("FAIL results", results);
    process.exit(1);
  }
  console.log("PASS: inbound queue FIFO", order.join(" → "));
  process.exit(0);
})().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
