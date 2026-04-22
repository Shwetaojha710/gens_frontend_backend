const PlanMaster = require("../models/plan_master");
const LandingSiteContent = require("../models/landing_site_content");
const { mergeLandingPayload } = require("../lib/landingMerge");
const Helper = require("../helper/helper");

function sanitizePlanForPublic(p) {
  const meta = p.metadata && typeof p.metadata === "object" ? p.metadata : {};
  let bullets = [];
  if (Array.isArray(meta.landingBullets) && meta.landingBullets.length) {
    bullets = meta.landingBullets.map((x) => String(x).trim()).filter(Boolean);
  } else if (p.description) {
    bullets = String(p.description)
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
  }
  if (!bullets.length) {
    bullets = ["Full GENS module access per your published plan"];
  }
  return {
    id: p.id,
    name: p.name,
    code: p.code,
    price: p.price != null ? Number(p.price) : null,
    billingCycle: p.billingCycle,
    durationDays: p.durationDays,
    maxUsers: p.maxUsers,
    description: p.description,
    highlight: Boolean(meta.landingFeatured || meta.highlight),
    supportLabel: meta.supportLabel || null,
    supportBadge: meta.supportBadge || null,
    bullets,
  };
}

/** GET /api/public/landing — no auth */
exports.getPublicLanding = async (req, res) => {
  try {
    const row = await LandingSiteContent.findOne({ where: { slug: "default" }, raw: true });
    const content = mergeLandingPayload(row?.payload || {});

    const planRows = await PlanMaster.findAll({
      where: { status: "active" },
      order: [["createdAt", "ASC"]],
      raw: true,
    });

    planRows.sort((a, b) => {
      const af = a.metadata?.landingFeatured || a.metadata?.highlight ? 1 : 0;
      const bf = b.metadata?.landingFeatured || b.metadata?.highlight ? 1 : 0;
      return bf - af;
    });

    const plans = planRows.map(sanitizePlanForPublic);

    return Helper.response(true, "Landing payload", { content, plans }, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};
