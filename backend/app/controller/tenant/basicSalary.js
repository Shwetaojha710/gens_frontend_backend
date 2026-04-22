const Basic = require("../../models/basic");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const Allowance = require("../../models/allowance");
const deduction = require("../../models/deductions");
const MasterComponents = require("../../models/master_components");
const EmploymentType = require("../../models/employmentType");
const sequelize =require('../../connection/connection')
exports.createVariable = async (req, res) => {
  const {
    employeeId,
    name,
    type,
    typeValue,
    dependent_component,
    finalAmount,
    component_name,
    amount,
    status,
    startDate,
    component_type,
    value_type,
    endDate,
    time_period,
    componentId,
  } = req.body;

  const tenantId = req.users?.tenantId;
  const userId = req.users?.id;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId=='null') {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId || !employeeId) {
    return Helper.response(false, "TenantId and employeeId are required", [], res, 400);
  }

  const employeeExist = await empPersonal.findOne({
    where: { id: employeeId, tenantId, status: "active", branchId },
  });

  if (!employeeExist) {
    return Helper.response(false, "Employee does not exist", [], res, 400);
  }

  const transaction = await sequelize.transaction();
  try {
    let createdVariable;
    const Model = component_type === "payable" ? Allowance : deduction;

    // Check if variable with same date already exists
    const existingDateVariable = await Model.findOne({
      where: {
        employeeId,
        tenantId,
        startDate,
        name: component_name,
        componentId,
        status: "active",
        branchId,
      },
    });

    if (existingDateVariable) {
      await transaction.rollback();
      return Helper.response(false, "Variable already created for this date", [], res, 400);
    }

    // If same variable exists, close previous record before creating new
    const existingVariable = await Model.findOne({
      where: {
        employeeId,
        tenantId,
        name: component_name,
        componentId,
        branchId,
        status: "active",
      },
    });

    if (existingVariable) {
      const endDate1 = new Date(startDate);
      endDate1.setDate(endDate1.getDate() - 1);

      await Model.update(
        { endDate: endDate1, status: "inactive" },
        { where: { id: existingVariable.id,branchId }, transaction }
      );
    }

    createdVariable = await Model.create(
      {
        tenantId,
        employeeId,
        name: component_name,
        type: value_type,
        typeValue,
        dependent: dependent_component,
        amount,
        finalAmount,
        endDate,
        componentId,
        endPeriodType: time_period,
        status: status || "active",
        startDate,
        createdBy: userId,
        updatedBy: userId,
        branchId,
      },
      { transaction }
    );

    await transaction.commit();
    return Helper.response(true, "Variable created successfully", createdVariable, res, 201);
  } catch (err) {
    await transaction.rollback();
    console.error("Error in createVariable:", err);
    return Helper.response(false, err?.message || "Internal server error", [], res, 500);
  }
};


exports.createBasic = async (req, res) => {
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
    where: { id: employeeId, tenantId, status: "active", branchId },
  });

  if (!emloyeeExist) {
    return Helper.response(false, "Employee does not exist", [], res, 400);
  }

  if (!name || !type || !typeValue || !dependent || !amount) {
    return Helper.response(
      false,
      "All required fields must be provided",
      [],
      res,
      400
    );
  }

  if (startDate && !Helper.formatToIST(startDate)) {
    return Helper.response(
      false,
      "Invalid startDate format. Use YYYY-MM-DD",
      [],
      res,
      400
    );
  }

  try {
    const basic = await Basic.create({
      tenantId,
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
      branchId,
    });

    return Helper.response(
      true,
      "Basic record created successfully",
      basic,
      res,
      201
    );
  } catch (err) {
    console.error("Error in createBasic:", err);
    return Helper.response(false,err?.message, [], res, 500);
  }
};

exports.getBasic = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { employeeId } = req.body;
  
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId=='null') {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (!employeeId) {
      return Helper.response(false, "employee ID is required", [], res, 400);
    }

    const emloyeeExist = empPersonal.findOne({
      where: { id: employeeId, tenantId, status: "active" },
    });

    if (!emloyeeExist) {
      return Helper.response(false, "Employee does not exist", [], res, 400);
    }
    const basics = await Basic.findAll({ where: { employeeId, tenantId } });

    if (!basics) {
      return Helper.response(false, "Data does not exist", [], res, 400);
    }

    return Helper.response(
      true,
      "Basic records fetched successfully",
      basics,
      res,
      200
    );
  } catch (err) {
    console.error("Error in getBasic:", err);
    return Helper.response(false,err?.message, [], res, 500);
  }
};

exports.updateBasic = async (req, res) => {
  const {
    id,
    employeeId,
    name,
    type,
    typeValue,
    dependent,
    amount,
    finalAmount,
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
    const emloyeeExist = empPersonal.findOne({
      where: { id: employeeId, tenantId, status: "active", branchId },
    });

    if (!emloyeeExist) {
      return Helper.response(false, "Employee does not exist", [], res, 400);
    }

    if (startDate && !Helper.formatToIST(startDate)) {
      return Helper.response(
        false,
        "Invalid startDate format. Use YYYY-MM-DD",
        [],
        res,
        400
      );
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
    const basic = await Basic.findOne({ where: { id, employeeId, tenantId,branchId } });

    if (!basic) {
      return Helper.response(false, "Basic record not found", [], res, 404);
    }

    if (name) basic.name = name;
    if (type) basic.type = type;
    if (typeValue !== undefined) basic.typeValue = typeValue;
    if (dependent) basic.dependent = dependent;
    if (amount !== undefined) basic.amount = amount;
    basic.finalAmount = finalAmount;
    if (status) basic.status = status;
    if (startDate) basic.startDate = Helper.formatToIST(startDate);

    basic.updatedBy = userId;

    await basic.save();

    return Helper.response(
      true,
      "Basic record updated successfully",
      basic,
      res,
      200
    );
  } catch (err) {
    console.error("Error in updateBasic:", err);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

exports.deleteBasic = async (req, res) => {
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
    const basic = await Basic.findOne({ where: { id, tenantId, branchId } });

    if (!basic) {
      return Helper.response(false, "Basic record not found", [], res, 404);
    }

    await basic.destroy();

    return Helper.response(
      true,
      "Basic record deleted successfully",
      [],
      res,
      200
    );
  } catch (err) {
    console.error("Error in deleteBasic:", err);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

exports.getBasicById = async (req, res) => {
  const { employeeId } = req.body;
  const tenantId = req.users && req.users.tenantId;
 const branchId = req.users && req.users.branchId;

  if (!branchId || branchId=='null') {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!employeeId || !tenantId) {
    return Helper.response(
      false,
      "employeeId and Tenant ID are required",
      [],
      res,
      400
    );
  }

  try {
    const basic = await Basic.findOne({ where: { employeeId, tenantId,branchId } });

    if (!basic) {
      return Helper.response(false, "Basic record not found", [], res, 404);
    }

    const basicData = {
      value: basic.id,
      label: basic.name,
      finalAmount: basic.finalAmount,
    };

    return Helper.response(
      true,
      "Basic record fetched successfully",
      basicData,
      res,
      200
    );
  } catch (err) {
    console.error("Error in getBasicById:", err);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

// exports.updateSalarySetup = async (req, res) => {
//   try {
//     const data = req.body;
//     const bodyData = data.data;
//     const tenantId = req.users && req.users.tenantId;
  
//     const { empType } = req.body;
//     if (!tenantId || !data.employeeId || !data.CTC) {
//       return Helper.response(
//         false,
//         "Required fields are missing",
//         {},
//         res,
//         400
//       );
//     }

//     const empTypedetails = await EmploymentType.findOne({
//       where: {
//         id: empType,
//       },
//     });

//     const salaryComponents = await MasterComponents.findAll({
//       where: { tenantId, status: "active" },
//     });

//     if (!salaryComponents || salaryComponents.length === 0) {
//       return Helper.response(
//         false,
//         "Create Salary Component First",
//         {},
//         res,
//         400
//       );
//     }

//     const existingCTC = await Basic.findOne({
//       where: {
//         tenantId,
//         employeeId: data.employeeId,
//         dependent: "CTC",
//         startDate: data.startDate,
//         status: "active",
//       },
//     });
 


//     if (existingCTC) {
 

//       return Helper.response(
//         false,
//         "CTC Component Already Exists",
//         {},
//         res,
//         400
//       );
//     }

//     let allowanceRecords = [];
//     let deductionRecords = [];
//     let basicRecords = [];

//     bodyData.map(async (item) => {
//       if (
//         item.value_type === "basic_dependent" &&
//         item.component_type === "payable"
//       ) {
//         basicRecords.push({
//           employeeId: data.employeeId,
//           tenantId,
//           componentId: item.componentId,
//           name: item.component_name,
//           typeValue: item.value,
//           type: item.value_type,
//           amount:
//             empTypedetails.duration_type == "half_paid"
//               ? (data.CTC / 2).toFixed(0)
//               : data.CTC,
//           finalAmount:
//             empTypedetails.duration_type == "half_paid"
//               ? (item.calculated_amount / 2).toFixed(0)
//               : item.calculated_amount,
//           finalCTC: req.body?.FinalCTC,
//           createdBy: req.users.id,
//           dependent: "CTC",
//           startDate: data.startDate,
//           status: item.status,
//         });
//       }
//       if (
//         item.component_type === "payable" &&
//         item.value_type != "basic_dependent"
//       ) {
//         allowanceRecords.push({
//           employeeId: data.employeeId,
//           tenantId,
//           componentId: item.componentId,
//           name: item.component_name,
//           type: item.value_type,
//           typeValue: item.value,
//           finalAmount:
//             empTypedetails.duration_type == "half_paid"
//               ? (item.calculated_amount / 2).toFixed(0)
//               : item.calculated_amount,
//           status: item.status,
//           startDate: data.startDate,
//           dependent: data.dependent_component_id,
//           createdBy: req.users.id,
//         });
//       }
//       if (
//         item.component_type === "deductible" &&
//         item.value_type != "basic_dependent"
//       ) {
//         deductionRecords.push({
//           employeeId: data.employeeId,
//           tenantId,
//           componentId: item.componentId,
//           name: item.component_name,
//           type: item.value_type,
//           typeValue: item.value,
//           finalAmount:
//             empTypedetails.duration_type == "half_paid"
//               ? (item.calculated_amount / 2).toFixed(0)
//               : item.calculated_amount,
//           status: item.status,
//           startDate: data.startDate,
//           dependent: data.dependent_component_id,
//           createdBy: req.users.id,
//         });
//       }
//     });

//     const totalBasics = basicRecords.reduce((sum, r) => sum + r.finalAmount, 0);
//     const totalAllowances = allowanceRecords.reduce(
//       (sum, r) => sum + r.finalAmount,
//       0
//     );
//     const totalDeductions = deductionRecords.reduce(
//       (sum, r) => sum + r.finalAmount,
//       0
//     );

//     const calculatedCTC = totalBasics + totalAllowances;

//     console.log(
//       totalBasics,
//       "ff",
//       totalAllowances,
//       "gg",
//       totalDeductions,
//       "hh",
//       calculatedCTC,
//       "jj",
//       data.CTC
//     );

//     // if (calculatedCTC !== Number(data.CTC)) {
//     //   await transaction.rollback();
//     //   return Helper.response(
//     //     false,
//     //     `CTC mismatch: Expected ${data.CTC}, got ${calculatedCTC}`,
//     //     {},
//     //     res,
//     //     400
//     //   );
//     // }

//     if (basicRecords.length > 0)
//       await Basic.bulkCreate(basicRecords);
//     if (allowanceRecords.length > 0)
//       await Allowance.bulkCreate(allowanceRecords);
//     if (deductionRecords.length > 0)
//       await deduction.bulkCreate(deductionRecords);

//     await transaction.commit();

//     return Helper.response(
//       true,
//       "Salary Created Successfully",
//       {
//         basics: basicRecords,
//         allowances: allowanceRecords,
//         deductions: deductionRecords,
//         totalCTC: calculatedCTC,
//       },
//       res,
//       200
//     );
//   } catch (error) {
//     console.error("Error in salary setup:", error);
//     return Helper.response(false, "Internal Server Error", [], res, 500);
//   }
// };
