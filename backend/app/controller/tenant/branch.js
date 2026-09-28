const Helper = require("../../helper/helper");
const branch = require("../../models/branch");
const Department = require("../../models/department");
const Designation = require("../../models/designation");
const EmploymentType = require("../../models/employmentType");
const DocumentType = require("../../models/documentType");
const HolidayType = require("../../models/HolidayType");
const MasterComponents = require("../../models/master_components");
const Shift = require("../../models/shift");
const LeaveMaster = require("../../models/leaveMaster");
const AttendanceSetting = require("../../models/attendanceSetting");
const Currency = require("../../models/currency");
const Prefix = require("../../models/prefix");
const RoundType = require("../../models/round_type");
const InterviewRound = require("../../models/interview_round");

exports.createBranch = async (req, res) => {
  const { name, status, longitude, latitude,description } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!tenantId || !name) {
      return Helper.response(
        false,
        "Tenant ID and name are required",
        [],
        res,
        400,
      );
    }
    if (!longitude || !latitude) {
      return Helper.response(
        false,
        "longitude and latitude are required",
        [],
        res,
        400,
      );
    }
    const existing = await branch.findOne({ where: { name, tenantId } });
    if (existing) {
      return Helper.response(false, "Branch with this name already exists", [], res, 409);
    }

    const imageFile = req.files && req.files.find((f) => f.fieldname == "image");
    const image = imageFile ? imageFile.filename : null;
    const newbranch = await branch.create({
      tenantId,
      name,
      latitude,
      longitude,
      image,
      description:description || null,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });
    return Helper.response(
      true,
      "branch created successfully",
      newbranch,
      res,
      201,
    );
  } catch (error) {
    console.error("Error creating branch:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getBranch = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { name } = req.body || {};
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant Id is required", [], res, 400);
    }
    if (name) {
      const branchs = await branch.findOne({
        where: { name, tenantId },
      });
      if (!branchs) {
        return Helper.response(false, "branch not found", [], res, 404);
      }
      // Format date and time in IST
      const formattedbranch = {
        ...branchs.toJSON(),
        createdAt: Helper.formatToIST(branchs.createdAt, "YYYY-MM-DD HH:mm:ss"),
      };
      return Helper.response(
        true,
        "branch fetched successfully",
        formattedbranch,
        res,
        200,
      );
    } else {
      const branchs = await branch.findAll({
        where: { tenantId },
        order: [["createdAt", "DESC"]],
      });

      const data = branchs.map((dept) => ({
        ...dept.toJSON(),
        createdAt: Helper.formatToIST(dept.createdAt, "YYYY-MM-DD HH:mm:ss"),
      }));
      return Helper.response(
        true,
        "branchs fetched successfully",
        data,
        res,
        200,
      );
    }
  } catch (error) {
    console.error("Error fetching branchs:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.updateBranch = async (req, res) => {
  const { id, name, status, latitude, longitude,description } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "branch ID and Tenant ID are required",
        [],
        res,
        400,
      );
    }
    const branchs = await branch.findOne({ where: { id, tenantId } });
    if (!branchs) {
      return Helper.response(false, "branch not found", [], res, 404);
    }
    if (!name) {
      return Helper.response(false, "Name Is Required", [], res, 404);
    }

    const duplicate = await branch.findOne({ where: { name, tenantId } });
    if (duplicate && duplicate.id !== id) {
      return Helper.response(false, "Branch with this name already exists", [], res, 409);
    }

    const imageFile = req.files && req.files.find((f) => f.fieldname == "image");
    branchs.name = name || branchs.name;
    branchs.latitude = latitude || branchs.latitude;
    branchs.longitude = longitude || branchs.longitude;
    branchs.status = status || branchs.status;
    branchs.description = description || branchs.description;
    branchs.image = imageFile ? imageFile.filename  : branchs.image;
    branchs.updatedBy = req.users && req.users.id;

    await branchs.save();
    return Helper.response(
      true,
      "branch updated successfully",
      branchs,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating branch:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.deleteBranch = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "branch ID and Tenant ID are required",
        [],
        res,
        400,
      );
    }
    const branchs = await branch.findOne({ where: { id, tenantId } });
    if (!branchs) {
      return Helper.response(false, "branch not found", [], res, 404);
    }
    await branchs.destroy();
    return Helper.response(true, "branch deleted successfully", [], res, 200);
  } catch (error) {
    console.error("Error deleting branch:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.copyBranchMasterData = async (req, res) => {
  const { sourceBranchId, targetBranchId } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const userId = req.users && req.users.id;

  try {
    if (!sourceBranchId || !targetBranchId) {
      return Helper.response(false, "sourceBranchId and targetBranchId are required", [], res, 400);
    }
    if (sourceBranchId === targetBranchId) {
      return Helper.response(false, "Source and target branches must be different", [], res, 400);
    }

    const sourceBranch = await branch.findOne({ where: { id: sourceBranchId, tenantId } });
    const targetBranch = await branch.findOne({ where: { id: targetBranchId, tenantId } });
    if (!sourceBranch) return Helper.response(false, "Source branch not found", [], res, 404);
    if (!targetBranch) return Helper.response(false, "Target branch not found", [], res, 404);

    const summary = {};

    // 1. Departments
    const sourceDepts = await Department.findAll({ where: { branchId: sourceBranchId, tenantId } });
    const deptIdMap = {};
    let deptCopied = 0;
    for (const dept of sourceDepts) {
      const existing = await Department.findOne({ where: { name: dept.name, branchId: targetBranchId, tenantId } });
      if (existing) {
        deptIdMap[dept.id] = existing.id;
      } else {
        const newDept = await Department.create({
          tenantId, branchId: targetBranchId, name: dept.name,
          status: dept.status, createdBy: userId, updatedBy: userId,
        });
        deptIdMap[dept.id] = newDept.id;
        deptCopied++;
      }
    }
    summary.departments = deptCopied;

    // 2. Designations
    const sourceDesigs = await Designation.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let desigCopied = 0;
    for (const desig of sourceDesigs) {
      const mappedDeptId = deptIdMap[desig.department] || desig.department;
      const existing = await Designation.findOne({ where: { name: desig.name, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await Designation.create({
          tenantId, branchId: targetBranchId, department: mappedDeptId,
          name: desig.name, status: desig.status, createdBy: userId, updatedBy: userId,
        });
        desigCopied++;
      }
    }
    summary.designations = desigCopied;

    // 3. Employment Types
    const sourceEmpTypes = await EmploymentType.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let empTypeCopied = 0;
    for (const et of sourceEmpTypes) {
      const existing = await EmploymentType.findOne({ where: { name: et.name, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await EmploymentType.create({
          tenantId, branchId: targetBranchId, name: et.name,
          duration_type: et.duration_type, status: et.status, createdBy: userId, updatedBy: userId,
        });
        empTypeCopied++;
      }
    }
    summary.employmentTypes = empTypeCopied;

    // 4. Document Types
    const sourceDocTypes = await DocumentType.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let docTypeCopied = 0;
    for (const dt of sourceDocTypes) {
      const existing = await DocumentType.findOne({ where: { type: dt.type, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await DocumentType.create({
          tenantId, branchId: targetBranchId, type: dt.type,
          status: dt.status, createdBy: userId, updatedBy: userId,
        });
        docTypeCopied++;
      }
    }
    summary.documentTypes = docTypeCopied;

    // 5. Holiday Types
    const sourceHolidayTypes = await HolidayType.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let holidayTypeCopied = 0;
    for (const ht of sourceHolidayTypes) {
      const existing = await HolidayType.findOne({ where: { name: ht.name, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await HolidayType.create({
          tenantId, branchId: targetBranchId, name: ht.name,
          status: ht.status, createdBy: userId, updatedBy: userId,
        });
        holidayTypeCopied++;
      }
    }
    summary.holidayTypes = holidayTypeCopied;

    // 6. Master Components (salary)
    const sourceMC = await MasterComponents.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let mcCopied = 0;
    for (const mc of sourceMC) {
      const existing = await MasterComponents.findOne({ where: { component_name: mc.component_name, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await MasterComponents.create({
          tenantId, branchId: targetBranchId, component_name: mc.component_name,
          value: mc.value, value_type: mc.value_type, amount: mc.amount,
          dependent_component: mc.dependent_component, component_description: mc.component_description,
          component_type: mc.component_type, status: mc.status, createdBy: userId, updatedBy: userId,
        });
        mcCopied++;
      }
    }
    summary.masterComponents = mcCopied;

    // 7. Shifts
    const sourceShifts = await Shift.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let shiftCopied = 0;
    for (const sh of sourceShifts) {
      const existing = await Shift.findOne({ where: { shift: sh.shift, day_of_week: sh.day_of_week, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await Shift.create({
          tenantId, branchId: targetBranchId, shift: sh.shift, day_of_week: sh.day_of_week,
          startTime: sh.startTime, endTime: sh.endTime, workingHours: sh.workingHours,
          status: sh.status, is_week_off: sh.is_week_off, createdBy: userId, updatedBy: userId,
        });
        shiftCopied++;
      }
    }
    summary.shifts = shiftCopied;

    // 8. Leave Masters
    const sourceLM = await LeaveMaster.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let lmCopied = 0;
    for (const lm of sourceLM) {
      const existing = await LeaveMaster.findOne({ where: { leaveCode: lm.leaveCode, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await LeaveMaster.create({
          tenantId, branchId: targetBranchId, leaveName: lm.leaveName, leaveCode: lm.leaveCode,
          isPaid: lm.isPaid, allowedPerYear: lm.allowedPerYear, carryForward: lm.carryForward,
          maxCarryForward: lm.maxCarryForward, enCashable: lm.enCashable, genderRestriction: lm.genderRestriction,
          requiresApproval: lm.requiresApproval, applyBeforeDays: lm.applyBeforeDays,
          description: lm.description, createdBy: userId, updatedBy: userId,
        });
        lmCopied++;
      }
    }
    summary.leaveMasters = lmCopied;

    // 9. Attendance Settings (one per branch)
    const targetAS = await AttendanceSetting.findOne({ where: { branchId: targetBranchId, tenantId } });
    if (!targetAS) {
      const sourceAS = await AttendanceSetting.findOne({ where: { branchId: sourceBranchId, tenantId } });
      if (sourceAS) {
        await AttendanceSetting.create({
          tenantId, branchId: targetBranchId, lateAllowanceMin: sourceAS.lateAllowanceMin,
          graceMinutes: sourceAS.graceMinutes, halfDayThreshold: sourceAS.halfDayThreshold,
          halfdayToAbsentMin: sourceAS.halfdayToAbsentMin, createdBy: userId, updatedBy: userId,
        });
        summary.attendanceSettings = 1;
      } else {
        summary.attendanceSettings = 0;
      }
    } else {
      summary.attendanceSettings = 0;
    }

    // 10. Currencies
    const sourceCurrencies = await Currency.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let currencyCopied = 0;
    for (const cur of sourceCurrencies) {
      const existing = await Currency.findOne({ where: { name: cur.name, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await Currency.create({
          tenantId, branchId: targetBranchId, name: cur.name,
          status: cur.status, createdBy: userId, updatedBy: userId,
        });
        currencyCopied++;
      }
    }
    summary.currencies = currencyCopied;

    // 11. Prefixes
    const sourcePrefixes = await Prefix.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let prefixCopied = 0;
    for (const pf of sourcePrefixes) {
      const existing = await Prefix.findOne({ where: { name: pf.name, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await Prefix.create({
          tenantId, branchId: targetBranchId, name: pf.name,
          status: pf.status, createdBy: userId, updatedBy: userId,
        });
        prefixCopied++;
      }
    }
    summary.prefixes = prefixCopied;

    // 12. Round Types
    const sourceRTs = await RoundType.findAll({ where: { branchId: sourceBranchId, tenantId } });
    const rtIdMap = {};
    let rtCopied = 0;
    for (const rt of sourceRTs) {
      const existing = await RoundType.findOne({ where: { name: rt.name, branchId: targetBranchId, tenantId } });
      if (existing) {
        rtIdMap[rt.id] = existing.id;
      } else {
        const newRT = await RoundType.create({
          tenantId, branchId: targetBranchId, name: rt.name,
          status: rt.status, createdBy: userId, updatedBy: userId,
        });
        rtIdMap[rt.id] = newRT.id;
        rtCopied++;
      }
    }
    summary.roundTypes = rtCopied;

    // 13. Interview Rounds
    const sourceIRs = await InterviewRound.findAll({ where: { branchId: sourceBranchId, tenantId } });
    let irCopied = 0;
    for (const ir of sourceIRs) {
      const existing = await InterviewRound.findOne({ where: { round_name: ir.round_name, branchId: targetBranchId, tenantId } });
      if (!existing) {
        await InterviewRound.create({
          tenantId, branchId: targetBranchId, round_name: ir.round_name,
          round_type: rtIdMap[ir.round_type] || ir.round_type,
          order_sequence: ir.order_sequence, duration_minutes: ir.duration_minutes,
          is_mandatory: ir.is_mandatory, status: ir.status, createdBy: userId, updatedBy: userId,
        });
        irCopied++;
      }
    }
    summary.interviewRounds = irCopied;

    return Helper.response(true, "Master data copied successfully", { summary, source: sourceBranch.name, target: targetBranch.name }, res, 200);
  } catch (error) {
    console.error("Error copying branch master data:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.branchDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { name } = req.body || {};
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (name) {
      const branchs = await branch.findOne({
        where: { name, tenantId },
      });
      if (!branchs) {
        return Helper.response(false, "branch not found", [], res, 404);
      }
      return Helper.response(
        true,
        "branch fetched successfully",
        branchs,
        res,
        200,
      );
    } else {
      const branchs = await branch.findAll({
        where: { tenantId },
        order: [["name", "ASC"]],
      });

      const data = branchs
        .map((branch) => ({
          id: branch.id,
          name: branch.name??null,
          image: branch.image??null,
          longitude: branch.longitude??null,
          latitude: branch.latitude??null,
          description: branch.description ?? "Central administration and monitoring access.",
        }))
        .sort((a, b) => (a.name === "Lucknow" ? -1 : 1));

      return Helper.response(
        true,
        "branchs fetched successfully",
        data,
        res,
        200,
      );
    }
  } catch (error) {
    console.error("Error fetching branchs:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};
