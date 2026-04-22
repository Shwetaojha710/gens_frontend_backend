const bankAccnt = require("../../models/bankAccnt");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
var ifsc = require("ifsc");

exports.createBankAccnt = async (req, res) => {
  const {
    employeeId,
    accountHolderName,
    bankName,
    bankBranch,
    accountNumber,
    ifscCode,
    status,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId=='null') {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (
      !employeeId ||
      !accountHolderName ||
      !bankName ||
      !bankBranch ||
      !accountNumber
    ) {
      return Helper.response(false, "All fields are required", null, res, 400);
    }

    // if (!Helper.validateAccountNumber(accountNumber)) {
    //   return Helper.response(
    //     false,
    //     "Account number must be between 11 to 14 digits",
    //     null,
    //     res,
    //     400
    //   );
    // }

    if (!ifsc.validate(ifscCode)) {
      return Helper.response(false, "Invalid IFSC code", null, res, 400);
    }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const existingAccount = await bankAccnt.findOne({
      where: { tenantId, employeeId, accountNumber, branchId },
    });

    if (existingAccount) {
      return Helper.response(
        false,
        "Bank account already exists for this employee",
        null,
        res,
        409
      );
    }

    const newBankAccnt = await bankAccnt.create({
      tenantId,
      employeeId,
      accountHolderName,
      bankName,
      bankBranch,
      accountNumber,
      ifscCode,
      branchId,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });

    return Helper.response(
      true,
      "Bank account created successfully",
      newBankAccnt,
      res,
      201
    );
  } catch (err) {
    console.error("Error creating bank account:", err);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.getBankAccnt = async (req, res) => {
  const { employeeId } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId },
    });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const bankAccounts = await bankAccnt.findAll({
      where: { employeeId, tenantId },
      order: [["createdAt", "DESC"]],
    });

    if (bankAccounts.length === 0) {
      return Helper.response(false, "No bank accounts found", null, res, 404);
    }

    return Helper.response(
      true,
      "Bank accounts retrieved successfully",
      bankAccounts,
      res,
      200
    );
  } catch (err) {
    console.error("Error retrieving bank accounts:", err);
    return Helper.response(false, err?.message, null, res, 500);
  }
};

exports.updateBankAccnt = async (req, res) => {
  const {
    id,
    employeeId,
    accountHolderName,
    bankName,
    bankBranch,
    accountNumber,
    ifscCode,
    status,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;

  try {
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (
      !employeeId ||
      !accountHolderName ||
      !bankName ||
      !bankBranch ||
      !accountNumber
    ) {
      return Helper.response(false, "All fields are required", null, res, 400);
    }

    if (!Helper.validateAccountNumber(accountNumber)) {
      return Helper.response(
        false,
        "Account number must be between 11 to 14 digits",
        null,
        res,
        400
      );
    }

    if (!ifsc.validate(ifscCode)) {
      return Helper.response(false, "Invalid IFSC code", null, res, 400);
    }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId },
    });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    if (!ifsc.validate(ifscCode)) {
      return Helper.response(false, "Invalid IFSC code", null, res, 400);
    }

    const bankAccount = await bankAccnt.findOne({
      where: { id, employeeId, tenantId },
    });

    if (!bankAccount) {
      return Helper.response(false, "Bank account not found", null, res, 404);
    }

    await bankAccount.update({
      accountHolderName,
      bankName,
      bankBranch,
      accountNumber,
      ifscCode,
      status: status || "active",
      updatedBy: req.users && req.users.id,
    });

    return Helper.response(
      true,
      "Bank account updated successfully",
      bankAccount,
      res,
      200
    );
  } catch (err) {
    console.error("Error updating bank account:", err);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.deleteBankAccnt = async (req, res) => {
  const { id, employeeId } = req.body;
  const tenantId = req.users && req.users.tenantId;

  try {
    if (!id || !employeeId) {
      return Helper.response(
        false,
        "ID and Employee ID are required",
        null,
        res,
        400
      );
    }
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const bankAccount = await bankAccnt.findOne({
      where: { id, employeeId, tenantId, branchId },
    });

    if (!bankAccount) {
      return Helper.response(false, "Bank account not found", null, res, 404);
    }

    await bankAccount.destroy();

    return Helper.response(
      true,
      "Bank account deleted successfully",
      null,
      res,
      200
    );
  } catch (err) {
    console.error("Error deleting bank account:", err);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};


exports.createAppBankAccnt = async (req, res) => {
  const {

    accountHolderName,
    bankName,
    bankBranch,
    accountNumber,
    ifscCode,
    status,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  const employeeId = req.users && req.users.id;
  if (!branchId || branchId=='null') {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (
      !employeeId ||
      !accountHolderName ||
      !bankName ||
      !bankBranch ||
      !accountNumber
    ) {
      return Helper.response(false, "All fields are required", null, res, 400);
    }

    // if (!Helper.validateAccountNumber(accountNumber)) {
    //   return Helper.response(
    //     false,
    //     "Account number must be between 11 to 14 digits",
    //     null,
    //     res,
    //     400
    //   );
    // }

    // if (!ifsc.validate(ifscCode)) {
    //   return Helper.response(false, "Invalid IFSC code", null, res, 400);
    // }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const existingAccount = await bankAccnt.findOne({
      where: { tenantId, employeeId, accountNumber, branchId },
    });

    if (existingAccount) {
      return Helper.response(
        false,
        "Bank account already exists for this employee",
        null,
        res,
        409
      );
    }

    const newBankAccnt = await bankAccnt.create({
      tenantId,
      employeeId,
      accountHolderName,
      bankName,
      bankBranch,
      accountNumber,
      ifscCode,
      branchId,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });

    return Helper.response(
      true,
      "Bank account created successfully",
      newBankAccnt,
      res,
      201
    );
  } catch (err) {
    console.error("Error creating bank account:", err);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.getAppBankAccnt = async (req, res) => {
  // const { employeeId } = req.body;
  const employeeId = req.users && req.users.id;
  const tenantId = req.users && req.users.tenantId;
  try {
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId },
    });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const bankAccounts = await bankAccnt.findAll({
      where: { employeeId, tenantId },
      order: [["createdAt", "DESC"]],
    });

    if (bankAccounts.length === 0) {
      return Helper.response(false, "No bank accounts found", null, res, 404);
    }

    return Helper.response(
      true,
      "Bank accounts retrieved successfully",
      bankAccounts,
      res,
      200
    );
  } catch (err) {
    console.error("Error retrieving bank accounts:", err);
    return Helper.response(false, err?.message, null, res, 500);
  }
};

exports.updateAppBankAccnt = async (req, res) => {
  const {
    id,
    accountHolderName,
    bankName,
    bankBranch,
    accountNumber,
    ifscCode,
    status,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const employeeId = req.users && req.users.id;
  try {
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (
      !employeeId ||
      !accountHolderName ||
      !bankName ||
      !bankBranch ||
      !accountNumber
    ) {
      return Helper.response(false, "All fields are required", null, res, 400);
    }

    if (!Helper.validateAccountNumber(accountNumber)) {
      return Helper.response(
        false,
        "Account number must be between 11 to 14 digits",
        null,
        res,
        400
      );
    }

    if (!ifsc.validate(ifscCode)) {
      return Helper.response(false, "Invalid IFSC code", null, res, 400);
    }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId },
    });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    if (!ifsc.validate(ifscCode)) {
      return Helper.response(false, "Invalid IFSC code", null, res, 400);
    }

    const bankAccount = await bankAccnt.findOne({
      where: { id, employeeId, tenantId },
    });

    if (!bankAccount) {
      return Helper.response(false, "Bank account not found", null, res, 404);
    }

    await bankAccount.update({
      accountHolderName,
      bankName,
      bankBranch,
      accountNumber,
      ifscCode,
      status: status || "active",
      updatedBy: req.users && req.users.id,
    });

    return Helper.response(
      true,
      "Bank account updated successfully",
      bankAccount,
      res,
      200
    );
  } catch (err) {
    console.error("Error updating bank account:", err);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.deleteAppBankAccnt = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const employeeId = req.users && req.users.id;

  try {
    if (!id) {
      return Helper.response(
        false,
        "ID is required",
        null,
        res,
        400
      );
    }
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingEmp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const bankAccount = await bankAccnt.findOne({
      where: { id, employeeId, tenantId, branchId },
    });

    if (!bankAccount) {
      return Helper.response(false, "Bank account not found", null, res, 404);
    }

    await bankAccount.destroy();

    return Helper.response(
      true,
      "Bank account deleted successfully",
      null,
      res,
      200
    );
  } catch (err) {
    console.error("Error deleting bank account:", err);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};
