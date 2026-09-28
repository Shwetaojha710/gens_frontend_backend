const log = require("../models/log");

function toPlain(data) {
  if (!data) return null;
  if (typeof data.toJSON == "function") return data.toJSON();
  if (typeof data.get == "function") return data.get({ plain: true });
  return JSON.parse(JSON.stringify(data));
}

/**
 * Write one security audit row.
 * Never throw to caller — audit failure should not break business action.
 */
async function writeAudit({
  req,
  actionType,
  referenceId = null,
  employeeId = null,
  oldValue = null,
  newValue = null,
  remarks = null,
  transaction = null,
}) {
  try {
    const tenantId = req?.users?.tenantId || null;
    const branchId =
      req?.users?.branchId && req.users.branchId !== "null"
        ? req.users.branchId
        : null;

    await log.create(
      {
        tenantId,
        branchId,
        employeeId: employeeId || null,
        actionType,
        referenceId: referenceId || null,
        oldValue: toPlain(oldValue),
        newValue: toPlain(newValue),
        remarks: remarks || null,
        createdBy: req?.users?.id || null,
        ipAddress: req?.ip || req?.headers?.["x-forwarded-for"] || null,
      },
      transaction ? { transaction } : undefined
    );
  } catch (err) {
    console.error("Audit log failed:", actionType, err?.message || err);
  }
}

/** Rebuild last known record state as of a datetime from audit rows */
async function getAsOfState({ referenceId, asOfDate, actionPrefix }) {
  const { Op } = require("sequelize");
  const rows = await log.findAll({
    where: {
      referenceId,
      actionType: { [Op.like]: `${actionPrefix}%` },
      createdAt: { [Op.lte]: asOfDate },
    },
    order: [["createdAt", "ASC"]],
  });

  let state = null;
  for (const row of rows) {
    if (String(row.actionType).endsWith("_DELETE")) {
      state = null;
    } else {
      state = row.newValue || state;
    }
  }
  return state;
}

module.exports = { writeAudit, getAsOfState, toPlain };