const LandingSiteContent = require("../models/landing_site_content");
const LandingContactSubmission = require("../models/landing_contact_submission");
const { mergeLandingPayload } = require("../lib/landingMerge");
const { sanitizePlainText, sanitizeEmail } = require("../lib/inputSanitize");
const Helper = require("../helper/helper");

const MAX_NAME = 200;
const MAX_MESSAGE = 8000;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX_PER_WINDOW = 12;
const rateState = new Map();

function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.trim()) {
    return xf.split(",")[0].trim().slice(0, 64);
  }
  const ra = req.socket?.remoteAddress || req.ip || "";
  return String(ra).slice(0, 64);
}

/** Sliding window bucket; increment only after a successful save so invalid payloads do not consume quota. */
function rateBucket(ip) {
  const now = Date.now();
  let row = rateState.get(ip);
  if (!row || row.resetAt < now) {
    row = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateState.set(ip, row);
  }
  return row;
}

/** POST /api/public/contact — no auth */
exports.postPublicContact = async (req, res) => {
  try {
    const row = await LandingSiteContent.findOne({ where: { slug: "default" }, raw: true });
    const content = mergeLandingPayload(row?.payload || {});
    if (content.contact && content.contact.formEnabled === false) {
      return Helper.response(false, "The contact form is not accepting submissions right now.", {}, res, 200);
    }

    const ipKey = clientIp(req) || "unknown";
    const bucket = rateBucket(ipKey);
    if (bucket.count >= RATE_MAX_PER_WINDOW) {
      return Helper.response(
        false,
        "Too many submissions from this address. Please try again later.",
        {},
        res,
        429,
      );
    }

    const body = req.body || {};
    const fullName = sanitizePlainText(body.fullName ?? body.name, MAX_NAME);
    const email = sanitizeEmail(body.email);
    const message = sanitizePlainText(body.message, MAX_MESSAGE);

    if (!fullName || fullName.length < 2) {
      return Helper.response(false, "Please enter your full name (at least 2 characters).", {}, res, 200);
    }
    if (!email) {
      return Helper.response(false, "Please enter a valid work email address.", {}, res, 200);
    }
    if (!message || message.length < 10) {
      return Helper.response(false, "Please enter a message (at least 10 characters).", {}, res, 200);
    }

    const ua = sanitizePlainText(req.headers["user-agent"] || "", 512);

    await LandingContactSubmission.create({
      fullName,
      email,
      message,
      ipAddress: ipKey === "unknown" ? null : ipKey,
      userAgent: ua || null,
    });

    bucket.count += 1;
    return Helper.response(true, "Thank you — your message has been received.", {}, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};
