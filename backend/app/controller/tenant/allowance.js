const Allowance = require('../../models/allowance');
const Helper = require('../../helper/helper');
const empPersonal = require('../../models/empPersonal');

exports.createAllowance = async (req, res) => {
  const {
    employeeId,
    name,
    type,
    typeValue,
    dependent,
    finalAmount,
    amount,
    status,
    startDate,
  } = req.body;

  const tenantId = req.users && req.users.tenantId;
  const userId = req.users && req.users.id;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId=='null') {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
  if (!tenantId || !employeeId) {
    return Helper.response(
      false,
      "TenantId and employeeId required",
      [],
      res,
      400
    );
  }

  const emloyeeExist = await empPersonal.findOne({
    where: { 
      id: employeeId, 
      tenantId,
      status:'active',
      branchId
      },
  });

  if (!emloyeeExist) {
    return Helper.response(false, "Employee does not exist", [], res, 400);
  }

  if (!name || !type || !finalAmount ) {
    return Helper.response(
      false,
      "All required fields must be provided",
      [],
      res,
      400
    );
  }

  if (startDate && !Helper.formatToIST(startDate)) {
  return Helper.response(false, "Invalid startDate format. Use YYYY-MM-DD", [], res, 400);
}


  
    const allowance = await Allowance.create({
      tenantId,
      branchId,
      employeeId,
      name,
      type,
      typeValue,
      dependent,
      amount,
      finalAmount,
      status: status || "active",
      startDate: Helper.formatToIST(startDate),
      createdBy: userId,
      updatedBy: userId,
      
    });

    return Helper.response(
      true,
      "allowance record created successfully",
      allowance,
      res,
      201
    );
  } catch (err) {
    console.error("Error in createallowance:", err);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

exports.getAllowance = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  const {employeeId } = req.body
  
  try {
    
     if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
  

      if (!tenantId ) {
        return Helper.response(false, "Tenant ID is required", [], res, 400);
      }
      if (!employeeId ) {
        return Helper.response(false, "employee ID is required", [], res, 400);
      }



      const emloyeeExist =await empPersonal.findOne({
        where: { id: employeeId, tenantId,branchId, status:'active' },
      });
    
      if (!emloyeeExist) {
        return Helper.response(false, "Employee does not exist", [], res, 400);
      }
    const allowance = await Allowance.findAll({ where: {employeeId,branchId, tenantId } });

    if(!allowance)
    {
      return Helper.response(false, "Data does not exist", [], res, 400);
    }

    return Helper.response(
      true,
      "Basic records fetched successfully",
      allowance,
      res,
      200
    );
  } catch (err) {
    console.error("Error in getBasic:", err);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

exports.updateAllowance = async (req, res) => {
  const {
    id,
    employeeId,
    name,
    type,
    typeValue,
    dependent,
    finalAmount,
    amount,
    status,
    startDate,
  } = req.body;

  const tenantId = req.users && req.users.tenantId;
  const userId = req.users && req.users.id;
  const branchId = req.users && req.users.branchId;
  
  try {

      if (!branchId || branchId=='null') {
        return Helper.response(false, "branchId is required!", {}, res, 200);
      }
  
      const emloyeeExist = await empPersonal.findOne({
        where: { id: employeeId, tenantId, status:'active' },
      });
    
      if (!emloyeeExist) {
        return Helper.response(false, "Employee does not exist", [], res, 400);
      }
    
      if (startDate && !Helper.formatToIST(startDate)) {
        return Helper.response(false, "Invalid startDate format. Use YYYY-MM-DD", [], res, 400);
      }
    
      if (!tenantId || !id || !employeeId) {
        return Helper.response(
          false,
          "EmployeeId, ID and Tenant ID are required",
          [],
          res,
          400
        );
      }
    const allowance = await Allowance.findOne({ where: { id, employeeId, tenantId } });

    if (!allowance) {
      return Helper.response(false, "allowance record not found", [], res, 404);
    }


    if (name) allowance.name = name;
    if (type) allowance.type = type;
    if (typeValue !== undefined) allowance.typeValue = typeValue;
    if (dependent) allowance.dependent = dependent;
    if (amount !== undefined) allowance.amount = amount;
    allowance.finalAmount = finalAmount;
    if (status) allowance.status = status;
    if (startDate) allowance.startDate = Helper.formatToIST(startDate);

    allowance.updatedBy = userId;

    await allowance.save();

    return Helper.response(
      true,
      "allowance record updated successfully",
      allowance,
      res,
      200
    );
  } catch (err) {
    console.error("Error in updateAllowance:", err);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

exports.deleteAllowance = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;


  if (!branchId || branchId=='null') {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!id || !tenantId) {
    return Helper.response(
      false,
      "ID and Tenant ID are required",
      [],
      res,
      400
    );
  }

  try {
    const allowance = await Allowance.findOne({ where: { id, tenantId,  branchId } });

    if (!allowance) {
      return Helper.response(false, "allowance record not found", [], res, 404);
    }

    await allowance.destroy();

    return Helper.response(
      true,
      "allowance record deleted successfully",
      [],
      res,
      200
    );
  } catch (err) {
    console.error("Error in deleteBasic:", err);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};
