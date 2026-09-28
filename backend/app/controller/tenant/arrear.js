const { Op } = require("sequelize");
const moment = require("moment");
const Helper = require("../../helper/helper");
const { writeAudit } = require("../../helper/auditLog");
const Arrear = require("../../models/arrear");
const ArrearDetail = require("../../models/arrear_detail");
const bill = require("../../models/bill");
const bill_info = require("../../models/bill_info");
const Basic = require("../../models/basic");
const Allowance = require("../../models/allowance");
const empPersonal = require("../../models/empPersonal");
const sequelize = require("../../connection/connection");

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ACTIVE_STATUSES = ["draft", "pending", "approved", "paid"];

function requireBranch(req, res) {
  const branchId = req.users && req.users.branchId;
  if (!branchId || branchId == "null") {
    Helper.response(false, "branchId is required!", {}, res, 200);
    return null;
  }
  return branchId;
}

function toMonthIndex(year, month) {
  return Number(year) * 12 + Number(month);
}

function addMonths(year, month, delta) {
  const idx = toMonthIndex(year, month) + delta;
  const y = Math.floor((idx - 1) / 12);
  const m = ((idx - 1) % 12) + 1;
  return { year: y, month: m };
}

/** Inclusive month range from start through end (implementation - 1). */
function getArrearMonths(effectiveYear, effectiveMonth, implementationYear, implementationMonth) {
  const startIdx = toMonthIndex(effectiveYear, effectiveMonth);
  const end = addMonths(implementationYear, implementationMonth, -1);
  const endIdx = toMonthIndex(end.year, end.month);

  if (endIdx < startIdx) {
    return [];
  }

  const months = [];
  let y = Number(effectiveYear);
  let m = Number(effectiveMonth);
  while (toMonthIndex(y, m) <= endIdx) {
    months.push({ year: y, month: m, label: `${MONTH_NAMES[m]} ${y}` });
    const next = addMonths(y, m, 1);
    y = next.year;
    m = next.month;
  }
  return months;
}

/** Inclusive From → To month range (both ends included). */
function getInclusiveMonths(fromYear, fromMonth, toYear, toMonth) {
  const startIdx = toMonthIndex(fromYear, fromMonth);
  const endIdx = toMonthIndex(toYear, toMonth);
  if (endIdx < startIdx) return [];

  const months = [];
  let y = Number(fromYear);
  let m = Number(fromMonth);
  while (toMonthIndex(y, m) <= endIdx) {
    months.push({ year: y, month: m, label: `${MONTH_NAMES[m]} ${y}` });
    const next = addMonths(y, m, 1);
    y = next.year;
    m = next.month;
  }
  return months;
}

/** Map From/To inclusive period → effective + implementation(=to+1) for storage. */
function mapFromToPeriod(fromYear, fromMonth, toYear, toMonth) {
  const payout = addMonths(toYear, toMonth, 1);
  return {
    effectiveYear: Number(fromYear),
    effectiveMonth: Number(fromMonth),
    implementationYear: payout.year,
    implementationMonth: payout.month,
    payoutYear: payout.year,
    payoutMonth: payout.month,
  };
}

function isNormalPayable(item) {
  return item.type !== "is_special" && item.type !== "deduction";
}

/**
 * Revised applicable monthly earnings from current active Basic + Allowance structure.
 */
async function getRevisedMonthlyStructure(tenantId, branchId, employeeId) {
  const [basics, allowances] = await Promise.all([
    Basic.findAll({
      where: { tenantId, branchId, employeeId, status: "active" },
      raw: true,
    }),
    Allowance.findAll({
      where: { tenantId, branchId, employeeId, status: "active" },
      raw: true,
    }),
  ]);

  const components = [];
  let monthlyTotal = 0;

  for (const item of [...basics, ...allowances]) {
    if (!isNormalPayable(item)) continue;
    const monthly = parseFloat((Number(item.finalAmount || 0) / 12).toFixed(2));
    monthlyTotal += monthly;
    components.push({
      id: item.id,
      componentId: item.componentId || null,
      name: item.name,
      type: item.type,
      annualAmount: Number(item.finalAmount || 0),
      monthlyAmount: monthly,
      pay_code: "PAY",
    });
  }

  return {
    monthlyTotal: parseFloat(monthlyTotal.toFixed(2)),
    components,
  };
}

/**
 * Actual paid earnings for a month from bill_info PAY lines, fallback bill.net_amount.
 */
async function getActualPaidForMonth(tenantId, branchId, employeeId, year, month) {
  const billRow = await bill.findOne({
    where: {
      tenantId,
      branchId,
      employeeId,
      year: Number(year),
      month: Number(month),
      status: "active",
    },
    raw: true,
  });

  if (!billRow) {
    return {
      actualPaid: 0,
      billId: null,
      bill_id: null,
      components: [],
      hasBill: false,
    };
  }

  const infos = await bill_info.findAll({
    where: {
      tenantId,
      branchId,
      employeeId,
      year: Number(year),
      month: Number(month),
      bill_id: billRow.bill_id,
      pay_code: "PAY",
      status: "active",
    },
    raw: true,
  });

  let sumPay = 0;
  const components = infos.map((row) => {
    const amt = Number(row.amount || 0);
    sumPay += amt;
    return {
      pay_component_id: row.pay_component_id,
      amount: amt,
      pay_code: row.pay_code,
    };
  });

  const actualPaid =
    infos.length > 0
      ? parseFloat(sumPay.toFixed(2))
      : parseFloat(Number(billRow.net_amount || 0).toFixed(2));

  return {
    actualPaid,
    billId: billRow.id,
    bill_id: billRow.bill_id,
    components,
    hasBill: true,
    net_amount: billRow.net_amount,
  };
}

function buildComponentBreakup(revisedComponents, paidComponents) {
  const paidById = {};
  for (const p of paidComponents || []) {
    paidById[p.pay_component_id] = Number(p.amount || 0);
  }

  return (revisedComponents || []).map((c) => {
    const actual = paidById[c.id] != null ? paidById[c.id] : 0;
    const revised = Number(c.monthlyAmount || 0);
    const diff = parseFloat((revised - actual).toFixed(2));
    return {
      name: c.name,
      componentId: c.componentId,
      pay_component_id: c.id,
      actualPaid: actual,
      revisedSalary: revised,
      difference: diff,
      arrearAmount: Math.max(diff, 0),
    };
  });
}

async function getEmployeeMonthlySalary(tenantId, branchId, employeeId) {
  const structure = await getRevisedMonthlyStructure(tenantId, branchId, employeeId);
  if (structure.monthlyTotal > 0) {
    return { monthlySalary: structure.monthlyTotal, source: "structure", structure };
  }
  const latestBill = await bill.findOne({
    where: { tenantId, branchId, employeeId, status: "active" },
    order: [
      ["year", "DESC"],
      ["month", "DESC"],
    ],
    raw: true,
  });
  if (latestBill) {
    const paid = await getActualPaidForMonth(
      tenantId,
      branchId,
      employeeId,
      latestBill.year,
      latestBill.month
    );
    if (paid.actualPaid > 0) {
      return { monthlySalary: paid.actualPaid, source: "last_bill", structure };
    }
  }
  return { monthlySalary: 0, source: "none", structure };
}

async function calculateArrearPreview({
  tenantId,
  branchId,
  employeeId,
  effectiveYear,
  effectiveMonth,
  implementationYear,
  implementationMonth,
  fromYear,
  fromMonth,
  toYear,
  toMonth,
  percentage,
  revisedMonthlyOverride,
  monthlySalaryOverride,
}) {
  let months = [];
  let periodMeta = null;

  if (fromYear && fromMonth && toYear && toMonth) {
    months = getInclusiveMonths(fromYear, fromMonth, toYear, toMonth);
    periodMeta = mapFromToPeriod(fromYear, fromMonth, toYear, toMonth);
    if (!months.length) {
      throw new Error("Invalid period: To month/year must be on or after From month/year.");
    }
  } else {
    months = getArrearMonths(
      effectiveYear,
      effectiveMonth,
      implementationYear,
      implementationMonth
    );
    periodMeta = {
      effectiveYear: Number(effectiveYear),
      effectiveMonth: Number(effectiveMonth),
      implementationYear: Number(implementationYear),
      implementationMonth: Number(implementationMonth),
      payoutYear: Number(implementationYear),
      payoutMonth: Number(implementationMonth),
    };
    if (!months.length) {
      throw new Error(
        "Invalid period: Implementation month must be after Effective month (implementation month is excluded from arrears)."
      );
    }
  }

  const pct = percentage != null && percentage !== "" ? Number(percentage) : null;
  const usePercentage = pct != null && !Number.isNaN(pct) && pct >= 0;

  // Single monthly salary base (e.g. 44000)
  let monthlySalary = null;
  let structure = { components: [], monthlyTotal: 0 };

  if (monthlySalaryOverride != null && monthlySalaryOverride !== "") {
    monthlySalary = parseFloat(Number(monthlySalaryOverride).toFixed(2));
  } else if (revisedMonthlyOverride != null && revisedMonthlyOverride !== "") {
    monthlySalary = parseFloat(Number(revisedMonthlyOverride).toFixed(2));
  }

  if (!monthlySalary || monthlySalary <= 0) {
    const salaryInfo = await getEmployeeMonthlySalary(tenantId, branchId, employeeId);
    structure = salaryInfo.structure;
    monthlySalary = salaryInfo.monthlySalary;
  } else {
    // Still load structure for component breakup when possible
    try {
      structure = (await getRevisedMonthlyStructure(tenantId, branchId, employeeId)) || structure;
    } catch (_) {}
  }

  if (!monthlySalary || monthlySalary <= 0) {
    throw new Error(
      "Monthly salary not found for employee. Please set up salary structure first."
    );
  }

  const monthCount = months.length;
  // e.g. 44000 * 10% = 4400 per month
  const monthlyIncrement = usePercentage
    ? parseFloat(((monthlySalary * pct) / 100).toFixed(2))
    : 0;
  // e.g. 4400 * 4 months = 17600
  const totalArrearByFormula = usePercentage
    ? parseFloat((monthlyIncrement * monthCount).toFixed(2))
    : 0;

  const details = [];
  let totalArrear = 0;
  let totalPaid = 0;

  for (const m of months) {
    let revisedSalary;
    let difference;
    let arrearAmount;
    const actualPaid = monthlySalary;

    if (usePercentage) {
      arrearAmount = monthlyIncrement;
      revisedSalary = parseFloat((monthlySalary + monthlyIncrement).toFixed(2));
      difference = monthlyIncrement;
    } else {
      revisedSalary = monthlySalary;
      const paid = await getActualPaidForMonth(
        tenantId,
        branchId,
        employeeId,
        m.year,
        m.month
      );
      const paidAmt = Number(paid.actualPaid || 0) || monthlySalary;
      difference = parseFloat((revisedSalary - paidAmt).toFixed(2));
      arrearAmount = difference > 0 ? difference : 0;
      if (Math.abs(difference) < 1) {
        arrearAmount = 0;
        difference = 0;
      }
    }

    const componentBreakup = usePercentage
      ? (structure.components || []).map((c) => {
          const base = Number(c.monthlyAmount || 0);
          const arr = parseFloat(((base * pct) / 100).toFixed(2));
          return {
            name: c.name,
            componentId: c.componentId,
            pay_component_id: c.id,
            actualPaid: base,
            revisedSalary: parseFloat((base + arr).toFixed(2)),
            difference: arr,
            arrearAmount: arr,
          };
        })
      : [];

    details.push({
      year: m.year,
      month: m.month,
      monthLabel: m.label,
      actualPaid,
      revisedSalary,
      difference,
      arrearAmount,
      monthlyIncrement: usePercentage ? monthlyIncrement : arrearAmount,
      hasBill: false,
      bill_id: null,
      componentBreakup,
    });

    totalArrear += arrearAmount;
    totalPaid += actualPaid;
  }

  if (usePercentage) totalArrear = totalArrearByFormula;

  return {
    ...periodMeta,
    fromYear: Number(fromYear || periodMeta.effectiveYear),
    fromMonth: Number(fromMonth || periodMeta.effectiveMonth),
    toYear: Number(
      toYear ||
        addMonths(periodMeta.implementationYear, periodMeta.implementationMonth, -1).year
    ),
    toMonth: Number(
      toMonth ||
        addMonths(periodMeta.implementationYear, periodMeta.implementationMonth, -1).month
    ),
    percentage: usePercentage ? pct : null,
    monthlySalary: parseFloat(Number(monthlySalary || 0).toFixed(2)),
    monthlyIncrement: usePercentage ? monthlyIncrement : null,
    monthCount,
    revisedMonthlySalary: usePercentage
      ? parseFloat((monthlySalary + monthlyIncrement).toFixed(2))
      : monthlySalary,
    structureComponents: structure.components,
    months: details,
    totalPaidSalary: parseFloat(totalPaid.toFixed(2)),
    totalArrear: parseFloat(Number(totalArrear).toFixed(2)),
    formula: usePercentage
      ? "(" + monthlySalary + " × " + pct + "% = " + monthlyIncrement + ") × " + monthCount + " months = " + totalArrearByFormula
      : null,
  };
}

async function findDuplicateArrear({
  tenantId,
  branchId,
  employeeId,
  effectiveYear,
  effectiveMonth,
  implementationYear,
  implementationMonth,
  excludeId,
}) {
  const where = {
    tenantId,
    branchId,
    employeeId,
    effectiveYear: Number(effectiveYear),
    effectiveMonth: Number(effectiveMonth),
    implementationYear: Number(implementationYear),
    implementationMonth: Number(implementationMonth),
    status: { [Op.in]: ACTIVE_STATUSES },
  };
  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }
  return Arrear.findOne({ where });
}

function withEmployeeName(row, empMap) {
  const plain = row.toJSON ? row.toJSON() : { ...row };
  const emp = empMap[plain.employeeId];
  plain.employeeName = emp
    ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
    : "";
  plain.empCode = emp?.empCode || "";
  plain.effectiveLabel = `${MONTH_NAMES[plain.effectiveMonth]} ${plain.effectiveYear}`;
  plain.implementationLabel = `${MONTH_NAMES[plain.implementationMonth]} ${plain.implementationYear}`;
  plain.payoutLabel = `${MONTH_NAMES[plain.payoutMonth]} ${plain.payoutYear}`;
  plain.effectiveDateLabel = plain.effectiveDate || null;
  return plain;
}

async function loadEmpMap(tenantId, branchId, employeeIds) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  if (!ids.length) return {};
  const emps = await empPersonal.findAll({
    where: { tenantId, branchId, id: { [Op.in]: ids } },
    attributes: ["id", "firstName", "lastName", "empCode"],
    raw: true,
  });
  const map = {};
  for (const e of emps) map[e.id] = e;
  return map;
}

// ─── 1. Employee salary history ─────────────────────────────────────────────
exports.getEmployeeSalaryHistory = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { employeeId } = req.body;
    if (!tenantId || !employeeId) {
      return Helper.response(false, "employeeId is required", {}, res, 400);
    }

    const bills = await bill.findAll({
      where: { tenantId, branchId, employeeId, status: "active" },
      order: [
        ["year", "DESC"],
        ["month", "DESC"],
      ],
      raw: true,
    });

    const structure = await getRevisedMonthlyStructure(
      tenantId,
      branchId,
      employeeId
    );

    const history = bills.map((b) => ({
      ...b,
      monthLabel: `${MONTH_NAMES[b.month]} ${b.year}`,
      net_amount: Number(b.net_amount || 0),
    }));

    return Helper.response(
      true,
      "Employee salary history",
      {
        history,
        currentRevisedMonthly: structure.monthlyTotal,
        structureComponents: structure.components,
      },
      res,
      200
    );
  } catch (error) {
    console.error("getEmployeeSalaryHistory:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

// ─── 2/3. Calculate arrear (month-wise) ─────────────────────────────────────
exports.calculateArrear = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const {
      employeeId,
      effectiveYear,
      effectiveMonth,
      implementationYear,
      implementationMonth,
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      percentage,
      revisedMonthlySalary,
    } = req.body;

    const hasFromTo = fromYear && fromMonth && toYear && toMonth;
    const hasEffective =
      effectiveYear && effectiveMonth && implementationYear && implementationMonth;

    if (!tenantId || !employeeId || (!hasFromTo && !hasEffective)) {
      return Helper.response(
        false,
        "employeeId and period (From/To year-month) are required",
        {},
        res,
        400
      );
    }

    const emp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
      raw: true,
    });
    if (!emp) {
      return Helper.response(false, "Employee not found", {}, res, 400);
    }

    const preview = await calculateArrearPreview({
      tenantId,
      branchId,
      employeeId,
      effectiveYear,
      effectiveMonth,
      implementationYear,
      implementationMonth,
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      percentage,
      revisedMonthlyOverride: revisedMonthlySalary,
    });

    return Helper.response(true, "Arrear calculated successfully", preview, res, 200);
  } catch (error) {
    console.error("calculateArrear:", error);
    return Helper.response(false, error.message || "Error", {}, res, 200);
  }
};

// ─── Salary list for From/To period (All or one employee) ───────────────────
exports.getArrearSalaryList = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { employeeId, fromYear, fromMonth, toYear, toMonth, percentage } = req.body;

    if (!tenantId || !fromYear || !fromMonth || !toYear || !toMonth) {
      return Helper.response(
        false,
        "From/To year and month are required",
        {},
        res,
        400
      );
    }

    const months = getInclusiveMonths(fromYear, fromMonth, toYear, toMonth);
    if (!months.length) {
      return Helper.response(
        false,
        "Invalid period: To must be on or after From",
        {},
        res,
        200
      );
    }

    const empWhere = { tenantId, branchId, status: "active" };
    if (employeeId && employeeId !== "All") {
      empWhere.id = employeeId;
    }

    const employees = await empPersonal.findAll({
      where: empWhere,
      attributes: ["id", "firstName", "lastName", "empCode"],
      order: [["firstName", "ASC"]],
      raw: true,
    });

    const pct =
      percentage != null && percentage !== "" ? Number(percentage) : null;
    const usePercentage = pct != null && !Number.isNaN(pct) && pct >= 0;

    const list = [];
    for (const emp of employees) {
      const salaryInfo = await getEmployeeMonthlySalary(
        tenantId,
        branchId,
        emp.id
      );
      const monthlySalary = Number(salaryInfo.monthlySalary || 0);
      const monthCount = months.length;
      const monthlyIncrement = usePercentage
        ? parseFloat(((monthlySalary * pct) / 100).toFixed(2))
        : 0;
      const totalArrear = usePercentage
        ? parseFloat((monthlyIncrement * monthCount).toFixed(2))
        : 0;

      const monthRows = months.map((m) => ({
        year: m.year,
        month: m.month,
        monthLabel: m.label,
        actualPaid: monthlySalary,
        hasBill: false,
        arrearAmount: monthlyIncrement,
        monthlyIncrement,
        revisedSalary: parseFloat((monthlySalary + monthlyIncrement).toFixed(2)),
      }));

      list.push({
        employeeId: emp.id,
        employeeName: `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
        empCode: emp.empCode || "",
        monthlySalary,
        monthlyIncrement,
        revisedAfterHike: parseFloat((monthlySalary + monthlyIncrement).toFixed(2)),
        monthCount,
        months: monthRows,
        totalPaidSalary: parseFloat((monthlySalary * monthCount).toFixed(2)),
        totalArrear,
        percentage: usePercentage ? pct : null,
        formula: usePercentage
          ? `(${monthlySalary} × ${pct}% = ${monthlyIncrement}) × ${monthCount} months = ${totalArrear}`
          : null,
        isSelected: false,
      });
    }

    const period = mapFromToPeriod(fromYear, fromMonth, toYear, toMonth);

    return Helper.response(
      true,
      "Salary list for arrear period",
      {
        fromYear: Number(fromYear),
        fromMonth: Number(fromMonth),
        toYear: Number(toYear),
        toMonth: Number(toMonth),
        percentage: usePercentage ? pct : null,
        months,
        period,
        employees: list,
      },
      res,
      200
    );
  } catch (error) {
    console.error("getArrearSalaryList:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

async function persistArrearDetails(arrearId, preview, meta, transaction) {
  await ArrearDetail.destroy({ where: { arrearId }, transaction });

  const rows = preview.months.map((m) => ({
    id: Helper.generateUUID().toString(),
    arrearId,
    tenantId: meta.tenantId,
    branchId: meta.branchId,
    employeeId: meta.employeeId,
    year: m.year,
    month: m.month,
    actualPaid: m.actualPaid,
    revisedSalary: m.revisedSalary,
    difference: m.difference,
    arrearAmount: m.arrearAmount,
    componentBreakup: m.componentBreakup,
    status: "active",
    createdBy: meta.userId,
  }));

  if (rows.length) {
    await ArrearDetail.bulkCreate(rows, { transaction });
  }
  return rows;
}

// ─── 4. Create / save draft ─────────────────────────────────────────────────
exports.createArrear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const branchId = requireBranch(req, res);
    if (!branchId) {
      await t.rollback();
      return;
    }

    const {
      employeeId,
      effectiveYear,
      effectiveMonth,
      implementationYear,
      implementationMonth,
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      percentage,
      payoutYear,
      payoutMonth,
      revisedMonthlySalary,
      remark,
      submit,
      effectiveDate,
    } = req.body;

    const hasFromTo = fromYear && fromMonth && toYear && toMonth;
    const hasEffective =
      effectiveYear && effectiveMonth && implementationYear && implementationMonth;

    if (!tenantId || !employeeId || (!hasFromTo && !hasEffective)) {
      await t.rollback();
      return Helper.response(false, "Required fields are missing", {}, res, 400);
    }

    const emp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
      transaction: t,
    });
    if (!emp) {
      await t.rollback();
      return Helper.response(false, "Employee not found", {}, res, 400);
    }

    const preview = await calculateArrearPreview({
      tenantId,
      branchId,
      employeeId,
      effectiveYear,
      effectiveMonth,
      implementationYear,
      implementationMonth,
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      percentage,
      revisedMonthlyOverride: revisedMonthlySalary,
    });

    const duplicate = await findDuplicateArrear({
      tenantId,
      branchId,
      employeeId,
      effectiveYear: preview.effectiveYear,
      effectiveMonth: preview.effectiveMonth,
      implementationYear: preview.implementationYear,
      implementationMonth: preview.implementationMonth,
    });
    if (duplicate) {
      await t.rollback();
      return Helper.response(
        false,
        `Duplicate arrear already exists for this period (status: ${duplicate.status})`,
        { existingId: duplicate.id },
        res,
        200
      );
    }

    const status = submit ? "pending" : "draft";

    const arrear = await Arrear.create(
      {
        tenantId,
        branchId,
        employeeId,
        effectiveYear: preview.effectiveYear,
        effectiveMonth: preview.effectiveMonth,
        implementationYear: preview.implementationYear,
        implementationMonth: preview.implementationMonth,
        payoutYear: Number(payoutYear || preview.payoutYear),
        payoutMonth: Number(payoutMonth || preview.payoutMonth),
        revisedMonthlySalary: preview.revisedMonthlySalary,
        percentage: preview.percentage,
        effectiveDate: effectiveDate || null,
        totalArrear: preview.totalArrear,
        remark: remark || null,
        status,
        createdBy: userId,
      },
      { transaction: t }
    );

    await persistArrearDetails(
      arrear.id,
      preview,
      { tenantId, branchId, employeeId, userId },
      t
    );

    await writeAudit({
      req,
      actionType: "ARREAR_CREATE",
      referenceId: arrear.id,
      employeeId,
      newValue: arrear,
      remarks: status === "pending" ? "Created and submitted" : "Draft saved",
      transaction: t,
    });

    await t.commit();

    const details = await ArrearDetail.findAll({
      where: { arrearId: arrear.id, status: "active" },
      order: [
        ["year", "ASC"],
        ["month", "ASC"],
      ],
    });

    return Helper.response(
      true,
      status === "pending" ? "Arrear submitted successfully" : "Arrear draft saved",
      { arrear, details, preview },
      res,
      200
    );
  } catch (error) {
    await t.rollback();
    console.error("createArrear:", error);
    const msg =
      error?.name === "SequelizeUniqueConstraintError"
        ? "Duplicate arrear for this employee and period"
        : error.message || "Error";
    return Helper.response(false, msg, {}, res, 200);
  }
};

// ─── 4b. Bulk create (selected employees from salary list) ──────────────────
exports.createBulkArrear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const branchId = requireBranch(req, res);
    if (!branchId) {
      await t.rollback();
      return;
    }

    const {
      employees,
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      percentage,
      payoutYear,
      payoutMonth,
      remark,
      submit,
      effectiveDate,
    } = req.body;

    if (
      !tenantId ||
      !fromYear ||
      !fromMonth ||
      !toYear ||
      !toMonth ||
      percentage == null ||
      percentage === "" ||
      !Array.isArray(employees) ||
      !employees.length
    ) {
      await t.rollback();
      return Helper.response(
        false,
        "employees[], From/To period and percentage are required",
        {},
        res,
        400
      );
    }

    const created = [];
    const skipped = [];
    const status = submit ? "pending" : "draft";

    for (const item of employees) {
      const employeeId = item.employeeId || item;
      const empPct =
        item.percentage != null && item.percentage !== ""
          ? Number(item.percentage)
          : Number(percentage);

      try {
        const preview = await calculateArrearPreview({
          tenantId,
          branchId,
          employeeId,
          fromYear,
          fromMonth,
          toYear,
          toMonth,
          percentage: empPct,
        });

        const duplicate = await findDuplicateArrear({
          tenantId,
          branchId,
          employeeId,
          effectiveYear: preview.effectiveYear,
          effectiveMonth: preview.effectiveMonth,
          implementationYear: preview.implementationYear,
          implementationMonth: preview.implementationMonth,
        });
        if (duplicate) {
          skipped.push({
            employeeId,
            reason: `Duplicate (${duplicate.status})`,
            existingId: duplicate.id,
          });
          continue;
        }

        const arrear = await Arrear.create(
          {
            tenantId,
            branchId,
            employeeId,
            effectiveYear: preview.effectiveYear,
            effectiveMonth: preview.effectiveMonth,
            implementationYear: preview.implementationYear,
            implementationMonth: preview.implementationMonth,
            payoutYear: Number(payoutYear || preview.payoutYear),
            payoutMonth: Number(payoutMonth || preview.payoutMonth),
            revisedMonthlySalary: preview.revisedMonthlySalary,
            percentage: preview.percentage,
            effectiveDate: effectiveDate || null,
            totalArrear: preview.totalArrear,
            remark: remark || null,
            status,
            createdBy: userId,
          },
          { transaction: t }
        );

        await persistArrearDetails(
          arrear.id,
          preview,
          { tenantId, branchId, employeeId, userId },
          t
        );

        await writeAudit({
          req,
          actionType: "ARREAR_CREATE",
          referenceId: arrear.id,
          employeeId,
          newValue: arrear,
          remarks: `Bulk ${status}; ${empPct}%`,
          transaction: t,
        });

        created.push({
          id: arrear.id,
          employeeId,
          totalArrear: arrear.totalArrear,
          percentage: empPct,
        });
      } catch (err) {
        skipped.push({ employeeId, reason: err.message || "Failed" });
      }
    }

    await t.commit();
    return Helper.response(
      true,
      `Arrear saved for ${created.length} employee(s)`,
      { created, skipped, createdCount: created.length, skippedCount: skipped.length },
      res,
      200
    );
  } catch (error) {
    await t.rollback();
    console.error("createBulkArrear:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

// ─── 5. Update draft ────────────────────────────────────────────────────────
exports.updateArrear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const branchId = requireBranch(req, res);
    if (!branchId) {
      await t.rollback();
      return;
    }

    const {
      id,
      effectiveYear,
      effectiveMonth,
      implementationYear,
      implementationMonth,
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      percentage,
      payoutYear,
      payoutMonth,
      revisedMonthlySalary,
      remark,
      submit,
    } = req.body;

    if (!id) {
      await t.rollback();
      return Helper.response(false, "Arrear id is required", {}, res, 400);
    }

    const arrear = await Arrear.findOne({
      where: { id, tenantId, branchId },
      transaction: t,
    });
    if (!arrear) {
      await t.rollback();
      return Helper.response(false, "Arrear not found", {}, res, 400);
    }

    if (!["draft", "pending"].includes(arrear.status)) {
      await t.rollback();
      return Helper.response(
        false,
        "Only draft/pending arrears can be updated. Approved arrears cannot be modified.",
        {},
        res,
        200
      );
    }

    const preview = await calculateArrearPreview({
      tenantId,
      branchId,
      employeeId: arrear.employeeId,
      effectiveYear: effectiveYear || arrear.effectiveYear,
      effectiveMonth: effectiveMonth || arrear.effectiveMonth,
      implementationYear: implementationYear || arrear.implementationYear,
      implementationMonth: implementationMonth || arrear.implementationMonth,
      fromYear,
      fromMonth,
      toYear,
      toMonth,
      percentage: percentage != null ? percentage : arrear.percentage,
      revisedMonthlyOverride:
        revisedMonthlySalary != null
          ? revisedMonthlySalary
          : arrear.revisedMonthlySalary,
    });

    const duplicate = await findDuplicateArrear({
      tenantId,
      branchId,
      employeeId: arrear.employeeId,
      effectiveYear: preview.effectiveYear,
      effectiveMonth: preview.effectiveMonth,
      implementationYear: preview.implementationYear,
      implementationMonth: preview.implementationMonth,
      excludeId: id,
    });
    if (duplicate) {
      await t.rollback();
      return Helper.response(
        false,
        `Duplicate arrear already exists for this period (status: ${duplicate.status})`,
        { existingId: duplicate.id },
        res,
        200
      );
    }

    const oldValue = arrear.toJSON();
    const nextStatus = submit ? "pending" : arrear.status === "pending" && !submit ? "pending" : "draft";

    await arrear.update(
      {
        effectiveYear: preview.effectiveYear,
        effectiveMonth: preview.effectiveMonth,
        implementationYear: preview.implementationYear,
        implementationMonth: preview.implementationMonth,
        payoutYear: Number(payoutYear || preview.payoutYear),
        payoutMonth: Number(payoutMonth || preview.payoutMonth),
        revisedMonthlySalary: preview.revisedMonthlySalary,
        percentage: preview.percentage,
        totalArrear: preview.totalArrear,
        remark: remark !== undefined ? remark : arrear.remark,
        status: submit ? "pending" : nextStatus === "pending" ? "pending" : "draft",
        updatedBy: userId,
      },
      { transaction: t }
    );

    await persistArrearDetails(
      arrear.id,
      preview,
      {
        tenantId,
        branchId,
        employeeId: arrear.employeeId,
        userId,
      },
      t
    );

    await writeAudit({
      req,
      actionType: "ARREAR_UPDATE",
      referenceId: arrear.id,
      employeeId: arrear.employeeId,
      oldValue,
      newValue: arrear,
      remarks: submit ? "Updated and submitted" : "Draft updated",
      transaction: t,
    });

    await t.commit();

    const details = await ArrearDetail.findAll({
      where: { arrearId: arrear.id, status: "active" },
      order: [
        ["year", "ASC"],
        ["month", "ASC"],
      ],
    });

    return Helper.response(
      true,
      "Arrear updated successfully",
      { arrear, details, preview },
      res,
      200
    );
  } catch (error) {
    await t.rollback();
    console.error("updateArrear:", error);
    return Helper.response(false, error.message || "Error", {}, res, 200);
  }
};

// ─── 6. Arrear details ──────────────────────────────────────────────────────
exports.getArrearDetails = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { id } = req.body;
    if (!id) {
      return Helper.response(false, "Arrear id is required", {}, res, 400);
    }

    const arrear = await Arrear.findOne({ where: { id, tenantId, branchId } });
    if (!arrear) {
      return Helper.response(false, "Arrear not found", {}, res, 400);
    }

    const details = await ArrearDetail.findAll({
      where: { arrearId: id, status: "active" },
      order: [
        ["year", "ASC"],
        ["month", "ASC"],
      ],
    });

    const empMap = await loadEmpMap(tenantId, branchId, [arrear.employeeId]);
    const enriched = withEmployeeName(arrear, empMap);
    enriched.details = details.map((d) => {
      const p = d.toJSON();
      p.monthLabel = `${MONTH_NAMES[p.month]} ${p.year}`;
      return p;
    });

    return Helper.response(true, "Arrear details", enriched, res, 200);
  } catch (error) {
    console.error("getArrearDetails:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

// ─── 7. Employee-wise history / list ────────────────────────────────────────
exports.getArrearList = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { employeeId, status, year, month, effectiveDate, payoutYear, payoutMonth } =
      req.body;
    const where = { tenantId, branchId };
    if (employeeId && employeeId !== "All") where.employeeId = employeeId;
    if (status && status !== "All") where.status = status;

    const py = payoutYear || year;
    const pm = payoutMonth || month;
    if (py && py !== "All") where.payoutYear = Number(py);
    if (pm && pm !== "All") where.payoutMonth = Number(pm);
    if (effectiveDate) where.effectiveDate = effectiveDate;

    const rows = await Arrear.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    const empMap = await loadEmpMap(
      tenantId,
      branchId,
      rows.map((r) => r.employeeId)
    );

    const data = rows.map((r) => withEmployeeName(r, empMap));
    return Helper.response(true, "Arrear list", data, res, 200);
  } catch (error) {
    console.error("getArrearList:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

// ─── 8. Pending arrears ─────────────────────────────────────────────────────
exports.getPendingArrears = async (req, res) => {
  req.body = { ...(req.body || {}), status: "pending" };
  return exports.getArrearList(req, res);
};

// ─── 9. Submit ──────────────────────────────────────────────────────────────
exports.submitArrear = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { id } = req.body;
    if (!id) {
      return Helper.response(false, "Arrear id is required", {}, res, 400);
    }

    const arrear = await Arrear.findOne({ where: { id, tenantId, branchId } });
    if (!arrear) {
      return Helper.response(false, "Arrear not found", {}, res, 400);
    }
    if (arrear.status !== "draft" && arrear.status !== "pending") {
      return Helper.response(
        false,
        "Only draft arrears can be submitted",
        {},
        res,
        200
      );
    }

    const oldValue = arrear.toJSON();
    await arrear.update({ status: "pending", updatedBy: userId });

    await writeAudit({
      req,
      actionType: "ARREAR_SUBMIT",
      referenceId: arrear.id,
      employeeId: arrear.employeeId,
      oldValue,
      newValue: arrear,
      remarks: "Submitted for approval",
    });

    return Helper.response(true, "Arrear submitted for approval", arrear, res, 200);
  } catch (error) {
    console.error("submitArrear:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

// ─── 10. Approve ────────────────────────────────────────────────────────────
exports.approveArrear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const branchId = requireBranch(req, res);
    if (!branchId) {
      await t.rollback();
      return;
    }

    const { id, payoutYear, payoutMonth } = req.body;
    if (!id) {
      await t.rollback();
      return Helper.response(false, "Arrear id is required", {}, res, 400);
    }

    const arrear = await Arrear.findOne({
      where: { id, tenantId, branchId },
      transaction: t,
    });
    if (!arrear) {
      await t.rollback();
      return Helper.response(false, "Arrear not found", {}, res, 400);
    }
    if (arrear.status !== "pending") {
      await t.rollback();
      return Helper.response(
        false,
        "Only pending arrears can be approved",
        {},
        res,
        200
      );
    }

    const py = Number(payoutYear || arrear.payoutYear || arrear.implementationYear);
    const pm = Number(payoutMonth || arrear.payoutMonth || arrear.implementationMonth);

    // Create one-time is_special allowance for payout month (reuses salary component path)
    const startDate = moment(`${py}-${String(pm).padStart(2, "0")}-01`).format(
      "YYYY-MM-DD"
    );
    const endDate = moment(startDate).endOf("month").format("YYYY-MM-DD");

    const allowanceRow = await Allowance.create(
      {
        id: Helper.generateUUID().toString(),
        tenantId,
        branchId,
        employeeId: arrear.employeeId,
        name: "Arrear",
        type: "is_special",
        dependent: null,
        amount: arrear.totalArrear,
        typeValue: null,
        finalAmount: arrear.totalArrear,
        status: "active",
        startDate,
        endDate,
        endPeriodType: "fixed",
        componentId: null,
        createdBy: userId,
      },
      { transaction: t }
    );

    const oldValue = arrear.toJSON();
    await arrear.update(
      {
        status: "approved",
        payoutYear: py,
        payoutMonth: pm,
        approverId: userId,
        approvedAt: new Date(),
        allowanceId: allowanceRow.id,
        updatedBy: userId,
      },
      { transaction: t }
    );

    await writeAudit({
      req,
      actionType: "ARREAR_APPROVE",
      referenceId: arrear.id,
      employeeId: arrear.employeeId,
      oldValue,
      newValue: arrear,
      remarks: `Approved; payout ${MONTH_NAMES[pm]} ${py}`,
      transaction: t,
    });

    await t.commit();
    return Helper.response(
      true,
      "Arrear approved successfully",
      { arrear, allowanceId: allowanceRow.id },
      res,
      200
    );
  } catch (error) {
    await t.rollback();
    console.error("approveArrear:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

// ─── 11. Reject ─────────────────────────────────────────────────────────────
exports.rejectArrear = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { id, remark } = req.body;
    if (!id) {
      return Helper.response(false, "Arrear id is required", {}, res, 400);
    }

    const arrear = await Arrear.findOne({ where: { id, tenantId, branchId } });
    if (!arrear) {
      return Helper.response(false, "Arrear not found", {}, res, 400);
    }
    if (arrear.status !== "pending") {
      return Helper.response(
        false,
        "Only pending arrears can be rejected",
        {},
        res,
        200
      );
    }

    const oldValue = arrear.toJSON();
    await arrear.update({
      status: "rejected",
      rejectedBy: userId,
      rejectedAt: new Date(),
      rejectRemark: remark || null,
      updatedBy: userId,
    });

    await writeAudit({
      req,
      actionType: "ARREAR_REJECT",
      referenceId: arrear.id,
      employeeId: arrear.employeeId,
      oldValue,
      newValue: arrear,
      remarks: remark || "Rejected",
    });

    return Helper.response(true, "Arrear rejected", arrear, res, 200);
  } catch (error) {
    console.error("rejectArrear:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

// ─── 12. Approved arrears for salary/payroll month ──────────────────────────
exports.getApprovedArrearsForSalary = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { employeeId, year, month } = req.body;
    if (!year || !month) {
      return Helper.response(false, "year and month are required", {}, res, 400);
    }

    const where = {
      tenantId,
      branchId,
      payoutYear: Number(year),
      payoutMonth: Number(month),
      status: { [Op.in]: ["approved"] },
    };
    if (employeeId && employeeId !== "All") where.employeeId = employeeId;

    const rows = await Arrear.findAll({ where, order: [["createdAt", "ASC"]] });
    const empMap = await loadEmpMap(
      tenantId,
      branchId,
      rows.map((r) => r.employeeId)
    );

    return Helper.response(
      true,
      "Approved arrears for salary month",
      rows.map((r) => withEmployeeName(r, empMap)),
      res,
      200
    );
  } catch (error) {
    console.error("getApprovedArrearsForSalary:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

/**
 * Used by salary generation to attach approved arrears as PAY lines.
 * Returns synthetic component objects compatible with calculateSalaryComponent.
 */
exports.fetchApprovedArrearComponents = async (
  tenantId,
  branchId,
  employeeId,
  year,
  month
) => {
  const rows = await Arrear.findAll({
    where: {
      tenantId,
      branchId,
      employeeId,
      payoutYear: Number(year),
      payoutMonth: Number(month),
      status: "approved",
    },
    raw: true,
  });

  return rows.map((a) => ({
    id: a.allowanceId || a.id,
    arrearId: a.id,
    name: "Arrear",
    type: "is_special",
    pay_code: "PAY",
    pay_amount: parseFloat(Number(a.totalArrear || 0).toFixed(2)),
    finalAmount: Number(a.totalArrear || 0),
    isArrear: true,
  }));
};

exports.markArrearsPaid = async (
  tenantId,
  branchId,
  employeeId,
  year,
  month,
  bill_id,
  transaction
) => {
  const rows = await Arrear.findAll({
    where: {
      tenantId,
      branchId,
      employeeId,
      payoutYear: Number(year),
      payoutMonth: Number(month),
      status: "approved",
    },
    transaction,
  });

  for (const row of rows) {
    await row.update(
      {
        status: "paid",
        paidBillId: bill_id,
        updatedBy: null,
      },
      { transaction }
    );

    if (row.allowanceId) {
      await Allowance.update(
        { status: "inactive" },
        { where: { id: row.allowanceId }, transaction }
      );
    }
  }

  return rows.length;
};

// ─── 13. Status / history (audit) ───────────────────────────────────────────
exports.getArrearStatusHistory = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = requireBranch(req, res);
    if (!branchId) return;

    const { id } = req.body;
    if (!id) {
      return Helper.response(false, "Arrear id is required", {}, res, 400);
    }

    const arrear = await Arrear.findOne({ where: { id, tenantId, branchId } });
    if (!arrear) {
      return Helper.response(false, "Arrear not found", {}, res, 400);
    }

    const log = require("../../models/log");
    const logs = await log.findAll({
      where: {
        tenantId,
        referenceId: id,
        actionType: { [Op.like]: "ARREAR_%" },
      },
      order: [["createdAt", "ASC"]],
      raw: true,
    });

    return Helper.response(
      true,
      "Arrear status history",
      { arrear, history: logs },
      res,
      200
    );
  } catch (error) {
    console.error("getArrearStatusHistory:", error);
    return Helper.response(false, error.message || "Error", {}, res, 500);
  }
};

exports._helpers = {
  getArrearMonths,
  calculateArrearPreview,
  getRevisedMonthlyStructure,
};
