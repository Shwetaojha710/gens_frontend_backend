/**
 * Employee-wise flexible week off.
 *
 * Priority (highest first):
 *   1. employee_week_off_roster row for that date  ('WO' | 'WORKING')
 *   2. empPersonal.week_off_days (fixed days, e.g. ["Tuesday"])
 *   3. Shift.is_week_off for that weekday   <-- old behaviour
 *
 * Backward compatibility: when an employee has no roster rows and an empty
 * week_off_days, every function here returns the shift-based value / shift row
 * unchanged, so existing outputs stay identical.
 */
const moment = require("moment");
const { Op } = require("sequelize");

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const normalizeDayName = (d) => {
  if (d == null) return null;
  const s = String(d).trim().toLowerCase();
  return DAY_NAMES.find((n) => n.toLowerCase() === s) || null;
};

/** Parses empPersonal.week_off_days (JSONB array or JSON string) -> ["Tuesday", ...] */
const getFixedWeekOffDays = (emp) => {
  let raw = emp && emp.week_off_days;
  if (raw == null || raw === "") return [];
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch (e) {
      raw = raw.split(",");
    }
  }
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(normalizeDayName).filter(Boolean))];
};

/**
 * Cleans week_off_days coming from API (array, JSON string or "Mon,Tue" string).
 * Returns array of day names, or null when empty (=> use shift week off).
 */
const sanitizeWeekOffDays = (input) => {
  const days = getFixedWeekOffDays({ week_off_days: input });
  return days.length ? days : null;
};

const hasFixedWeekOff = (emp) => getFixedWeekOffDays(emp).length > 0;

const toDateStr = (date) =>
  moment.isMoment(date)
    ? date.format("YYYY-MM-DD")
    : moment(date).format("YYYY-MM-DD");

/**
 * Loads roster overrides in ONE query.
 * Returns Map<employeeId, Map<'YYYY-MM-DD', 'WO'|'WORKING'>>.
 * Never throws: if the table is missing (SQL not yet applied) it returns an
 * empty map so old behaviour continues.
 */
const loadRosterMap = async ({ tenantId, employeeIds, from, to }) => {
  const map = new Map();
  try {
    const Roster = require("../models/employeeWeekOffRoster");
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (employeeIds != null) {
      const ids = (Array.isArray(employeeIds) ? employeeIds : [employeeIds])
        .filter(Boolean)
        .map(String);
      if (!ids.length) return map;
      where.employeeId = { [Op.in]: ids };
    }
    if (from && to) where.date = { [Op.between]: [toDateStr(from), toDateStr(to)] };
    else if (from) where.date = toDateStr(from);
    const rows = await Roster.findAll({
      where,
      attributes: ["employeeId", "date", "type"],
      raw: true,
    });
    rows.forEach((r) => {
      const key = String(r.employeeId);
      if (!map.has(key)) map.set(key, new Map());
      map.get(key).set(toDateStr(r.date), String(r.type).toUpperCase());
    });
  } catch (err) {
    if (!loadRosterMap._warned) {
      loadRosterMap._warned = true;
      console.error(
        "weekOff.loadRosterMap failed (using shift week off only):",
        err?.parent?.message || err?.message || err,
      );
    }
  }
  return map;
};

const getRosterType = (rosterMap, employeeId, date) => {
  if (!rosterMap || employeeId == null) return null;
  const m = rosterMap.get(String(employeeId));
  if (!m) return null;
  return m.get(toDateStr(date)) || null;
};

/** True when this employee/date has any override (roster or fixed days). */
const hasOverride = ({ emp, date, rosterMap }) =>
  !!getRosterType(rosterMap, emp && emp.id, date) || hasFixedWeekOff(emp);

/**
 * Final week-off decision for one employee on one date.
 * @param {boolean} shiftIsWeekOff  the value the old code computed from the shift
 */
const resolveWeekOff = ({ emp, date, shiftIsWeekOff, rosterMap }) => {
  const rosterType = getRosterType(rosterMap, emp && emp.id, date);
  if (rosterType === "WO") return true;
  if (rosterType === "WORKING") return false;
  const fixed = getFixedWeekOffDays(emp);
  if (fixed.length) {
    const dayName = moment(toDateStr(date), "YYYY-MM-DD").format("dddd");
    return fixed.includes(dayName);
  }
  return !!shiftIsWeekOff;
};

/**
 * Picks a working-day timing row from the same shift, used when the employee
 * works on a weekday whose shift row is a week off (that row has no timing).
 * Prefers Monday..Saturday order, then any active row.
 * @param {Array|Object} shiftRows  rows of that shift (array) or {dayName: row}
 */
const getWorkingShiftTiming = (shiftRows) => {
  const rows = Array.isArray(shiftRows)
    ? shiftRows
    : Object.values(shiftRows || {});
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const usable = rows.filter(
    (r) => r && !r.is_week_off && r.startTime && r.endTime &&
      !(r.startTime === "00:00:00" && r.endTime === "00:00:00"),
  );
  if (!usable.length) return null;
  usable.sort(
    (a, b) =>
      (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) ||
      order.indexOf(a.day_of_week) - order.indexOf(b.day_of_week),
  );
  return usable[0];
};

/**
 * Returns the shift row the old code should use for this employee/date.
 * - No override            -> `shiftRow` returned AS IS (same reference).
 * - Override says OFF      -> clone marked week off (inactive, 0 hours).
 * - Override says WORKING  -> if shiftRow is already a working row it is returned
 *                             as is; otherwise a clone of a working day's timing.
 *
 * @param {Object|null} shiftRow   row the old code found for that weekday (may be null)
 * @param {Array|Object} shiftRows all rows of the employee's shift (for timing fallback)
 */
const effectiveShiftRow = ({ emp, date, shiftRow, shiftRows, rosterMap }) => {
  if (!hasOverride({ emp, date, rosterMap })) return shiftRow;

  const shiftIsWeekOff = !shiftRow || !!shiftRow.is_week_off;
  const off = resolveWeekOff({ emp, date, shiftIsWeekOff, rosterMap });
  const dayName = moment(toDateStr(date), "YYYY-MM-DD").format("dddd");

  if (off) {
    if (shiftRow && shiftRow.is_week_off) return shiftRow;
    return {
      ...(shiftRow || {}),
      day_of_week: dayName,
      is_week_off: true,
      status: "inactive",
      workingHours: 0,
      _weekOffSource: "employee",
    };
  }

  if (shiftRow && !shiftRow.is_week_off && shiftRow.status !== "inactive") {
    return shiftRow;
  }
  const timing = getWorkingShiftTiming(shiftRows) ||
    (shiftRow && shiftRow.startTime && shiftRow.endTime ? shiftRow : null);
  if (!timing) return null; // no timing anywhere -> keep old "no shift" handling
  return {
    ...timing,
    ...(shiftRow ? { id: shiftRow.id } : {}),
    day_of_week: dayName,
    is_week_off: false,
    status: "active",
    _weekOffSource: "employee",
  };
};

/**
 * Week-off date list for one employee in [from, to].
 * @param {(dayName:string, dateStr:string) => boolean} shiftIsWeekOffFn old shift check
 */
const getWeekOffDates = ({ emp, from, to, rosterMap, shiftIsWeekOffFn }) => {
  const out = [];
  const end = moment(toDateStr(to), "YYYY-MM-DD");
  for (
    let d = moment(toDateStr(from), "YYYY-MM-DD");
    d.isSameOrBefore(end, "day");
    d.add(1, "day")
  ) {
    const dateStr = d.format("YYYY-MM-DD");
    const shiftOff = !!shiftIsWeekOffFn(d.format("dddd"), dateStr);
    if (resolveWeekOff({ emp, date: dateStr, shiftIsWeekOff: shiftOff, rosterMap })) {
      out.push(dateStr);
    }
  }
  return out;
};

module.exports = {
  DAY_NAMES,
  normalizeDayName,
  getFixedWeekOffDays,
  sanitizeWeekOffDays,
  hasFixedWeekOff,
  loadRosterMap,
  getRosterType,
  hasOverride,
  resolveWeekOff,
  getWorkingShiftTiming,
  effectiveShiftRow,
  getWeekOffDates,
};
