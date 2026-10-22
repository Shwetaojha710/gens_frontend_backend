/**
 * Bulk salary setup by designation (MONTHLY salary → stored as ANNUAL CTC = monthly * 12):
 * - Software Developer / Project Manager → ₹50,000 / month → CTC 6,00,000
 * - Customer Relationship Executive (CRE) → ₹15,000 / month → CTC 1,80,000
 * - Remaining (incl. no designation) → ₹20,000 / month → CTC 2,40,000
 *
 * Writes Basics + allowances + deductions using each branch's MasterComponents
 * (percentage / basic_dependent only — fixed Medical/Conveyance skipped so CTC matches).
 *
 * Usage:
 *   node scripts/bulk-set-salaries-by-designation.js           # dry-run
 *   node scripts/bulk-set-salaries-by-designation.js --apply    # write DB
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Op } = require("sequelize");
const sequelize = require("../app/connection/connection");
const Designation = require("../app/models/designation");
const empPersonal = require("../app/models/empPersonal");
const MasterComponents = require("../app/models/master_components");
const Basic = require("../app/models/basic");
const Allowance = require("../app/models/allowance");
const deductionS = require("../app/models/deductions");

const APPLY = process.argv.includes("--apply");
const START_DATE = new Date().toISOString().slice(0, 10);

/** Returns ANNUAL CTC (monthly × 12) — payroll stores annual, UI/payslip ÷ 12. */
function resolveCtc(desigName) {
  const n = String(desigName || "").toLowerCase().trim();
  let monthly = 20000;
  if (n.includes("software developer") || n.includes("project manager")) {
    monthly = 50000;
  } else if (
    n.includes("customer relationship") ||
    n === "cre" ||
    /(^|\s)cre(\s|$)/.test(n)
  ) {
    monthly = 15000;
  }
  return monthly * 12;
}

function computeComponents(salaryComponents, CTC) {
  const computed = {};

  salaryComponents.forEach((comp) => {
    if (!comp.dependent_component || comp.value_type === "basic_dependent") {
      let amount = 0;
      if (String(comp.component_name).toLowerCase() === "basic") {
        amount = (CTC * Number(comp.value)) / 100;
      } else if (comp.value_type === "basic_dependent") {
        amount = (CTC * Number(comp.value)) / 100;
      } else if (comp.value_type === "percentage" && !comp.dependent_component) {
        amount = (CTC * Number(comp.value)) / 100;
      }
      // fixed components intentionally skipped in first pass
      computed[comp.id] = amount;
    }
  });

  const resolveAmount = (comp) => {
    if (comp.value_type === "percentage") {
      if (Array.isArray(comp.dependent_component)) {
        let baseSum = comp.dependent_component.reduce(
          (sum, depId) => sum + (computed[depId] || 0),
          0,
        );
        if (baseSum === 0) {
          const basicComp = salaryComponents.find(
            (c) => c.value_type === "basic_dependent" && computed[c.id] > 0,
          );
          baseSum = basicComp ? computed[basicComp.id] : CTC;
        }
        return (baseSum * Number(comp.value)) / 100;
      }
      const base = computed[comp.dependent_component] || CTC;
      return (base * Number(comp.value)) / 100;
    }
    return 0;
  };

  salaryComponents.forEach((comp) => {
    if (computed[comp.id] == null || computed[comp.id] === 0) {
      if (comp.value_type === "fixed" || comp.value_type === "is_special") {
        computed[comp.id] = 0;
      } else {
        computed[comp.id] = resolveAmount(comp);
      }
    }
  });

  let gross = 0;
  const records = salaryComponents.map((comp) => {
    let amount = computed[comp.id] || 0;
    const nameLower = String(comp.component_name || "").toLowerCase();
    if (
      nameLower.includes("special allowance") ||
      nameLower === "miscellaneous" ||
      nameLower === "misc. allowance" ||
      nameLower === "esic" ||
      nameLower.includes("esic employer")
    ) {
      amount = 0;
    }
    if (comp.component_type === "payable") gross += amount;
    return {
      componentId: comp.id,
      component_name: comp.component_name,
      component_type: comp.component_type,
      value_type: comp.value_type,
      value: comp.value,
      calculated_amount: Number(Number(amount).toFixed(2)),
      dependent_component_id: comp.dependent_component,
      status: "active",
    };
  });

  const miscAmount = CTC - Math.round(gross);
  const miscIndex = records.findIndex((r) => {
    const n = String(r.component_name || "").toLowerCase();
    return (
      n.includes("special allowance") ||
      n === "miscellaneous" ||
      n === "misc. allowance"
    );
  });

  if (miscIndex !== -1) {
    records[miscIndex].calculated_amount = miscAmount > 0 ? miscAmount : 0;
  } else if (miscAmount > 0) {
    records.push({
      componentId: null,
      component_name: "Misc. Allowance",
      component_type: "payable",
      value_type: "fixed",
      value: 0,
      calculated_amount: Number(miscAmount.toFixed(2)),
      dependent_component_id: null,
      status: "active",
    });
  }

  return records.filter((r) => r.value_type !== "is_special");
}

function depUuid(dep) {
  if (!dep) return null;
  if (Array.isArray(dep)) return dep[0] || null;
  if (typeof dep === "string") return dep;
  return null;
}

/** Keep one row per component_name (master tables have duplicates on some branches). */
function dedupeComponents(list) {
  const byName = new Map();
  for (const c of list) {
    const key = String(c.component_name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (!byName.has(key)) {
      byName.set(key, c);
      continue;
    }
    // Prefer percentage/basic over empty fixed; prefer non-null value
    const prev = byName.get(key);
    const score = (x) =>
      (x.value_type === "basic_dependent" ? 3 : 0) +
      (x.value_type === "percentage" ? 2 : 0) +
      (x.value != null ? 1 : 0) +
      (x.amount != null ? 1 : 0);
    if (score(c) > score(prev)) byName.set(key, c);
  }
  return [...byName.values()];
}

(async () => {
  console.log(APPLY ? "MODE: APPLY (will write DB)" : "MODE: DRY-RUN (no writes)");

  const desigs = await Designation.findAll({ attributes: ["id", "name"], raw: true });
  const desigMap = new Map(desigs.map((d) => [d.id, d.name]));

  const employees = await empPersonal.findAll({
    where: { status: "active" },
    attributes: [
      "id",
      "firstName",
      "lastName",
      "designationId",
      "branchId",
      "tenantId",
      "empCode",
    ],
    raw: true,
  });

  const allComps = await MasterComponents.findAll({
    where: {
      status: "active",
      value_type: { [Op.ne]: "is_special" },
    },
    raw: true,
  });

  const compsByBranch = new Map();
  for (const c of allComps) {
    if (!compsByBranch.has(c.branchId)) compsByBranch.set(c.branchId, []);
    compsByBranch.get(c.branchId).push(c);
  }

  const summary = {
    "600000 (50k/mo)": 0,
    "180000 (15k/mo)": 0,
    "240000 (20k/mo)": 0,
    skipped: 0,
    written: 0,
    errors: 0,
  };

  const bucketKey = (ctc) => {
    if (ctc === 600000) return "600000 (50k/mo)";
    if (ctc === 180000) return "180000 (15k/mo)";
    return "240000 (20k/mo)";
  };
  const skipped = [];
  const errors = [];

  try {
    for (const emp of employees) {
      const desigName = desigMap.get(emp.designationId) || "";
      const CTC = resolveCtc(desigName);
      summary[bucketKey(CTC)] += 1;

      const pickBestBranchComps = (tenantId) => {
        let best = [];
        for (const [, list] of compsByBranch) {
          const scoped = tenantId
            ? list.filter((c) => c.tenantId === tenantId)
            : list;
          if (scoped.length > best.length) best = scoped;
        }
        return best;
      };

      let comps = compsByBranch.get(emp.branchId) || [];
      if (!comps.length) comps = pickBestBranchComps(emp.tenantId);
      if (!comps.length) comps = pickBestBranchComps(null);
      if (!comps.length) {
        summary.skipped += 1;
        skipped.push({
          empCode: emp.empCode || emp.id,
          reason: "no master components for branch/tenant",
        });
        continue;
      }

      const salaryComponents = dedupeComponents(comps);

      const hasBasic = salaryComponents.some(
        (c) =>
          c.value_type === "basic_dependent" ||
          String(c.component_name).toLowerCase() === "basic",
      );
      if (!hasBasic) {
        summary.skipped += 1;
        skipped.push({ empCode: emp.empCode, reason: "no Basic component" });
        continue;
      }

      const bodyData = computeComponents(salaryComponents, CTC);

      const basicRecords = [];
      const allowanceRecords = [];
      const deductionRecords = [];

      for (const item of bodyData) {
        if (
          item.value_type === "basic_dependent" &&
          item.component_type === "payable"
        ) {
          basicRecords.push({
            employeeId: emp.id,
            tenantId: emp.tenantId,
            branchId: emp.branchId,
            componentId: item.componentId,
            name: item.component_name,
            typeValue: item.value,
            type: item.value_type,
            amount: CTC,
            finalAmount: Math.round(item.calculated_amount),
            finalCTC: CTC,
            createdBy: null,
            dependent: "CTC",
            startDate: START_DATE,
            status: "active",
          });
        } else if (
          item.component_type === "payable" &&
          item.value_type !== "basic_dependent"
        ) {
          if (Number(item.calculated_amount) <= 0) continue;
          allowanceRecords.push({
            employeeId: emp.id,
            tenantId: emp.tenantId,
            branchId: emp.branchId,
            componentId: item.componentId,
            name: item.component_name,
            type: item.value_type,
            typeValue: item.value,
            finalAmount: Math.round(item.calculated_amount),
            status: "active",
            startDate: START_DATE,
            dependent: depUuid(item.dependent_component_id),
            createdBy: null,
          });
        } else if (
          item.component_type === "deductible" &&
          item.value_type !== "basic_dependent"
        ) {
          if (Number(item.calculated_amount) <= 0) continue;
          deductionRecords.push({
            employeeId: emp.id,
            tenantId: emp.tenantId,
            branchId: emp.branchId,
            componentId: item.componentId,
            name: item.component_name,
            type: item.value_type,
            typeValue: item.value,
            finalAmount: Math.round(item.calculated_amount),
            status: "active",
            startDate: START_DATE,
            dependent: depUuid(item.dependent_component_id),
            createdBy: null,
          });
        }
      }

      if (!basicRecords.length) {
        summary.skipped += 1;
        skipped.push({ empCode: emp.empCode, reason: "basic record not built" });
        continue;
      }

      if (!APPLY) {
        if (summary.written < 5) {
          console.log("SAMPLE", {
            empCode: emp.empCode,
            name: `${emp.firstName} ${emp.lastName}`,
            designation: desigName || "(none)",
            CTC,
            basics: basicRecords.map((b) => ({
              name: b.name,
              finalAmount: b.finalAmount,
              finalCTC: b.finalCTC,
            })),
            allowances: allowanceRecords.map((a) => ({
              name: a.name,
              finalAmount: a.finalAmount,
            })),
            deductions: deductionRecords.map((d) => ({
              name: d.name,
              finalAmount: d.finalAmount,
            })),
          });
        }
        summary.written += 1;
        continue;
      }

      // One transaction per employee — avoids Postgres lock / shared-memory limits
      const t = await sequelize.transaction();
      try {
        await Basic.update(
          { endDate: START_DATE, status: "inactive" },
          {
            where: {
              employeeId: emp.id,
              tenantId: emp.tenantId,
              branchId: emp.branchId,
              status: "active",
            },
            transaction: t,
          },
        );
        await Allowance.update(
          { endDate: START_DATE, status: "inactive" },
          {
            where: {
              employeeId: emp.id,
              tenantId: emp.tenantId,
              branchId: emp.branchId,
              status: "active",
              type: { [Op.ne]: "is_special" },
            },
            transaction: t,
          },
        );
        await deductionS.update(
          { endDate: START_DATE, status: "inactive" },
          {
            where: {
              employeeId: emp.id,
              tenantId: emp.tenantId,
              branchId: emp.branchId,
              status: "active",
            },
            transaction: t,
          },
        );

        await Basic.bulkCreate(basicRecords, { transaction: t });
        if (allowanceRecords.length) {
          await Allowance.bulkCreate(allowanceRecords, { transaction: t });
        }
        if (deductionRecords.length) {
          await deductionS.bulkCreate(deductionRecords, { transaction: t });
        }
        await t.commit();
        summary.written += 1;
      } catch (empErr) {
        try {
          await t.rollback();
        } catch (_) {}
        summary.errors += 1;
        errors.push({
          empCode: emp.empCode || emp.id,
          message: empErr.message,
        });
      }
    }
  } catch (err) {
    throw err;
  }

  console.log("SUMMARY", summary);
  if (skipped.length) {
    console.log("SKIPPED (first 20):", skipped.slice(0, 20));
  }
  if (errors.length) {
    console.log("ERRORS (first 20):", errors.slice(0, 20));
  }

  await sequelize.close();
  console.log(APPLY ? "Done. Salaries written." : "Dry-run done. Re-run with --apply to write.");
})().catch(async (e) => {
  console.error(e);
  try {
    await sequelize.close();
  } catch (_) {}
  process.exit(1);
});
