/**
 * Shared attendance punch used by HR UI, employee portal, and AI face service.
 *
 * Rules:
 * - First punch of the day → check_in
 * - Any later punch → always update check_out (latest out time)
 */
const attendance = require("../models/attendance");
const empPersonal = require("../models/empPersonal");
const Helper = require("./helper");
const moment = require("moment-timezone");

/**
 * @param {object} opts
 * @param {string} opts.tenantId
 * @param {string} opts.branchId
 * @param {string} [opts.employeeId]
 * @param {string} [opts.empCode]
 * @param {string} opts.datetime - "YYYY-MM-DD HH:mm:ss" IST preferred
 * @param {string} [opts.date] - YYYY-MM-DD; derived from datetime if omitted
 * @param {string} opts.ip_address
 * @param {string} [opts.imageFilename]
 * @param {'entry'|'exit'|'auto'} [opts.eventType='auto']
 * @param {string} [opts.actorId]
 * @returns {Promise<{ action: 'check_in'|'check_out', record: object }>}
 */
async function recordAttendancePunch(opts) {
  const {
    tenantId,
    branchId,
    employeeId: employeeIdIn,
    empCode,
    datetime,
    date: dateIn,
    ip_address,
    imageFilename = null,
    eventType = "auto",
    actorId = null,
  } = opts;

  if (!tenantId || !branchId) {
    throw new Error("tenantId and branchId are required");
  }
  if (!datetime) {
    throw new Error("datetime is required");
  }
  if (!ip_address) {
    throw new Error("ip_address is required");
  }

  let employeeId = employeeIdIn;
  let empType = null;
  let shift_id = null;

  if (!employeeId) {
    if (!empCode) throw new Error("employeeId or empCode is required");
    const emp = await empPersonal.findOne({
      where: { empCode, tenantId, branchId, status: "active" },
      attributes: ["id", "empType", "shift_id"],
    });
    if (!emp) throw new Error("Employee not found");
    employeeId = emp.id;
    empType = emp.empType;
    shift_id = emp.shift_id;
  } else {
    const emp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, status: "active" },
      attributes: ["id", "empType", "shift_id", "branchId"],
    });
    if (!emp) throw new Error("Employee not found");
    empType = emp.empType;
    shift_id = emp.shift_id;
  }

  const m = moment.tz(datetime, "Asia/Kolkata");
  const date = dateIn || m.format("YYYY-MM-DD");
  const month = m.month() + 1;
  const year = m.year();
  const timeStr = m.format("YYYY-MM-DD HH:mm:ss");

  let existing = await attendance.findOne({
    where: { employeeId, date, tenantId, branchId },
  });

  // No row yet
  if (!existing) {
    // Exit-first: still create presence with both in/out = now, then later outs overwrite out
    if (eventType === "exit") {
      const created = await attendance.create({
        employeeId,
        tenantId,
        branchId,
        empType,
        shift_id,
        date,
        month,
        year,
        ip_address,
        check_in_time: timeStr,
        check_out_time: timeStr,
        check_out_img: imageFilename,
        is_present: true,
        createdBy: actorId,
      });
      return { action: "check_out", record: created };
    }

    const created = await attendance.create({
      employeeId,
      tenantId,
      branchId,
      empType,
      shift_id,
      date,
      month,
      year,
      ip_address,
      check_in_time: timeStr,
      check_in_img: imageFilename,
      is_present: true,
      createdBy: actorId,
    });
    return { action: "check_in", record: created };
  }

  // Row exists → ALWAYS update check_out to latest recognition time
  await existing.update({
    check_out_time: timeStr,
    check_out_img: imageFilename || existing.check_out_img,
    is_present: true,
    ip_address,
    branchId,
    updatedBy: actorId,
  });
  return { action: "check_out", record: existing };
}

/**
 * Express-friendly wrapper matching legacy addAttendance body shape.
 */
async function addAttendanceFromRequest(req) {
  const { empCode, check_in_time, date, employeeId, eventType } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;
  const ip_address = Helper.getIpAddress(req);
  const imageFilename = req.files?.[0]?.filename || req.body?.check_in_img || null;

  return recordAttendancePunch({
    tenantId,
    branchId,
    empCode,
    employeeId,
    datetime: check_in_time,
    date,
    ip_address,
    imageFilename,
    eventType: eventType || "auto",
    actorId: req.users?.id,
  });
}

module.exports = { recordAttendancePunch, addAttendanceFromRequest };
