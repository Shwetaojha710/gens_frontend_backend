"use strict";

/**
 * Returns true if the plan is free (price is 0, null, or billingCycle is 'free').
 *
 * @param {object} plan - PlanMaster row
 * @returns {boolean}
 */
function isPlanFree(plan) {
  if (!plan) return true;
  if (plan.billingCycle == "free") return true;
  const price = plan.price != null ? Number(plan.price) : 0;
  return price <= 0;
}

/**
 * Reads the Razorpay plan ID from plan.metadata.razorpayPlanId.
 *
 * @param {object} plan - PlanMaster row (with metadata field)
 * @returns {string|null}
 */
function getRazorpayPlanId(plan) {
  if (!plan) return null;
  const meta = plan.metadata && typeof plan.metadata === "object" ? plan.metadata : {};
  return meta.razorpayPlanId ? String(meta.razorpayPlanId).trim() : null;
}

module.exports = { isPlanFree, getRazorpayPlanId };
