/**
 * Demo slot calendar for WhatsApp AI Agent.
 * Office: Mon–Sat 09:00–18:30 IST; hourly starts 09:00–17:00;
 * min 60 minutes between booked starts (tenant-scoped).
 */
const moment = require("moment-timezone");
const { Op } = require("sequelize");
const sequelize = require("../connection/connection");
const AiAgentDemoSlot = require("../models/ai_agent_demo_slots");

const TZ = "Asia/Kolkata";
const SLOT_MINUTES = 60;
const MIN_GAP_MINUTES = 60;
/** Last bookable start hour (17:00 → ends 18:00, within 18:30 close). */
const FIRST_START_HOUR = 9;
const LAST_START_HOUR = 17;

function officeDayMoment(dateYmd) {
  return moment.tz(String(dateYmd).slice(0, 10), "YYYY-MM-DD", TZ);
}

function isWorkingDay(m) {
  // Sunday = 0
  return m.day() !== 0;
}

function formatSlotLabel(m) {
  return m.clone().tz(TZ).format("h:mm A") + " IST";
}

function formatSlotLong(m) {
  return m.clone().tz(TZ).format("dddd, D MMM YYYY, h:mm A") + " IST";
}

/**
 * Parse user/LLM datetime into a moment in IST.
 * Accepts ISO, "YYYY-MM-DD HH:mm", "YYYY-MM-DDThh:mm", or date+time parts.
 */
function parseScheduledAt(input, fallbackDateYmd = null) {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  let m = moment.tz(raw, moment.ISO_8601, true, TZ);
  if (!m.isValid()) {
    m = moment.tz(raw, ["YYYY-MM-DD HH:mm", "YYYY-MM-DD H:mm", "YYYY-MM-DDTHH:mm", "DD/MM/YYYY HH:mm", "D/M/YYYY H:mm A", "YYYY-MM-DD h:mm A"], true, TZ);
  }
  if (!m.isValid() && fallbackDateYmd) {
    const timeOnly = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeOnly) {
      let h = parseInt(timeOnly[1], 10);
      const min = timeOnly[2] ? parseInt(timeOnly[2], 10) : 0;
      const ap = (timeOnly[3] || "").toLowerCase();
      if (ap === "pm" && h < 12) h += 12;
      if (ap === "am" && h === 12) h = 0;
      m = officeDayMoment(fallbackDateYmd).hour(h).minute(min).second(0).millisecond(0);
    }
  }
  if (!m || !m.isValid()) return null;
  return m.tz(TZ).second(0).millisecond(0);
}

function todayYmd() {
  return moment().tz(TZ).format("YYYY-MM-DD");
}

/** Reject LLM hallucinations like 2023-10-05 — only today or future IST dates. */
function isBookableDateYmd(dateYmd) {
  if (!dateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateYmd))) return false;
  const day = officeDayMoment(dateYmd);
  if (!day.isValid()) return false;
  const today = moment().tz(TZ).startOf("day");
  return day.isSameOrAfter(today, "day");
}

/**
 * Resolve relative / local date phrases from customer text (IST).
 * Handles: aaj/today, kal/tomorrow, parso, DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD.
 */
function resolveDemoDateFromText(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  const now = moment().tz(TZ);

  if (/\b(aaj|aj|today|ajj)\b/i.test(t) || /\baaj\s*ka\b/i.test(t)) {
    return now.format("YYYY-MM-DD");
  }
  if (/\b(kal|tomorrow|tmlw)\b/i.test(t)) {
    return now.clone().add(1, "day").format("YYYY-MM-DD");
  }
  if (/\b(parso|day\s*after\s*tomorrow)\b/i.test(t)) {
    return now.clone().add(2, "day").format("YYYY-MM-DD");
  }

  // DD-MM-YYYY or DD/MM/YYYY (Indian style) — prefer over US MM/DD
  const dmy = t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
  if (dmy) {
    const ymd = `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
    if (isBookableDateYmd(ymd)) return ymd;
  }
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const ymd = `${iso[1]}-${iso[2]}-${iso[3]}`;
    if (isBookableDateYmd(ymd)) return ymd;
  }
  return null;
}

/**
 * Authoritative date for listing/booking.
 * Priority: customer text (aaj/kal/…) → valid future payload date → conversation context.
 * Never accepts past LLM hallucination dates.
 */
function resolveDateYmd(payload = {}, conversation = null, inboundText = null) {
  const fromText = resolveDemoDateFromText(inboundText);
  if (fromText) return fromText;

  const fromPayload =
    payload.date ||
    payload.dateYmd ||
    (payload.datetime && String(payload.datetime).slice(0, 10));
  if (fromPayload && isBookableDateYmd(String(fromPayload).slice(0, 10))) {
    return String(fromPayload).slice(0, 10);
  }

  const ctx = conversation?.context?.demoPreferredDate;
  if (ctx && isBookableDateYmd(String(ctx).slice(0, 10))) {
    return String(ctx).slice(0, 10);
  }
  return null;
}

function wantsDemoScheduling(text) {
  const t = String(text || "").toLowerCase();
  return /\b(demo|schedule|shedule|book|slot|appointment)\b/i.test(t);
}

async function loadBookedStarts(tenantId, rangeStart, rangeEnd) {
  const rows = await AiAgentDemoSlot.findAll({
    where: {
      tenantId,
      status: "booked",
      scheduledAt: {
        [Op.gte]: rangeStart.toDate(),
        [Op.lte]: rangeEnd.toDate(),
      },
    },
    attributes: ["id", "scheduledAt"],
    raw: true,
  });
  return rows.map((r) => moment(r.scheduledAt).tz(TZ));
}

function conflictsWith(candidate, bookedMoments) {
  const c = candidate.valueOf();
  const gapMs = MIN_GAP_MINUTES * 60 * 1000;
  return bookedMoments.some((b) => Math.abs(b.valueOf() - c) < gapMs);
}

/**
 * List available hourly slots for a calendar date (IST).
 */
async function listAvailableSlots({ tenantId, dateYmd }) {
  const day = officeDayMoment(dateYmd);
  if (!day.isValid()) {
    return { ok: false, reason: "invalid_date", dateYmd, slots: [], labels: [] };
  }
  if (!isWorkingDay(day)) {
    return {
      ok: true,
      reason: "sunday_closed",
      dateYmd,
      slots: [],
      labels: [],
      message: "We are closed on Sundays. Please choose Monday–Saturday.",
    };
  }

  const dayStart = day.clone().startOf("day");
  const dayEnd = day.clone().endOf("day");
  const booked = await loadBookedStarts(
    tenantId,
    dayStart.clone().subtract(MIN_GAP_MINUTES, "minutes"),
    dayEnd.clone().add(MIN_GAP_MINUTES, "minutes")
  );

  const now = moment().tz(TZ);
  const slots = [];
  for (let h = FIRST_START_HOUR; h <= LAST_START_HOUR; h++) {
    const start = day.clone().hour(h).minute(0).second(0).millisecond(0);
    if (start.isSameOrBefore(now)) continue;
    if (conflictsWith(start, booked)) continue;
    slots.push({
      datetime: start.toISOString(),
      local: start.format("YYYY-MM-DD HH:mm"),
      label: formatSlotLabel(start),
      labelLong: formatSlotLong(start),
    });
  }

  return {
    ok: true,
    reason: slots.length ? null : "no_slots",
    dateYmd,
    slots,
    labels: slots.map((s) => s.label),
    message:
      slots.length === 0
        ? `No free demo slots on ${dateYmd}. Please try another weekday.`
        : `Available demo slots on ${dateYmd} (IST): ${slots.map((s) => s.label).join(", ")}`,
  };
}

async function isSlotAvailable({ tenantId, scheduledAt }) {
  const start = moment(scheduledAt).tz(TZ);
  if (!start.isValid()) return { ok: false, reason: "invalid_datetime" };
  if (!isWorkingDay(start)) return { ok: false, reason: "sunday_closed" };
  if (start.hour() < FIRST_START_HOUR || start.hour() > LAST_START_HOUR || start.minute() !== 0) {
    return { ok: false, reason: "outside_grid" };
  }
  if (start.isSameOrBefore(moment().tz(TZ))) {
    return { ok: false, reason: "in_past" };
  }

  const windowStart = start.clone().subtract(MIN_GAP_MINUTES, "minutes");
  const windowEnd = start.clone().add(MIN_GAP_MINUTES, "minutes");
  const booked = await loadBookedStarts(tenantId, windowStart, windowEnd);
  if (conflictsWith(start, booked)) {
    return { ok: false, reason: "conflict" };
  }
  return { ok: true, scheduledAt: start.toDate(), labelLong: formatSlotLong(start) };
}

/**
 * Book a slot with re-check inside a transaction.
 */
async function bookDemoSlot({
  tenantId,
  lead = null,
  conversation = null,
  scheduledAt,
  meta = {},
  createdBy = null,
}) {
  const start = moment(scheduledAt).tz(TZ);
  if (!start.isValid()) {
    return { ok: false, reason: "invalid_datetime" };
  }

  return sequelize.transaction(async (t) => {
    const check = await isSlotAvailable({ tenantId, scheduledAt: start });
    if (!check.ok) {
      return { ok: false, reason: check.reason };
    }

    // Re-query inside transaction for race safety
    const windowStart = start.clone().subtract(MIN_GAP_MINUTES, "minutes");
    const windowEnd = start.clone().add(MIN_GAP_MINUTES, "minutes");
    // Conflict if another booked start is strictly within 60 minutes (11:00 OK after 10:00)
    const clash = await AiAgentDemoSlot.findOne({
      where: {
        tenantId,
        status: "booked",
        scheduledAt: {
          [Op.gt]: windowStart.toDate(),
          [Op.lt]: windowEnd.toDate(),
        },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (clash) {
      return { ok: false, reason: "conflict" };
    }

    const row = await AiAgentDemoSlot.create(
      {
        tenantId,
        leadId: lead?.id || null,
        conversationId: conversation?.id || null,
        waId: lead?.waId || conversation?.waId || null,
        scheduledAt: start.toDate(),
        durationMinutes: SLOT_MINUTES,
        status: "booked",
        customerName: lead?.fullName || conversation?.customerName || null,
        phone: lead?.phone || conversation?.customerPhone || null,
        email: lead?.email || null,
        companyName: lead?.companyName || null,
        timezone: TZ,
        meta: {
          source: "whatsapp_agent",
          ...meta,
        },
        createdBy,
      },
      { transaction: t }
    );

    return {
      ok: true,
      slot: row,
      labelLong: formatSlotLong(start),
      local: start.format("YYYY-MM-DD HH:mm"),
      scheduledAt: start.toDate(),
    };
  });
}

function friendlyDateLabel(dateYmd) {
  const m = officeDayMoment(dateYmd);
  if (!m.isValid()) return dateYmd;
  const today = todayYmd();
  const tomorrow = moment().tz(TZ).add(1, "day").format("YYYY-MM-DD");
  const long = m.format("dddd, D MMM YYYY");
  if (dateYmd === today) return `today (${long})`;
  if (dateYmd === tomorrow) return `tomorrow (${long})`;
  return long;
}

function formatSlotsForReply(listResult, language = "en") {
  if (!listResult) return "";
  const ymd = listResult.dateYmd;
  const nice = friendlyDateLabel(ymd);
  const hi = language === "hi";

  if (listResult.reason === "sunday_closed") {
    return hi
      ? `${nice} Sunday hai — hum closed hain. Monday–Saturday me se koi date bataiye.`
      : `${nice} is Sunday — we are closed. Please choose a Monday–Saturday date.`;
  }
  if (!listResult.slots?.length) {
    return hi
      ? `${nice} ke liye koi free demo slot nahi bacha. Kripya dusri weekday date batayein.`
      : `No free demo slots left for ${nice}. Please try another weekday.`;
  }
  const times = listResult.slots.map((s) => s.label).join(", ");
  return hi
    ? `${nice} ke available demo slots (IST): ${times}.\nKaunsa time book karun?`
    : `Available demo slots for ${nice} (IST): ${times}.\nWhich time should I book?`;
}

/** Remove invented times / wrong dates from LLM reply before injecting engine slots. */
function stripSlotHallucinations(text) {
  return String(text || "")
    .replace(/No free demo slots[^\n]*/gi, "")
    .replace(/available (demo )?slots?[^\n]*/gi, "")
    .replace(/aaj ke liye available[^\n]*/gi, "")
    .replace(/\d{1,2}:\d{2}\s*(AM|PM)(\s*(IST)?)?/gi, "")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/[,\s]+aur[,\s]+/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = {
  TZ,
  SLOT_MINUTES,
  MIN_GAP_MINUTES,
  FIRST_START_HOUR,
  LAST_START_HOUR,
  officeDayMoment,
  isWorkingDay,
  formatSlotLabel,
  formatSlotLong,
  parseScheduledAt,
  todayYmd,
  isBookableDateYmd,
  resolveDemoDateFromText,
  resolveDateYmd,
  wantsDemoScheduling,
  listAvailableSlots,
  isSlotAvailable,
  bookDemoSlot,
  friendlyDateLabel,
  formatSlotsForReply,
  stripSlotHallucinations,
};
