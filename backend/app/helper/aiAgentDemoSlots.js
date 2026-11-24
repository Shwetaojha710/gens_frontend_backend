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

function resolveDateYmd(payload = {}, conversation = null) {
  const fromPayload =
    payload.date ||
    payload.dateYmd ||
    (payload.datetime && String(payload.datetime).slice(0, 10));
  if (fromPayload && /^\d{4}-\d{2}-\d{2}/.test(String(fromPayload))) {
    return String(fromPayload).slice(0, 10);
  }
  const ctx = conversation?.context?.demoPreferredDate;
  if (ctx && /^\d{4}-\d{2}-\d{2}/.test(String(ctx))) return String(ctx).slice(0, 10);
  return null;
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

function formatSlotsForReply(listResult) {
  if (!listResult) return "";
  if (listResult.message) return listResult.message;
  if (!listResult.slots?.length) return "No free demo slots for that date.";
  return `Available demo slots (${listResult.dateYmd} IST): ${listResult.slots
    .map((s) => s.label)
    .join(", ")}`;
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
  resolveDateYmd,
  listAvailableSlots,
  isSlotAvailable,
  bookDemoSlot,
  formatSlotsForReply,
};
