/**
 * Expense management — employee portal endpoints (AppAdmin auth):
 * receipt upload with OCR, claim submission, and approvals for managers,
 * skip-level managers and finance staff (Expense settings → finance employees).
 */
const fs = require("fs");
const crypto = require("crypto");
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const Reimbursement = require("../../models/reimbursement");
const ExpenseCategory = require("../../models/expense_category");
const ExpenseApprovalRule = require("../../models/expense_approval_rule");
const ExpenseReceipt = require("../../models/expense_receipt");
const ExpenseClaim = require("../../models/expense_claim");
const ExpenseApproval = require("../../models/expense_approval");
const Ex = require("../../helper/expense");
const { extractText, parseReceiptText } = require("../../lib/receiptOcr");
const { writeAudit } = require("../../helper/auditLog");

const OCR_MIME = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

const handler = (name, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error instanceof Ex.ExpenseValidationError) return fail(res, error.message);
    console.error(`expensePortal.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

async function me(req) {
  return empPersonal.findOne({
    where: { id: req.users.id, tenantId: req.users.tenantId },
    attributes: ["id", "tenantId", "branchId", "departmentId", "reportingPersonId"],
    raw: true,
  });
}

// ───────────────────────────── submitting ─────────────────────────────

/** Active categories with their policy, for the claim form. */
exports.categories = handler("categories", async (req, res) => {
  const data = await ExpenseCategory.findAll({
    where: { tenantId: req.users.tenantId, status: "active" },
    attributes: ["id", "name", "code", "description", "perClaimLimit", "monthlyLimit", "receiptRequiredAbove", "maxAgeDays", "limitAction"],
    order: [["name", "ASC"]],
    raw: true,
  });
  return Helper.response(true, "Categories fetched", data, res, 200);
});

/** Stores one receipt, runs OCR and warns if the same file was already claimed. */
exports.uploadReceipt = handler("uploadReceipt", async (req, res) => {
  const file = req.file;
  if (!file) return fail(res, "Select a receipt image or PDF");
  if (!OCR_MIME.includes(file.mimetype)) {
    fs.unlink(file.path, () => {});
    return fail(res, "Receipts must be JPG, PNG or PDF");
  }

  const fileHash = crypto.createHash("sha256").update(fs.readFileSync(file.path)).digest("hex");
  let ocrStatus = "done";
  let ocrText = "";
  let ocrData = null;
  try {
    ocrText = await extractText(file.path, file.mimetype);
    ocrData = parseReceiptText(ocrText);
    if (!ocrText.trim()) ocrStatus = "failed";
  } catch (error) {
    console.error("expensePortal.uploadReceipt OCR:", error?.message || error);
    ocrStatus = "failed";
  }

  const receipt = await ExpenseReceipt.create({
    tenantId: req.users.tenantId,
    employeeId: req.users.id,
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    fileHash,
    ocrStatus,
    ocrText: ocrText ? ocrText.slice(0, 20000) : null,
    ocrData,
  });

  const priorUses = await ExpenseReceipt.findAll({
    where: { tenantId: req.users.tenantId, fileHash, reimbursementId: { [Op.ne]: null } },
    attributes: ["reimbursementId"],
    raw: true,
  });
  const active = priorUses.length
    ? await Reimbursement.count({
        where: { id: { [Op.in]: priorUses.map((p) => p.reimbursementId) }, status: { [Op.notIn]: ["rejected", "cancelled"] } },
      })
    : 0;

  return Helper.response(
    true,
    ocrStatus === "done" ? "Receipt read" : "Receipt uploaded; enter the details manually",
    {
      id: receipt.id,
      fileName: receipt.fileName,
      mimeType: receipt.mimeType,
      ocrStatus,
      extracted: ocrData,
      alreadyClaimed: active > 0,
    },
    res,
    200,
  );
});

/** Dry run: policy errors, flags and the approval chain a claim would get. */
exports.validate = handler("validate", async (req, res) => {
  const result = await Ex.validateItems({ tenantId: req.users.tenantId, employeeId: req.users.id, items: req.body?.items });
  const settings = await Ex.getSettings(req.users.tenantId);
  const rules = await ExpenseApprovalRule.findAll({ where: { tenantId: req.users.tenantId, status: "active" }, raw: true });
  const valid = result.items.filter((i) => i.categoryId && i.amount > 0);
  const flagged = result.items.some((i) => i.flags.length);
  const routing = valid.length ? Ex.resolveLevels({ items: valid, rules, settings, flagged }) : { levels: [], appliedRules: [] };
  return Helper.response(
    true,
    "Validated",
    {
      errors: result.errors,
      items: result.items.map((i) => ({ flags: i.flags })),
      approvalLevels: routing.levels.map((l) => ({ level: l, label: Ex.LEVEL_LABELS[l] })),
      appliedRules: routing.appliedRules,
    },
    res,
    200,
  );
});

exports.submit = handler("submit", async (req, res) => {
  const employee = await me(req);
  if (!employee) return fail(res, "Employee not found");
  if (!employee.branchId) return fail(res, "Your profile has no branch; contact HR");
  const { header, claim } = await Ex.submitClaim({
    employee,
    title: req.body?.title,
    description: req.body?.description,
    items: req.body?.items,
  });
  await writeAudit({
    req,
    actionType: "EXPENSE_CLAIM_SUBMIT",
    referenceId: header.id,
    employeeId: employee.id,
    newValue: { claimNo: claim.claimNo, amount: claim.claimedAmount, levels: claim.approvalLevels, flags: claim.flagCount },
  });
  return Helper.response(
    true,
    header.status === "approved" ? `Claim ${claim.claimNo} submitted and auto-approved` : `Claim ${claim.claimNo} submitted`,
    { id: header.id, claimNo: claim.claimNo },
    res,
    200,
  );
});

exports.myClaims = handler("myClaims", async (req, res) => {
  const { rows } = await Ex.claimRows({ tenantId: req.users.tenantId, employeeId: req.users.id });
  return Helper.response(true, "Claims fetched", rows, res, 200);
});

exports.cancel = handler("cancel", async (req, res) => {
  const { header, claim } = await Ex.loadClaim(req.users.tenantId, req.body?.id);
  if (!header || header.employeeId !== req.users.id) return fail(res, "Claim not found");
  if (!claim || claim.kind !== "expense") return fail(res, "Older reimbursements cannot be withdrawn here");
  if (header.status !== "pending") return fail(res, "Only pending claims can be withdrawn");
  await header.update({ status: "cancelled", updatedBy: req.users.id });
  return Helper.response(true, "Claim withdrawn", {}, res, 200);
});

// ───────────────────────────── approving ─────────────────────────────

/** Viewer may open a claim they own, can act on, or already acted on. */
async function canView(req, header, claim, settings) {
  if (header.employeeId === req.users.id) return true;
  if (await Ex.portalCanAct(req.users.id, header, claim, settings)) return true;
  if (claim?.managerId === req.users.id) return true;
  if (settings.financeEmployeeIds.includes(req.users.id)) return true;
  return (await ExpenseApproval.count({ where: { reimbursementId: header.id, approverId: req.users.id } })) > 0;
}

exports.claimDetail = handler("claimDetail", async (req, res) => {
  const { header, claim } = await Ex.loadClaim(req.users.tenantId, req.body?.id);
  const settings = await Ex.getSettings(req.users.tenantId);
  if (!header || !(await canView(req, header, claim, settings))) return fail(res, "Claim not found");
  const detail = await Ex.buildClaimDetail(header, claim);
  const isFinance = settings.financeEmployeeIds.includes(req.users.id);
  detail.permissions = {
    isOwner: header.employeeId === req.users.id,
    canAct: await Ex.portalCanAct(req.users.id, header, claim, settings),
    canCancel: header.employeeId === req.users.id && claim?.kind === "expense" && header.status === "pending",
    canPay: isFinance && header.status === "approved" && header.employeeId !== req.users.id,
  };
  return Helper.response(true, "Claim fetched", detail, res, 200);
});

/** Pending claims waiting on the logged-in employee. */
exports.approvals = handler("approvals", async (req, res) => {
  const settings = await Ex.getSettings(req.users.tenantId);
  const reports = await empPersonal.findAll({
    where: { tenantId: req.users.tenantId, reportingPersonId: req.users.id },
    attributes: ["id"],
    raw: true,
  });
  const isFinance = settings.financeEmployeeIds.includes(req.users.id);
  const managerIds = [req.users.id, ...reports.map((r) => r.id)];

  const candidates = await ExpenseClaim.findAll({
    where: {
      tenantId: req.users.tenantId,
      kind: "expense",
      ...(isFinance ? {} : { managerId: { [Op.in]: managerIds } }),
    },
  });
  const pendingHeaders = await Reimbursement.findAll({
    where: { id: { [Op.in]: candidates.map((c) => c.reimbursementId) }, status: "pending" },
  });
  const claimBy = Object.fromEntries(candidates.map((c) => [c.reimbursementId, c]));
  const mine = [];
  for (const h of pendingHeaders) {
    if (await Ex.portalCanAct(req.users.id, h, claimBy[h.id], settings)) mine.push(h.id);
  }
  const { rows } = mine.length ? await Ex.claimRows({ id: { [Op.in]: mine } }) : { rows: [] };
  return Helper.response(true, "Approvals fetched", { rows, isFinance }, res, 200);
});

exports.act = handler("act", async (req, res) => {
  const { header, claim } = await Ex.loadClaim(req.users.tenantId, req.body?.id);
  const settings = await Ex.getSettings(req.users.tenantId);
  if (!header) return fail(res, "Claim not found");
  if (!(await Ex.portalCanAct(req.users.id, header, claim, settings))) return fail(res, "This claim is not waiting on you");
  const level = Ex.currentLevelOf(header, claim);
  await Ex.actOnClaim({
    header,
    claim,
    action: req.body.action,
    comments: req.body.comments,
    actor: { id: req.users.id, name: req.users.name },
  });
  await writeAudit({
    req,
    actionType: "EXPENSE_CLAIM_DECISION",
    referenceId: header.id,
    employeeId: header.employeeId,
    newValue: { action: req.body.action, level },
    remarks: req.body.comments || null,
  });
  return Helper.response(true, `Claim ${req.body.action}`, {}, res, 200);
});

/** Finance employees: approved claims awaiting payment. */
exports.payables = handler("payables", async (req, res) => {
  const settings = await Ex.getSettings(req.users.tenantId);
  if (!settings.financeEmployeeIds.includes(req.users.id)) return fail(res, "Only finance staff can view payables");
  const { rows } = await Ex.claimRows({ tenantId: req.users.tenantId, status: "approved", employeeId: { [Op.ne]: req.users.id } });
  return Helper.response(true, "Payables fetched", rows, res, 200);
});

exports.markPaid = handler("markPaid", async (req, res) => {
  const settings = await Ex.getSettings(req.users.tenantId);
  if (!settings.financeEmployeeIds.includes(req.users.id)) return fail(res, "Only finance staff can record payments");
  const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(Boolean);
  const own = await Reimbursement.count({ where: { id: { [Op.in]: ids }, employeeId: req.users.id } });
  if (own) return fail(res, "You cannot record payment for your own claim");
  const result = await Ex.markPaid({
    tenantId: req.users.tenantId,
    reimbursementIds: ids,
    payment: req.body,
    actor: { id: req.users.id, name: req.users.name },
  });
  if (!result.paid.length) return fail(res, "Select approved claims");
  await writeAudit({
    req,
    actionType: "EXPENSE_CLAIM_PAID",
    referenceId: result.paid[0],
    newValue: { ids: result.paid, mode: req.body.paymentMode, reference: req.body.paymentReference || null },
  });
  return Helper.response(true, `${result.paid.length} claim(s) marked paid`, result, res, 200);
});
