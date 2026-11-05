/**
 * Expense management — policy checks, duplicate detection, conditional
 * approval routing and the claim workflow. Shared by the HR controller
 * (Admin auth) and the employee portal controller (AppAdmin auth).
 *
 * A claim is a reimbursements row (header: amount, dates, status) plus an
 * expense_claims row (workflow + payment) and expense_items lines.
 */
const { Op } = require("sequelize");
const moment = require("moment-timezone");
const sequelize = require("../connection/connection");
const empPersonal = require("../models/empPersonal");
const Department = require("../models/department");
const Reimbursement = require("../models/reimbursement");
const ReimbursementFile = require("../models/reimbursementfile");
const ExpenseCategory = require("../models/expense_category");
const ExpenseApprovalRule = require("../models/expense_approval_rule");
const ExpenseSetting = require("../models/expense_setting");
const ExpenseReceipt = require("../models/expense_receipt");
const ExpenseItem = require("../models/expense_item");
const ExpenseClaim = require("../models/expense_claim");
const ExpenseApproval = require("../models/expense_approval");

/** A rule violation whose message is safe to show the user. */
class ExpenseValidationError extends Error {}

const LEVEL_ORDER = ["manager", "skip_manager", "hr", "finance"];
const DEFAULT_LEVELS = ["manager", "finance"];
const LEVEL_LABELS = {
  manager: "Reporting manager",
  skip_manager: "Skip-level manager",
  hr: "HR",
  finance: "Finance",
};
// Claims in these states no longer count towards limits or duplicates
const INACTIVE_STATUSES = ["rejected", "cancelled"];
const PAYMENT_MODES = ["bank_transfer", "upi", "cash", "cheque", "payroll"];

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const todayIST = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
const fullName = (e) => [e?.firstName, e?.lastName].filter(Boolean).join(" ").trim();
const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function sortLevels(levels) {
  return LEVEL_ORDER.filter((l) => levels.includes(l));
}

async function getSettings(tenantId) {
  const [row] = await ExpenseSetting.findOrCreate({
    where: { tenantId },
    defaults: { tenantId, defaultLevels: DEFAULT_LEVELS, financeEmployeeIds: [], flaggedRequiresHr: true, claimPrefix: "EXP" },
  });
  const s = row.get({ plain: true });
  return {
    ...s,
    defaultLevels: sortLevels(Array.isArray(s.defaultLevels) && s.defaultLevels.length ? s.defaultLevels : DEFAULT_LEVELS),
    financeEmployeeIds: Array.isArray(s.financeEmployeeIds) ? s.financeEmployeeIds : [],
  };
}

// ───────────────────────────── approval routing ─────────────────────────────

function ruleMatches(rule, amount) {
  return amount >= Number(rule.minAmount || 0) && (rule.maxAmount === null || amount <= Number(rule.maxAmount));
}

/**
 * Approval levels for a claim.
 * Each category picks its best rule: category-specific rules are tested against
 * the category subtotal, generic rules against the claim total; higher priority
 * wins, then category-specific over generic. Levels from all categories are merged.
 */
function resolveLevels({ items, rules, settings, flagged }) {
  const total = items.reduce((s, i) => s + Number(i.amount), 0);
  const subtotals = {};
  for (const i of items) subtotals[i.categoryId] = (subtotals[i.categoryId] || 0) + Number(i.amount);

  const levels = new Set();
  const applied = [];
  for (const [categoryId, subtotal] of Object.entries(subtotals)) {
    const candidates = rules
      .filter((r) => r.status === "active")
      .filter((r) => (r.categoryId ? r.categoryId === categoryId && ruleMatches(r, subtotal) : ruleMatches(r, total)))
      .sort((a, b) => b.priority - a.priority || (b.categoryId ? 1 : 0) - (a.categoryId ? 1 : 0));
    const rule = candidates[0];
    const ruleLevels = rule ? rule.levels : settings.defaultLevels;
    (Array.isArray(ruleLevels) ? ruleLevels : []).forEach((l) => levels.add(l));
    if (rule && !applied.includes(rule.name)) applied.push(rule.name);
  }
  if (flagged && settings.flaggedRequiresHr) levels.add("hr");
  const resolved = sortLevels([...levels]);
  return { levels: resolved.length ? resolved : settings.defaultLevels, appliedRules: applied };
}

/** Employee who must act on a person-bound level, or null if the level is role-based / unfilled. */
async function personForLevel(level, claim) {
  if (level === "manager") return claim.managerId || null;
  if (level === "skip_manager") {
    if (!claim.managerId) return null;
    const m = await empPersonal.findOne({ where: { id: claim.managerId }, attributes: ["reportingPersonId"], raw: true });
    return m?.reportingPersonId || null;
  }
  return null;
}

/** First level index >= start that has someone to act on it. */
async function nextApplicableLevel(levels, start, claim) {
  for (let i = start; i < levels.length; i++) {
    if (!["manager", "skip_manager"].includes(levels[i])) return i;
    const person = await personForLevel(levels[i], claim);
    if (person && person !== claim.employeeId) return i;
  }
  return levels.length;
}

// ───────────────────────────── validation ─────────────────────────────

/**
 * Policy and duplicate checks for draft items.
 * Returns blocking `errors` and per-item `flags` (shown to approvers).
 */
async function validateItems({ tenantId, employeeId, items }) {
  const errors = [];
  if (!Array.isArray(items) || !items.length) {
    return { errors: [{ index: null, message: "Add at least one expense" }], items: [] };
  }

  const categoryIds = [...new Set(items.map((i) => i.categoryId).filter(Boolean))];
  const categories = await ExpenseCategory.findAll({ where: { tenantId, id: { [Op.in]: categoryIds } }, raw: true });
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const receiptIds = items.map((i) => i.receiptId).filter(Boolean);
  const receipts = receiptIds.length
    ? await ExpenseReceipt.findAll({ where: { tenantId, id: { [Op.in]: receiptIds } }, raw: true })
    : [];
  const receiptById = Object.fromEntries(receipts.map((r) => [r.id, r]));

  // Other active items of this employee in the affected months/categories
  const dates = items.map((i) => i.expenseDate).filter(Boolean).sort();
  let existing = [];
  if (dates.length && categoryIds.length) {
    const rows = await ExpenseItem.findAll({
      where: {
        tenantId,
        employeeId,
        categoryId: { [Op.in]: categoryIds },
        expenseDate: {
          [Op.between]: [moment(dates[0]).startOf("month").format("YYYY-MM-DD"), moment(dates[dates.length - 1]).endOf("month").format("YYYY-MM-DD")],
        },
      },
      raw: true,
    });
    existing = await withActiveClaims(rows);
  }

  // Same invoice already claimed by anyone in the tenant
  const invoiceNos = items.map((i) => String(i.invoiceNo || "").trim()).filter(Boolean);
  const invoiceMatches = invoiceNos.length
    ? await withActiveClaims(
        await ExpenseItem.findAll({
          where: { tenantId, [Op.or]: invoiceNos.map((n) => sequelize.where(sequelize.fn("lower", sequelize.col("invoiceNo")), n.toLowerCase())) },
          raw: true,
        }),
      )
    : [];

  // Same receipt file (by hash) already attached to an active claim
  const hashes = receipts.map((r) => r.fileHash).filter(Boolean);
  const hashMatches = hashes.length
    ? await ExpenseReceipt.findAll({
        where: { tenantId, fileHash: { [Op.in]: hashes }, reimbursementId: { [Op.ne]: null } },
        raw: true,
      })
    : [];
  const activeHashClaims = await activeClaimIds(hashMatches.map((h) => h.reimbursementId));

  const today = todayIST();
  const checked = [];
  const seenReceipts = new Set();
  const monthTotals = {}; // categoryId|YYYY-MM -> running total for this claim

  items.forEach((raw, index) => {
    const flags = [];
    const err = (message) => errors.push({ index, message });
    const amount = num(raw.amount);
    const cat = catById[raw.categoryId];

    if (!cat || cat.status !== "active") err("Select a valid expense category");
    if (amount === null || amount <= 0) err("Amount must be greater than zero");
    if (!raw.expenseDate || !moment(raw.expenseDate, "YYYY-MM-DD", true).isValid()) err("Expense date is required");
    else if (raw.expenseDate > today) err("Expense date cannot be in the future");

    const receipt = raw.receiptId ? receiptById[raw.receiptId] : null;
    if (raw.receiptId && (!receipt || receipt.employeeId !== employeeId)) err("Receipt not found");
    if (receipt && receipt.reimbursementId) err("This receipt is already attached to another claim");
    if (receipt && seenReceipts.has(receipt.id)) err("The same receipt is attached to two expenses");
    if (receipt) seenReceipts.add(receipt.id);

    if (cat && amount !== null && amount > 0 && raw.expenseDate) {
      const policy = (message, type) => (cat.limitAction === "block" ? err(message) : flags.push({ type, message }));

      if (!receipt && amount > Number(cat.receiptRequiredAbove || 0)) {
        err(
          Number(cat.receiptRequiredAbove) > 0
            ? `${cat.name}: receipt required above ₹${Number(cat.receiptRequiredAbove)}`
            : `${cat.name}: receipt required`,
        );
      }
      if (cat.perClaimLimit !== null && amount > Number(cat.perClaimLimit)) {
        policy(`${cat.name} limit is ₹${Number(cat.perClaimLimit)} per expense`, "over_limit");
      }
      if (cat.maxAgeDays !== null && moment(today).diff(moment(raw.expenseDate), "days") > cat.maxAgeDays) {
        policy(`${cat.name} expenses must be claimed within ${cat.maxAgeDays} days`, "late_claim");
      }
      if (cat.monthlyLimit !== null) {
        const month = raw.expenseDate.slice(0, 7);
        const key = `${cat.id}|${month}`;
        if (monthTotals[key] === undefined) {
          monthTotals[key] = existing
            .filter((e) => e.categoryId === cat.id && String(e.expenseDate).slice(0, 7) === month)
            .reduce((s, e) => s + Number(e.amount), 0);
        }
        monthTotals[key] += amount;
        if (monthTotals[key] > Number(cat.monthlyLimit)) {
          policy(`${cat.name} monthly limit of ₹${Number(cat.monthlyLimit)} exceeded (₹${round2(monthTotals[key])} in ${month})`, "monthly_limit");
        }
      }

      // Duplicate signals
      if (receipt?.fileHash && hashMatches.some((h) => h.fileHash === receipt.fileHash && activeHashClaims.has(h.reimbursementId))) {
        err("This receipt has already been claimed");
      }
      const sameExpense = existing.find(
        (e) => e.categoryId === cat.id && String(e.expenseDate) === raw.expenseDate && Number(e.amount) === amount,
      );
      const sameInClaim = items.some(
        (o, j) => j < index && o.categoryId === raw.categoryId && o.expenseDate === raw.expenseDate && Number(o.amount) === amount,
      );
      if (sameExpense || sameInClaim) {
        flags.push({ type: "possible_duplicate", message: `Possible duplicate: same category, date and amount already claimed` });
      }
      const inv = String(raw.invoiceNo || "").trim().toLowerCase();
      if (inv) {
        const match = invoiceMatches.find(
          (m) => String(m.invoiceNo).toLowerCase() === inv && (!raw.merchant || !m.merchant || normalize(m.merchant) === normalize(raw.merchant)),
        );
        if (match) flags.push({ type: "duplicate_invoice", message: `Invoice ${raw.invoiceNo} was already claimed` });
      }
    }

    checked.push({
      categoryId: raw.categoryId,
      expenseDate: raw.expenseDate,
      merchant: raw.merchant ? String(raw.merchant).trim().slice(0, 200) : null,
      invoiceNo: raw.invoiceNo ? String(raw.invoiceNo).trim().slice(0, 60) : null,
      amount: amount !== null ? round2(amount) : null,
      description: raw.description ? String(raw.description).trim() : null,
      receiptId: receipt ? receipt.id : null,
      flags,
    });
  });

  return { errors, items: checked };
}

/** Keeps rows whose claim is still active (not rejected / cancelled). */
async function withActiveClaims(rows) {
  const active = await activeClaimIds(rows.map((r) => r.reimbursementId));
  return rows.filter((r) => active.has(r.reimbursementId));
}

async function activeClaimIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Set();
  const rows = await Reimbursement.findAll({
    where: { id: { [Op.in]: unique }, status: { [Op.notIn]: INACTIVE_STATUSES } },
    attributes: ["id"],
    raw: true,
  });
  return new Set(rows.map((r) => r.id));
}

// ───────────────────────────── workflow ─────────────────────────────

async function nextClaimNo(tenantId, prefix, transaction) {
  const yymm = moment().tz("Asia/Kolkata").format("YYMM");
  const base = `${prefix || "EXP"}-${yymm}-`;
  const count = await ExpenseClaim.count({ where: { tenantId, claimNo: { [Op.like]: `${base}%` } }, transaction });
  return `${base}${String(count + 1).padStart(4, "0")}`;
}

/** Validates and creates a claim. Throws ExpenseValidationError with every blocking problem. */
async function submitClaim({ employee, title, description, items }) {
  const tenantId = employee.tenantId;
  const cleanTitle = String(title || "").trim();
  if (!cleanTitle) throw new ExpenseValidationError("Claim title is required");

  const { errors, items: checked } = await validateItems({ tenantId, employeeId: employee.id, items });
  if (errors.length) {
    throw new ExpenseValidationError(
      errors.map((e) => (e.index === null ? e.message : `Expense ${e.index + 1}: ${e.message}`)).join("; "),
    );
  }

  const settings = await getSettings(tenantId);
  const rules = await ExpenseApprovalRule.findAll({ where: { tenantId, status: "active" }, raw: true });
  const flagCount = checked.reduce((s, i) => s + i.flags.length, 0);
  const { levels } = resolveLevels({ items: checked, rules, settings, flagged: flagCount > 0 });
  const total = round2(checked.reduce((s, i) => s + i.amount, 0));
  const dates = checked.map((i) => i.expenseDate).sort();

  return sequelize.transaction(async (t) => {
    const header = await Reimbursement.create(
      {
        tenantId,
        branchId: employee.branchId,
        employeeId: employee.id,
        fromDate: dates[0],
        toDate: dates[dates.length - 1],
        amount: Math.round(total),
        remark: [cleanTitle, description].filter(Boolean).join(" — "),
        status: "pending",
        createdBy: employee.id,
        updatedBy: employee.id,
      },
      { transaction: t },
    );

    const claim = await ExpenseClaim.create(
      {
        tenantId,
        reimbursementId: header.id,
        kind: "expense",
        claimNo: await nextClaimNo(tenantId, settings.claimPrefix, t),
        title: cleanTitle,
        claimedAmount: total,
        approvalLevels: levels,
        currentLevel: 0,
        managerId: employee.reportingPersonId || null,
        departmentId: employee.departmentId || null,
        flagCount,
        submittedAt: new Date(),
      },
      { transaction: t },
    );

    for (const item of checked) {
      await ExpenseItem.create(
        { ...item, tenantId, reimbursementId: header.id, employeeId: employee.id, flags: item.flags.length ? item.flags : null },
        { transaction: t },
      );
    }

    // Receipts also go into reimbursement_files so legacy screens and the mobile app show them
    const receiptIds = checked.map((i) => i.receiptId).filter(Boolean);
    if (receiptIds.length) {
      const receipts = await ExpenseReceipt.findAll({ where: { id: { [Op.in]: receiptIds } }, transaction: t });
      for (const r of receipts) {
        await r.update({ reimbursementId: header.id }, { transaction: t });
        await ReimbursementFile.create(
          {
            tenantId,
            branchId: employee.branchId,
            reimbursementId: header.id,
            image: r.fileName,
            doc_type: r.mimeType,
            status: "pending",
            createdBy: employee.id,
            updatedBy: employee.id,
          },
          { transaction: t },
        );
      }
    }

    const first = await nextApplicableLevel(levels, 0, { ...claim.get({ plain: true }), employeeId: employee.id });
    if (first >= levels.length) {
      await claim.update({ currentLevel: levels.length, approvedAt: new Date() }, { transaction: t });
      await header.update({ status: "approved" }, { transaction: t });
    } else if (first !== 0) {
      await claim.update({ currentLevel: first }, { transaction: t });
    }
    return { header, claim };
  });
}

/** Loads header + workflow row; claim is null for legacy reimbursements. */
async function loadClaim(tenantId, reimbursementId) {
  if (!reimbursementId) return {};
  const header = await Reimbursement.findOne({ where: { id: reimbursementId, tenantId } });
  if (!header) return {};
  const claim = await ExpenseClaim.findOne({ where: { reimbursementId } });
  return { header, claim };
}

/** True when the reimbursement runs through the expense approval workflow. */
async function isWorkflowClaim(reimbursementId) {
  return (await ExpenseClaim.count({ where: { reimbursementId, kind: "expense" } })) > 0;
}

function currentLevelOf(header, claim) {
  if (!claim || claim.kind !== "expense" || header.status !== "pending") return null;
  return claim.approvalLevels?.[claim.currentLevel] || null;
}

/**
 * Whether a portal employee can act on the claim's current level.
 * Nobody approves their own claim.
 */
async function portalCanAct(employeeId, header, claim, settings) {
  const level = currentLevelOf(header, claim);
  if (!level || header.employeeId === employeeId) return false;
  if (level === "finance") return settings.financeEmployeeIds.includes(employeeId);
  if (level === "hr") return false;
  const person = await personForLevel(level, { ...claim.get({ plain: true }), employeeId: header.employeeId });
  return person === employeeId;
}

/** Approve / reject the current level; rejection ends the claim. */
async function actOnClaim({ header, claim, action, comments, actor }) {
  if (!["approved", "rejected"].includes(action)) throw new ExpenseValidationError("Invalid action");
  if (action === "rejected" && !String(comments || "").trim()) {
    throw new ExpenseValidationError("Add a reason for the rejection");
  }

  // Legacy reimbursement: single-step decision by HR
  if (!claim || claim.kind !== "expense") {
    if (!["pending", "recommended"].includes(header.status)) throw new ExpenseValidationError("Claim is not pending");
    await header.update({ status: action, updatedBy: actor.id });
    return;
  }

  const level = currentLevelOf(header, claim);
  if (!level) throw new ExpenseValidationError("Claim is not awaiting approval");

  await sequelize.transaction(async (t) => {
    await ExpenseApproval.create(
      {
        tenantId: header.tenantId,
        reimbursementId: header.id,
        level: claim.currentLevel,
        approverType: level,
        approverId: actor.id,
        approverName: actor.name,
        action,
        comments: comments || null,
      },
      { transaction: t },
    );
    if (action === "rejected") {
      await claim.update({ rejectionReason: comments }, { transaction: t });
      await header.update({ status: "rejected", updatedBy: actor.id }, { transaction: t });
      return;
    }
    const next = await nextApplicableLevel(claim.approvalLevels, claim.currentLevel + 1, {
      ...claim.get({ plain: true }),
      employeeId: header.employeeId,
    });
    if (next >= claim.approvalLevels.length) {
      await claim.update({ currentLevel: claim.approvalLevels.length, approvedAt: new Date() }, { transaction: t });
      await header.update({ status: "approved", updatedBy: actor.id }, { transaction: t });
    } else {
      await claim.update({ currentLevel: next }, { transaction: t });
    }
  });
}

/** Record payment for approved claims. Returns { paid, skipped }. */
async function markPaid({ tenantId, reimbursementIds, payment, actor }) {
  const mode = payment?.paymentMode;
  if (!PAYMENT_MODES.includes(mode)) throw new ExpenseValidationError("Select a payment mode");
  const paidAt = payment.paidAt || todayIST();
  if (!moment(paidAt, "YYYY-MM-DD", true).isValid()) throw new ExpenseValidationError("Invalid payment date");
  if (mode === "payroll" && !(num(payment.payrollMonth) >= 1 && num(payment.payrollMonth) <= 12 && num(payment.payrollYear))) {
    throw new ExpenseValidationError("Select the payroll month and year");
  }
  if (["bank_transfer", "upi", "cheque"].includes(mode) && !String(payment.paymentReference || "").trim()) {
    throw new ExpenseValidationError("Payment reference (UTR / cheque no.) is required");
  }

  const ids = Array.isArray(reimbursementIds) ? reimbursementIds : [];
  const headers = await Reimbursement.findAll({ where: { tenantId, id: { [Op.in]: ids } } });
  const paid = [];
  const skipped = [];
  for (const header of headers) {
    if (header.status !== "approved") {
      skipped.push({ id: header.id, reason: `Status is ${header.status}` });
      continue;
    }
    await sequelize.transaction(async (t) => {
      const fields = {
        paymentMode: mode,
        paymentReference: payment.paymentReference || null,
        paidAt,
        paidBy: actor.id,
        paidByName: actor.name,
        payrollMonth: mode === "payroll" ? num(payment.payrollMonth) : null,
        payrollYear: mode === "payroll" ? num(payment.payrollYear) : null,
      };
      const [claim] = await ExpenseClaim.findOrCreate({
        where: { reimbursementId: header.id },
        defaults: { tenantId, reimbursementId: header.id, kind: "legacy", claimedAmount: header.amount },
        transaction: t,
      });
      await claim.update(fields, { transaction: t });
      await header.update({ status: "paid", updatedBy: actor.id }, { transaction: t });
    });
    paid.push(header.id);
  }
  return { paid, skipped };
}

// ───────────────────────────── read models ─────────────────────────────

async function lookupMaps(tenantId, employeeIds) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  const [emps, departments, categories] = await Promise.all([
    ids.length
      ? empPersonal.findAll({
          where: { tenantId, id: { [Op.in]: ids } },
          attributes: ["id", "firstName", "lastName", "empCode", "departmentId", "reportingPersonId"],
          raw: true,
        })
      : [],
    Department.findAll({ where: { tenantId }, attributes: ["id", "name"], raw: true }),
    ExpenseCategory.findAll({ where: { tenantId }, attributes: ["id", "name"], raw: true }),
  ]);
  return {
    people: Object.fromEntries(emps.map((e) => [e.id, { ...e, name: fullName(e) }])),
    departments: Object.fromEntries(departments.map((d) => [d.id, d.name])),
    categories: Object.fromEntries(categories.map((c) => [c.id, c.name])),
  };
}

/** Display status: legacy "recommended" is still awaiting a decision. */
const displayStatus = (s) => (s === "recommended" ? "pending" : s);

/**
 * Flat claim rows (one per reimbursement) for lists, dashboards and exports.
 * `where` filters the reimbursements table.
 */
async function claimRows(where) {
  const headers = await Reimbursement.findAll({ where, order: [["createdAt", "DESC"]], raw: true });
  if (!headers.length) return { rows: [], items: [] };
  const tenantId = headers[0].tenantId;
  const ids = headers.map((h) => h.id);
  const [claims, items] = await Promise.all([
    ExpenseClaim.findAll({ where: { reimbursementId: { [Op.in]: ids } }, raw: true }),
    ExpenseItem.findAll({ where: { reimbursementId: { [Op.in]: ids } }, raw: true }),
  ]);
  const claimBy = Object.fromEntries(claims.map((c) => [c.reimbursementId, c]));
  const maps = await lookupMaps(tenantId, headers.map((h) => h.employeeId));

  const rows = headers.map((h) => {
    const c = claimBy[h.id];
    const emp = maps.people[h.employeeId] || {};
    const isExpense = c?.kind === "expense";
    const myItems = items.filter((i) => i.reimbursementId === h.id);
    const departmentId = c?.departmentId || emp.departmentId || null;
    const status = displayStatus(h.status);
    return {
      id: h.id,
      claimNo: c?.claimNo || null,
      kind: isExpense ? "expense" : "legacy",
      title: c?.title || h.remark,
      employeeId: h.employeeId,
      employeeName: emp.name || "",
      empCode: emp.empCode || "",
      departmentId,
      department: maps.departments[departmentId] || "Unassigned",
      amount: c?.claimedAmount != null ? Number(c.claimedAmount) : Number(h.amount),
      fromDate: h.fromDate,
      toDate: h.toDate,
      status,
      categories: [...new Set(myItems.map((i) => maps.categories[i.categoryId]).filter(Boolean))],
      itemCount: myItems.length,
      flagCount: c?.flagCount || 0,
      pendingWith: status === "pending" && isExpense ? c.approvalLevels?.[c.currentLevel] || null : status === "pending" ? "hr" : null,
      managerId: c?.managerId || emp.reportingPersonId || null,
      submittedAt: c?.submittedAt || h.createdAt,
      approvedAt: c?.approvedAt || null,
      paymentMode: c?.paymentMode || null,
      paymentReference: c?.paymentReference || null,
      paidAt: c?.paidAt || null,
      rejectionReason: c?.rejectionReason || null,
    };
  });
  return {
    rows,
    items: items.map((i) => ({ ...i, amount: Number(i.amount), category: maps.categories[i.categoryId] || "" })),
  };
}

/** Full claim payload for the detail screen. */
async function buildClaimDetail(header, claim) {
  const h = header.get ? header.get({ plain: true }) : header;
  const c = claim ? (claim.get ? claim.get({ plain: true }) : claim) : null;
  const [items, approvals, files] = await Promise.all([
    ExpenseItem.findAll({ where: { reimbursementId: h.id }, order: [["expenseDate", "ASC"]], raw: true }),
    ExpenseApproval.findAll({ where: { reimbursementId: h.id }, order: [["createdAt", "ASC"]], raw: true }),
    ReimbursementFile.findAll({ where: { reimbursementId: h.id }, attributes: ["id", "image", "doc_type"], raw: true }),
  ]);
  const receiptIds = items.map((i) => i.receiptId).filter(Boolean);
  const receipts = receiptIds.length ? await ExpenseReceipt.findAll({ where: { id: { [Op.in]: receiptIds } }, raw: true }) : [];
  const receiptBy = Object.fromEntries(receipts.map((r) => [r.id, r]));
  const maps = await lookupMaps(h.tenantId, [h.employeeId, c?.managerId]);
  const emp = maps.people[h.employeeId] || {};

  const level = currentLevelOf(h, c);
  let waitingOn = null;
  if (level) {
    const person = await personForLevel(level, { ...c, employeeId: h.employeeId });
    const personName = person ? (await lookupMaps(h.tenantId, [person])).people[person]?.name : null;
    waitingOn = { level, label: LEVEL_LABELS[level], name: personName || LEVEL_LABELS[level] };
  }

  return {
    claim: {
      id: h.id,
      kind: c?.kind === "expense" ? "expense" : "legacy",
      claimNo: c?.claimNo || null,
      title: c?.title || h.remark,
      remark: h.remark,
      status: displayStatus(h.status),
      amount: c?.claimedAmount != null ? Number(c.claimedAmount) : Number(h.amount),
      fromDate: h.fromDate,
      toDate: h.toDate,
      submittedAt: c?.submittedAt || h.createdAt,
      approvedAt: c?.approvedAt || null,
      rejectionReason: c?.rejectionReason || null,
      flagCount: c?.flagCount || 0,
      approvalLevels: (c?.approvalLevels || []).map((l) => ({ level: l, label: LEVEL_LABELS[l] || l })),
      currentLevel: c?.currentLevel ?? 0,
      waitingOn,
      payment: c?.paidAt
        ? {
            mode: c.paymentMode,
            reference: c.paymentReference,
            paidAt: c.paidAt,
            paidByName: c.paidByName,
            payrollMonth: c.payrollMonth,
            payrollYear: c.payrollYear,
          }
        : null,
    },
    employee: {
      id: h.employeeId,
      name: emp.name || "",
      empCode: emp.empCode || "",
      department: maps.departments[c?.departmentId || emp.departmentId] || "",
      managerName: maps.people[c?.managerId]?.name || "",
    },
    items: items.map((i) => {
      const r = receiptBy[i.receiptId];
      return {
        ...i,
        amount: Number(i.amount),
        category: maps.categories[i.categoryId] || "",
        flags: i.flags || [],
        receipt: r ? { id: r.id, fileName: r.fileName, mimeType: r.mimeType, ocrStatus: r.ocrStatus, ocrData: r.ocrData } : null,
      };
    }),
    files,
    approvals,
  };
}

/** Dashboard aggregates from claimRows output. */
function summarize(rows, items) {
  const sum = (list) => round2(list.reduce((s, r) => s + r.amount, 0));
  const byStatus = {};
  for (const s of ["pending", "approved", "paid", "rejected", "cancelled"]) {
    const list = rows.filter((r) => r.status === s);
    byStatus[s] = { count: list.length, amount: sum(list) };
  }

  const activeIds = new Set(rows.filter((r) => !INACTIVE_STATUSES.includes(r.status)).map((r) => r.id));
  const activeItems = items.filter((i) => activeIds.has(i.reimbursementId));
  const byCategory = {};
  for (const i of activeItems) {
    byCategory[i.category] = byCategory[i.category] || { category: i.category, count: 0, amount: 0 };
    byCategory[i.category].count++;
    byCategory[i.category].amount = round2(byCategory[i.category].amount + i.amount);
  }

  const active = rows.filter((r) => activeIds.has(r.id));
  const byDepartment = {};
  for (const r of active) {
    byDepartment[r.department] = byDepartment[r.department] || { department: r.department, count: 0, amount: 0 };
    byDepartment[r.department].count++;
    byDepartment[r.department].amount = round2(byDepartment[r.department].amount + r.amount);
  }

  const months = [];
  for (let i = 11; i >= 0; i--) months.push(moment().tz("Asia/Kolkata").subtract(i, "months").format("YYYY-MM"));
  const monthly = months.map((m) => {
    const list = active.filter((r) => String(r.fromDate).slice(0, 7) === m);
    return { month: m, count: list.length, amount: sum(list) };
  });

  const spenders = {};
  for (const r of active) {
    spenders[r.employeeId] = spenders[r.employeeId] || { employeeId: r.employeeId, employeeName: r.employeeName, department: r.department, count: 0, amount: 0 };
    spenders[r.employeeId].count++;
    spenders[r.employeeId].amount = round2(spenders[r.employeeId].amount + r.amount);
  }

  const pendingByLevel = {};
  rows.filter((r) => r.status === "pending").forEach((r) => {
    const key = LEVEL_LABELS[r.pendingWith] || "HR";
    pendingByLevel[key] = (pendingByLevel[key] || 0) + 1;
  });

  const approvalDays = rows
    .filter((r) => r.approvedAt && r.submittedAt)
    .map((r) => moment(r.approvedAt).diff(moment(r.submittedAt), "hours") / 24);

  return {
    totalClaims: rows.length,
    totalAmount: sum(active),
    byStatus,
    outstandingPayable: byStatus.approved.amount,
    flaggedClaims: rows.filter((r) => r.flagCount > 0 && activeIds.has(r.id)).length,
    avgApprovalDays: approvalDays.length ? round2(approvalDays.reduce((s, d) => s + d, 0) / approvalDays.length) : null,
    byCategory: Object.values(byCategory).sort((a, b) => b.amount - a.amount),
    byDepartment: Object.values(byDepartment).sort((a, b) => b.amount - a.amount),
    monthly,
    topSpenders: Object.values(spenders).sort((a, b) => b.amount - a.amount).slice(0, 10),
    pendingByLevel: Object.entries(pendingByLevel).map(([level, count]) => ({ level, count })),
  };
}

module.exports = {
  ExpenseValidationError,
  LEVEL_ORDER,
  LEVEL_LABELS,
  PAYMENT_MODES,
  num,
  sortLevels,
  getSettings,
  resolveLevels,
  validateItems,
  submitClaim,
  loadClaim,
  isWorkflowClaim,
  currentLevelOf,
  portalCanAct,
  actOnClaim,
  markPaid,
  claimRows,
  buildClaimDetail,
  summarize,
};
