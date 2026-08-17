const Helper = require("../../helper/helper");
const leaveMaster = require("../../models/leaveMaster");
const leaveBalance = require("../../models/leaveBalance");
const leave_application = require("../../models/leave_application");
const moment = require("moment");
const empPersonal = require("../../models/empPersonal");
const leave_balance = require("../../models/leaveBalance");
const { Op } = require("sequelize");
const sequelize = require("../../connection/connection");
const { writeAudit, toPlain } = require("../../helper/auditLog");



exports.createLeave = async (req, res) => {
  const {
    leaveName,
    leaveCode,
    isPaid,
    allowedPerYear,
    carryForward,
    enCashable,
    maxCarryForward,
    genderRestriction,
    requiresApproval,
    applyBeforeDays,
    description,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  try {
    if (!branchId || branchId == "null") {
      return Helper.response(false, "BranchId is required!", {}, res, 200);
    }

    const leave_master = new leaveMaster();

    const existingLeave = await leaveMaster.findOne({
      where: { leaveName, leaveCode, tenantId, branchId },
    });
    if (existingLeave) {
      return Helper.response(
        false,
        "Leave name or code already exists for this tenant.",
        [],
        res,
        400,
      );
    }

    leave_master.leaveName = leaveName;
    leave_master.leaveCode = leaveCode;
    leave_master.isPaid = isPaid;
    leave_master.allowedPerYear = allowedPerYear;
    leave_master.carryForward = carryForward;
    leave_master.enCashable = enCashable;
    leave_master.genderRestriction = genderRestriction;
    leave_master.requiresApproval = requiresApproval;
    leave_master.applyBeforeDays = applyBeforeDays;
    leave_master.description = description;
    leave_master.tenantId = tenantId;
    leave_master.branchId = branchId;
    leave_master.maxCarryForward = maxCarryForward;

    if (await leave_master.save()) {
      return Helper.response(
        true,
        "Leave created successfully.",
        leave_master,
        res,
        200,
      );
    }
    return Helper.response(false, "Failed to create leave.", [], res, 400);
  } catch (error) {
    console.error("Error creating deduction:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.getLeaves = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  try {
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const leaves = await leaveMaster.findAll({
      where: { tenantId, branchId },
    });

    return Helper.response(
      true,
      "Leave fetched successfully.",
      leaves,
      res,
      200,
    );
  } catch (error) {
    console.error("Error creating deduction:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.updatedLeave = async (req, res) => {
  const {
    id,
    leaveName,
    leaveCode,
    isPaid,
    allowedPerYear,
    carryForward,
    enCashable,
    genderRestriction,
    maxCarryForward,
    requiresApproval,
    applyBeforeDays,
    description,
  } = req.body;

  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  try {
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingLeave = await leaveMaster.findOne({
      where: { id, branchId },
    });

    existingLeave.leaveName = leaveName;
    existingLeave.leaveCode = leaveCode;
    existingLeave.isPaid = isPaid;
    existingLeave.allowedPerYear = allowedPerYear;
    existingLeave.carryForward = carryForward;
    existingLeave.enCashable = enCashable;
    existingLeave.genderRestriction = genderRestriction;
    existingLeave.requiresApproval = requiresApproval;
    existingLeave.applyBeforeDays = applyBeforeDays;
    existingLeave.description = description;
    existingLeave.tenantId = tenantId;
    existingLeave.branchId = branchId;
    existingLeave.maxCarryForward = maxCarryForward;
    existingLeave.updatedBy = req.users && req.users.id;

    if (await existingLeave.save()) {
      return Helper.response(
        true,
        "Leave updated successfully.",
        existingLeave,
        res,
        200,
      );
    }
    return Helper.response(false, "Failed to create leave.", [], res, 400);
  } catch (error) {
    console.error("Error creating leaves:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.destroy = async (req, res) => {
  try {
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;
    const { id } = req.body;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!tenantId) {
      return Helper.response(false, "tenantId is required!", {}, res, 200);
    }
    const recordDestroy = await leaveMaster.destroy({ where: { id } });
    if (recordDestroy) {
      return Helper.response(
        true,
        "Leave deleted successfully.",
        recordDestroy,
        res,
        200,
      );
    }
    return Helper.response(false, "Failed to create leave.", [], res, 400);
  } catch (error) {
    console.error("Error creating leaves:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.assignLeave = async (req, res) => {
  const {
    employeeId,
    leaveTypeId,
    year,
    month,
    totalAssigned,
    carryForwarded = 0,
  } = req.body;

  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (
    !employeeId ||
    !leaveTypeId ||
    !year ||
    !totalAssigned ||
    !tenantId ||
    !month
  ) {
    return Helper.response(false, "Required fields missing", [], res, 200);
  }

  try {
    const existing = await leaveBalance.findOne({
      where: { employeeId, leaveTypeId, year, branchId },
    });
    const usedLeaves = existing ? existing.usedLeaves : 0;
    const remainingLeaves =
      parseFloat(totalAssigned) +
      parseFloat(carryForwarded) -
      parseFloat(usedLeaves);
    if (existing) {
      // await existing.update({
      //     totalAssigned,
      //     carryForwarded,
      //     remainingLeaves
      // });
      return Helper.response(false, "Already Data Exists", [], res, 200);
    }
    const assignLeave = new leaveBalance();
    assignLeave.employeeId = employeeId;
    assignLeave.branchId = branchId;
    assignLeave.leaveTypeId = leaveTypeId;
    assignLeave.year = year;
    assignLeave.totalAssigned = totalAssigned;
    assignLeave.carryForwarded = carryForwarded;
    assignLeave.tenantId = tenantId;
    assignLeave.remainingLeaves = remainingLeaves;
    assignLeave.usedLeaves = usedLeaves;
    assignLeave.createdBy = req.users && req.users.id;
    assignLeave.month = month;
    assignLeave.branchId = branchId;

    if (await assignLeave.save()) {
      return Helper.response(
        true,
        "Leave balance assigned",
        assignLeave,
        res,
        200,
      );
    }
    return Helper.response(false, "Unable to assign leave!", [], res, 200);
  } catch (error) {
    console.error("Assign Leave Error:", error);
    return Helper.response(false, "Server error", error, res, 500);
  }
};

exports.updateAssignedLeave = async (req, res) => {
  const {
    id,
    employeeId,
    leaveTypeId,
    year,
    month,
    totalAssigned,
    carryForwarded = 0,
  } = req.body;
  const tenantId = req.users?.tenantId;

  const branchId = req.users && req.users.branchId;

  if (
    !employeeId ||
    !leaveTypeId ||
    !year ||
    !totalAssigned ||
    !tenantId ||
    !month
  ) {
    return Helper.response(false, "Required fields missing", [], res, 400);
  }
  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    // const existRecord = await leaveBalance.findOne({ where: { id } });
    // if (!existRecord) {
    //   return Helper.response(false, "No Record Found", [], res, 404);
    // }

    const existing = await leaveBalance.findOne({
      where: { employeeId, year, id, month, branchId },
    });
    if (!existing) {
      return Helper.response(false, "No Record Found", [], res, 404);
    }

    const usedLeaves = existing ? parseFloat(existing.usedLeaves) : 0;
    const remainingLeaves =
      parseFloat(totalAssigned) + parseFloat(carryForwarded) - usedLeaves;

    if (existing) {
      await existing.update({
        leaveTypeId,
        year,
        branchId,
        totalAssigned,
        carryForwarded,
        remainingLeaves,
      });
      return Helper.response(true, "Leave balance updated", existing, res, 200);
    }

    // const assignLeave = await leaveBalance.create({
    //   employeeId,
    //   leaveTypeId,
    //   year,
    //   totalAssigned,
    //   carryForwarded,
    //   tenantId,
    //   remainingLeaves,
    //   usedLeaves,
    //   createdBy: req.users?.id
    // });

    return Helper.response(
      true,
      "Leave balance assigned",
      assignLeave,
      res,
      200,
    );
  } catch (error) {
    console.error("Error creating/updating leaves:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.getLeaveTypes = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  try {
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const leaveTypes = await leaveMaster.findAll({
      where: { tenantId, branchId },
    });
    const data = [];
    leaveTypes.map((r) => {
      const value = {
        value: r.id,
        label: r.leaveName,
        allowedPerYear: r.allowedPerYear,
      };
      data.push(value);
    });
    return Helper.response(
      true,
      "Leave types fetched successfully.",
      data,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.getLeaveByEmployee = async (req, res) => {
  const { employeeId, year } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  try {
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!tenantId) {
      return Helper.response(false, "tenantId is required!", {}, res, 200);
    }
    let leaveBalanceData;
    if (year) {
      leaveBalanceData = await leaveBalance.findAll({
        where: { employeeId, year, tenantId, branchId },
        raw: true,
      });
    } else {
      leaveBalanceData = await leaveBalance.findAll({
        where: { employeeId, tenantId, branchId },
        raw: true,
      });
    }

    const leaveBalanceRecord = await Promise.all(
      leaveBalanceData.map(async (r) => {
        const leaveType = await leaveMaster.findByPk(r.leaveTypeId);

        return {
          ...r,
          leaveTypeName: leaveType.leaveName,
          createdAt: Helper.dateFormat(r.createdAt),
        };
      }),
    );
    if (leaveBalanceRecord.length > 0) {
      return Helper.response(
        true,
        "Leave balance fetched successfully.",
        leaveBalanceRecord,
        res,
        200,
      );
    } else {
      return Helper.response(
        false,
        "No leave balance found for this employee.",
        [],
        res,
        404,
      );
    }
  } catch (error) {
    console.error("Error fetching leave balance:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.applyForLeave = async (req, res) => {
  const {
    employeeId,
    leaveTypeId,
    fromDate,
    toDate,
    reason,
    duration_type = "full",
  } = req.body;

  const tenantId = req.users?.tenantId;
  const createdBy = req.users?.id;
  const branchId = req.users && req.users.branchId;

  if (!employeeId || !leaveTypeId || !tenantId) {
    return Helper.response(false, "Required fields missing", [], res, 200);
  }

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    const leavePeriods = [];

    // Case 1: Both dates are missing → save null values
    // if (!fromDate && !toDate) {
    //   leavePeriods.push({ fromDate: null, toDate: null });
    // }
    // Case 2: Only one date is provided → save that date, other null
    if (fromDate && !toDate) {
      leavePeriods.push({ fromDate, toDate: null });
    } else if (!fromDate && toDate) {
      leavePeriods.push({ fromDate: null, toDate });
    }
    // Case 3: Both dates provided → split if month/year changes
    else {
      const start = moment(fromDate, "YYYY-MM-DD");
      const end = moment(toDate, "YYYY-MM-DD");

      if (start.month() !== end.month() || start.year() !== end.year()) {
        // First month
        const firstMonthEnd = moment(start).endOf("month");
        leavePeriods.push({
          fromDate: start.format("YYYY-MM-DD"),
          toDate: firstMonthEnd.format("YYYY-MM-DD"),
        });

        // Second month
        const secondMonthStart = moment(end).startOf("month");
        leavePeriods.push({
          fromDate: secondMonthStart.format("YYYY-MM-DD"),
          toDate: end.format("YYYY-MM-DD"),
        });
      } else {
        leavePeriods.push({
          fromDate: start.format("YYYY-MM-DD"),
          toDate: end.format("YYYY-MM-DD"),
        });
      }
    }

    const savedLeaves = [];

    for (const period of leavePeriods) {
      let days = 0;

      if (period.fromDate || period.toDate) {
        days = moment(period.toDate).diff(moment(period.fromDate), "days") + 1;
        if (duration_type == "first_half" || duration_type == "second_half") {
          days = 0.5;
        }
      }

      // Check duplicate leave only if dates exist
      const existsLeave = await leave_application.findOne({
        where: {
          employeeId,
          tenantId,
          leaveTypeId,
          fromDate: period.fromDate,
          toDate: period.toDate,
          branchId,
        },
      });

      if (existsLeave) continue;

      const leaveApplication = await leave_application.create({
        employeeId,
        leaveTypeId,
        fromDate: period.fromDate,
        toDate: period.toDate,
        duration_type,
        days,
        reason,
        tenantId,
        createdBy,
        branchId,
      });

      savedLeaves.push(leaveApplication);
    }
    await writeAudit({
      req,
      actionType: "LEAVE_CREATE",
      referenceId: savedLeaves.id,
      employeeId: savedLeaves.employeeId,
      oldValue: null,
      newValue: savedLeaves,
      remarks: "Leave applied",
    });
    
    if (savedLeaves.length > 0) {
      return Helper.response(
        true,
        "Leave application submitted successfully.",
        savedLeaves,
        res,
        200,
      );
    }

    return Helper.response(false, "Leave already exists.", [], res, 200);
  } catch (error) {
    console.error("Error applying for leave:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.deleteAssignedLeave = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return Helper.response(false, "Id is Required!", {}, res, 200);
    }

    const deleteLeave = await leaveBalance.destroy({
      where: {
        id,
      },
    });
    return Helper.response(true, "Leave Deleted Successfully", [], res, 200);
  } catch (error) {
    console.error("Error applying for leave:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};
// exports.applyForLeave = async (req, res) => {
//   const {
//     employeeId,
//     leaveTypeId,
//     fromDate,
//     toDate,
//     reason,
//     duration_type = "full",
//   } = req.body;
//   const tenantId = req.users && req.users.tenantId;
//   const createdBy = req.users && req.users.id;

//   if (!employeeId || !leaveTypeId || !tenantId) {
//     return Helper.response(false, "Required fields missing", [], res, 200);
//   }

//   try {
//     let days = moment(toDate).diff(moment(fromDate), "days") + 1;
//     if (duration_type === "first_half" || duration_type === "second_half") {
//       days = 0.5;
//     }
//     const existsLeave = await leave_application.findOne({
//       where: {
//         employeeId,
//         leaveTypeId,
//         fromDate,
//         toDate,
//         duration_type,
//         days,
//         tenantId,
//       },
//     });
//     if (existsLeave) {
//       return Helper.response(false, "Data Already Exists", {}, res, 200);
//     }

//     const leaveApplication = new leave_application();
//     leaveApplication.employeeId = employeeId;
//     leaveApplication.leaveTypeId = leaveTypeId;
//     leaveApplication.fromDate = fromDate;
//     leaveApplication.duration_type = duration_type;
//     leaveApplication.toDate = toDate;
//     leaveApplication.days = days;
//     leaveApplication.reason = reason;
//     leaveApplication.tenantId = tenantId;
//     leaveApplication.createdBy = createdBy;

//     if (await leaveApplication.save()) {
//       return Helper.response(
//         true,
//         "Leave application submitted successfully.",
//         leaveApplication,
//         res,
//         200
//       );
//     }
//     return Helper.response(false, "Failed to apply for leave.", [], res, 400);
//   } catch (error) {
//     console.error("Error applying for leave:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

//commented By 17-11-2025
// exports.getAppliedLeaves = async (req, res) => {
//   const tenantId = req.users && req.users.tenantId;
//   const employeeId = req.users && req.users.id;

//   try {
//     const appliedLeaves = await leave_application.findAll({
//       where: { tenantId },
//       order: [["appliedOn", "DESC"]],
//       raw:true
//     });

//     const all = await Promise.all(
//       appliedLeaves.map(async (r) => {
//         const employee = await empPersonal.findByPk(r.employeeId, {
//           attributes: ["firstName", "lastName", "email"],
//         });
//         // const leaveType = await leaveMaster.findByPk(r.leaveTypeId);
//         const leaveType=await leaveMaster.findOne({
//           where:{
//             id:r.leaveTypeId
//           }
//         })
//         return {
//           leaveTypeId: r?.leaveTypeId,
//           id: r?.id,
//           employeeId: r?.employeeId,
//           employeeName: `${employee?.firstName} ${employee?.lastName}`,
//           employeeEmail: employee?.email,
//           appliedOn: r.appliedOn,
//           reason: r.reason,
//           duration_type_name: r?.duration_type == "full"
//               ? "Full Day"
//               : r?.duration_type === "first_half"
//               ? "First Half"
//               : "Second Half",
//           duration_type: r?.duration_type,
//           fromDate: r.fromDate,
//           toDate: r.toDate,
//           days: r.days,
//           status: r.status,
//           leaveName: leaveType.leaveName,
//           leaveCode: leaveType.leaveCode,
//           createdAt: Helper.dateFormat(r.createdAt),
//         };
//       })
//     );
//     if (all.length > 0) {
//       return Helper.response(
//         true,
//         "Applied leaves fetched successfully.",
//         all,
//         res,
//         200
//       );
//     } else {
//       return Helper.response(
//         false,
//         "No applied leaves found for this employee.",
//         [],
//         res,
//         404
//       );
//     }
//   } catch (error) {
//     console.error("Error fetching applied leaves:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

// exports.getAppliedLeaves = async (req, res) => {

//   const tenantId = req.users?.tenantId;
//   const branchId = req.users && req.users.branchId;

//   if (!branchId || branchId=='null') {
//       return Helper.response(false, "branchId is required!", {}, res, 200);
//   }

//   try {

//     const appliedLeaves = await leave_application.findAll({
//       where: { tenantId,branchId },
//       order: [["appliedOn", "DESC"]],
//       raw: true,
//     });

//     if (appliedLeaves.length == 0) {
//       return Helper.response(false, "No applied leaves found", [], res, 404);
//     }

//     const employeeIds = [...new Set(appliedLeaves.map(a => a.employeeId))];
//     const leaveTypeIds = [...new Set(appliedLeaves.map(a => a.leaveTypeId))];

//     // Fetch employees once
//     const employees = await empPersonal.findAll({
//       where: { id: { [Op.in]: employeeIds } ,branchId },
//       attributes: ["id", "firstName", "lastName", "email"],
//       raw: true,
//     });

//     const employeeMap = Object.fromEntries(
//       employees.map(e => [e.id, e])
//     );

//     // Fetch leave types once
//     const leaveTypes = await leaveMaster.findAll({
//       where: { id: { [Op.in]: leaveTypeIds } ,branchId },
//       raw: true,
//     });

//     const leaveTypeMap = Object.fromEntries(
//       leaveTypes.map(l => [l.id, l])
//     );

//     const final = appliedLeaves.map(r => ({
//       ...r,
//       employeeName: `${employeeMap[r.employeeId]?.firstName} ${employeeMap[r.employeeId]?.lastName}`,
//       employeeEmail: employeeMap[r.employeeId]?.email,
//       leaveName: leaveTypeMap[r.leaveTypeId]?.leaveName,
//       leaveCode: leaveTypeMap[r.leaveTypeId]?.leaveCode,
//       duration_type_name:
//         r.duration_type == "full"
//           ? "Full Day"
//           : r.duration_type == "first_half"
//           ? "First Half"
//           : "Second Half",
//     }));

//     return Helper.response(true, "Applied leaves fetched", final, res, 200);

//   } catch (error) {
//     return Helper.response(false, error.message, [], res, 500);
//   }
// };

// exports.updatedApplyLeaveStatus = async (req, res) => {
//   let { id, employeeId, leaveTypeId, status, reason, days, appliedOn } =
//     req.body;
//   const tenantId = req.users && req.users.tenantId;
//   try {
//     const year = new Date(appliedOn).getFullYear();
//     const leaveBalance = await leave_balance.findOne({
//       where: {
//         tenantId,
//         leaveTypeId: leaveTypeId,
//         employeeId,
//         year,
//       },
//     });
//     if (!leaveBalance) {
//       return Helper.response(false, "Assigned Leave First", [], res, 400);
//     }
//     const existingLeave = await leave_application.findOne({ where: { id } });

//     existingLeave.status = status;
//     existingLeave.reason = reason;
//     existingLeave.updatedBy = req.users && req.users.id;
//     // existingLeave.approverId=req.users&&req.users.id
//     if (status == "approved") {
//       existingLeave.approverId = req.users && req.users.id;
//     }
//     if (status == "rejected") {
//       existingLeave.canceledId = req.users && req.users.id;
//     }
//     if (status == "recommended") {
//       existingLeave.recommendedId = req.users && req.users.id;
//     }
//     let remainingLeaves;
//     if (await existingLeave.save()) {
//       if (leaveBalance.remainingLeaves < Number(days)) {
//         remainingLeaves = 0;
//       } else {
//         remainingLeaves = leaveBalance.remainingLeaves - Number(days);
//         days = Number(leaveBalance.usedLeaves) + Number(days);
//       }

//       //     const updateleavebalance= await leave_balance.update({
//       //            usedLeaves:days,
//       //            remainingLeaves,
//       //            updatedBy:req.users?.id
//       //     },{
//       //    where:{
//       //        tenantId,
//       //         leaveTypeId:leaveTypeId,
//       //         employeeId,
//       //         year
//       //    }
//       //     })
//       return Helper.response(
//         true,
//         "Leave updated successfully.",
//         existingLeave,
//         res,
//         200
//       );
//     }
//     return Helper.response(false, "Failed to create leave.", [], res, 400);
//   } catch (error) {
//     console.error("Error creating leaves:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

const { fn, literal, where } = require("sequelize");
const comp_off = require("../../models/comp_off");
const attendance = require("../../models/attendance");

exports.getAppliedLeaves = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    let whereClause = { tenantId, branchId };

    let { emp_id, leave_type_id, year, month, status, todayActive, emergencyOnly } = req.body;

    if (emp_id != "All" && emp_id) {
      whereClause.employeeId = emp_id;
    }

    if (leave_type_id) {
      whereClause.leaveTypeId = leave_type_id;
    }

    if (todayActive) {
      // Show only leaves that span today (fromDate <= today <= toDate), pending or approved
      const today = moment().format("YYYY-MM-DD");
      whereClause.fromDate = { [Op.lte]: today };
      whereClause.toDate = { [Op.gte]: today };
      whereClause.status = { [Op.in]: ["pending", "approved"] };
    } else {
      if (!year) {
        year = new Date().getFullYear();
      }
      if (!month) {
        month = new Date().getMonth() + 1;
      }
      //  Year & Month filter using fromDate
      if (year && month) {
        whereClause[Op.and] = [
          where(fn("EXTRACT", literal('YEAR FROM "fromDate"')), year),
          where(fn("EXTRACT", literal('MONTH FROM "fromDate"')), month),
        ];
      }
      if (status) {
        whereClause.status = status;
      }
    }

    let appliedLeaves = await leave_application.findAll({
      where: whereClause,
      order: [["appliedOn", "DESC"]],
      raw: true,
    });

    if (emergencyOnly) {
      const keywords = /urgent|emergency|serious|medical|health/i;
      appliedLeaves = appliedLeaves.filter((l) => keywords.test(String(l.reason || "")));
    }

    if (!appliedLeaves.length) {
      return Helper.response(false, "No applied leaves found", [], res, 404);
    }

    const employeeIds = [...new Set(appliedLeaves.map((a) => a.employeeId))];
    const leaveTypeIds = [...new Set(appliedLeaves.map((a) => a.leaveTypeId))];

    const employees = await empPersonal.findAll({
      where: { id: { [Op.in]: employeeIds }, branchId },
      attributes: ["id", "firstName", "lastName", "email"],
      raw: true,
    });

    const employeeMap = Object.fromEntries(employees.map((e) => [e.id, e]));

    const leaveTypes = await leaveMaster.findAll({
      where: { id: { [Op.in]: leaveTypeIds }, branchId },
      raw: true,
    });

    const leaveTypeMap = Object.fromEntries(leaveTypes.map((l) => [l.id, l]));

    const final = appliedLeaves.map((r) => ({
      ...r,
      employeeName:
        `${employeeMap[r.employeeId]?.firstName || ""} ${employeeMap[r.employeeId]?.lastName || ""}`.trim(),
      employeeEmail: employeeMap[r.employeeId]?.email || null,
      leaveName: leaveTypeMap[r.leaveTypeId]?.leaveName || null,
      leaveCode: leaveTypeMap[r.leaveTypeId]?.leaveCode || null,
      duration_type_name:
        r.duration_type === "full"
          ? "Full Day"
          : r.duration_type === "first_half"
            ? "First Half"
            : "Second Half",
    }));

    return Helper.response(true, "Applied leaves fetched", final, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.updatedApplyLeaveStatus = async (req, res) => {
  let { id, status, reason } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  try {
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingLeave = await leave_application.findOne({
      where: { id, branchId },
    });
    let { employeeId, leaveTypeId, days, appliedOn } = existingLeave;
    const year = new Date(appliedOn).getFullYear();
    const leaveBalances = await leave_balance.findOne({
      where: {
        tenantId,
        branchId,
        leaveTypeId: leaveTypeId,
        employeeId: employeeId,
        year,
      },
    });
    // if (!leaveBalances) {
    //   return Helper.response(false, "Assigned Leave First", [], res, 400);
    // }

    existingLeave.status = status;
    existingLeave.reason = reason || null;
    existingLeave.updatedBy = req.users && req.users.id;

    if (status == "approved") {
      existingLeave.approverId = req.users && req.users.id;
    }
    if (status == "rejected") {
      existingLeave.canceledId = req.users && req.users.id;
    }
    if (status == "recommended") {
      existingLeave.recommendedId = req.users && req.users.id;
    }

    if (!branchId || branchId == "null") {
      existingLeave.branchId = branchId;
    }
    // if(req.users.role=='manager'){
    //  existingLeave.approverId = req.users && req.users.id;
    // }else{

    // }

    if (await existingLeave.save()) {
      await writeAudit({
        req,
        actionType: "LEAVE_UPDATE",
        referenceId: existingLeave.id,
        employeeId: existingLeave.employeeId,
        oldValue: existingLeave,
        newValue: toPlain(existingLeave),
        remarks: "Leave updated",
      });
      return Helper.response(
        true,
        "Leave updated successfully.",
        existingLeave,
        res,
        200,
      );
    }
    return Helper.response(false, "Failed to create leave.", [], res, 400);
  } catch (error) {
    console.error("Error creating leaves:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

// exports.updatedApplyLeaveStatus = async (req, res) => {
//     const { id, employeeId, leaveTypeId, status, reason, days, appliedOn } = req.body
//     const tenantId = req.users && req.users.tenantId;
//     try {
//         const year = new Date(appliedOn).getFullYear();
//         const leaveBalance = await leave_balance.findOne({
//             where: {
//                 tenantId,
//                 leaveTypeId: leaveTypeId,
//                 employeeId,
//                 year
//             }
//         })
//         if (!leaveBalance) {
//             return Helper.response(false, "Assigned Leave First", [], res, 400);
//         }
//         const existingLeave = await leave_application.findOne({ where: { id } })

//         existingLeave.status = status
//         existingLeave.reason = reason
//         existingLeave.updatedBy = req.users && req.users.id
//         existingLeave.approverId = req.users && req.users.id

//         let remainingLeaves
//         if (await existingLeave.save()) {
//             if (leaveBalance.remainingLeaves < Number(days)) {
//                 remainingLeaves = 0
//             } else {
//                 remainingLeaves = leaveBalance.remainingLeaves - Number(days)
//             }

//             const updateleavebalance = await leave_balance.update({
//                 usedLeaves: days,
//                 remainingLeaves,
//                 updatedBy: req.users?.id
//             }, {
//                 where: {
//                     tenantId,
//                     leaveTypeId: leaveTypeId,
//                     employeeId,
//                     year
//                 }
//             })
//             return Helper.response(true, "Leave updated successfully.", existingLeave, res, 200);
//         }
//         return Helper.response(false, "Failed to create leave.", [], res, 400);
//     } catch (error) {
//         console.error("Error creating leaves:", error);
//         return Helper.response(false, error?.message, [], res, 500);
//     }
// }

exports.generateCompOffLeave = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const userId = req.users?.id;
  const branchId = req.users?.branchId;

  const weekendAttendance = Array.isArray(req.body)
    ? req.body
    : [];

  if (!tenantId || !branchId) {
    return Helper.response(false, "Invalid user data", [], res, 400);
  }

  if (!weekendAttendance.length) {
    return Helper.response(false, "No data found", [], res, 200);
  }

  const t = await sequelize.transaction();

  try {
    const compoffLeave = await leaveMaster.findOne({
      where: {
        tenantId,
        branchId,
        leaveCode: "002", // Your compoff code
      },
      transaction: t,
    });

    if (!compoffLeave) {
      throw new Error("COMPOFF leave type not found");
    }

    const leaveTypeId = compoffLeave.id;

    let createdCount = 0;

    for (const item of weekendAttendance) {
      if (!item.employeeId || !item.date) continue;

      const year = moment(item.date).year();
      const month = moment(item.date).month() + 1;

      const existingCompOff = await comp_off.findOne({
        where: {
          employeeId: item.employeeId,
          attendanceId: item.id,
          tenantId,
           branchId
        },
        transaction: t,
      });

      if (existingCompOff) continue;

      await comp_off.create(
        {
          employeeId: item.employeeId,
          attendanceId: item.id,
          earnedDate: item.date,
          expiryDate: moment(item.date)
            .add(60, "days")
            .format("YYYY-MM-DD"),
          totalDays: 1,
          remainingDays: 1,
          tenantId,
          branchId
        },
        { transaction: t }
      );

      let balance = await leave_balance.findOne({
        where: {
          employeeId: item.employeeId,
          leaveTypeId,
          year,
          month,
          tenantId,
          branchId,
        },
        transaction: t,
      });

      if (balance) {
        balance.totalAssigned =
          Number(balance.totalAssigned) + 1;

        balance.remainingLeaves =
          Number(balance.remainingLeaves) + 1;

        await balance.save({ transaction: t });
      } else {
        await leave_balance.create(
          {
            employeeId: item.employeeId,
            branchId,
            leaveTypeId,
            year,
            month,
            totalAssigned: 1,
            usedLeaves: 0,
            carryForwarded: 0,
            remainingLeaves: 1,
            tenantId,
            createdBy: userId,
          },
          { transaction: t }
        );
      }

      await attendance.update(
        {
          is_comp_off_approve: true,
          updatedBy: userId,
        },
        {
          where: {
            id: item.id, 
            employeeId: item.employeeId,
            tenantId,
            branchId,
          },
          transaction: t,
        }
      );

      createdCount++;
    }

    await t.commit();

    return Helper.response(
      true,
      `${createdCount} CompOff generated successfully`,
      [],
      res,
      200
    );
  } catch (error) {
    await t.rollback();
    console.log("CompOff Error:", error);

    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.approveCompOffLeave = async (req, res) => {

  const tenantId = req.users?.tenantId;
  const userId = req.users?.id;
  const branchId = req.users?.branchId;

  const weekendAttendance = Array.isArray(req.body) ? req.body : [];

  if (!tenantId || !branchId) {
    return Helper.response(false, "Invalid user data", [], res, 400);
  }

  if (!weekendAttendance.length) {
    return Helper.response(false, "No data found", [], res, 200);
  }

  const t = await sequelize.transaction();

  try {

    const compoffLeave = await leaveMaster.findOne({
      where: {
        tenantId,
        branchId,
        leaveCode: "002"
      },
      transaction: t
    });

    if (!compoffLeave) {
      throw new Error("COMPOFF leave type not found");
    }

    const leaveTypeId = compoffLeave.id;

    let createdCount = 0;

   for (const item of weekendAttendance) {

  if (!item.employeeId || !item.earnedDate) continue;

  const year = moment(item.earnedDate).year();
  const month = moment(item.earnedDate).month() + 1;

  let compOff = await comp_off.findOne({
    where: {
      id: item.id,   // ✅ correct lookup
      tenantId,
      branchId
    },
    transaction: t
  });

  if (!compOff) continue;

  // ✅ prevent double approval
  if (compOff.approval_status == "approved") continue;

  await compOff.update({
    approval_status: "approved",
    updatedBy: userId
  }, { transaction: t });

  // ✅ UPDATE LEAVE BALANCE
  let balance = await leave_balance.findOne({
    where: {
      employeeId: item.employeeId,
      leaveTypeId,
      year,
      tenantId,
      branchId
    },
    transaction: t
  });

  if (balance) {

    await balance.update({
      totalAssigned: Number(balance.totalAssigned) + 1,
      remainingLeaves: Number(balance.remainingLeaves) + 1
    }, { transaction: t });

  } else {

    await leave_balance.create({
      employeeId: item.employeeId,
      branchId,
      leaveTypeId,
      year,
      month,
      totalAssigned: 1,
      usedLeaves: 0,
      carryForwarded: 0,
      remainingLeaves: 1,
      tenantId,
      createdBy: userId
    }, { transaction: t });

  }

}

    await t.commit();

    return Helper.response(
      true,
      `${createdCount} CompOff processed successfully`,
      [],
      res,
      200
    );

  } catch (error) {

    await t.rollback();
    console.log("CompOff Error:", error);

    return Helper.response(false, error.message, [], res, 500);
  }
};