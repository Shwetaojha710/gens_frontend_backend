/**
 * Projects & timesheets — entry rules, timer, approval, attendance
 * reconciliation and reports. Shared by the HR controller (Admin auth) and
 * the employee portal controller (AppAdmin auth).
 *
 * Attendance and timesheets stay separate: this module only *reads*
 * attendance / leave / holidays to compare them with logged hours.
 */
const { Op } = require("sequelize");
const moment = require("moment-timezone");
const sequelize = require("../connection/connection");
const empPersonal = require("../models/empPersonal");
const Department = require("../models/department");
const Attendance = require("../models/attendance");
const LeaveApplication = require("../models/leave_application");
const Holiday = require("../models/holiday");
const PtClient = require("../models/pt_client");
const PtProject = require("../models/pt_project");
const PtAllocation = require("../models/pt_allocation");
const PtTask = require("../models/pt_task");
const PtTimesheet = require("../models/pt_timesheet");
const PtTimeEntry = require("../models/pt_time_entry");
const PtSetting = require("../models/pt_setting");

/** A rule violation whose message is safe to show the user. */
class PtValidationError extends Error {}

const TZ = "Asia/Kolkata";
const EDITABLE = ["draft", "rejected"];
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
// holidays.status is nullable; NULL means active
const ACTIVE_HOLIDAY = { [Op.or]: [{ status: null }, { status: { [Op.ne]: "inactive" } }] };

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const todayIST = () => moment().tz(TZ).format("YYYY-MM-DD");
const fullName = (e) => [e?.firstName, e?.lastName].filter(Boolean).join(" ").trim();
const isDate = (d) => !!d && moment(d, "YYYY-MM-DD", true).isValid();

/** Monday of the ISO week containing `date`. */
function weekStartOf(date) {
  return moment(date, "YYYY-MM-DD").isoWeekday(1).format("YYYY-MM-DD");
}

function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => moment(weekStart).add(i, "days").format("YYYY-MM-DD"));
}

function datesBetween(from, to) {
  const out = [];
  for (let d = moment(from); d.isSameOrBefore(to, "day"); d.add(1, "day")) out.push(d.format("YYYY-MM-DD"));
  return out;
}

/**
 * Hours between attendance check-in and check-out.
 * Same parsing rules as attendance.js timeDiffHours: values may be "HH:MM",
 * "HH:MM:SS" or "YYYY-MM-DD HH:MM[:SS]".
 */
function attendanceHours(inTime, outTime) {
  if (!inTime || !outTime) return null;
  const timePart = (t) => (String(t).includes(" ") ? String(t).trim().split(" ")[1] : String(t));
  const [ih, im] = timePart(inTime).split(":").map(Number);
  const [oh, om] = timePart(outTime).split(":").map(Number);
  if ([ih, im, oh, om].some((n) => Number.isNaN(n))) return null;
  const diff = oh * 60 + om - (ih * 60 + im);
  return diff > 0 ? round2(diff / 60) : 0;
}

async function getSettings(tenantId) {
  const [row] = await PtSetting.findOrCreate({
    where: { tenantId },
    defaults: { tenantId, workingDays: DEFAULT_WORKING_DAYS, hoursPerDay: 8, reconcileToleranceHours: 0.5 },
  });
  const s = row.get({ plain: true });
  return {
    ...s,
    workingDays: Array.isArray(s.workingDays) && s.workingDays.length ? s.workingDays : DEFAULT_WORKING_DAYS,
    hoursPerDay: Number(s.hoursPerDay),
    reconcileToleranceHours: Number(s.reconcileToleranceHours),
  };
}

// ───────────────────────────── rates & billing ─────────────────────────────

function ratesFor(project, allocation) {
  return {
    billRate: num(allocation?.billRate) ?? num(project.defaultBillRate) ?? 0,
    costRate: num(allocation?.costRate) ?? num(project.defaultCostRate) ?? 0,
  };
}

/** Whether hours may be billed: project, member and task must all allow it. */
function canBill(project, allocation, task) {
  if (project.billingType === "non_billable") return false;
  if (allocation && allocation.isBillable === false) return false;
  if (task && task.isBillable === false) return false;
  return true;
}

/** Active allocation of the employee on the project covering `date`. */
async function allocationOn(projectId, employeeId, date) {
  const rows = await PtAllocation.findAll({ where: { projectId, employeeId, status: "active" }, raw: true });
  return rows.find((a) => (!a.startDate || a.startDate <= date) && (!a.endDate || a.endDate >= date)) || null;
}

// ───────────────────────────── team & tasks ─────────────────────────────

/** Add or update a member's allocation; one active allocation per member per project. */
async function saveAllocation({ project, payload, actorId }) {
  const percent = num(payload.allocationPercent) ?? 100;
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw new PtValidationError("Allocation must be 1–100%");
  if (payload.startDate && !isDate(payload.startDate)) throw new PtValidationError("Invalid start date");
  if (payload.endDate && !isDate(payload.endDate)) throw new PtValidationError("Invalid end date");
  if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) throw new PtValidationError("End date is before start date");
  for (const k of ["billRate", "costRate"]) {
    if (num(payload[k]) !== null && num(payload[k]) < 0) throw new PtValidationError("Rates cannot be negative");
  }
  const fields = {
    role: payload.role ? String(payload.role).trim() : null,
    allocationPercent: percent,
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    isBillable: payload.isBillable !== false,
    billRate: num(payload.billRate),
    costRate: num(payload.costRate),
    updatedBy: actorId,
  };
  if (payload.id) {
    const row = await PtAllocation.findOne({ where: { id: payload.id, projectId: project.id } });
    if (!row) throw new PtValidationError("Allocation not found");
    return row.update(fields);
  }
  const emp = await empPersonal.findOne({ where: { id: payload.employeeId, tenantId: project.tenantId, status: "active" }, raw: true });
  if (!emp) throw new PtValidationError("Select an active employee");
  const dupe = await PtAllocation.findOne({ where: { projectId: project.id, employeeId: emp.id, status: "active" } });
  if (dupe) throw new PtValidationError(`${fullName(emp)} is already on this project; edit their allocation instead`);
  return PtAllocation.create({ ...fields, tenantId: project.tenantId, projectId: project.id, employeeId: emp.id, status: "active", createdBy: actorId });
}

/** Removing keeps logged hours; the member just can't log new time. */
async function removeAllocation({ project, allocationId, actorId }) {
  const row = await PtAllocation.findOne({ where: { id: allocationId, projectId: project.id, status: "active" } });
  if (!row) throw new PtValidationError("Allocation not found");
  await row.update({ status: "removed", updatedBy: actorId });
}

async function saveTask({ project, payload, actorId }) {
  const title = String(payload.title || "").trim();
  if (!title) throw new PtValidationError("Task title is required");
  const est = num(payload.estimatedHours);
  if (est !== null && est < 0) throw new PtValidationError("Estimate cannot be negative");
  if (payload.dueDate && !isDate(payload.dueDate)) throw new PtValidationError("Invalid due date");
  if (!["todo", "in_progress", "done", undefined, null, ""].includes(payload.status)) throw new PtValidationError("Invalid status");
  if (payload.parentId) {
    const parent = await PtTask.findOne({ where: { id: payload.parentId, projectId: project.id }, raw: true });
    if (!parent) throw new PtValidationError("Parent task not found");
    if (parent.parentId) throw new PtValidationError("Subtasks cannot have their own subtasks");
    if (payload.id && payload.id === parent.id) throw new PtValidationError("A task cannot be its own parent");
  }
  if (payload.assigneeId) {
    const member = await PtAllocation.findOne({ where: { projectId: project.id, employeeId: payload.assigneeId, status: "active" } });
    if (!member) throw new PtValidationError("Assign the task to a project member");
  }
  const fields = {
    title,
    description: payload.description || null,
    parentId: payload.parentId || null,
    assigneeId: payload.assigneeId || null,
    estimatedHours: est,
    dueDate: payload.dueDate || null,
    status: payload.status || "todo",
    isBillable: payload.isBillable !== false,
    updatedBy: actorId,
  };
  if (payload.id) {
    const row = await PtTask.findOne({ where: { id: payload.id, projectId: project.id } });
    if (!row) throw new PtValidationError("Task not found");
    if (fields.parentId && (await PtTask.count({ where: { parentId: row.id } }))) {
      throw new PtValidationError("This task has subtasks, so it cannot become a subtask");
    }
    return row.update(fields);
  }
  return PtTask.create({ ...fields, tenantId: project.tenantId, projectId: project.id, createdBy: actorId });
}

/** Deletes a task (and its subtasks) only when no time has been logged against them. */
async function deleteTask({ project, taskId }) {
  const task = await PtTask.findOne({ where: { id: taskId, projectId: project.id } });
  if (!task) throw new PtValidationError("Task not found");
  const ids = [task.id, ...(await PtTask.findAll({ where: { parentId: task.id }, attributes: ["id"], raw: true })).map((t) => t.id)];
  if (await PtTimeEntry.count({ where: { taskId: { [Op.in]: ids } } })) {
    throw new PtValidationError("Time is logged against this task; mark it done instead");
  }
  await PtTask.destroy({ where: { id: { [Op.in]: ids } } });
}

// ───────────────────────────── timesheets ─────────────────────────────

async function ensureTimesheet(employee, weekStart, transaction) {
  const [ts] = await PtTimesheet.findOrCreate({
    where: { employeeId: employee.id, weekStart },
    defaults: { tenantId: employee.tenantId, branchId: employee.branchId, employeeId: employee.id, weekStart, status: "draft" },
    transaction,
  });
  return ts;
}

async function recomputeTimesheet(timesheetId, transaction) {
  const entries = await PtTimeEntry.findAll({ where: { timesheetId }, attributes: ["hours", "isBillable"], raw: true, transaction });
  const total = round2(entries.reduce((s, e) => s + Number(e.hours || 0), 0));
  const billable = round2(entries.filter((e) => e.isBillable).reduce((s, e) => s + Number(e.hours || 0), 0));
  await PtTimesheet.update({ totalHours: total, billableHours: billable }, { where: { id: timesheetId }, transaction });
}

/**
 * Validates an entry and returns the resolved project / task / allocation.
 * `hours` may be 0 only for a timer that is about to start.
 */
async function checkEntry({ employee, projectId, taskId, date, hours, excludeEntryId, allowZero }) {
  if (!isDate(date)) throw new PtValidationError("Select a valid date");
  if (date > todayIST()) throw new PtValidationError("You cannot log time for a future date");
  const h = num(hours);
  if (h === null || h < 0 || (!allowZero && h === 0)) throw new PtValidationError("Hours must be greater than zero");
  if (h > 24) throw new PtValidationError("Hours cannot exceed 24");
  if (Math.abs(Math.round(h * 100) - h * 100) > 1e-6) throw new PtValidationError("Use at most two decimals for hours");

  const project = await PtProject.findOne({ where: { id: projectId, tenantId: employee.tenantId }, raw: true });
  if (!project) throw new PtValidationError("Select a project");
  if (project.status !== "active") throw new PtValidationError(`${project.name} is not active`);
  if ((project.startDate && date < project.startDate) || (project.endDate && date > project.endDate)) {
    throw new PtValidationError(`${project.name} runs ${project.startDate || "…"} to ${project.endDate || "…"}`);
  }
  const allocation = await allocationOn(project.id, employee.id, date);
  if (!allocation) throw new PtValidationError(`You are not allocated to ${project.name} on ${date}`);

  let task = null;
  if (taskId) {
    task = await PtTask.findOne({ where: { id: taskId, projectId: project.id }, raw: true });
    if (!task) throw new PtValidationError("Task does not belong to this project");
  }

  const others = await PtTimeEntry.findAll({
    where: { employeeId: employee.id, date, ...(excludeEntryId ? { id: { [Op.ne]: excludeEntryId } } : {}) },
    attributes: ["hours"],
    raw: true,
  });
  const dayTotal = others.reduce((s, e) => s + Number(e.hours || 0), 0) + h;
  if (dayTotal > 24) throw new PtValidationError(`That makes ${round2(dayTotal)} hours on ${date}; a day has 24`);

  return { project, task, allocation, hours: h };
}

async function editableTimesheet(employee, date, transaction) {
  const ts = await ensureTimesheet(employee, weekStartOf(date), transaction);
  if (!EDITABLE.includes(ts.status)) {
    throw new PtValidationError(`The week of ${ts.weekStart} is ${ts.status}; it can no longer be changed`);
  }
  return ts;
}

/** Create or update a manual entry. */
async function saveEntry({ employee, payload }) {
  const existing = payload.id
    ? await PtTimeEntry.findOne({ where: { id: payload.id, employeeId: employee.id } })
    : null;
  if (payload.id && !existing) throw new PtValidationError("Entry not found");
  if (existing?.timerStartedAt) throw new PtValidationError("Stop the timer before editing this entry");
  if (existing) {
    const oldTs = await PtTimesheet.findByPk(existing.timesheetId);
    if (!EDITABLE.includes(oldTs.status)) throw new PtValidationError(`This week is ${oldTs.status}; it can no longer be changed`);
  }

  const { project, task, allocation, hours } = await checkEntry({
    employee,
    projectId: payload.projectId,
    taskId: payload.taskId || null,
    date: payload.date,
    hours: payload.hours,
    excludeEntryId: existing?.id,
  });
  const billable = canBill(project, allocation, task) && payload.isBillable !== false;

  return sequelize.transaction(async (t) => {
    const ts = await editableTimesheet(employee, payload.date, t);
    const fields = {
      timesheetId: ts.id,
      projectId: project.id,
      taskId: task?.id || null,
      date: payload.date,
      hours,
      isBillable: billable,
      notes: payload.notes ? String(payload.notes).trim() : null,
    };
    let entry;
    if (existing) {
      const oldTimesheetId = existing.timesheetId;
      entry = await existing.update(fields, { transaction: t });
      if (oldTimesheetId !== ts.id) await recomputeTimesheet(oldTimesheetId, t);
    } else {
      entry = await PtTimeEntry.create({ ...fields, tenantId: employee.tenantId, employeeId: employee.id, source: "manual" }, { transaction: t });
    }
    await recomputeTimesheet(ts.id, t);
    return entry;
  });
}

async function deleteEntry({ employee, entryId }) {
  const entry = await PtTimeEntry.findOne({ where: { id: entryId, employeeId: employee.id } });
  if (!entry) throw new PtValidationError("Entry not found");
  const ts = await PtTimesheet.findByPk(entry.timesheetId);
  if (!EDITABLE.includes(ts.status)) throw new PtValidationError(`This week is ${ts.status}; it can no longer be changed`);
  await sequelize.transaction(async (t) => {
    await entry.destroy({ transaction: t });
    await recomputeTimesheet(ts.id, t);
  });
}

// ───────────────────────────── timer ─────────────────────────────

async function runningTimer(employeeId) {
  return PtTimeEntry.findOne({ where: { employeeId, timerStartedAt: { [Op.ne]: null } } });
}

async function startTimer({ employee, payload }) {
  if (await runningTimer(employee.id)) throw new PtValidationError("A timer is already running; stop it first");
  const date = todayIST();
  const { project, task, allocation } = await checkEntry({
    employee,
    projectId: payload.projectId,
    taskId: payload.taskId || null,
    date,
    hours: 0,
    allowZero: true,
  });
  return sequelize.transaction(async (t) => {
    const ts = await editableTimesheet(employee, date, t);
    return PtTimeEntry.create(
      {
        tenantId: employee.tenantId,
        timesheetId: ts.id,
        employeeId: employee.id,
        projectId: project.id,
        taskId: task?.id || null,
        date,
        hours: 0,
        isBillable: canBill(project, allocation, task) && payload.isBillable !== false,
        notes: payload.notes ? String(payload.notes).trim() : null,
        source: "timer",
        timerStartedAt: new Date(),
      },
      { transaction: t },
    );
  });
}

/**
 * Stops the running timer and books the elapsed time on the start day,
 * capped so the day never exceeds 24 hours. A sub-minute run is discarded.
 */
async function stopTimer({ employee, now = new Date() }) {
  const entry = await runningTimer(employee.id);
  if (!entry) throw new PtValidationError("No timer is running");
  const elapsed = (now.getTime() - new Date(entry.timerStartedAt).getTime()) / 3600000;
  const others = await PtTimeEntry.findAll({
    where: { employeeId: employee.id, date: entry.date, id: { [Op.ne]: entry.id } },
    attributes: ["hours"],
    raw: true,
  });
  const room = 24 - others.reduce((s, e) => s + Number(e.hours || 0), 0);
  const hours = round2(Math.max(0, Math.min(elapsed, room)));

  return sequelize.transaction(async (t) => {
    if (hours < 0.02 && Number(entry.hours || 0) === 0) {
      await entry.destroy({ transaction: t });
      await recomputeTimesheet(entry.timesheetId, t);
      return { discarded: true, hours: 0 };
    }
    await entry.update({ hours: round2(Number(entry.hours || 0) + hours), timerStartedAt: null }, { transaction: t });
    await recomputeTimesheet(entry.timesheetId, t);
    return { discarded: false, hours, entry };
  });
}

// ───────────────────────────── submit & approve ─────────────────────────────

async function submitWeek({ employee, weekStart }) {
  if (!isDate(weekStart) || weekStartOf(weekStart) !== weekStart) throw new PtValidationError("Invalid week");
  const ts = await PtTimesheet.findOne({ where: { employeeId: employee.id, weekStart } });
  if (!ts) throw new PtValidationError("Log some time before submitting this week");
  if (!EDITABLE.includes(ts.status)) throw new PtValidationError(`This week is already ${ts.status}`);
  if (await PtTimeEntry.count({ where: { timesheetId: ts.id, timerStartedAt: { [Op.ne]: null } } })) {
    throw new PtValidationError("Stop the running timer before submitting");
  }
  await recomputeTimesheet(ts.id);
  await ts.reload();
  if (Number(ts.totalHours) <= 0) throw new PtValidationError("Log some time before submitting this week");
  await ts.update({
    status: "submitted",
    submittedAt: new Date(),
    approverId: employee.reportingPersonId || null,
    decidedBy: null,
    decidedByName: null,
    decidedAt: null,
    comments: null,
  });
  return ts;
}

async function actOnTimesheet({ timesheet, action, comments, actor }) {
  if (timesheet.status !== "submitted") throw new PtValidationError("Timesheet is not awaiting approval");
  if (!["approved", "rejected"].includes(action)) throw new PtValidationError("Invalid action");
  if (action === "rejected" && !String(comments || "").trim()) throw new PtValidationError("Add a reason for the rejection");
  await timesheet.update({
    status: action,
    decidedBy: actor.id,
    decidedByName: actor.name,
    decidedAt: new Date(),
    comments: comments || null,
  });
}

// ───────────────────────────── reconciliation ─────────────────────────────

/**
 * Per employee per day: attendance hours, leave, holiday and logged hours,
 * with flags where they disagree. Read-only on attendance.
 */
async function reconcile({ tenantId, employees, from, to, settings }) {
  const ids = employees.map((e) => e.id);
  if (!ids.length) return [];
  const [attendance, leaves, holidays, entries] = await Promise.all([
    Attendance.findAll({
      where: { tenantId, employeeId: { [Op.in]: ids }, date: { [Op.between]: [from, to] } },
      attributes: ["employeeId", "date", "check_in_time", "check_out_time", "is_present"],
      raw: true,
    }),
    LeaveApplication.findAll({
      where: { employeeId: { [Op.in]: ids }, status: "approved", fromDate: { [Op.lte]: to }, toDate: { [Op.gte]: from } },
      attributes: ["employeeId", "fromDate", "toDate", "duration_type"],
      raw: true,
    }),
    Holiday.findAll({
      where: { tenantId, date: { [Op.between]: [from, to] }, ...ACTIVE_HOLIDAY },
      attributes: ["date", "branchId", "holiday_name"],
      raw: true,
    }),
    PtTimeEntry.findAll({
      where: { employeeId: { [Op.in]: ids }, date: { [Op.between]: [from, to] } },
      attributes: ["employeeId", "date", "hours"],
      raw: true,
    }),
  ]);

  const tol = settings.reconcileToleranceHours;
  const rows = [];
  for (const emp of employees) {
    for (const date of datesBetween(from, to)) {
      const att = attendance.find((a) => a.employeeId === emp.id && String(a.date) === date);
      const attHours = att ? attendanceHours(att.check_in_time, att.check_out_time) : null;
      const present = !!att && (att.is_present || !!att.check_in_time);
      const leave = leaves.find((l) => l.employeeId === emp.id && l.fromDate <= date && l.toDate >= date);
      const holiday = holidays.find((h) => String(h.date) === date && (!h.branchId || h.branchId === emp.branchId));
      const logged = round2(
        entries.filter((e) => e.employeeId === emp.id && String(e.date) === date).reduce((s, e) => s + Number(e.hours || 0), 0),
      );
      const workingDay = settings.workingDays.includes(moment(date).isoWeekday()) && !holiday;

      const flags = [];
      if (logged > 0 && leave && leave.duration_type === "full") flags.push({ type: "logged_on_leave", message: "Time logged on a full-day leave" });
      if (logged > 0 && !present && !leave) flags.push({ type: "logged_without_attendance", message: "Time logged but no attendance" });
      if (attHours !== null && logged > attHours + tol) {
        flags.push({ type: "over_attendance", message: `Logged ${logged}h but attended ${attHours}h` });
      }
      if (present && workingDay && logged === 0 && date < todayIST()) flags.push({ type: "missing_timesheet", message: "Present but no time logged" });

      if (logged || present || leave || flags.length) {
        rows.push({
          employeeId: emp.id,
          date,
          attendanceHours: attHours,
          present,
          leave: leave ? leave.duration_type : null,
          holiday: holiday?.holiday_name || null,
          logged,
          flags,
        });
      }
    }
  }
  return rows;
}

// ───────────────────────────── read models ─────────────────────────────

async function lookups(tenantId, employeeIds) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  const [emps, departments, clients] = await Promise.all([
    ids.length
      ? empPersonal.findAll({
          where: { tenantId, id: { [Op.in]: ids } },
          attributes: ["id", "firstName", "lastName", "empCode", "departmentId", "reportingPersonId", "branchId"],
          raw: true,
        })
      : [],
    Department.findAll({ where: { tenantId }, attributes: ["id", "name"], raw: true }),
    PtClient.findAll({ where: { tenantId }, attributes: ["id", "name"], raw: true }),
  ]);
  return {
    people: Object.fromEntries(emps.map((e) => [e.id, { ...e, name: fullName(e) }])),
    departments: Object.fromEntries(departments.map((d) => [d.id, d.name])),
    clients: Object.fromEntries(clients.map((c) => [c.id, c.name])),
  };
}

/** Entries that count in reports: submitted + approved weeks, or approved only. */
async function reportEntries(where, approvedOnly) {
  const entries = await PtTimeEntry.findAll({ where: { ...where, timerStartedAt: null }, raw: true });
  if (!entries.length) return [];
  const sheets = await PtTimesheet.findAll({
    where: { id: { [Op.in]: [...new Set(entries.map((e) => e.timesheetId))] } },
    attributes: ["id", "status"],
    raw: true,
  });
  const ok = new Set(sheets.filter((s) => (approvedOnly ? s.status === "approved" : ["submitted", "approved"].includes(s.status))).map((s) => s.id));
  return entries.filter((e) => ok.has(e.timesheetId)).map((e) => ({ ...e, hours: Number(e.hours) }));
}

function budgetStatus(used, budget) {
  if (!budget) return null;
  const pct = round2((used / budget) * 100);
  return { used: round2(used), budget: Number(budget), pct, state: pct > 100 ? "over" : pct >= 80 ? "warning" : "ok" };
}

/** Hours, money and budget figures for a set of projects from report entries. */
async function projectFigures(projects, entries) {
  if (!projects.length) return [];
  const ids = projects.map((p) => p.id);
  const [allocations, tasks] = await Promise.all([
    PtAllocation.findAll({ where: { projectId: { [Op.in]: ids } }, raw: true }),
    PtTask.findAll({ where: { projectId: { [Op.in]: ids } }, attributes: ["id", "projectId", "parentId", "estimatedHours"], raw: true }),
  ]);
  return projects.map((p) => {
    const mine = entries.filter((e) => e.projectId === p.id);
    let billableValue = 0;
    let cost = 0;
    for (const e of mine) {
      const alloc = allocations.find((a) => a.projectId === p.id && a.employeeId === e.employeeId);
      const r = ratesFor(p, alloc);
      if (e.isBillable) billableValue += e.hours * r.billRate;
      cost += e.hours * r.costRate;
    }
    const actualHours = round2(mine.reduce((s, e) => s + e.hours, 0));
    const billableHours = round2(mine.filter((e) => e.isBillable).reduce((s, e) => s + e.hours, 0));
    // Subtasks roll up into their parent's estimate only when the parent has none
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const estimatedHours = round2(
      projectTasks.reduce((s, t) => {
        const est = Number(t.estimatedHours || 0);
        if (!t.parentId) return s + est;
        const parent = projectTasks.find((x) => x.id === t.parentId);
        return parent && Number(parent.estimatedHours || 0) > 0 ? s : s + est;
      }, 0),
    );
    // T&M budgets cap what the client is billed; fixed / internal budgets cap cost
    const amountUsed = p.billingType === "time_material" ? billableValue : cost;
    return {
      projectId: p.id,
      actualHours,
      billableHours,
      nonBillableHours: round2(actualHours - billableHours),
      estimatedHours,
      billableValue: round2(billableValue),
      cost: round2(cost),
      hoursBudget: budgetStatus(actualHours, num(p.budgetHours)),
      amountBudget: budgetStatus(amountUsed, num(p.budgetAmount)),
      members: allocations.filter((a) => a.projectId === p.id && a.status === "active").length,
    };
  });
}

/** Project with members, task tree (with actual hours) and figures. */
async function buildProjectDetail(project, { from, to, approvedOnly } = {}) {
  const p = project.get ? project.get({ plain: true }) : project;
  const [allocations, tasks] = await Promise.all([
    PtAllocation.findAll({ where: { projectId: p.id }, order: [["createdAt", "ASC"]], raw: true }),
    PtTask.findAll({ where: { projectId: p.id }, order: [["createdAt", "ASC"]], raw: true }),
  ]);
  const where = { projectId: p.id };
  if (from || to) where.date = { [Op.between]: [from || "1900-01-01", to || "2999-12-31"] };
  const entries = await reportEntries(where, approvedOnly);
  const maps = await lookups(p.tenantId, [p.managerId, ...allocations.map((a) => a.employeeId), ...tasks.map((t) => t.assigneeId), ...entries.map((e) => e.employeeId)]);
  const [figures] = await projectFigures([p], entries);

  const taskHours = (id) => round2(entries.filter((e) => e.taskId === id).reduce((s, e) => s + e.hours, 0));
  const withHours = tasks.map((t) => ({
    ...t,
    estimatedHours: num(t.estimatedHours),
    actualHours: taskHours(t.id),
    assigneeName: maps.people[t.assigneeId]?.name || "",
  }));
  const tree = withHours
    .filter((t) => !t.parentId)
    .map((t) => {
      const subtasks = withHours.filter((s) => s.parentId === t.id);
      return { ...t, subtasks, rolledActual: round2(t.actualHours + subtasks.reduce((s, x) => s + x.actualHours, 0)) };
    });

  const members = allocations.map((a) => {
    const mine = entries.filter((e) => e.employeeId === a.employeeId);
    return {
      ...a,
      employeeName: maps.people[a.employeeId]?.name || "",
      empCode: maps.people[a.employeeId]?.empCode || "",
      billRate: num(a.billRate),
      costRate: num(a.costRate),
      hours: round2(mine.reduce((s, e) => s + e.hours, 0)),
      billableHours: round2(mine.filter((e) => e.isBillable).reduce((s, e) => s + e.hours, 0)),
    };
  });

  const weekly = {};
  for (const e of entries) {
    const w = weekStartOf(String(e.date));
    weekly[w] = round2((weekly[w] || 0) + e.hours);
  }

  return {
    project: {
      ...p,
      budgetHours: num(p.budgetHours),
      budgetAmount: num(p.budgetAmount),
      defaultBillRate: num(p.defaultBillRate),
      defaultCostRate: num(p.defaultCostRate),
      clientName: maps.clients[p.clientId] || (p.clientId ? "" : "Internal"),
      managerName: maps.people[p.managerId]?.name || "",
    },
    figures,
    members,
    tasks: tree,
    unassignedHours: round2(entries.filter((e) => !e.taskId).reduce((s, e) => s + e.hours, 0)),
    weekly: Object.entries(weekly).sort(([a], [b]) => a.localeCompare(b)).map(([weekStart, hours]) => ({ weekStart, hours })),
  };
}

/** Projects list rows with figures (all time). */
async function projectRows(where) {
  const projects = await PtProject.findAll({ where, order: [["createdAt", "DESC"]], raw: true });
  if (!projects.length) return [];
  const entries = await reportEntries({ projectId: { [Op.in]: projects.map((p) => p.id) } });
  const figures = await projectFigures(projects, entries);
  const maps = await lookups(projects[0].tenantId, projects.map((p) => p.managerId));
  return projects.map((p, i) => ({
    ...p,
    budgetHours: num(p.budgetHours),
    budgetAmount: num(p.budgetAmount),
    clientName: maps.clients[p.clientId] || "Internal",
    managerName: maps.people[p.managerId]?.name || "",
    ...figures[i],
  }));
}

/**
 * Utilization per employee: capacity = working days in range minus
 * holidays and approved leave, × hours per day.
 */
async function utilization({ tenantId, employees, from, to, settings, approvedOnly }) {
  const ids = employees.map((e) => e.id);
  if (!ids.length) return [];
  const [entries, leaves, holidays] = await Promise.all([
    reportEntries({ employeeId: { [Op.in]: ids }, date: { [Op.between]: [from, to] } }, approvedOnly),
    LeaveApplication.findAll({
      where: { employeeId: { [Op.in]: ids }, status: "approved", fromDate: { [Op.lte]: to }, toDate: { [Op.gte]: from } },
      attributes: ["employeeId", "fromDate", "toDate", "duration_type", "to_duration_type"],
      raw: true,
    }),
    Holiday.findAll({ where: { tenantId, date: { [Op.between]: [from, to] }, ...ACTIVE_HOLIDAY }, attributes: ["date", "branchId"], raw: true }),
  ]);
  const maps = await lookups(tenantId, ids);
  const days = datesBetween(from, to);

  return employees.map((emp) => {
    let capacityDays = 0;
    for (const d of days) {
      if (!settings.workingDays.includes(moment(d).isoWeekday())) continue;
      if (holidays.some((h) => String(h.date) === d && (!h.branchId || h.branchId === emp.branchId))) continue;
      const leave = leaves.find((l) => l.employeeId === emp.id && l.fromDate <= d && l.toDate >= d);
      if (!leave) capacityDays += 1;
      else {
        const type = d === leave.fromDate ? leave.duration_type : d === leave.toDate ? leave.to_duration_type : "full";
        if (type === "first_half" || type === "second_half") capacityDays += 0.5;
      }
    }
    const mine = entries.filter((e) => e.employeeId === emp.id);
    const logged = round2(mine.reduce((s, e) => s + e.hours, 0));
    const billable = round2(mine.filter((e) => e.isBillable).reduce((s, e) => s + e.hours, 0));
    const capacity = round2(capacityDays * settings.hoursPerDay);
    const person = maps.people[emp.id] || {};
    return {
      employeeId: emp.id,
      employeeName: person.name || fullName(emp),
      empCode: person.empCode || "",
      department: maps.departments[person.departmentId] || "Unassigned",
      capacityHours: capacity,
      loggedHours: logged,
      billableHours: billable,
      nonBillableHours: round2(logged - billable),
      utilization: capacity ? round2((logged / capacity) * 100) : null,
      billableUtilization: capacity ? round2((billable / capacity) * 100) : null,
      projects: [...new Set(mine.map((e) => e.projectId))].length,
    };
  });
}

/** Timesheet with entries grouped for display and the week's reconciliation. */
async function buildTimesheetDetail(timesheet) {
  const ts = timesheet.get ? timesheet.get({ plain: true }) : timesheet;
  const entries = await PtTimeEntry.findAll({ where: { timesheetId: ts.id }, order: [["date", "ASC"]], raw: true });
  const projectIds = [...new Set(entries.map((e) => e.projectId))];
  const [projects, tasks] = await Promise.all([
    projectIds.length ? PtProject.findAll({ where: { id: { [Op.in]: projectIds } }, attributes: ["id", "name", "code"], raw: true }) : [],
    PtTask.findAll({ where: { id: { [Op.in]: entries.map((e) => e.taskId).filter(Boolean) } }, attributes: ["id", "title"], raw: true }),
  ]);
  const maps = await lookups(ts.tenantId, [ts.employeeId, ts.approverId]);
  const emp = maps.people[ts.employeeId] || { id: ts.employeeId };
  const settings = await getSettings(ts.tenantId);
  const days = weekDates(ts.weekStart);
  const reconciliation = await reconcile({ tenantId: ts.tenantId, employees: [emp], from: days[0], to: days[6], settings });

  return {
    timesheet: {
      ...ts,
      totalHours: Number(ts.totalHours),
      billableHours: Number(ts.billableHours),
      employeeName: emp.name || "",
      empCode: emp.empCode || "",
      approverName: maps.people[ts.approverId]?.name || "HR",
    },
    days,
    entries: entries.map((e) => ({
      ...e,
      hours: Number(e.hours),
      running: !!e.timerStartedAt,
      projectName: projects.find((p) => p.id === e.projectId)?.name || "",
      taskTitle: tasks.find((t) => t.id === e.taskId)?.title || "",
    })),
    reconciliation: days.map((d) => reconciliation.find((r) => r.date === d) || { date: d, logged: 0, attendanceHours: null, flags: [] }),
  };
}

module.exports = {
  PtValidationError,
  EDITABLE,
  num,
  round2,
  todayIST,
  isDate,
  weekStartOf,
  weekDates,
  attendanceHours,
  getSettings,
  canBill,
  allocationOn,
  saveAllocation,
  removeAllocation,
  saveTask,
  deleteTask,
  saveEntry,
  deleteEntry,
  runningTimer,
  startTimer,
  stopTimer,
  submitWeek,
  actOnTimesheet,
  reconcile,
  lookups,
  reportEntries,
  projectFigures,
  buildProjectDetail,
  projectRows,
  utilization,
  buildTimesheetDetail,
};
