/**
 * Projects & timesheets — employee portal endpoints (AppAdmin auth).
 *   employee         — logs time on projects they are allocated to, runs a timer, submits weeks
 *   project manager  — pt_projects.managerId: manages tasks and team, sees project figures
 *   reporting manager — approves submitted timesheets of direct reports
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const PtProject = require("../../models/pt_project");
const PtAllocation = require("../../models/pt_allocation");
const PtTask = require("../../models/pt_task");
const PtTimesheet = require("../../models/pt_timesheet");
const Pt = require("../../helper/projectTime");
const { writeAudit } = require("../../helper/auditLog");

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

const handler = (name, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error instanceof Pt.PtValidationError) return fail(res, error.message);
    console.error(`projectPortal.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

async function me(req) {
  return empPersonal.findOne({
    where: { id: req.users.id, tenantId: req.users.tenantId },
    attributes: ["id", "tenantId", "branchId", "reportingPersonId", "firstName", "lastName"],
    raw: true,
  });
}

/** Project the logged-in employee manages, or null. */
async function managedProject(req, id) {
  if (!id) return null;
  return PtProject.findOne({ where: { id, tenantId: req.users.tenantId, managerId: req.users.id } });
}

// ───────────────────────────── projects ─────────────────────────────

exports.myProjects = handler("myProjects", async (req, res) => {
  const allocations = await PtAllocation.findAll({ where: { employeeId: req.users.id, status: "active" }, raw: true });
  const managed = await PtProject.findAll({ where: { tenantId: req.users.tenantId, managerId: req.users.id }, attributes: ["id"], raw: true });
  const ids = [...new Set([...allocations.map((a) => a.projectId), ...managed.map((p) => p.id)])];
  const rows = ids.length ? await Pt.projectRows({ id: { [Op.in]: ids } }) : [];
  const data = rows.map((p) => {
    const isManager = p.managerId === req.users.id;
    const mine = allocations.find((a) => a.projectId === p.id);
    const base = {
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      clientName: p.clientName,
      managerName: p.managerName,
      startDate: p.startDate,
      endDate: p.endDate,
      isManager,
      myRole: mine?.role || null,
      myAllocation: mine?.allocationPercent ?? null,
    };
    // Hours figures for managers only; money stays with HR / managers in the detail view
    return isManager
      ? { ...base, actualHours: p.actualHours, estimatedHours: p.estimatedHours, budgetHours: p.budgetHours, hoursBudget: p.hoursBudget, members: p.members }
      : base;
  });
  return Helper.response(true, "Projects fetched", data, res, 200);
});

/** Managers see everything; members see tasks and team without money. */
exports.projectDetail = handler("projectDetail", async (req, res) => {
  const project = await PtProject.findOne({ where: { id: req.body?.id, tenantId: req.users.tenantId } });
  if (!project) return fail(res, "Project not found");
  const isManager = project.managerId === req.users.id;
  const member = await PtAllocation.findOne({ where: { projectId: project.id, employeeId: req.users.id, status: "active" } });
  if (!isManager && !member) return fail(res, "Project not found");

  const { from, to, approvedOnly } = req.body || {};
  const detail = await Pt.buildProjectDetail(project, { from, to, approvedOnly: !!approvedOnly });
  if (!isManager) {
    for (const k of ["budgetAmount", "defaultBillRate", "defaultCostRate"]) detail.project[k] = null;
    detail.figures = { actualHours: detail.figures.actualHours, estimatedHours: detail.figures.estimatedHours };
    detail.members = detail.members
      .filter((m) => m.status === "active")
      .map((m) => ({ id: m.id, employeeName: m.employeeName, role: m.role, status: m.status }));
  }
  detail.permissions = { canManage: isManager, canSeeMoney: isManager, canEditProject: false };
  return Helper.response(true, "Project fetched", detail, res, 200);
});

exports.saveTask = handler("saveTask", async (req, res) => {
  const project = await managedProject(req, req.body?.projectId);
  if (!project) return fail(res, "Only the project manager can change tasks");
  const row = await Pt.saveTask({ project, payload: req.body, actorId: req.users.id });
  return Helper.response(true, "Task saved", row, res, 200);
});

exports.deleteTask = handler("deleteTask", async (req, res) => {
  const project = await managedProject(req, req.body?.projectId);
  if (!project) return fail(res, "Only the project manager can change tasks");
  await Pt.deleteTask({ project, taskId: req.body.id });
  return Helper.response(true, "Task deleted", {}, res, 200);
});

exports.saveAllocation = handler("saveAllocation", async (req, res) => {
  const project = await managedProject(req, req.body?.projectId);
  if (!project) return fail(res, "Only the project manager can change the team");
  const row = await Pt.saveAllocation({ project, payload: req.body, actorId: req.users.id });
  return Helper.response(true, "Team updated", row, res, 200);
});

exports.removeAllocation = handler("removeAllocation", async (req, res) => {
  const project = await managedProject(req, req.body?.projectId);
  if (!project) return fail(res, "Only the project manager can change the team");
  await Pt.removeAllocation({ project, allocationId: req.body.id, actorId: req.users.id });
  return Helper.response(true, "Member removed", {}, res, 200);
});

/** Active colleagues, for project managers adding team members. */
exports.colleagues = handler("colleagues", async (req, res) => {
  const rows = await empPersonal.findAll({
    where: { tenantId: req.users.tenantId, status: "active" },
    attributes: ["id", "firstName", "lastName", "empCode"],
    order: [["firstName", "ASC"]],
    raw: true,
  });
  const data = rows.map((r) => ({ value: r.id, label: `${[r.firstName, r.lastName].filter(Boolean).join(" ")}${r.empCode ? ` (${r.empCode})` : ""}` }));
  return Helper.response(true, "Colleagues fetched", data, res, 200);
});

// ───────────────────────────── my week ─────────────────────────────

/** Everything the timesheet screen needs for one week. */
exports.week = handler("week", async (req, res) => {
  const employee = await me(req);
  if (!employee) return fail(res, "Employee not found");
  const weekStart = Pt.weekStartOf(Pt.isDate(req.body?.weekStart) ? req.body.weekStart : Pt.todayIST());
  const days = Pt.weekDates(weekStart);

  const allocations = await PtAllocation.findAll({
    where: {
      employeeId: employee.id,
      status: "active",
      [Op.and]: [
        { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: days[6] } }] },
        { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: days[0] } }] },
      ],
    },
    raw: true,
  });
  const projects = allocations.length
    ? await PtProject.findAll({ where: { id: { [Op.in]: allocations.map((a) => a.projectId) }, status: "active" }, raw: true })
    : [];
  const tasks = projects.length
    ? await PtTask.findAll({ where: { projectId: { [Op.in]: projects.map((p) => p.id) } }, order: [["createdAt", "ASC"]], raw: true })
    : [];
  const assignable = projects.map((p) => {
    const alloc = allocations.find((a) => a.projectId === p.id);
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    return {
      projectId: p.id,
      name: p.name,
      code: p.code,
      billable: Pt.canBill(p, alloc, null),
      tasks: pTasks
        .filter((t) => t.status !== "done")
        .map((t) => ({
          id: t.id,
          title: t.parentId ? `${pTasks.find((x) => x.id === t.parentId)?.title || ""} › ${t.title}` : t.title,
          billable: t.isBillable,
          mine: t.assigneeId === employee.id,
        })),
    };
  });

  const ts = await PtTimesheet.findOne({ where: { employeeId: employee.id, weekStart } });
  const detail = ts ? await Pt.buildTimesheetDetail(ts) : null;
  let reconciliation = detail?.reconciliation;
  if (!detail) {
    const settings = await Pt.getSettings(employee.tenantId);
    const rec = await Pt.reconcile({ tenantId: employee.tenantId, employees: [employee], from: days[0], to: days[6], settings });
    reconciliation = days.map((d) => rec.find((r) => r.date === d) || { date: d, logged: 0, attendanceHours: null, flags: [] });
  }
  const timer = await Pt.runningTimer(employee.id);

  return Helper.response(
    true,
    "Week fetched",
    {
      weekStart,
      days,
      today: Pt.todayIST(),
      timesheet: detail?.timesheet || { status: "draft", totalHours: 0, billableHours: 0 },
      editable: !detail || Pt.EDITABLE.includes(detail.timesheet.status),
      entries: detail?.entries || [],
      reconciliation,
      assignable,
      timer: timer ? { id: timer.id, projectId: timer.projectId, taskId: timer.taskId, notes: timer.notes, startedAt: timer.timerStartedAt } : null,
    },
    res,
    200,
  );
});

exports.saveEntry = handler("saveEntry", async (req, res) => {
  const employee = await me(req);
  const entry = await Pt.saveEntry({ employee, payload: req.body || {} });
  return Helper.response(true, "Time saved", entry, res, 200);
});

exports.deleteEntry = handler("deleteEntry", async (req, res) => {
  const employee = await me(req);
  await Pt.deleteEntry({ employee, entryId: req.body?.id });
  return Helper.response(true, "Entry deleted", {}, res, 200);
});

exports.startTimer = handler("startTimer", async (req, res) => {
  const employee = await me(req);
  const entry = await Pt.startTimer({ employee, payload: req.body || {} });
  return Helper.response(true, "Timer started", { id: entry.id, startedAt: entry.timerStartedAt }, res, 200);
});

exports.stopTimer = handler("stopTimer", async (req, res) => {
  const employee = await me(req);
  const result = await Pt.stopTimer({ employee });
  return Helper.response(
    true,
    result.discarded ? "Timer stopped (under a minute, not saved)" : `Timer stopped: ${result.hours}h logged`,
    { hours: result.hours, discarded: result.discarded },
    res,
    200,
  );
});

exports.submitWeek = handler("submitWeek", async (req, res) => {
  const employee = await me(req);
  const ts = await Pt.submitWeek({ employee, weekStart: req.body?.weekStart });
  await writeAudit({ req, actionType: "TIMESHEET_SUBMIT", referenceId: ts.id, employeeId: employee.id, newValue: { weekStart: ts.weekStart, hours: ts.totalHours } });
  return Helper.response(true, ts.approverId ? "Timesheet submitted to your manager" : "Timesheet submitted to HR", {}, res, 200);
});

// ───────────────────────────── approvals ─────────────────────────────

exports.approvals = handler("approvals", async (req, res) => {
  const rows = await PtTimesheet.findAll({
    where: { tenantId: req.users.tenantId, approverId: req.users.id, status: "submitted" },
    order: [["weekStart", "ASC"]],
    raw: true,
  });
  const maps = await Pt.lookups(req.users.tenantId, rows.map((r) => r.employeeId));
  const data = rows.map((r) => ({
    ...r,
    totalHours: Number(r.totalHours),
    billableHours: Number(r.billableHours),
    employeeName: maps.people[r.employeeId]?.name || "",
    empCode: maps.people[r.employeeId]?.empCode || "",
  }));
  return Helper.response(true, "Approvals fetched", data, res, 200);
});

exports.timesheetDetail = handler("timesheetDetail", async (req, res) => {
  const ts = await PtTimesheet.findOne({ where: { id: req.body?.id, tenantId: req.users.tenantId } });
  if (!ts || (ts.employeeId !== req.users.id && ts.approverId !== req.users.id)) return fail(res, "Timesheet not found");
  const detail = await Pt.buildTimesheetDetail(ts);
  detail.permissions = { canAct: ts.status === "submitted" && ts.approverId === req.users.id };
  return Helper.response(true, "Timesheet fetched", detail, res, 200);
});

exports.act = handler("act", async (req, res) => {
  const ts = await PtTimesheet.findOne({ where: { id: req.body?.id, tenantId: req.users.tenantId } });
  if (!ts || ts.approverId !== req.users.id || ts.employeeId === req.users.id) return fail(res, "This timesheet is not waiting on you");
  await Pt.actOnTimesheet({ timesheet: ts, action: req.body.action, comments: req.body.comments, actor: { id: req.users.id, name: req.users.name } });
  await writeAudit({ req, actionType: "TIMESHEET_DECISION", referenceId: ts.id, employeeId: ts.employeeId, newValue: { action: req.body.action }, remarks: req.body.comments || null });
  return Helper.response(true, `Timesheet ${req.body.action}`, {}, res, 200);
});
