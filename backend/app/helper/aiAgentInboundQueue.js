/**
 * Per-customer inbound queue so rapid WhatsApp messages are processed FIFO.
 * Prevents concurrent LLM/send races that cause missed or delayed replies.
 *
 * Key = `${tenantId}:${waId}` (or phoneNumberId fallback).
 */

const tails = new Map();

function queueKey(tenantId, inbound) {
  const who =
    String(inbound?.waId || inbound?.customerPhone || inbound?.waMessageId || "unknown").replace(
      /\D/g,
      ""
    ) || "unknown";
  return `${tenantId || "tenant"}:${who}`;
}

/**
 * Enqueue an async job behind any in-flight jobs for the same key.
 * Always returns a Promise; errors are logged and rethrown to the caller chain
 * but do not block subsequent jobs.
 */
function enqueueInbound(key, task) {
  const prev = tails.get(key) || Promise.resolve();
  const next = prev
    .catch((err) => {
      // Keep chain alive after a prior failure
      console.error("aiAgent.inboundQueue prior:", err?.message || err);
    })
    .then(async () => {
      const started = Date.now();
      console.log(`aiAgent.inboundQueue: start key=${key}`);
      try {
        return await task();
      } finally {
        console.log(`aiAgent.inboundQueue: done key=${key} ms=${Date.now() - started}`);
      }
    });

  tails.set(key, next);
  next.finally(() => {
    if (tails.get(key) === next) tails.delete(key);
  });

  return next;
}

function queueDepthApprox() {
  return tails.size;
}

module.exports = {
  queueKey,
  enqueueInbound,
  queueDepthApprox,
};
