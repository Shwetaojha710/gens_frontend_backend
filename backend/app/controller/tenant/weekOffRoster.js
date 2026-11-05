const moment = require("moment");
const xlsx = require("xlsx");
const fs = require("fs");
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const WeekOff = require("../../helper/weekOff");
const Roster = require("../../models/employeeWeekOffRoster");
const empPersonal = require("../../models/empPersonal");
const Shift = require("../../models/shift");

const normType = (t) => {
  const s = String(t || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (["WO", "WEEK OFF", "WEEKOFF", "W/OFF", "WEEK-OFF", "OFF"].includes(s)) return "WO";
  if (["WORKING", "W", "WORK", "WD"].includes(s)) return "WORKING";
  return null;
};
const isValidDate = (d) => !!d && moment(d, "YYYY-MM-DD", true).isValid();
const branchMissing = (branchId) => !branchId || branchId == "null";

/**
 * POST /api/weekoff/roster/list
 * body: { fromDate, toDate, employeeId? }  (tenant/branch from token)
 * Returns branch employees with fixed week_off_days, shift week-off days,
 * roster overrides and the final week-off dates in the range.
 */
exports.listRoster = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    if (branchMissing(branchId)) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const { fromDate, toDate, employeeId } = req.body || {};
    if (!isValidDate(fromDate) || !isValidDate(toDate) || moment(toDate).isBefore(fromDate)) {
      return Helper.response(false, "Valid fromDate and toDate (YYYY-MM-DD) required", {}, res, 200);
    }
    if (moment(toDate).diff(moment(fromDate), "days") > 62) {
      return Helper.response(false, "Date range cannot exceed 62 days", {}, res, 200);
    }

    const empWhere = { tenantId, branchId, status: "active" };
    if (employeeId) empWhere.id = employeeId;
    const employees = await empPersonal.findAll({
      where: empWhere,
      attributes: ["id", "firstName", "lastName", "empCode", "shift_id", "week_off_days"],
      order: [["firstName", "ASC"]],
      raw: true,
    });
    if (!employees.length) return Helper.response(true, "Week off roster", [], res, 200);

    const shifts = await Shift.findAll({
      where: { tenantId, branchId },
      attributes: ["shift", "day_of_week", "is_week_off"],
      raw: true,
    });
    const shiftOffDays = {};
    shifts.forEach((s) => {
      if (!shiftOffDays[s.shift]) shiftOffDays[s.shift] = new Set();
      if (s.is_week_off) shiftOffDays[s.shift].add(s.day_of_week);
    });

    const rosterRows = await Roster.findAll({
      where: {
        tenantId,
        employeeId: { [Op.in]: employees.map((e) => e.id) },
        date: { [Op.between]: [fromDate, toDate] },
      },
      attributes: ["id", "employeeId", "date", "type", "remark"],
      order: [["date", "ASC"]],
      raw: true,
    });
    const rosterMap = new Map();
    const rosterByEmp = new Map();
    rosterRows.forEach((r) => {
      const k = String(r.employeeId);
      if (!rosterMap.has(k)) rosterMap.set(k, new Map());
      rosterMap.get(k).set(moment(r.date).format("YYYY-MM-DD"), r.type);
      if (!rosterByEmp.has(k)) rosterByEmp.set(k, []);
      rosterByEmp.get(k).push({
        id: r.id,
        date: moment(r.date).format("YYYY-MM-DD"),
        type: r.type,
        remark: r.remark,
      });
    });

    const data = employees.map((emp) => {
      const shiftDays = [...(shiftOffDays[emp.shift_id] || [])];
      return {
        id: emp.id,
        name: [emp.firstName, emp.lastName].filter(Boolean).join(" "),
        empCode: emp.empCode,
        shift_id: emp.shift_id,
        week_off_days: WeekOff.getFixedWeekOffDays(emp),
        shift_week_off_days: shiftDays,
        roster: rosterByEmp.get(String(emp.id)) || [],
        week_off_dates: WeekOff.getWeekOffDates({
          emp,
          from: fromDate,
          to: toDate,
          rosterMap,
          shiftIsWeekOffFn: (dayName) => shiftDays.includes(dayName),
        }),
      };
    });

    return Helper.response(true, "Week off roster", data, res, 200);
  } catch (error) {
    console.error("listRoster error:", error);
    return Helper.response(false, error?.message || "Something went wrong", {}, res, 500);
  }
};

/** Upserts [{employeeId, date, type, remark}] for the branch. Empty type removes the override. */
const saveEntries = async ({ tenantId, branchId, userId, entries }) => {
  const ids = [...new Set(entries.map((e) => e && e.employeeId).filter(Boolean).map(String))];
  const validEmps = ids.length
    ? await empPersonal.findAll({
        where: { tenantId, branchId, id: { [Op.in]: ids } },
        attributes: ["id"],
        raw: true,
      })
    : [];
  const validSet = new Set(validEmps.map((e) => String(e.id)));

  let saved = 0;
  let removed = 0;
  const errors = [];
  for (const e of entries) {
    if (!e || !e.employeeId || !validSet.has(String(e.employeeId))) {
      errors.push({ ...(e || {}), error: "Invalid employee" });
      continue;
    }
    if (!isValidDate(e.date)) {
      errors.push({ ...e, error: "Invalid date" });
      continue;
    }
    const type = e.type ? normType(e.type) : null;
    if (e.type && !type) {
      errors.push({ ...e, error: "type must be WO or WORKING" });
      continue;
    }
    const where = { tenantId, employeeId: e.employeeId, date: e.date };
    if (!type) {
      removed += await Roster.destroy({ where });
      continue;
    }
    const existing = await Roster.findOne({ where });
    if (existing) {
      await existing.update({
        type,
        remark: e.remark !== undefined ? e.remark : existing.remark,
        branchId,
        updatedBy: userId,
      });
    } else {
      await Roster.create({
        ...where,
        branchId,
        type,
        remark: e.remark || null,
        createdBy: userId,
        updatedBy: userId,
      });
    }
    saved++;
  }
  return { saved, removed, errors };
};

/**
 * POST /api/weekoff/roster/save
 * body: { entries: [{ employeeId, date: 'YYYY-MM-DD', type: 'WO'|'WORKING'|null, remark }] }
 */
exports.saveRoster = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    if (branchMissing(branchId)) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (!entries.length) return Helper.response(false, "entries required", {}, res, 200);
    if (entries.length > 5000) {
      return Helper.response(false, "Max 5000 entries at once", {}, res, 200);
    }
    const result = await saveEntries({ tenantId, branchId, userId: req.users?.id, entries });
    return Helper.response(true, "Week off roster saved", result, res, 200);
  } catch (error) {
    console.error("saveRoster error:", error);
    return Helper.response(false, error?.message || "Something went wrong", {}, res, 500);
  }
};

/** POST /api/weekoff/roster/delete  body: { id } or { employeeId, date } */
exports.deleteRoster = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const { id, employeeId, date } = req.body || {};
    const where = { tenantId };
    if (!branchMissing(branchId)) where.branchId = branchId;
    if (id) where.id = id;
    else if (employeeId && isValidDate(date)) Object.assign(where, { employeeId, date });
    else return Helper.response(false, "id or employeeId + date required", {}, res, 200);
    const count = await Roster.destroy({ where });
    return Helper.response(true, count ? "Deleted" : "Nothing to delete", { count }, res, 200);
  } catch (error) {
    console.error("deleteRoster error:", error);
    return Helper.response(false, error?.message || "Something went wrong", {}, res, 500);
  }
};

const parseExcelDate = (v) => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return moment(v).format("YYYY-MM-DD");
  if (typeof v === "number") {
    const p = xlsx.SSF.parse_date_code(v);
    return p ? moment({ y: p.y, M: p.m - 1, d: p.d }).format("YYYY-MM-DD") : null;
  }
  const m = moment(String(v).trim(), ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY"], true);
  return m.isValid() ? m.format("YYYY-MM-DD") : null;
};

/**
 * POST /api/weekoff/roster/upload  (multipart field "file")
 * Columns: EmpCode | Date | Type (WO / WORKING / blank = remove) | Remark
 */
exports.uploadRoster = async (req, res) => {
  const filePath = req.file?.path;
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    if (branchMissing(branchId)) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!req.file) return Helper.response(false, "No file uploaded", null, res, 400);

    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      raw: true,
    });
    if (rows.length <= 1) return Helper.response(false, "Excel file is empty", null, res, 400);

    const dataRows = rows.slice(1);
    const codes = [
      ...new Set(dataRows.map((r) => r && r[0]).filter(Boolean).map((c) => String(c).trim())),
    ];
    const emps = codes.length
      ? await empPersonal.findAll({
          where: { tenantId, branchId, empCode: { [Op.in]: codes } },
          attributes: ["id", "empCode"],
          raw: true,
        })
      : [];
    const byCode = new Map(emps.map((e) => [String(e.empCode).trim(), e.id]));

    const entries = [];
    const errors = [];
    dataRows.forEach((r, idx) => {
      if (!r || !r[0]) return;
      const code = String(r[0]).trim();
      const date = parseExcelDate(r[1]);
      const employeeId = byCode.get(code);
      if (!employeeId) {
        errors.push({ row: idx + 2, empCode: code, error: "Employee not found" });
        return;
      }
      if (!date) {
        errors.push({ row: idx + 2, empCode: code, error: "Invalid date" });
        return;
      }
      entries.push({
        employeeId,
        date,
        type: r[2] ? String(r[2]) : null,
        remark: r[3] ? String(r[3]) : null,
      });
    });

    const result = entries.length
      ? await saveEntries({ tenantId, branchId, userId: req.users?.id, entries })
      : { saved: 0, removed: 0, errors: [] };
    result.errors = [...errors, ...result.errors];
    return Helper.response(true, "Week off roster uploaded", result, res, 200);
  } catch (error) {
    console.error("uploadRoster error:", error);
    return Helper.response(false, error?.message || "Something went wrong", {}, res, 500);
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
};
