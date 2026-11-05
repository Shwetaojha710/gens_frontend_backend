/**
 * Projects & timesheets — HR / admin endpoints (Admin auth).
 * Employee, project-manager and approver actions live in projectPortal.js.
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const PtClient = require("../../models/pt_client");
const PtProject = require("../../models/pt_project");
const PtSetting = require("../../models/pt_setting");
const PtTimesheet = require("../../models/pt_timesheet");
const Pt = require("../../helper/projectTime");
const { writeAudit } = require("../../helper/auditLog");

const HR_ROLES = ["admin", "hr", "superadmin"];

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

function branchOf(req) {
  const b = req.body?.branchId || req.users?.branchId;
  return b && b !== "null" && b !== "All" && b !== "undefined" ? b : null;
}

const hr = (name, fn) => async (req, res) => {
  try {
    if (!HR_ROLES.includes(req.users?.role)) return fail(res, "Only HR or admin can perform this action");
    return await fn(req, res);
  } catch (error) {
    if (error instanceof Pt.PtValidationError) return fail(res, error.message);
    console.error(`project.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

async function loadProject(req, id) {
  if (!id) return null;
  return PtProject.findOne({ where: { id, tenantId: req.users.tenantId } });
}

/** Active employees in scope for reports (branch + optional department / employee). */
async function scopedEmployees(req) {
  const b = req.body || {};
  const where = { tenantId: req.users.tenantId, status: "active" };
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;
  if (b.departmentId) where.departmentId = b.departmentId;
  if (b.employeeId) where.id = b.employeeId;
  return empPersonal.findAll({ where, attributes: ["id", "firstName", "lastName", "branchId"], raw: true });
}

function dateRange(req) {
  const { from, to } = req.body || {};
  if (!Pt.isDate(from) || !Pt.isDate(to)) throw new Pt.PtValidationError("Select a from and to date");
  if (from > to) throw new Pt.PtValidationError("From date is after to date");
  if ((new Date(to) - new Date(from)) / 86400000 > 366) throw new Pt.PtValidationError("Choose a range of one year or less");
  return { from, to };
}

// ───────────────────────────── settings & clients ─────────────────────────────

exports.getSettings = hr("getSettings", async (req, res) => {
  return Helper.response(true, "Settings fetched", await Pt.getSettings(req.users.tenantId), res, 200);
});

exports.saveSettings = hr("saveSettings", async (req, res) => {
  const b = req.body || {};
  const days = [...new Set((Array.isArray(b.workingDays) ? b.workingDays : []).map(Number))].filter((d) => d >= 1 && d <= 7).sort();
  if (!days.length) return fail(res, "Select at least one working day");
  const hours = Pt.num(b.hoursPerDay);
  if (hours === null || hours <= 0 || hours > 24) return fail(res, "Hours per day must be between 0 and 24");
  const tol = Pt.num(b.reconcileToleranceHours) ?? 0.5;
  if (tol < 0 || tol > 8) return fail(res, "Tolerance must be between 0 and 8 hours");
  await Pt.getSettings(req.users.tenantId);
  await PtSetting.update(
    { workingDays: days, hoursPerDay: hours, reconcileToleranceHours: tol, updatedBy: req.users.id },
    { where: { tenantId: req.users.tenantId } },
  );
  return Helper.response(true, "Settings saved", await Pt.getSettings(req.users.tenantId), res, 200);
});

exports.listClients = hr("listClients", async (req, res) => {
  const data = await PtClient.findAll({ where: { tenantId: req.users.tenantId }, order: [["name", "ASC"]], raw: true });
  return Helper.response(true, "Clients fetched", data, res, 200);
});

exports.saveClient = hr("saveClient", async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  if (!name) return fail(res, "Client name is required");
  if (b.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return fail(res, "Invalid email");
  const dupe = await PtClient.findOne({
    where: { tenantId: req.users.tenantId, name: { [Op.iLike]: name }, ...(b.id ? { id: { [Op.ne]: b.id } } : {}) },
  });
  if (dupe) return fail(res, "A client with this name already exists");
  const fields = {
    name,
    code: b.code ? String(b.code).trim().toUpperCase() : null,
    contactName: b.contactName || null,
    email: b.email || null,
    phone: b.phone || null,
    gstin: b.gstin ? String(b.gstin).trim().toUpperCase() : null,
    address: b.address || null,
    status: b.status === "inactive" ? "inactive" : "active",
    updatedBy: req.users.id,
  };
  if (b.id) {
    const row = await PtClient.findOne({ where: { id: b.id, tenantId: req.users.tenantId } });
    if (!row) return fail(res, "Client not found");
    await row.update(fields);
    return Helper.response(true, "Client updated", row, res, 200);
  }
  const row = await PtClient.create({ ...fields, tenantId: req.users.tenantId, createdBy: req.users.id });
  return Helper.response(true, "Client created", row, res, 200);
});

// ───────────────────────────── projects ─────────────────────────────

exports.listProjects = hr("listProjects", async (req, res) => {
  const b = req.body || {};
  const where = { tenantId: req.users.tenantId };
  const branchId = branchOf(req);
  if (branchId) where[Op.or] = [{ branchId: null }, { branchId }];
  if (b.status) where.status = b.status;
  if (b.clientId) where.clientId = b.clientId;
  return Helper.response(true, "Projects fetched", await Pt.projectRows(where), res, 200);
});

exports.saveProject = hr("saveProject", async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  if (!name) return fail(res, "Project name is required");
  if (b.startDate && !Pt.isDate(b.startDate)) return fail(res, "Invalid start date");
  if (b.endDate && !Pt.isDate(b.endDate)) return fail(res, "Invalid end date");
  if (b.startDate && b.endDate && b.startDate > b.endDate) return fail(res, "End date is before start date");
  if (!["time_material", "fixed", "non_billable"].includes(b.billingType)) return fail(res, "Select a billing type");
  if (!["planned", "active", "on_hold", "completed", "cancelled"].includes(b.status || "active")) return fail(res, "Invalid status");
  for (const k of ["budgetHours", "budgetAmount", "defaultBillRate", "defaultCostRate"]) {
    if (Pt.num(b[k]) !== null && Pt.num(b[k]) < 0) return fail(res, "Budgets and rates cannot be negative");
  }
  if (b.clientId && !(await PtClient.findOne({ where: { id: b.clientId, tenantId: req.users.tenantId } }))) {
    return fail(res, "Client not found");
  }
  if (b.managerId && !(await empPersonal.findOne({ where: { id: b.managerId, tenantId: req.users.tenantId, status: "active" } }))) {
    return fail(res, "Select an active employee as project manager");
  }
  const code = b.code ? String(b.code).trim().toUpperCase() : null;
  if (code) {
    const dupe = await PtProject.findOne({ where: { tenantId: req.users.tenantId, code, ...(b.id ? { id: { [Op.ne]: b.id } } : {}) } });
    if (dupe) return fail(res, `Project code ${code} is already used by ${dupe.name}`);
  }

  const fields = {
    name,
    code,
    clientId: b.clientId || null,
    description: b.description || null,
    managerId: b.managerId || null,
    startDate: b.startDate || null,
    endDate: b.endDate || null,
    status: b.status || "active",
    billingType: b.billingType,
    budgetHours: Pt.num(b.budgetHours),
    budgetAmount: Pt.num(b.budgetAmount),
    defaultBillRate: b.billingType === "non_billable" ? null : Pt.num(b.defaultBillRate),
    defaultCostRate: Pt.num(b.defaultCostRate),
    updatedBy: req.users.id,
  };
  if (b.id) {
    const row = await loadProject(req, b.id);
    if (!row) return fail(res, "Project not found");
    await row.update(fields);
    return Helper.response(true, "Project updated", row, res, 200);
  }
  const row = await PtProject.create({ ...fields, tenantId: req.users.tenantId, branchId: branchOf(req), createdBy: req.users.id });
  await writeAudit({ req, actionType: "PROJECT_CREATE", referenceId: row.id, newValue: { name, code } });
  return Helper.response(true, "Project created", row, res, 200);
});

exports.projectDetail = hr("projectDetail", async (req, res) => {
  const project = await loadProject(req, req.body?.id);
  if (!project) return fail(res, "Project not found");
  const { from, to, approvedOnly } = req.body || {};
  const detail = await Pt.buildProjectDetail(project, { from, to, approvedOnly: !!approvedOnly });
  detail.permissions = { canManage: true, canSeeMoney: true, canEditProject: true };
  return Helper.response(true, "Project fetched", detail, res, 200);
});

exports.saveAllocation = hr("saveAllocation", async (req, res) => {
  const project = await loadProject(req, req.body?.projectId);
  if (!project) return fail(res, "Project not found");
  const row = await Pt.saveAllocation({ project, payload: req.body, actorId: req.users.id });
  return Helper.response(true, "Team updated", row, res, 200);
});

exports.removeAllocation = hr("removeAllocation", async (req, res) => {
  const project = await loadProject(req, req.body?.projectId);
  if (!project) return fail(res, "Project not found");
  await Pt.removeAllocation({ project, allocationId: req.body.id, actorId: req.users.id });
  return Helper.response(true, "Member removed", {}, res, 200);
});

exports.saveTask = hr("saveTask", async (req, res) => {
  const project = await loadProject(req, req.body?.projectId);
  if (!project) return fail(res, "Project not found");
  const row = await Pt.saveTask({ project, payload: req.body, actorId: req.users.id });
  return Helper.response(true, "Task saved", row, res, 200);
});

exports.deleteTask = hr("deleteTask", async (req, res) => {
  const project = await loadProject(req, req.body?.projectId);
  if (!project) return fail(res, "Project not found");
  await Pt.deleteTask({ project, taskId: req.body.id });
  return Helper.response(true, "Task deleted", {}, res, 200);
});

// ───────────────────────────── timesheets ─────────────────────────────

exports.listTimesheets = hr("listTimesheets", async (req, res) => {
  const b = req.body || {};
  const where = { tenantId: req.users.tenantId };
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;
  if (b.status) where.status = b.status;
  if (b.employeeId) where.employeeId = b.employeeId;
  if (b.weekStart) where.weekStart = Pt.weekStartOf(b.weekStart);
  const rows = await PtTimesheet.findAll({ where, order: [["weekStart", "DESC"], ["submittedAt", "DESC"]], limit: 500, raw: true });
  const maps = await Pt.lookups(req.users.tenantId, [...rows.map((r) => r.employeeId), ...rows.map((r) => r.approverId)]);
  const data = rows.map((r) => ({
    ...r,
    totalHours: Number(r.totalHours),
    billableHours: Number(r.billableHours),
    employeeName: maps.people[r.employeeId]?.name || "",
    empCode: maps.people[r.employeeId]?.empCode || "",
    department: maps.departments[maps.people[r.employeeId]?.departmentId] || "",
    approverName: maps.people[r.approverId]?.name || (r.status === "submitted" ? "HR" : ""),
  }));
  return Helper.response(true, "Timesheets fetched", data, res, 200);
});

exports.timesheetDetail = hr("timesheetDetail", async (req, res) => {
  const ts = await PtTimesheet.findOne({ where: { id: req.body?.id, tenantId: req.users.tenantId } });
  if (!ts) return fail(res, "Timesheet not found");
  const detail = await Pt.buildTimesheetDetail(ts);
  detail.permissions = { canAct: ts.status === "submitted" };
  return Helper.response(true, "Timesheet fetched", detail, res, 200);
});

/** HR can decide any submitted timesheet (e.g. employees without a reporting manager). */
exports.actOnTimesheet = hr("actOnTimesheet", async (req, res) => {
  const ts = await PtTimesheet.findOne({ where: { id: req.body?.id, tenantId: req.users.tenantId } });
  if (!ts) return fail(res, "Timesheet not found");
  await Pt.actOnTimesheet({ timesheet: ts, action: req.body.action, comments: req.body.comments, actor: { id: req.users.id, name: `${req.users.name} (HR)` } });
  await writeAudit({ req, actionType: "TIMESHEET_DECISION", referenceId: ts.id, employeeId: ts.employeeId, newValue: { action: req.body.action }, remarks: req.body.comments || null });
  return Helper.response(true, `Timesheet ${req.body.action}`, {}, res, 200);
});

// ───────────────────────────── reports ─────────────────────────────

exports.utilizationReport = hr("utilizationReport", async (req, res) => {
  const { from, to } = dateRange(req);
  const employees = await scopedEmployees(req);
  const settings = await Pt.getSettings(req.users.tenantId);
  const rows = await Pt.utilization({ tenantId: req.users.tenantId, employees, from, to, settings, approvedOnly: !!req.body.approvedOnly });
  return Helper.response(true, "Utilization fetched", { rows, settings }, res, 200);
});

/** Project-wise figures for the date range, including estimated vs actual. */
exports.projectReport = hr("projectReport", async (req, res) => {
  const { from, to } = dateRange(req);
  const b = req.body || {};
  const where = { tenantId: req.users.tenantId };
  if (b.clientId) where.clientId = b.clientId;
  if (b.status) where.status = b.status;
  const projects = await PtProject.findAll({ where, raw: true });
  const entries = projects.length
    ? await Pt.reportEntries({ projectId: { [Op.in]: projects.map((p) => p.id) }, date: { [Op.between]: [from, to] } }, !!b.approvedOnly)
    : [];
  const figures = await Pt.projectFigures(projects, entries);
  const maps = await Pt.lookups(req.users.tenantId, projects.map((p) => p.managerId));
  const rows = projects.map((p, i) => ({
    projectId: p.id,
    name: p.name,
    code: p.code,
    status: p.status,
    billingType: p.billingType,
    clientId: p.clientId,
    clientName: maps.clients[p.clientId] || "Internal",
    managerName: maps.people[p.managerId]?.name || "",
    budgetHours: Pt.num(p.budgetHours),
    budgetAmount: Pt.num(p.budgetAmount),
    ...figures[i],
  }));
  return Helper.response(true, "Project report fetched", rows, res, 200);
});

exports.clientReport = hr("clientReport", async (req, res) => {
  const { from, to } = dateRange(req);
  const projects = await PtProject.findAll({ where: { tenantId: req.users.tenantId }, raw: true });
  const entries = projects.length
    ? await Pt.reportEntries({ projectId: { [Op.in]: projects.map((p) => p.id) }, date: { [Op.between]: [from, to] } }, !!req.body.approvedOnly)
    : [];
  const figures = await Pt.projectFigures(projects, entries);
  const maps = await Pt.lookups(req.users.tenantId, []);
  const byClient = {};
  projects.forEach((p, i) => {
    const key = p.clientId || "internal";
    const c = (byClient[key] = byClient[key] || {
      clientId: p.clientId,
      clientName: maps.clients[p.clientId] || "Internal",
      projects: 0,
      activeProjects: 0,
      hours: 0,
      billableHours: 0,
      billableValue: 0,
      cost: 0,
    });
    const f = figures[i];
    c.projects++;
    if (p.status === "active") c.activeProjects++;
    c.hours = Pt.round2(c.hours + f.actualHours);
    c.billableHours = Pt.round2(c.billableHours + f.billableHours);
    c.billableValue = Pt.round2(c.billableValue + f.billableValue);
    c.cost = Pt.round2(c.cost + f.cost);
  });
  const rows = Object.values(byClient)
    .map((c) => ({ ...c, margin: Pt.round2(c.billableValue - c.cost) }))
    .sort((a, b) => b.hours - a.hours);
  return Helper.response(true, "Client report fetched", rows, res, 200);
});

/** Attendance vs timesheet comparison per employee per day. */
exports.reconciliationReport = hr("reconciliationReport", async (req, res) => {
  const { from, to } = dateRange(req);
  if ((new Date(to) - new Date(from)) / 86400000 > 62) return fail(res, "Choose a range of two months or less");
  const employees = await scopedEmployees(req);
  const settings = await Pt.getSettings(req.users.tenantId);
  let rows = await Pt.reconcile({ tenantId: req.users.tenantId, employees, from, to, settings });
  if (req.body.flaggedOnly) rows = rows.filter((r) => r.flags.length);
  const maps = await Pt.lookups(req.users.tenantId, employees.map((e) => e.id));
  const data = rows.map((r) => ({ ...r, employeeName: maps.people[r.employeeId]?.name || "", empCode: maps.people[r.employeeId]?.empCode || "" }));
  return Helper.response(true, "Reconciliation fetched", data, res, 200);
});
