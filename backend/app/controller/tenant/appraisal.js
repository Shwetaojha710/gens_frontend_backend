const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const sequelize = require("../../connection/connection");
const empPersonal = require("../../models/empPersonal");
const Basic = require("../../models/basic");
const allowance = require("../../models/allowance");
const deductionS = require("../../models/deductions");
const Designation = require("../../models/designation");
const Department = require("../../models/department");
const EmployeeOldSalary = require("../../models/employeeOldSalary");
const log = require("../../models/log");
const { writeAudit, toPlain } = require("../../helper/auditLog");


const roundAmt = (n) => Math.round(Number(n) || 0);

function headKey(source, id) {
  return `${source}:${id}`;
}

/** Temp month-only rows from salary generation — not part of structure / appraisal. */
function isExcludedSalaryHead(row) {
  const name = String(row?.name || "").trim().toLowerCase();
  if (name === "leave deduction" || name === "penalty") return true;
  if (String(row?.type || "").toLowerCase() === "is_special") return true;
  return false;
}

function buildHeads(basics, allowances, deductions) {
  const heads = [];

  for (const b of basics) {
    if (isExcludedSalaryHead(b)) continue;
    heads.push({
      key: headKey("basic", b.id),
      source: "basic",
      id: b.id,
      componentId: b.componentId,
      name: b.name,
      type: b.type,
      typeValue: b.typeValue,
      componentType: "payable",
      currentAmount: roundAmt(b.finalAmount),
      ctcAnchor: roundAmt(b.amount || b.finalCTC),
      closed: false,
    });
  }

  for (const a of allowances) {
    if (isExcludedSalaryHead(a)) continue;
    heads.push({
      key: headKey("allowance", a.id),
      source: "allowance",
      id: a.id,
      componentId: a.componentId,
      name: a.name,
      type: a.type,
      typeValue: a.typeValue,
      componentType: "payable",
      currentAmount: roundAmt(a.finalAmount),
      closed: false,
    });
  }

  for (const d of deductions) {
    if (isExcludedSalaryHead(d)) continue;
    heads.push({
      key: headKey("deduction", d.id),
      source: "deduction",
      id: d.id,
      componentId: d.componentId,
      name: d.name,
      type: d.type,
      typeValue: d.typeValue,
      componentType: "deductible",
      currentAmount: roundAmt(d.finalAmount),
      closed: true, // deductions excluded from % by default (payables only)
    });
  }

  return heads;
}

function applyIncrement(heads, percent, closedHeadKeys = []) {
  const closedSet = new Set(closedHeadKeys);
  const pct = Number(percent) || 0;
  const factor = 1 + pct / 100;

  return heads.map((h) => {
    const closed = closedSet.has(h.key);

    let increase = 0;
    let newAmount = h.currentAmount;

    // Payables + deductions both get % when not closed
    if (!closed && pct !== 0) {
      newAmount = roundAmt(h.currentAmount * factor);
      increase = newAmount - h.currentAmount;
    }

    return {
      ...h,
      closed,
      increase,
      newAmount,
    };
  });
}

/** [] from list-apply = close all deductions by default.
 *  Explicit array from modal = exact closed set (may open deductions). */
function resolveClosedKeys(heads, closedHeadKeys) {
  if (closedHeadKeys == null) {
    return heads
      .filter((h) => h.componentType === "deductible")
      .map((h) => h.key);
  }
  if (!Array.isArray(closedHeadKeys)) return [];
  // Empty array from list/bulk: keep old behaviour — deductions stay closed
  if (closedHeadKeys.length === 0) {
    return heads
      .filter((h) => h.componentType === "deductible")
      .map((h) => h.key);
  }
  return closedHeadKeys;
}

// function applyIncrement(heads, percent, closedHeadKeys = []) {
//   const closedSet = new Set(closedHeadKeys);
//   const pct = Number(percent) || 0;
//   const factor = 1 + pct / 100;

//   return heads.map((h) => {
//     const closed =
//       h.componentType === "deductible"
//         ? true
//         : closedSet.has(h.key) || !!h.closed;

//     let increase = 0;
//     let newAmount = h.currentAmount;

//     if (h.componentType === "payable" && !closed && pct !== 0) {
//       newAmount = roundAmt(h.currentAmount * factor);
//       increase = newAmount - h.currentAmount;
//     }

//     return {
//       ...h,
//       closed,
//       increase,
//       newAmount,
//     };
//   });
// }

function summarize(computedHeads) {
  const payables = computedHeads.filter((h) => h.componentType == "payable");
  const deductibles = computedHeads.filter(
    (h) => h.componentType == "deductible",
  );

  const currentCTC = payables.reduce((s, h) => s + h.currentAmount, 0);
  const newCTC = payables.reduce((s, h) => s + h.newAmount, 0);
  const totalIncrease = newCTC - currentCTC;
  const currentDeductions = deductibles.reduce(
    (s, h) => s + h.currentAmount,
    0,
  );
  const newDeductions = deductibles.reduce((s, h) => s + h.newAmount, 0);

  return {
    currentCTC,
    newCTC,
    totalIncrease,
    currentDeductions,
    newDeductions,
    currentNet: currentCTC - currentDeductions,
    newNet: newCTC - newDeductions,
  };
}

async function loadActiveStructure(tenantId, branchId, employeeId, transaction) {
  const opts = { raw: true };
  if (transaction) opts.transaction = transaction;
  const basics = await Basic.findAll({
    where: { tenantId, branchId, employeeId, status: "active" },
    ...opts,
  });
  const allowances = await allowance.findAll({
    where: { tenantId, branchId, employeeId, status: "active" },
    ...opts,
  });
  const deductions = await deductionS.findAll({
    where: { tenantId, branchId, employeeId, status: "active" },
    ...opts,
  });
  return { basics, allowances, deductions };
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function dateOnly(value) {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${value.getFullYear()}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function payableCtc(heads, field) {
  return (heads || [])
    .filter((h) => h.componentType === "payable")
    .reduce((sum, h) => sum + roundAmt(h[field]), 0);
}

/** Employee list with current CTC for appraisal */
exports.listAppraisalEmployees = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId =
      req.body?.branchId && req.body.branchId !== "null" && req.body.branchId !== ""
        ? req.body.branchId
        : req.users?.branchId;

    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (!branchId || branchId === "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employees = await empPersonal.findAll({
      where: { tenantId, branchId, status: "active" },
      attributes: [
        "id",
        "empCode",
        "firstName",
        "lastName",
        "email",
        "mobile",
        "departmentId",
        "designationId",
        "empType",
        "joiningDate",
      ],
      order: [
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
      raw: true,
    });

    if (!employees.length) {
      return Helper.response(true, "No employees found", [], res, 200);
    }

    const empIds = employees.map((e) => e.id);

    const basics = await Basic.findAll({
      where: {
        tenantId,
        branchId,
        employeeId: { [Op.in]: empIds },
        status: "active",
      },
      raw: true,
    });

    const startByEmp = {};
    for (const b of basics) {
      if (b.startDate) {
        if (
          !startByEmp[b.employeeId] ||
          new Date(b.startDate) > new Date(startByEmp[b.employeeId])
        ) {
          startByEmp[b.employeeId] = b.startDate;
        }
      }
    }

    const allowances = await allowance.findAll({
      where: {
        tenantId,
        branchId,
        employeeId: { [Op.in]: empIds },
        status: "active",
      },
      raw: true,
    });

    const payableSum = {};
    for (const b of basics) {
      if (isExcludedSalaryHead(b)) continue;
      payableSum[b.employeeId] =
        (payableSum[b.employeeId] || 0) + roundAmt(b.finalAmount);
    }
    for (const a of allowances) {
      if (isExcludedSalaryHead(a)) continue;
      payableSum[a.employeeId] =
        (payableSum[a.employeeId] || 0) + roundAmt(a.finalAmount);
    }

    const deptIds = [
      ...new Set(employees.map((e) => e.departmentId).filter(Boolean)),
    ];
    const desigIds = [
      ...new Set(employees.map((e) => e.designationId).filter(Boolean)),
    ];

    const [depts, desigs] = await Promise.all([
      deptIds.length
        ? Department.findAll({
            where: { id: { [Op.in]: deptIds } },
            attributes: ["id", "name"],
            raw: true,
          })
        : [],
      desigIds.length
        ? Designation.findAll({
            where: { id: { [Op.in]: desigIds } },
            attributes: ["id", "name"],
            raw: true,
          })
        : [],
    ]);

    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));
    const desigMap = Object.fromEntries(desigs.map((d) => [d.id, d.name]));

    const list = employees.map((e) => {
      const currentCTC = payableSum[e.id] || 0;
      return {
        id: e.id,
        empCode: e.empCode,
        employeeName: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
        email: e.email,
        mobile: e.mobile,
        department: deptMap[e.departmentId] || null,
        designation: desigMap[e.designationId] || null,
        empType: e.empType,
        dateOfJoining: e.joiningDate,
        currentCTC,
        lastSalaryStartDate: startByEmp[e.id] || null,
        hasSalary: currentCTC > 0,
      };
    });

    return Helper.response(
      true,
      "Appraisal employee list",
      list,
      res,
      200,
    );
  } catch (error) {
    console.error("listAppraisalEmployees:", error);
    return Helper.response(false, error?.message || "Server error", [], res, 500);
  }
};

/** Current salary heads for one employee */
exports.getAppraisalDetail = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const { employeeId } = req.body || {};

    if (!tenantId || !branchId) {
      return Helper.response(false, "tenantId/branchId required", {}, res, 400);
    }
    if (!employeeId) {
      return Helper.response(false, "employeeId is required", {}, res, 400);
    }

    const emp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
      raw: true,
    });
    if (!emp) {
      return Helper.response(false, "Employee not found", {}, res, 404);
    }

    const { basics, allowances, deductions } = await loadActiveStructure(
      tenantId,
      branchId,
      employeeId,
    );

    if (!basics.length && !allowances.length) {
      return Helper.response(
        false,
        "No active salary structure found. Set up salary first.",
        {},
        res,
        404,
      );
    }

    const heads = buildHeads(basics, allowances, deductions);
    const computed = applyIncrement(heads, 0, []);
    const summary = summarize(computed);

    return Helper.response(
      true,
      "Appraisal detail",
      {
        employee: {
          id: emp.id,
          empCode: emp.empCode,
          employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
          empType: emp.empType,
        },
        heads: computed,
        summary,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("getAppraisalDetail:", error);
    return Helper.response(false, error?.message || "Server error", {}, res, 500);
  }
};

/** Preview increment with % and closed heads */
exports.previewAppraisal = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const { employeeId, percent, closedHeadKeys } = req.body || {};

    if (!tenantId || !branchId || !employeeId) {
      return Helper.response(false, "Required fields missing", {}, res, 400);
    }
    if (percent === undefined || percent === null || Number(percent) < 0) {
      return Helper.response(false, "Valid increment percent is required", {}, res, 400);
    }

    const { basics, allowances, deductions } = await loadActiveStructure(
      tenantId,
      branchId,
      employeeId,
    );

    if (!basics.length && !allowances.length) {
      return Helper.response(
        false,
        "No active salary structure found",
        {},
        res,
        404,
      );
    }

    // const heads = buildHeads(basics, allowances, deductions);
    // const computed = applyIncrement(
    //   heads,
    //   percent,
    //   Array.isArray(closedHeadKeys) ? closedHeadKeys : [],
    // );
    // const summary = summarize(computed);

    const heads = buildHeads(basics, allowances, deductions);
    const keys = resolveClosedKeys(
      heads,
      Array.isArray(closedHeadKeys) ? closedHeadKeys : null,
    );
    const computed = applyIncrement(heads, percent, keys);
    const summary = summarize(computed);

    return Helper.response(
      true,
      "Appraisal preview",
      { heads: computed, summary, percent: Number(percent) },
      res,
      200,
    );
  } catch (error) {
    console.error("previewAppraisal:", error);
    return Helper.response(false, error?.message || "Server error", {}, res, 500);
  }
};

/**
 * Version the active salary structure.
 * Caller owns the transaction. Pass skipAudit when the caller updates an existing appraisal log.
 */
async function runApplyAppraisal({
  req,
  transaction,
  tenantId,
  branchId,
  userId,
  employeeId,
  percent,
  closedHeadKeys,
  effectiveDate,
  skipAudit = false,
}) {
  if (!tenantId || !branchId || !employeeId) {
    return { ok: false, status: 400, message: "Required fields missing" };
  }
  if (percent === undefined || percent === null || Number(percent) < 0) {
    return { ok: false, status: 400, message: "Valid increment percent is required" };
  }
  if (!effectiveDate) {
    return { ok: false, status: 400, message: "effectiveDate is required" };
  }

  const emp = await empPersonal.findOne({
    where: { id: employeeId, tenantId, branchId },
    transaction,
    raw: true,
  });
  if (!emp) {
    return { ok: false, status: 404, message: "Employee not found" };
  }

  const { basics, allowances, deductions } = await loadActiveStructure(
    tenantId,
    branchId,
    employeeId,
    transaction,
  );

  if (!basics.length && !allowances.length) {
    return { ok: false, status: 404, message: "No active salary structure found" };
  }

  const sameDateRows = await Basic.findAll({
    where: {
      tenantId,
      branchId,
      employeeId,
      startDate: effectiveDate,
      status: "active",
    },
    transaction,
  });
  if (sameDateRows.some((row) => !isExcludedSalaryHead(row))) {
    return {
      ok: false,
      status: 400,
      message: "Salary already exists for this effective date",
    };
  }

    const heads = buildHeads(basics, allowances, deductions);
    const keys = resolveClosedKeys(
      heads,
      Array.isArray(closedHeadKeys) ? closedHeadKeys : null,
    );
    const computed = applyIncrement(heads, percent, keys);
    const summary = summarize(computed);

    if (summary.totalIncrease === 0 && Number(percent) > 0) {
      // Still allow if all payable heads closed — but warn via message
    }

    const oldCTC = summary.currentCTC;
    const newCTC = summary.newCTC;

    const endDate = new Date(effectiveDate);
    endDate.setDate(endDate.getDate() - 1);
    const endDateStr = endDate.toISOString().slice(0, 10);

    // Only close structure heads being replaced — keep Leave Deduction / Penalty / is_special untouched
    const basicIds = computed.filter((h) => h.source === "basic").map((h) => h.id);
    const allowanceIds = computed
      .filter((h) => h.source === "allowance")
      .map((h) => h.id);
    const deductionIds = computed
      .filter((h) => h.source === "deduction")
      .map((h) => h.id);

    if (basicIds.length) {
      await Basic.update(
        { endDate: endDateStr, status: "inactive" },
        {
          where: {
            id: { [Op.in]: basicIds },
            employeeId,
            branchId,
            tenantId,
            status: "active",
          },
          transaction,
        },
      );
    }
    if (allowanceIds.length) {
      await allowance.update(
        { endDate: endDateStr, status: "inactive" },
        {
          where: {
            id: { [Op.in]: allowanceIds },
            employeeId,
            branchId,
            tenantId,
            status: "active",
          },
          transaction,
        },
      );
    }
    if (deductionIds.length) {
      await deductionS.update(
        { endDate: endDateStr, status: "inactive" },
        {
          where: {
            id: { [Op.in]: deductionIds },
            employeeId,
            branchId,
            tenantId,
            status: "active",
          },
          transaction,
        },
      );
    }

    const basicById = Object.fromEntries(basics.map((b) => [b.id, b]));
    const allowById = Object.fromEntries(allowances.map((a) => [a.id, a]));
    const dedById = Object.fromEntries(deductions.map((d) => [d.id, d]));

    const basicRecords = [];
    const allowanceRecords = [];
    const deductionRecords = [];

    for (const h of computed) {
      if (h.source === "basic") {
        const old = basicById[h.id];
        if (!old || isExcludedSalaryHead(old)) continue;
        basicRecords.push({
          employeeId,
          tenantId,
          branchId,
          componentId: old.componentId,
          name: old.name,
          typeValue: old.typeValue,
          type: old.type,
          amount: newCTC,
          finalAmount: h.newAmount,
          finalCTC: newCTC,
          createdBy: userId,
          dependent: old.dependent || "CTC",
          startDate: effectiveDate,
          status: "active",
        });
      } else if (h.source === "allowance") {
        const old = allowById[h.id];
        if (!old || isExcludedSalaryHead(old)) continue;
        allowanceRecords.push({
          employeeId,
          tenantId,
          branchId,
          componentId: old.componentId,
          name: old.name,
          type: old.type,
          typeValue: old.typeValue,
          finalAmount: h.newAmount,
          amount: old.amount,
          status: "active",
          startDate: effectiveDate,
          dependent: old.dependent,
          createdBy: userId,
        });
      } else if (h.source === "deduction") {
        const old = dedById[h.id];
        if (!old || isExcludedSalaryHead(old)) continue;
        deductionRecords.push({
          employeeId,
          tenantId,
          branchId,
          componentId: old.componentId,
          name: old.name,
          type: old.type,
          typeValue: old.typeValue,
          finalAmount: h.newAmount,
          amount: old.amount,
          status: "active",
          startDate: effectiveDate,
          dependent: old.dependent,
          createdBy: userId,
        });
      }
    }

    if (basicRecords.length) {
      await Basic.bulkCreate(basicRecords, { transaction });
    }
    if (allowanceRecords.length) {
      await allowance.bulkCreate(allowanceRecords, { transaction });
    }
    if (deductionRecords.length) {
      await deductionS.bulkCreate(deductionRecords, { transaction });
    }

    // Store previous CTC for salary-register appraisal columns
    const existingOld = await EmployeeOldSalary.findOne({
      where: { employeeId },
      transaction,
    });
    if (existingOld) {
      await existingOld.update(
        { oldSalary: oldCTC, empCode: emp.empCode },
        { transaction },
      );
    } else {
      await EmployeeOldSalary.create(
        {
          employeeId,
          empCode: emp.empCode,
          oldSalary: oldCTC,
        },
        { transaction },
      );
    }
  const auditOld = {
    percent: null,
    ctcBefore: oldCTC,
    structure: { basics, allowances, deductions },
  };
  const auditNew = {
    percent: Number(percent),
    effectiveDate,
    closedHeadKeys: keys,
    ctcAfter: newCTC,
    computed: toPlain(computed),
  };

  if (!skipAudit) {
    await writeAudit({
      req,
      actionType: "APPRAISAL_APPLY",
      referenceId: employeeId,
      employeeId,
      oldValue: auditOld,
      newValue: auditNew,
      remarks: `Appraisal ${percent}% effective ${effectiveDate}`,
      transaction,
    });
  }

  return {
    ok: true,
    data: {
      employeeId,
      percent: Number(percent),
      effectiveDate,
      heads: computed,
      summary,
      oldCTC,
      newCTC,
      emp,
      auditOld,
      auditNew,
    },
  };
}

/** Apply appraisal — version salary structure like updateSalarySetup */
exports.applyAppraisal = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const result = await runApplyAppraisal({
      req,
      transaction,
      tenantId: req.users?.tenantId,
      branchId: req.users?.branchId,
      userId: req.users?.id,
      employeeId: req.body?.employeeId,
      percent: req.body?.percent,
      closedHeadKeys: req.body?.closedHeadKeys,
      effectiveDate: req.body?.effectiveDate,
    });
    if (!result.ok) {
      await transaction.rollback();
      return Helper.response(false, result.message, {}, res, result.status || 400);
    }
    await transaction.commit();
    const { auditOld, auditNew, emp, ...payload } = result.data;
    return Helper.response(true, "Appraisal applied successfully", payload, res, 200);
  } catch (error) {
    console.error("applyAppraisal:", error);
    await transaction.rollback();
    return Helper.response(false, error?.message || "Server error", {}, res, 500);
  }
};

function idsFromRows(rows) {
  return (rows || []).filter((row) => !isExcludedSalaryHead(row)).map((row) => row.id);
}

function snapshotHeads(newValue, structure) {
  const computed = Array.isArray(newValue?.computed) ? newValue.computed : [];
  const fromComputed = {
    basic: computed.filter((h) => h.source === "basic").map((h) => h.id),
    allowance: computed.filter((h) => h.source === "allowance").map((h) => h.id),
    deduction: computed.filter((h) => h.source === "deduction").map((h) => h.id),
  };
  if (fromComputed.basic.length || fromComputed.allowance.length) return fromComputed;
  return {
    basic: idsFromRows(structure?.basics),
    allowance: idsFromRows(structure?.allowances),
    deduction: idsFromRows(structure?.deductions),
  };
}

async function removeVersionRows(model, whereBase, effectiveDate, transaction) {
  const rows = await model.findAll({
    where: { ...whereBase, status: "active", startDate: effectiveDate },
    transaction,
  });
  const ids = rows.filter((row) => !isExcludedSalaryHead(row)).map((row) => row.id);
  if (!ids.length) return;
  await model.destroy({ where: { id: { [Op.in]: ids } }, transaction });
}

async function reactivateRows(model, ids, employeeId, tenantId, branchId, transaction) {
  if (!ids.length) return 0;
  const [count] = await model.update(
    { status: "active", endDate: null },
    {
      where: {
        id: { [Op.in]: ids },
        employeeId,
        tenantId,
        branchId,
        status: "inactive",
      },
      transaction,
    },
  );
  return count;
}

function structureStillMatches(rows, effectiveDate, required) {
  const structureRows = (rows || []).filter((row) => !isExcludedSalaryHead(row));
  if (!structureRows.length) return !required;
  return structureRows.every((row) => dateOnly(row.startDate) === dateOnly(effectiveDate));
}

async function loadAppliedAppraisalRow(tenantId, branchId, appraisalId) {
  if (!appraisalId) return { error: "appraisalId is required", status: 400 };
  const row = await log.findOne({
    where: { id: appraisalId, tenantId, actionType: "APPRAISAL_APPLY" },
  });
  if (!row) return { error: "Appraisal not found", status: 404 };

  const employee = await empPersonal.findOne({
    where: { id: row.employeeId, tenantId, branchId },
    raw: true,
  });
  if (!employee) return { error: "Appraisal not found", status: 404 };

  const newValue = parseJson(row.newValue) || {};
  const oldValue = parseJson(row.oldValue) || {};
  const structure = oldValue.structure || {};
  if (!newValue.effectiveDate) {
    return { error: "Appraisal record is incomplete", status: 400 };
  }
  return { row, employee, newValue, oldValue, structure };
}

/** All appraisals applied in this branch */
exports.listAppliedAppraisals = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId =
      req.body?.branchId && req.body.branchId !== "null" && req.body.branchId !== ""
        ? req.body.branchId
        : req.users?.branchId;

    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (!branchId || branchId === "null") {
      return Helper.response(false, "branchId is required!", [], res, 200);
    }

    const rows = await log.findAll({
      where: { tenantId, actionType: "APPRAISAL_APPLY" },
      order: [["createdAt", "DESC"]],
    });

    if (!rows.length) {
      return Helper.response(true, "Appraisal list", [], res, 200);
    }

    const empIds = [...new Set(rows.map((r) => r.employeeId).filter(Boolean))];
    const employees = await empPersonal.findAll({
      where: { tenantId, branchId, id: { [Op.in]: empIds } },
      attributes: ["id", "empCode", "firstName", "lastName", "departmentId", "designationId"],
      raw: true,
    });
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

    const deptIds = [...new Set(employees.map((e) => e.departmentId).filter(Boolean))];
    const desigIds = [...new Set(employees.map((e) => e.designationId).filter(Boolean))];
    const [depts, desigs] = await Promise.all([
      deptIds.length
        ? Department.findAll({
            where: { id: { [Op.in]: deptIds } },
            attributes: ["id", "name"],
            raw: true,
          })
        : [],
      desigIds.length
        ? Designation.findAll({
            where: { id: { [Op.in]: desigIds } },
            attributes: ["id", "name"],
            raw: true,
          })
        : [],
    ]);
    const deptMap = Object.fromEntries(depts.map((d) => [d.id, d.name]));
    const desigMap = Object.fromEntries(desigs.map((d) => [d.id, d.name]));

    const latestByEmp = {};
    for (const row of rows) {
      if (!empMap[row.employeeId]) continue;
      const prev = latestByEmp[row.employeeId];
      if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) {
        latestByEmp[row.employeeId] = row;
      }
    }

    const list = [];
    for (const row of rows) {
      const emp = empMap[row.employeeId];
      if (!emp) continue;
      const nv = parseJson(row.newValue) || {};
      const computed = Array.isArray(nv.computed) ? nv.computed : [];
      const oldCTC = payableCtc(computed, "currentAmount") || roundAmt(parseJson(row.oldValue)?.ctcBefore);
      const newCTC = roundAmt(nv.ctcAfter) || payableCtc(computed, "newAmount");
      list.push({
        id: row.id,
        employeeId: emp.id,
        empCode: emp.empCode,
        employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
        department: deptMap[emp.departmentId] || null,
        designation: desigMap[emp.designationId] || null,
        percent: Number(nv.percent) || 0,
        effectiveDate: nv.effectiveDate || null,
        oldCTC,
        newCTC,
        appliedOn: row.createdAt,
        canEdit: latestByEmp[emp.id]?.id === row.id,
      });
    }

    return Helper.response(true, "Appraisal list", list, res, 200);
  } catch (error) {
    console.error("listAppliedAppraisals:", error);
    return Helper.response(false, error?.message || "Server error", [], res, 500);
  }
};

/** One applied appraisal, rebuilt from the salary snapshot taken before it was applied */
exports.getAppliedAppraisal = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const loaded = await loadAppliedAppraisalRow(tenantId, branchId, req.body?.appraisalId);
    if (loaded.error) {
      return Helper.response(false, loaded.error, {}, res, loaded.status);
    }

    const { row, employee, newValue, structure } = loaded;
    const basics = structure.basics || [];
    const allowances = structure.allowances || [];
    const deductions = structure.deductions || [];
    if (!basics.length && !allowances.length) {
      return Helper.response(
        false,
        "This appraisal cannot be edited because the previous salary snapshot is missing",
        {},
        res,
        400,
      );
    }

    const heads = buildHeads(basics, allowances, deductions);
    const keys = Array.isArray(newValue.closedHeadKeys) ? newValue.closedHeadKeys : null;
    const resolved = resolveClosedKeys(heads, keys);
    const computed = applyIncrement(heads, newValue.percent || 0, resolved);

    const newer = await log.findOne({
      where: {
        tenantId,
        employeeId: employee.id,
        actionType: "APPRAISAL_APPLY",
        createdAt: { [Op.gt]: row.createdAt },
      },
    });

    return Helper.response(
      true,
      "Appraisal record",
      {
        id: row.id,
        employee: {
          id: employee.id,
          empCode: employee.empCode,
          employeeName: `${employee.firstName || ""} ${employee.lastName || ""}`.trim(),
        },
        percent: Number(newValue.percent) || 0,
        effectiveDate: newValue.effectiveDate,
        heads: computed,
        summary: summarize(computed),
        canEdit: !newer,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("getAppliedAppraisal:", error);
    return Helper.response(false, error?.message || "Server error", {}, res, 500);
  }
};

/** Preview an edit against the pre-appraisal salary, not the current salary */
exports.previewAppliedAppraisal = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const { appraisalId, percent, closedHeadKeys } = req.body || {};
    if (percent === undefined || percent === null || Number(percent) < 0) {
      return Helper.response(false, "Valid increment percent is required", {}, res, 400);
    }

    const loaded = await loadAppliedAppraisalRow(tenantId, branchId, appraisalId);
    if (loaded.error) {
      return Helper.response(false, loaded.error, {}, res, loaded.status);
    }

    const structure = loaded.structure || {};
    const heads = buildHeads(
      structure.basics || [],
      structure.allowances || [],
      structure.deductions || [],
    );
    const keys = resolveClosedKeys(
      heads,
      Array.isArray(closedHeadKeys) ? closedHeadKeys : null,
    );
    const computed = applyIncrement(heads, percent, keys);
    return Helper.response(
      true,
      "Appraisal edit preview",
      { heads: computed, summary: summarize(computed), percent: Number(percent) },
      res,
      200,
    );
  } catch (error) {
    console.error("previewAppliedAppraisal:", error);
    return Helper.response(false, error?.message || "Server error", {}, res, 500);
  }
};

/** Edit the latest appraisal: restore the previous salary version, then re-apply */
exports.updateAppliedAppraisal = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const userId = req.users?.id;
    const { appraisalId, percent, closedHeadKeys, effectiveDate } = req.body || {};

    const loaded = await loadAppliedAppraisalRow(tenantId, branchId, appraisalId);
    if (loaded.error) {
      await transaction.rollback();
      return Helper.response(false, loaded.error, {}, res, loaded.status);
    }

    const { row, employee, newValue, structure } = loaded;
    const previousDate = dateOnly(newValue.effectiveDate);
    const versionIds = snapshotHeads(newValue, structure);
    if (!versionIds.basic.length && !versionIds.allowance.length) {
      await transaction.rollback();
      return Helper.response(
        false,
        "This appraisal cannot be edited because the previous salary snapshot is missing",
        {},
        res,
        400,
      );
    }

    const newer = await log.findOne({
      where: {
        tenantId,
        employeeId: employee.id,
        actionType: "APPRAISAL_APPLY",
        createdAt: { [Op.gt]: row.createdAt },
      },
      transaction,
    });
    if (newer) {
      await transaction.rollback();
      return Helper.response(
        false,
        "Only the latest appraisal for this employee can be edited",
        {},
        res,
        400,
      );
    }

    const current = await loadActiveStructure(tenantId, branchId, employee.id, transaction);
    const stillCurrent =
      structureStillMatches(current.basics, previousDate, versionIds.basic.length > 0) &&
      structureStillMatches(current.allowances, previousDate, versionIds.allowance.length > 0) &&
      structureStillMatches(current.deductions, previousDate, versionIds.deduction.length > 0);
    if (!stillCurrent) {
      await transaction.rollback();
      return Helper.response(
        false,
        "Salary was changed after this appraisal, so it cannot be edited",
        {},
        res,
        400,
      );
    }

    const whereBase = { tenantId, branchId, employeeId: employee.id };
    await removeVersionRows(Basic, whereBase, previousDate, transaction);
    await removeVersionRows(allowance, whereBase, previousDate, transaction);
    await removeVersionRows(deductionS, whereBase, previousDate, transaction);

    const basicRestored = await reactivateRows(
      Basic,
      versionIds.basic,
      employee.id,
      tenantId,
      branchId,
      transaction,
    );
    const allowanceRestored = await reactivateRows(
      allowance,
      versionIds.allowance,
      employee.id,
      tenantId,
      branchId,
      transaction,
    );
    const deductionRestored = await reactivateRows(
      deductionS,
      versionIds.deduction,
      employee.id,
      tenantId,
      branchId,
      transaction,
    );
    const restoredOk =
      basicRestored === versionIds.basic.length &&
      allowanceRestored === versionIds.allowance.length &&
      deductionRestored === versionIds.deduction.length;
    if (!restoredOk) {
      await transaction.rollback();
      return Helper.response(
        false,
        "Previous salary version could not be restored",
        {},
        res,
        400,
      );
    }

    const result = await runApplyAppraisal({
      req,
      transaction,
      tenantId,
      branchId,
      userId,
      employeeId: employee.id,
      percent,
      closedHeadKeys,
      effectiveDate,
      skipAudit: true,
    });
    if (!result.ok) {
      await transaction.rollback();
      return Helper.response(false, result.message, {}, res, result.status || 400);
    }

    await row.update(
      {
        oldValue: result.data.auditOld,
        newValue: result.data.auditNew,
        remarks: `Appraisal ${percent}% effective ${effectiveDate}`,
      },
      { transaction },
    );
    await writeAudit({
      req,
      actionType: "APPRAISAL_UPDATE",
      referenceId: row.id,
      employeeId: employee.id,
      oldValue: newValue,
      newValue: result.data.auditNew,
      remarks: `Appraisal updated to ${percent}% effective ${effectiveDate}`,
      transaction,
    });

    await transaction.commit();
    const { auditOld, auditNew, emp, ...payload } = result.data;
    return Helper.response(true, "Appraisal updated successfully", payload, res, 200);
  } catch (error) {
    console.error("updateAppliedAppraisal:", error);
    await transaction.rollback();
    return Helper.response(false, error?.message || "Server error", {}, res, 500);
  }
};
