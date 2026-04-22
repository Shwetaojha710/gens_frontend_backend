const Currency = require("../../models/currency");
const Helper = require("../../helper/helper");

exports.createCurrency = async (req, res) => {
  const { name, status } = req.body;
  const tenantId = req.users && req.users.tenantId;
     const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  try {
    if (!tenantId || !name) {
      return Helper.response(
        false,
        "Tenant ID and name are required",
        [],
        res,
        400
      );
    }
    const newCurrency = await Currency.create({
      tenantId,
      name,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,branchId
    });
    return Helper.response(
      true,
      "Currency created successfully",
      newCurrency,
      res,
      201
    );
  } catch (error) {
    console.error("Error creating Currency:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getCurrency = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { name } = req.body || {};
     const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (name) {
      const Currency = await Currency.findOne({
        where: { name, tenantId, branchId },
      });
      if (!Currency) {
        return Helper.response(false, "Currency not found", [], res, 404);
      }
      // Format date and time in IST
      const formattedCurrency = {
        ...Currency.toJSON(),
        createdAt: Helper.formatToIST(Currency.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      };
      return Helper.response(
        true,
        "Currency fetched successfully",
        formattedCurrency,
        res,
        200
      );
    } else {
      const Currencys = await Currency.findAll({
        where: { tenantId, branchId },
        order: [["createdAt", "DESC"]],
      });

      const data = Currencys.map((dept) => ({
        ...dept.toJSON(),
        createdAt: Helper.formatToIST(dept.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      }));
      if(data.length>0){
      return Helper.response(
        true,
        "Currencys fetched successfully",
        data,
        res,
        200
      );
      }else{
        return Helper.response(
        false,
        "No data Found",
        data,
        res,
        200
      );
      }
      
    }
  } catch (error) {
    console.error("Error fetching Currencys:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.updateCurrency = async (req, res) => {
  const { id, name, status } = req.body;
  const tenantId = req.users && req.users.tenantId; 
  try {
      const branchId = req.users && req.users.branchId;
      if (!branchId || branchId=='null') {  
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Currency ID and Tenant ID are required",
        [],
        res,
        400
      );
    }
    const Currency1 = await Currency.findOne({ where: { id, tenantId, branchId } });
    if (!Currency1) {
      return Helper.response(false, "Currency not found", [], res, 404);
    }
    Currency1.name = name || Currency1.name;
    Currency1.status = status || Currency1.status;
    Currency1.updatedBy = req.users && req.users.id; 
    Currency1.branchId = branchId; 

    await Currency1.save();
    return Helper.response(
      true,
      "Currency updated successfully",
      Currency1,
      res,
      200
    );
  } catch (error) {
    console.error("Error updating Currency:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.deleteCurrency = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId; 
  const branchId = req.users && req.users.branchId;
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Currency ID and Tenant ID are required",
        [],
        res,
        400
      );
    }
    const deleteCurrency = await Currency.findOne({ where: { id, tenantId, branchId } });
    if (!deleteCurrency) {
      return Helper.response(false, "Currency not found", [], res, 404);
    }
    await deleteCurrency.destroy();
    return Helper.response(
      true,
      "Currency deleted successfully",
      [],
      res,
      200
    );
  } catch (error) {
    console.error("Error deleting Currency:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

