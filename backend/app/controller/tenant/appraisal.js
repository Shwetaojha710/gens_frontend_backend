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

const roundAmt = (n) => Math.round(Number(n) || 0);

function headKey(source, id) {
  return `${source}:${id}`;
}

function buildHeads(basics, allowances, deductions) {
  const heads = [];

  for (const b of basics) {
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
    const closed =
      h.componentType === "deductible"
        ? true
        : closedSet.has(h.key) || !!h.closed;

    let increase = 0;
    let newAmount = h.currentAmount;

    if (h.componentType === "payable" && !closed && pct !== 0) {
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

function summarize(computedHeads) {
  const payables = computedHeads.filter((h) => h.componentType === "payable");
  const deductibles = computedHeads.filter(
    (h) => h.componentType === "deductible",
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

async function loadActiveStructure(tenantId, branchId, employeeId) {
  const basics = await Basic.findAll({
    where: { tenantId, branchId, employeeId, status: "active" },
    raw: true,
  });
  const allowances = await allowance.findAll({
    where: { tenantId, branchId, employeeId, status: "active" },
    raw: true,
  });
  const deductions = await deductionS.findAll({
    where: { tenantId, branchId, employeeId, status: "active" },
    raw: true,
  });
  return { basics, allowances, deductions };
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
      payableSum[b.employeeId] =
        (payableSum[b.employeeId] || 0) + roundAmt(b.finalAmount);
    }
    for (const a of allowances) {
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

    const heads = buildHeads(basics, allowances, deductions);
    const computed = applyIncrement(
      heads,
      percent,
      Array.isArray(closedHeadKeys) ? closedHeadKeys : [],
    );
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

/** Apply appraisal — version salary structure like updateSalarySetup */
exports.applyAppraisal = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const userId = req.users?.id;
    const { employeeId, percent, closedHeadKeys, effectiveDate } = req.body || {};

    if (!tenantId || !branchId || !employeeId) {
      await transaction.rollback();
      return Helper.response(false, "Required fields missing", {}, res, 400);
    }
    if (percent === undefined || percent === null || Number(percent) < 0) {
      await transaction.rollback();
      return Helper.response(false, "Valid increment percent is required", {}, res, 400);
    }
    if (!effectiveDate) {
      await transaction.rollback();
      return Helper.response(false, "effectiveDate is required", {}, res, 400);
    }

    const emp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
      transaction,
      raw: true,
    });
    if (!emp) {
      await transaction.rollback();
      return Helper.response(false, "Employee not found", {}, res, 404);
    }

    const { basics, allowances, deductions } = await loadActiveStructure(
      tenantId,
      branchId,
      employeeId,
    );

    if (!basics.length && !allowances.length) {
      await transaction.rollback();
      return Helper.response(
        false,
        "No active salary structure found",
        {},
        res,
        404,
      );
    }

    const sameDate = await Basic.findOne({
      where: {
        tenantId,
        branchId,
        employeeId,
        startDate: effectiveDate,
        status: "active",
      },
      transaction,
    });
    if (sameDate) {
      await transaction.rollback();
      return Helper.response(
        false,
        "Salary already exists for this effective date",
        {},
        res,
        400,
      );
    }

    const heads = buildHeads(basics, allowances, deductions);
    const computed = applyIncrement(
      heads,
      percent,
      Array.isArray(closedHeadKeys) ? closedHeadKeys : [],
    );
    const summary = summarize(computed);

    if (summary.totalIncrease === 0 && Number(percent) > 0) {
      // Still allow if all payable heads closed — but warn via message
    }

    const oldCTC = summary.currentCTC;
    const newCTC = summary.newCTC;

    const endDate = new Date(effectiveDate);
    endDate.setDate(endDate.getDate() - 1);
    const endDateStr = endDate.toISOString().slice(0, 10);

    await Basic.update(
      { endDate: endDateStr, status: "inactive" },
      {
        where: { employeeId, branchId, tenantId, status: "active" },
        transaction,
      },
    );
    await allowance.update(
      { endDate: endDateStr, status: "inactive" },
      {
        where: { employeeId, branchId, tenantId, status: "active" },
        transaction,
      },
    );
    await deductionS.update(
      { endDate: endDateStr, status: "inactive" },
      {
        where: { employeeId, branchId, tenantId, status: "active" },
        transaction,
      },
    );

    const basicById = Object.fromEntries(basics.map((b) => [b.id, b]));
    const allowById = Object.fromEntries(allowances.map((a) => [a.id, a]));
    const dedById = Object.fromEntries(deductions.map((d) => [d.id, d]));

    const basicRecords = [];
    const allowanceRecords = [];
    const deductionRecords = [];

    for (const h of computed) {
      if (h.source === "basic") {
        const old = basicById[h.id];
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

    await transaction.commit();

    return Helper.response(
      true,
      "Appraisal applied successfully",
      {
        employeeId,
        percent: Number(percent),
        effectiveDate,
        heads: computed,
        summary,
        oldCTC,
        newCTC,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("applyAppraisal:", error);
    await transaction.rollback();
    return Helper.response(false, error?.message || "Server error", {}, res, 500);
  }
};
