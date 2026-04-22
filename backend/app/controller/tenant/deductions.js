const deduction = require("../../models/deductions");
const Helper = require("../../helper/helper");



exports.createDeductionMaster = async (req, res) => {
    const { deductionName, deductionType, amount,deductionValue,startDate } = req.body;
    const tenantId = req.users && req.users.tenantId;
       const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    try {
        const existingDeduction = await deduction.findOne({ where: { tenantId, deductionName,startDate } });
        if (existingDeduction) {
            return Helper.response(false, "Deduction already exists for this tenant.", [], res, 400);
        }

        const newDeduction = new deduction();
        newDeduction.tenantId = tenantId;
        newDeduction.branchId = branchId;
        newDeduction.deductionName = deductionName;
        newDeduction.deductionType = deductionType;
        newDeduction.deductionValue = deductionValue
        newDeduction.amount = amount;
        newDeduction.startDate = startDate

        if (await newDeduction.save()) {
            return Helper.response(true, "Deduction created successfully.", newDeduction, res, 200);
        }
        return Helper.response(false, "Failed to create deduction.", [], res, 400);
    } catch (error) {
        console.error("Error creating deduction:", error);
        return Helper.response(false, "Internal server error.", [], res, 500);
    }
}
exports.getDeductionMaster = async (req, res) => {
    const tenantId = req.users && req.users.tenantId;
        const branchId = req.users && req.users.branchId;
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    try {
        const deductions = await deduction.findAll({ where: { tenantId, branchId } });
        if (deductions.length === 0) {
            return Helper.response(false, "No deductions found for this tenant.", [], res, 400);
        }
        return Helper.response(true, "Deductions retrieved successfully.", deductions, res, 200);
    } catch (error) {
        console.error("Error retrieving deductions:", error);
        return Helper.response(false, "Internal server error.", [], res, 500);
    }
}

exports.updateDeductionMaster = async (req, res) => {
    const { id, deductionName, deductionType, amount ,deductionValue,startDate} = req.body;
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    
    try {
        const deductionToUpdate = await deduction.findOne({ where: { id: id, tenantId } });
        if (!deductionToUpdate) {
            return Helper.response(false, "Deduction not found for this tenant.", [], res, 404);
        }

        deductionToUpdate.deductionName = deductionName;
        deductionToUpdate.deductionType = deductionType;
        deductionToUpdate.amount = amount;
        deductionToUpdate.branchId = branchId;
        deductionToUpdate.deductionValue = deductionValue;
        deductionToUpdate.startDate = startDate

        if (await deductionToUpdate.save()) {
            return Helper.response(true, "Deduction updated successfully.", deductionToUpdate, res, 200);
        }
        return Helper.response(false, "Failed to update deduction.", [], res, 400);
    } catch (error) {
        console.error("Error updating deduction:", error);
        return Helper.response(false, "Internal server error.", [], res, 500);
    }
}


