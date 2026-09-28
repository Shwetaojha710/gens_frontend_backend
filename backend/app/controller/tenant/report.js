const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const Department = require("../../models/department");
const Designation = require("../../models/designation");
const bill = require("../../models/bill");
const bill_info = require("../../models/bill_info");
const Basic = require("../../models/basic");
const allowance = require("../../models/allowance");
const deductionS = require("../../models/deductions");
const reimbursement = require("../../models/reimbursement");
const EmployeeOldSalary = require("../../models/employeeOldSalary");
const { Op } = require("sequelize");
const moment = require("moment");

const DEPARTMENT_COLORS = [
  "#154D71",
  "#005890",
  "#3357FF",
  "#1c6ea4",
  "#33a1e0",
  "#3498DB",
  "#56cfe1",
  "#c77dff",
  "#ff4d4f",
  "#7f8c8d",
  "#52c41a",
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Round to nearest 0.5 day (matches half-day payroll deductions). */
const roundHalfDay = (n) => Math.round((Number(n) || 0) * 2) / 2;

/**
 * Deduction / absent days from bill:
 * calendar days in month − present days (bill.full_days already includes half-days as 0.5).
 */
const deductionDaysFromBill = (billRow, year, month) => {
  const daysInMonth = moment(
    `${year}-${String(month).padStart(2, "0")}-01`,
  ).daysInMonth();
  const presentDays = Number(billRow?.full_days) || 0;
  return roundHalfDay(Math.max(0, daysInMonth - presentDays));
};

const formatDaysLabel = (days) => {
  const d = roundHalfDay(days);
  if (d === 1) return "1 Day";
  return `${d} Days`;
};

const getRequestContext = (req) => {
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!tenantId) {
    return { error: "TenantId Is Required", statusCode: 400 };
  }

  if (!branchId || branchId === "null") {
    return { error: "branchId is required!", statusCode: 200 };
  }

  return { tenantId, branchId };
};

/** Monthly CTC from Basic row (both amount and finalCTC are annual CTC). */
const monthlyCtcFromBasic = (row) => {
  const amount = Number(row?.amount) || 0;
  if (amount > 0) return round2(amount / 12);
  const finalCtc = Number(row?.finalCTC) || 0;
  if (finalCtc > 0) return round2(finalCtc / 12);
  return 0;
};

/**
 * Old salary = previous salary-structure CTC (inactive Basic before last revision).
 * Current salary = active Basic CTC (after appraisal).
 * Appraisal % = ((current - old) / old) * 100
 */
const buildAppraisalMapFromBasics = (basicRows) => {
  const byEmp = {};
  for (const row of basicRows || []) {
    if (!byEmp[row.employeeId]) {
      byEmp[row.employeeId] = { active: [], inactive: [] };
    }
    if (row.status === "active") byEmp[row.employeeId].active.push(row);
    else if (row.status === "inactive") byEmp[row.employeeId].inactive.push(row);
  }

  const map = {};
  for (const [empId, groups] of Object.entries(byEmp)) {
    const currentSalary = groups.active.length
      ? monthlyCtcFromBasic(groups.active[0])
      : 0;

    const inactiveSorted = [...groups.inactive].sort((a, b) => {
      const ae = a.endDate ? new Date(a.endDate).getTime() : 0;
      const be = b.endDate ? new Date(b.endDate).getTime() : 0;
      if (be !== ae) return be - ae;
      const as = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bs = b.startDate ? new Date(b.startDate).getTime() : 0;
      if (bs !== as) return bs - as;
      return (
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    });

    let oldSalary = 0;
    for (const row of inactiveSorted) {
      const ctc = monthlyCtcFromBasic(row);
      if (ctc <= 0) continue;
      // Prefer a prior structure that differs from the current CTC
      if (currentSalary === 0 || ctc !== currentSalary) {
        oldSalary = ctc;
        break;
      }
      if (!oldSalary) oldSalary = ctc;
    }

    const appraisalPercent =
      oldSalary > 0 && currentSalary > 0
        ? round2(((currentSalary - oldSalary) / oldSalary) * 100)
        : 0;

    map[empId] = { oldSalary, currentSalary, appraisalPercent };
  }
  return map;
};

const buildComponentNameMap = async (tenantId, branchId) => {
  const [basics, allowances, deductions] = await Promise.all([
    Basic.findAll({
      where: { tenantId, branchId },
      attributes: ["id", "name"],
      raw: true,
    }),
    allowance.findAll({
      where: { tenantId, branchId },
      attributes: ["id", "name"],
      raw: true,
    }),
    deductionS.findAll({
      where: { tenantId, branchId },
      attributes: ["id", "name"],
      raw: true,
    }),
  ]);

  const map = {};
  for (const row of [...basics, ...allowances, ...deductions]) {
    map[row.id] = row.name || "";
  }
  return map;
};

const matchName = (name, patterns) => {
  const n = String(name || "").toLowerCase().trim();
  if (!n) return false;
  return patterns.some((p) => n.includes(p));
};

const isEmployer = (name) => matchName(name, ["employer"]);

const classifyComponent = (name, payCode) => {
  const n = String(name || "").toLowerCase();
  const code = String(payCode || "").toUpperCase();

  if (matchName(n, ["pf"]) && isEmployer(n)) return "pfEmployer";
  if (matchName(n, ["esi", "esic"]) && isEmployer(n)) return "esiEmployer";
  if (matchName(n, ["pf", "provident"]) && !isEmployer(n)) return "pfEmployee";
  if (matchName(n, ["esi", "esic"]) && !isEmployer(n)) return "esiEmployee";

  if (code === "DED" || code === "DEDUCTION") {
    if (matchName(n, ["leave", "lop", "loss of pay", "absent", "penalty", "late"])) {
      return "leaveDeduction";
    }
    if (matchName(n, ["tds", "tax"])) return "tds";
    return "otherDeduction";
  }

  if (isEmployer(n)) return "employerOther";

  if (matchName(n, ["basic"]) && !matchName(n, ["basic+da"])) return "basic";
  if (n === "da" || matchName(n, ["dearness"])) return "da";
  if (matchName(n, ["hra", "house rent"])) return "hra";
  if (matchName(n, ["medical"])) return "medical";
  if (matchName(n, ["conveyance", "transport"])) return "conveyance";
  if (matchName(n, ["education", "child"])) return "education";
  if (matchName(n, ["performance", "lta", "bonus"])) return "performanceBonus";
  if (matchName(n, ["misc", "special allowance", "special allow"])) return "misc";

  if (code === "PAY" || code === "EARN" || code === "ALLOWANCE") return "misc";
  return "otherDeduction";
};

const emptyBuckets = () => ({
  basic: 0,
  da: 0,
  hra: 0,
  misc: 0,
  medical: 0,
  conveyance: 0,
  education: 0,
  performanceBonus: 0,
  leaveDeduction: 0,
  otherDeduction: 0,
  tds: 0,
  pfEmployee: 0,
  esiEmployee: 0,
  pfEmployer: 0,
  esiEmployer: 0,
  employerOther: 0,
});

const buildRowFromComponents = (components, nameMap) => {
  const buckets = emptyBuckets();
  const leaveDetailParts = [];
  const otherDetailParts = [];

  for (const c of components) {
    const amount = round2(c.amount);
    if (amount <= 0) continue;
    const name = nameMap[c.pay_component_id] || c.pay_code || "";
    const key = classifyComponent(name, c.pay_code);
    if (buckets[key] != null) buckets[key] += amount;

    const n = String(name).toLowerCase();
    if (key === "leaveDeduction" || matchName(n, ["penalty", "late"])) {
      let reason = "Leave";
      if (matchName(n, ["penalty", "late"])) reason = "Late";
      else if (matchName(n, ["lop", "absent", "loss of pay"])) reason = "Leave";
      leaveDetailParts.push({ amount, reason, componentName: name });
    } else if (key === "otherDeduction") {
      otherDetailParts.push({
        amount,
        reason: name || "Other deduction",
        componentName: name,
      });
    }
  }

  const grossSalary = round2(
    buckets.basic +
      buckets.da +
      buckets.hra +
      buckets.misc +
      buckets.medical +
      buckets.conveyance +
      buckets.education +
      buckets.performanceBonus,
  );

  const totalDeductions = round2(
    buckets.leaveDeduction + buckets.otherDeduction + buckets.tds,
  );

  const salaryAfterAppraisal = round2(grossSalary + totalDeductions);
  const salaryAfterDeduction = round2(salaryAfterAppraisal - totalDeductions);
  const totalPfEsiEmployee = round2(buckets.pfEmployee + buckets.esiEmployee);
  const netPayable = round2(grossSalary - totalPfEsiEmployee);
  const totalEarningCtc = round2(
    grossSalary + buckets.pfEmployer + buckets.esiEmployer,
  );

  return {
    ...buckets,
    grossSalary,
    totalDeductions,
    salaryAfterAppraisal,
    salaryAfterDeduction,
    totalPfEsiEmployee,
    netPayable,
    totalEarningCtc,
    leaveDetailParts,
    otherDetailParts,
  };
};

exports.getEmployeeReport = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const { tenantId, branchId } = context;
    const status = req.body?.status || "active";

    const employeeWhere = { tenantId, branchId };
    if (status !== "all") {
      employeeWhere.status = status;
    }

    const [departments, employees, designations] = await Promise.all([
      Department.findAll({
        where: { tenantId, branchId, status: "active" },
        attributes: ["id", "name"],
        raw: true,
        order: [["name", "ASC"]],
      }),
      empPersonal.findAll({
        where: employeeWhere,
        attributes: [
          "id",
          "firstName",
          "lastName",
          "empCode",
          "email",
          "mobile",
          "gender",
          "status",
          "joiningDate",
          "departmentId",
          "designationId",
          "profileImage",
        ],
        raw: true,
      }),
      Designation.findAll({
        where: { tenantId, branchId },
        attributes: ["id", "name"],
        raw: true,
      }),
    ]);

    const designationMap = Object.fromEntries(designations.map((item) => [item.id, item.name]));
    const departmentMap = Object.fromEntries(departments.map((item) => [item.id, item.name]));

    const employeeData = employees.map((employee) => ({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      empCode: employee.empCode || "N/A",
      department: departmentMap[employee.departmentId] || "Unassigned",
      designation: designationMap[employee.designationId] || "N/A",
      gender: employee.gender || "N/A",
      email: employee.email || "N/A",
      mobile: employee.mobile || "N/A",
      status: employee.status || "N/A",
      joiningDate: employee.joiningDate ? Helper.newDateFormat(employee.joiningDate) : "NA",
      profileImage: employee.profileImage ? `${process.env.IMG_BASE_URL}/${employee.profileImage}` : null,
    }));

    return Helper.response(
      true,
      "Employee report fetched successfully",
      { totalEmployees: employeeData.length, employees: employeeData },
      res,
      200,
    );
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.getPayrollReport = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const { tenantId, branchId } = context;
    const today = new Date();
    const month = Number(req.body?.month) || today.getMonth() + 1;
    const year = Number(req.body?.year) || today.getFullYear();

    const [departments, employees, designations, bills] = await Promise.all([
      Department.findAll({
        where: { tenantId, branchId, status: "active" },
        attributes: ["id", "name"],
        raw: true,
        order: [["name", "ASC"]],
      }),
      empPersonal.findAll({
        where: { tenantId, branchId },
        attributes: ["id", "firstName", "lastName", "empCode", "departmentId", "designationId"],
        raw: true,
      }),
      Designation.findAll({
        where: { tenantId, branchId },
        attributes: ["id", "name"],
        raw: true,
      }),
      bill.findAll({
        where: { tenantId, branchId, month, year, status: "active" },
        raw: true,
      }),
    ]);

    const designationMap = Object.fromEntries(designations.map((item) => [item.id, item.name]));
    const employeeMap = Object.fromEntries(employees.map((item) => [item.id, item]));

    const departmentData = departments.map((department, index) => {
      const deptBills = bills.filter((item) => employeeMap[item.employeeId]?.departmentId === department.id);

      const members = deptBills.map((item) => {
        const employee = employeeMap[item.employeeId];
        return {
          employeeId: item.employeeId,
          name: employee ? `${employee.firstName} ${employee.lastName}`.trim() : "N/A",
          empCode: employee?.empCode || "N/A",
          designation: designationMap[employee?.designationId] || "N/A",
          netAmount: Number(item.net_amount) || 0,
          fullDays: item.full_days || "0",
          absentDays: item.absent_days || "0",
          leaveTaken: item.leave_taken || "0",
          lateAttendance: item.late_attendance || "0",
        };
      });

      const totalNetAmount = members.reduce((sum, member) => sum + member.netAmount, 0);

      return {
        departmentId: department.id,
        departmentName: department.name,
        color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
        total: members.length,
        totalNetAmount,
        members,
      };
    });

    const departmentIds = new Set(departments.map((department) => department.id));
    const unassignedBills = bills.filter((item) => !departmentIds.has(employeeMap[item.employeeId]?.departmentId));

    if (unassignedBills.length) {
      const members = unassignedBills.map((item) => {
        const employee = employeeMap[item.employeeId];
        return {
          employeeId: item.employeeId,
          name: employee ? `${employee.firstName} ${employee.lastName}`.trim() : "N/A",
          empCode: employee?.empCode || "N/A",
          designation: designationMap[employee?.designationId] || "N/A",
          netAmount: Number(item.net_amount) || 0,
          fullDays: item.full_days || "0",
          absentDays: item.absent_days || "0",
          leaveTaken: item.leave_taken || "0",
          lateAttendance: item.late_attendance || "0",
        };
      });
      departmentData.push({
        departmentId: "unassigned",
        departmentName: "Unassigned",
        color: "#7f8c8d",
        total: members.length,
        totalNetAmount: members.reduce((sum, member) => sum + member.netAmount, 0),
        members,
      });
    }

    const grandTotal = departmentData.reduce((sum, department) => sum + department.totalNetAmount, 0);

    return Helper.response(
      true,
      "Payroll report fetched successfully",
      { month, year, grandTotal, departments: departmentData },
      res,
      200,
    );
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

/**
 * Excel-style monthly salary register from generated bills + bill_info components.
 * Old Salary / Appraisal % come from salary structure revisions (Basic active vs previous inactive CTC).
 */
exports.getSalaryRegisterReport = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const { tenantId, branchId } = context;
    const today = new Date();
    const month = Number(req.body?.month) || today.getMonth() + 1;
    const year = Number(req.body?.year) || today.getFullYear();

    const [employees, designations, departments, bills, nameMap, basicRows, reimbursements, manualOldSalaryRows] =
      await Promise.all([
        empPersonal.findAll({
          where: { tenantId, branchId },
          attributes: [
            "id",
            "firstName",
            "lastName",
            "empCode",
            "departmentId",
            "designationId",
          ],
          raw: true,
        }),
        Designation.findAll({
          where: { tenantId, branchId },
          attributes: ["id", "name"],
          raw: true,
        }),
        Department.findAll({
          where: { tenantId, branchId },
          attributes: ["id", "name"],
          raw: true,
        }),
        bill.findAll({
          where: { tenantId, branchId, month, year, status: "active" },
          raw: true,
          order: [["bill_id", "ASC"]],
        }),
        buildComponentNameMap(tenantId, branchId),
        Basic.findAll({
          where: { tenantId, branchId },
          attributes: [
            "id",
            "employeeId",
            "amount",
            "finalCTC",
            "status",
            "startDate",
            "endDate",
            "createdAt",
            "updatedAt",
          ],
          raw: true,
        }),
        reimbursement.findAll({
          where: {
            tenantId,
            branchId,
            status: { [Op.in]: ["approved", "paid", "recommended"] },
            [Op.or]: [
              {
                fromDate: {
                  [Op.between]: [
                    moment(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD"),
                    moment(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD"),
                  ],
                },
              },
              {
                toDate: {
                  [Op.between]: [
                    moment(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD"),
                    moment(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD"),
                  ],
                },
              },
              {
                fromDate: {
                  [Op.lte]: moment(`${year}-${month}-01`).startOf("month").format("YYYY-MM-DD"),
                },
                toDate: {
                  [Op.gte]: moment(`${year}-${month}-01`).endOf("month").format("YYYY-MM-DD"),
                },
              },
            ],
          },
          raw: true,
          order: [["createdAt", "DESC"]],
        }),
        EmployeeOldSalary.findAll({
          attributes: ["employeeId", "oldSalary"],
          raw: true,
        }),
      ]);

    const appraisalMap = buildAppraisalMapFromBasics(basicRows);
    const manualOldSalaryMap = Object.fromEntries(
      manualOldSalaryRows.map((r) => [r.employeeId, Number(r.oldSalary) || 0]),
    );

    if (!bills.length) {
      return Helper.response(
        true,
        "No generated salary found for selected month",
        {
          month,
          year,
          rows: [],
          totals: {
            oldSalary: 0,
            salaryAfterAppraisal: 0,
            leaveDeduction: 0,
            otherDeduction: 0,
            tds: 0,
            totalDeductions: 0,
            salaryAfterDeduction: 0,
            basic: 0,
            da: 0,
            hra: 0,
            misc: 0,
            medical: 0,
            conveyance: 0,
            education: 0,
            performanceBonus: 0,
            grossSalary: 0,
            pfEmployee: 0,
            esiEmployee: 0,
            totalPfEsiEmployee: 0,
            netPayable: 0,
            pfEmployer: 0,
            esiEmployer: 0,
            totalEarningCtc: 0,
          },
          summary: {
            employeeCount: 0,
            totalGross: 0,
            totalNetPayable: 0,
            totalCtc: 0,
          },
          leaveDeductionDetails: [],
          otherDeductionDetails: [],
          reimbursementDetails: [],
        },
        res,
        200,
      );
    }

    const billIds = bills.map((b) => b.bill_id);

    const infos = await bill_info.findAll({
      where: {
        tenantId,
        branchId,
        month,
        year,
        status: "active",
        bill_id: { [Op.in]: billIds },
      },
      raw: true,
    });

    const infosByEmp = {};
    for (const info of infos) {
      if (!infosByEmp[info.employeeId]) infosByEmp[info.employeeId] = [];
      infosByEmp[info.employeeId].push(info);
    }

    const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e]));
    const designationMap = Object.fromEntries(designations.map((d) => [d.id, d.name]));
    const departmentMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

    const leaveDeductionDetails = [];
    const otherDeductionDetails = [];

    const rows = bills.map((b, index) => {
      const emp = employeeMap[b.employeeId];
      const empName = emp
        ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
        : "N/A";
      const calc = buildRowFromComponents(infosByEmp[b.employeeId] || [], nameMap);
      const appraisal = appraisalMap[b.employeeId] || {
        oldSalary: 0,
        currentSalary: 0,
        appraisalPercent: 0,
      };

      const oldSalary =
        manualOldSalaryMap[b.employeeId] > 0
          ? manualOldSalaryMap[b.employeeId]
          : appraisal.oldSalary || 0;
      const salaryAfterAppraisal =
        appraisal.currentSalary > 0
          ? appraisal.currentSalary
          : calc.salaryAfterAppraisal;
      const appraisalPercent =
        appraisal.appraisalPercent > 0
          ? appraisal.appraisalPercent
          : oldSalary > 0 && salaryAfterAppraisal > 0
            ? round2(((salaryAfterAppraisal - oldSalary) / oldSalary) * 100)
            : 0;

      const salaryAfterDeduction = round2(
        salaryAfterAppraisal - calc.totalDeductions,
      );

      const netPayable =
        Number(b.net_amount) > 0 ? round2(b.net_amount) : calc.netPayable;

      // Present days on bill; remaining calendar days = deduction / absent days
      const deductionDays = deductionDaysFromBill(b, year, month);
      const lateDays = Number(b.late_attendance) || 0;
      const leaveTaken = Number(b.leave_taken) || 0;
      const absentDays = Number(b.absent_days) || 0;

      for (const part of calc.leaveDetailParts || []) {
        leaveDeductionDetails.push({
          employeeId: b.employeeId,
          employeeName: empName,
          amount: part.amount,
          days: deductionDays,
          daysLabel: formatDaysLabel(deductionDays),
          reason: part.reason,
          presentDays: Number(b.full_days) || 0,
          monthDays: moment(
            `${year}-${String(month).padStart(2, "0")}-01`,
          ).daysInMonth(),
        });
      }

      // Fallback leave row when amount exists but no named component parts
      if (
        (!calc.leaveDetailParts || !calc.leaveDetailParts.length) &&
        calc.leaveDeduction > 0
      ) {
        leaveDeductionDetails.push({
          employeeId: b.employeeId,
          employeeName: empName,
          amount: calc.leaveDeduction,
          days: deductionDays,
          daysLabel: formatDaysLabel(deductionDays),
          reason:
            leaveTaken > 0
              ? "Leave"
              : lateDays > 0
                ? "Late"
                : absentDays > 0
                  ? "Absent"
                  : "Leave",
          presentDays: Number(b.full_days) || 0,
          monthDays: moment(
            `${year}-${String(month).padStart(2, "0")}-01`,
          ).daysInMonth(),
        });
      }

      for (const part of calc.otherDetailParts || []) {
        otherDeductionDetails.push({
          employeeId: b.employeeId,
          employeeName: empName,
          amount: part.amount,
          reason: part.reason,
        });
      }

      return {
        sno: index + 1,
        employeeId: b.employeeId,
        billId: b.bill_id,
        empCode: emp?.empCode || "N/A",
        name: empName,
        department: departmentMap[emp?.departmentId] || "Unassigned",
        designation: designationMap[emp?.designationId] || "N/A",
        oldSalary,
        appraisalPercent,
        salaryAfterAppraisal,
        leaveDeduction: calc.leaveDeduction,
        otherDeduction: calc.otherDeduction,
        tds: calc.tds,
        totalDeductions: calc.totalDeductions,
        salaryAfterDeduction,
        basic: calc.basic,
        da: calc.da,
        hra: calc.hra,
        misc: calc.misc,
        medical: calc.medical,
        conveyance: calc.conveyance,
        education: calc.education,
        performanceBonus: calc.performanceBonus,
        grossSalary: calc.grossSalary,
        pfEmployee: calc.pfEmployee,
        esiEmployee: calc.esiEmployee,
        totalPfEsiEmployee: calc.totalPfEsiEmployee,
        netPayable,
        pfEmployer: calc.pfEmployer,
        esiEmployer: calc.esiEmployer,
        totalEarningCtc: calc.totalEarningCtc,
        leaveTaken: b.leave_taken || "0",
        fullDays: b.full_days || "0",
        absentDays: b.absent_days || "0",
        lateAttendance: b.late_attendance || "0",
      };
    });

    const reimbursementDetails = (reimbursements || []).map((item) => {
      const emp = employeeMap[item.employeeId];
      return {
        employeeId: item.employeeId,
        employeeName: emp
          ? `${emp.firstName || ""} ${emp.lastName || ""}`.trim()
          : "N/A",
        amount: Number(item.amount) || 0,
        reason: item.remark || item.status || "—",
        status: item.status || "",
        fromDate: item.fromDate || null,
        toDate: item.toDate || null,
      };
    });

    const totals = rows.reduce(
      (acc, row) => {
        for (const key of Object.keys(acc)) {
          acc[key] = round2(acc[key] + (Number(row[key]) || 0));
        }
        return acc;
      },
      {
        oldSalary: 0,
        salaryAfterAppraisal: 0,
        leaveDeduction: 0,
        otherDeduction: 0,
        tds: 0,
        totalDeductions: 0,
        salaryAfterDeduction: 0,
        basic: 0,
        da: 0,
        hra: 0,
        misc: 0,
        medical: 0,
        conveyance: 0,
        education: 0,
        performanceBonus: 0,
        grossSalary: 0,
        pfEmployee: 0,
        esiEmployee: 0,
        totalPfEsiEmployee: 0,
        netPayable: 0,
        pfEmployer: 0,
        esiEmployer: 0,
        totalEarningCtc: 0,
      },
    );

    return Helper.response(
      true,
      "Salary register fetched successfully",
      {
        month,
        year,
        rows,
        totals,
        summary: {
          employeeCount: rows.length,
          totalGross: totals.grossSalary,
          totalNetPayable: totals.netPayable,
          totalCtc: totals.totalEarningCtc,
        },
        leaveDeductionDetails,
        otherDeductionDetails,
        reimbursementDetails,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("Salary register report error:", error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};
