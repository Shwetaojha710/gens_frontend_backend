const Razorpay = require("razorpay");
const PlanMaster = require("../models/plan_master");
const Helper = require("../helper/helper");
const { isPlanFree, getRazorpayPlanId } = require("../lib/planPayment");

/** GET /api/public/plan/:planId — safe fields for registration UI */
exports.getPublicPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    if (!planId) {
      return Helper.response(false, "planId is required.", {}, res, 200);
    }
    const row = await PlanMaster.findOne({
      where: { id: planId, status: "active" },
      raw: true,
    });
    if (!row) {
      return Helper.response(false, "Plan not found.", {}, res, 200);
    }
    const free = isPlanFree(row);
    const rzPlan = getRazorpayPlanId({ metadata: row.metadata });
    return Helper.response(
      true,
      "Plan",
      {
        id: row.id,
        name: row.name,
        code: row.code,
        price: row.price != null ? Number(row.price) : null,
        billingCycle: row.billingCycle,
        durationDays: row.durationDays,
        maxUsers: row.maxUsers,
        description: row.description,
        requiresPayment: !free,
        razorpayReady: !free && Boolean(rzPlan) && Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      },
      res,
      200,
    );
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

/**
 * POST /api/public/razorpay/subscription-start
 * Body: { planId, email, name } — creates Razorpay customer + subscription (recurring).
 */
exports.postRazorpaySubscriptionStart = async (req, res) => {
  try {
    const planId = req.body?.planId ? String(req.body.planId).trim() : "";
    const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : "";
    const name = req.body?.name ? String(req.body.name).trim() : "";

    if (!planId || !email || !name) {
      return Helper.response(false, "planId, email, and name are required.", {}, res, 200);
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return Helper.response(false, "Payment gateway is not configured on the server.", {}, res, 503);
    }

    const plan = await PlanMaster.findOne({ where: { id: planId, status: "active" } });
    if (!plan) {
      return Helper.response(false, "Invalid or inactive plan.", {}, res, 200);
    }

    if (isPlanFree(plan)) {
      return Helper.response(false, "This plan does not require payment.", {}, res, 200);
    }

    const rzPlanId = getRazorpayPlanId(plan);
    if (!rzPlanId) {
      return Helper.response(
        false,
        "This plan is not linked to Razorpay yet. Ask the administrator to set razorpayPlanId in plan metadata.",
        {},
        res,
        200,
      );
    }

    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    let customer;
    try {
      customer = await rzp.customers.create({
        name: name.slice(0, 200),
        email: email.slice(0, 254),
        fail_existing: 1,
      });
    } catch (e) {
      const msg = e?.error?.description || e?.message || "Could not create billing customer.";
      return Helper.response(false, msg, {}, res, 200);
    }

    const totalCount =
      plan.billingCycle === "yearly" ? 10 : plan.billingCycle === "one_time" ? 1 : 60;

    let subscription;
    try {
      subscription = await rzp.subscriptions.create({
        plan_id: rzPlanId,
        customer_id: customer.id,
        customer_notify: 1,
        total_count: totalCount,
        quantity: 1,
        notes: {
          planName: plan.name,
          source: "gens_company_reg",
        },
      });
    } catch (e) {
      const msg = e?.error?.description || e?.message || "Could not start subscription.";
      return Helper.response(false, msg, {}, res, 200);
    }

    return Helper.response(
      true,
      "Open Razorpay Checkout",
      {
        keyId,
        subscriptionId: subscription.id,
        planName: plan.name,
      },
      res,
      200,
    );
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};
