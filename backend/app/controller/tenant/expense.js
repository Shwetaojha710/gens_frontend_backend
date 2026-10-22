/**
 * Expense management — HR / admin / finance endpoints (Admin auth).
 * Employee and approver actions live in expensePortal.js.
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const ExpenseCategory = require("../../models/expense_category");
const ExpenseApprovalRule = require("../../models/expense_approval_rule");
const ExpenseSetting = require("../../models/expense_setting");
const Ex = require("../../helper/expense");
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
    if (!HR_ROLES.includes(req.users?.role)) return fail(res, "Only HR, finance or admin can perform this action");
    return await fn(req, res);
  } catch (error) {
    if (error instanceof Ex.ExpenseValidationError) return fail(res, error.message);
    console.error(`expense.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

// ───────────────────────────── policy setup ─────────────────────────────

exports.listCategories = hr("listCategories", async (req, res) => {
  const data = await ExpenseCategory.findAll({ where: { tenantId: req.users.tenantId }, order: [["name", "ASC"]], raw: true });
  return Helper.response(true, "Categories fetched", data, res, 200);
});

exports.saveCategory = hr("saveCategory", async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  if (!name) return fail(res, "Category name is required");
  const limits = [b.perClaimLimit, b.monthlyLimit, b.receiptRequiredAbove].map(Ex.num);
  if (limits.some((v) => v !== null && v < 0)) return fail(res, "Limits cannot be negative");
  if (limits[0] !== null && limits[1] !== null && limits[0] > limits[1]) {
    return fail(res, "Per-expense limit cannot exceed the monthly limit");
  }
  const maxAgeDays = Ex.num(b.maxAgeDays);
  if (maxAgeDays !== null && (!Number.isInteger(maxAgeDays) || maxAgeDays < 1)) return fail(res, "Claim window must be at least 1 day");

  const dupe = await ExpenseCategory.findOne({
    where: { tenantId: req.users.tenantId, name: { [Op.iLike]: name }, ...(b.id ? { id: { [Op.ne]: b.id } } : {}) },
  });
  if (dupe) return fail(res, "A category with this name already exists");

  const fields = {
    name,
    code: b.code ? String(b.code).trim().toUpperCase() : null,
    description: b.description || null,
    perClaimLimit: limits[0],
    monthlyLimit: limits[1],
    receiptRequiredAbove: limits[2] ?? 0,
    maxAgeDays,
    limitAction: b.limitAction === "block" ? "block" : "flag",
    status: b.status === "inactive" ? "inactive" : "active",
    updatedBy: req.users.id,
  };
  if (b.id) {
    const row = await ExpenseCategory.findOne({ where: { id: b.id, tenantId: req.users.tenantId } });
    if (!row) return fail(res, "Category not found");
    await row.update(fields);
    return Helper.response(true, "Category updated", row, res, 200);
  }
  const row = await ExpenseCategory.create({ ...fields, tenantId: req.users.tenantId, createdBy: req.users.id });
  return Helper.response(true, "Category created", row, res, 200);
});

exports.listRules = hr("listRules", async (req, res) => {
  const data = await ExpenseApprovalRule.findAll({
    where: { tenantId: req.users.tenantId },
    order: [["priority", "DESC"], ["minAmount", "ASC"]],
    raw: true,
  });
  return Helper.response(true, "Rules fetched", data, res, 200);
});

exports.saveRule = hr("saveRule", async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  if (!name) return fail(res, "Rule name is required");
  const levels = Ex.sortLevels(Array.isArray(b.levels) ? b.levels : []);
  if (!levels.length) return fail(res, "Select at least one approval level");
  const minAmount = Ex.num(b.minAmount) ?? 0;
  const maxAmount = Ex.num(b.maxAmount);
  if (minAmount < 0 || (maxAmount !== null && maxAmount < minAmount)) return fail(res, "Invalid amount range");
  if (b.categoryId) {
    const cat = await ExpenseCategory.findOne({ where: { id: b.categoryId, tenantId: req.users.tenantId } });
    if (!cat) return fail(res, "Category not found");
  }

  const fields = {
    name,
    categoryId: b.categoryId || null,
    minAmount,
    maxAmount,
    levels,
    priority: Number.isInteger(Number(b.priority)) ? Number(b.priority) : 0,
    status: b.status === "inactive" ? "inactive" : "active",
    updatedBy: req.users.id,
  };
  if (b.id) {
    const row = await ExpenseApprovalRule.findOne({ where: { id: b.id, tenantId: req.users.tenantId } });
    if (!row) return fail(res, "Rule not found");
    await row.update(fields);
    return Helper.response(true, "Rule updated", row, res, 200);
  }
  const row = await ExpenseApprovalRule.create({ ...fields, tenantId: req.users.tenantId, createdBy: req.users.id });
  return Helper.response(true, "Rule created", row, res, 200);
});

exports.deleteRule = hr("deleteRule", async (req, res) => {
  const removed = await ExpenseApprovalRule.destroy({ where: { id: req.body?.id, tenantId: req.users.tenantId } });
  if (!removed) return fail(res, "Rule not found");
  return Helper.response(true, "Rule deleted", {}, res, 200);
});

exports.getSettings = hr("getSettings", async (req, res) => {
  const data = await Ex.getSettings(req.users.tenantId);
  return Helper.response(true, "Settings fetched", data, res, 200);
});

exports.saveSettings = hr("saveSettings", async (req, res) => {
  const b = req.body || {};
  const defaultLevels = Ex.sortLevels(Array.isArray(b.defaultLevels) ? b.defaultLevels : []);
  if (!defaultLevels.length) return fail(res, "Select at least one default approval level");
  await Ex.getSettings(req.users.tenantId);
  await ExpenseSetting.update(
    {
      defaultLevels,
      financeEmployeeIds: Array.isArray(b.financeEmployeeIds) ? b.financeEmployeeIds : [],
      flaggedRequiresHr: b.flaggedRequiresHr !== false,
      claimPrefix: String(b.claimPrefix || "EXP").trim().toUpperCase().slice(0, 10) || "EXP",
      updatedBy: req.users.id,
    },
    { where: { tenantId: req.users.tenantId } },
  );
  return Helper.response(true, "Settings saved", await Ex.getSettings(req.users.tenantId), res, 200);
});

// ───────────────────────────── claims ─────────────────────────────

/** Builds the reimbursements filter shared by list, dashboard and report. */
function claimWhere(req) {
  const b = req.body || {};
  const where = { tenantId: req.users.tenantId };
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;
  if (b.employeeId) where.employeeId = b.employeeId;
  if (b.fromDate || b.toDate) {
    where.fromDate = {};
    if (b.fromDate) where.fromDate[Op.gte] = b.fromDate;
    if (b.toDate) where.fromDate[Op.lte] = b.toDate;
  }
  return where;
}

function filterRows(rows, items, b) {
  let out = rows;
  if (b.status) out = out.filter((r) => r.status === b.status);
  if (b.departmentId) out = out.filter((r) => r.departmentId === b.departmentId);
  if (b.flaggedOnly) out = out.filter((r) => r.flagCount > 0);
  if (b.pendingWith) out = out.filter((r) => r.status === "pending" && r.pendingWith === b.pendingWith);
  if (b.categoryId) {
    const ids = new Set(items.filter((i) => i.categoryId === b.categoryId).map((i) => i.reimbursementId));
    out = out.filter((r) => ids.has(r.id));
  }
  return out;
}

exports.listClaims = hr("listClaims", async (req, res) => {
  const { rows, items } = await Ex.claimRows(claimWhere(req));
  return Helper.response(true, "Claims fetched", filterRows(rows, items, req.body || {}), res, 200);
});

exports.claimDetail = hr("claimDetail", async (req, res) => {
  const { header, claim } = await Ex.loadClaim(req.users.tenantId, req.body?.id);
  if (!header) return fail(res, "Claim not found");
  const detail = await Ex.buildClaimDetail(header, claim);
  const level = Ex.currentLevelOf(header, claim);
  const legacyPending = (!claim || claim.kind !== "expense") && ["pending", "recommended"].includes(header.status);
  detail.permissions = {
    canAct: !!level && ["hr", "finance"].includes(level),
    // Manager levels can be overridden by HR, but only deliberately
    canOverride: !!level && ["manager", "skip_manager"].includes(level),
    canDecideLegacy: legacyPending,
    canPay: header.status === "approved",
  };
  return Helper.response(true, "Claim fetched", detail, res, 200);
});

exports.actOnClaim = hr("actOnClaim", async (req, res) => {
  const { header, claim } = await Ex.loadClaim(req.users.tenantId, req.body?.id);
  if (!header) return fail(res, "Claim not found");
  const level = Ex.currentLevelOf(header, claim);
  if (level && ["manager", "skip_manager"].includes(level) && !req.body.override) {
    return fail(res, `This claim is waiting on the ${Ex.LEVEL_LABELS[level].toLowerCase()}; confirm an HR override to act`);
  }
  const override = level && ["manager", "skip_manager"].includes(level);
  await Ex.actOnClaim({
    header,
    claim,
    action: req.body.action,
    comments: req.body.comments,
    actor: { id: req.users.id, name: `${req.users.name} (${override ? "HR override" : level === "finance" ? "Finance" : "HR"})` },
  });
  await writeAudit({
    req,
    actionType: "EXPENSE_CLAIM_DECISION",
    referenceId: header.id,
    employeeId: header.employeeId,
    newValue: { action: req.body.action, level: level || "legacy", override: !!override },
    remarks: req.body.comments || null,
  });
  return Helper.response(true, `Claim ${req.body.action}`, {}, res, 200);
});

exports.markPaid = hr("markPaid", async (req, res) => {
  const result = await Ex.markPaid({
    tenantId: req.users.tenantId,
    reimbursementIds: req.body?.ids,
    payment: req.body,
    actor: { id: req.users.id, name: req.users.name },
  });
  if (!result.paid.length) return fail(res, result.skipped[0]?.reason ? `Nothing paid: ${result.skipped[0].reason}` : "Select approved claims");
  await writeAudit({
    req,
    actionType: "EXPENSE_CLAIM_PAID",
    referenceId: result.paid[0],
    newValue: { ids: result.paid, mode: req.body.paymentMode, reference: req.body.paymentReference || null },
  });
  const msg = result.skipped.length
    ? `${result.paid.length} marked paid, ${result.skipped.length} skipped (not approved)`
    : `${result.paid.length} claim(s) marked paid`;
  return Helper.response(true, msg, result, res, 200);
});

// ───────────────────────────── analytics ─────────────────────────────

exports.dashboard = hr("dashboard", async (req, res) => {
  const { rows, items } = await Ex.claimRows(claimWhere(req));
  const filtered = filterRows(rows, items, { departmentId: req.body?.departmentId });
  const ids = new Set(filtered.map((r) => r.id));
  return Helper.response(true, "Dashboard fetched", Ex.summarize(filtered, items.filter((i) => ids.has(i.reimbursementId))), res, 200);
});

/** Claim rows + item rows for Excel / PDF export. */
exports.report = hr("report", async (req, res) => {
  const { rows, items } = await Ex.claimRows(claimWhere(req));
  const filtered = filterRows(rows, items, req.body || {});
  const ids = new Set(filtered.map((r) => r.id));
  const byId = Object.fromEntries(filtered.map((r) => [r.id, r]));
  const itemRows = items
    .filter((i) => ids.has(i.reimbursementId) && (!req.body?.categoryId || i.categoryId === req.body.categoryId))
    .map((i) => ({
      claimNo: byId[i.reimbursementId].claimNo,
      employeeName: byId[i.reimbursementId].employeeName,
      empCode: byId[i.reimbursementId].empCode,
      status: byId[i.reimbursementId].status,
      category: i.category,
      expenseDate: i.expenseDate,
      merchant: i.merchant,
      invoiceNo: i.invoiceNo,
      amount: i.amount,
      flags: (i.flags || []).map((f) => f.message).join("; "),
    }));
  return Helper.response(true, "Report fetched", { claims: filtered, items: itemRows, summary: Ex.summarize(filtered, items.filter((i) => ids.has(i.reimbursementId))) }, res, 200);
});
