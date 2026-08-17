const log = require("../../models/log");
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
exports.listAuditLogs = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const {
      employeeId,
      actionType,
      referenceId,
      fromDate,
      toDate,
      module, // optional: EMP, LEAVE, SALARY, APPRAISAL, LETTER
    } = req.body;

    const where = { tenantId };
    if (branchId && branchId !== "null") where.branchId = branchId;
    if (employeeId) where.employeeId = employeeId;
    if (referenceId) where.referenceId = referenceId;
    if (actionType) where.actionType = actionType;
    if (module) where.actionType = { [Op.like]: `${module}%` };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt[Op.gte] = new Date(fromDate);
      if (toDate) where.createdAt[Op.lte] = new Date(toDate);
    }

    const rows = await log.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    return Helper.response(true, "Audit logs", rows, res, 200);
  } catch (e) {
    return Helper.response(false, e.message, [], res, 500);
  }
};