const Prefix = require("../../models/prefix");
const Helper = require("../../helper/helper");

exports.createPrefix = async (req, res) => {
  const { name, status } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  try {
    if (!tenantId || !name || !branchId) {
      return Helper.response(
        false,
        "branchId,Tenant ID and name are required",
        [],
        res,
        400
      );
    }
    const checkprefix=await Prefix.findOne({where:{tenantId,branchId}})
    if(checkprefix){
      return Helper.response(false, "Prefix already exists", [], res, 400);
    }
    const newPrefix = await Prefix.create({
      tenantId,
      branchId,
      name,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });
    return Helper.response(
      true,
      "Prefix created successfully",
      newPrefix,
      res,
      201
    );
  } catch (error) {
    console.error("Error creating Prefix:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getPrefixs = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
   const branchId = req.users && req.users.branchId;
  const { name } = req.body || {};
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
     if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (name) {
      const Prefixs = await Prefix.findOne({
        where: { name, tenantId,branchId },
      });
      if (!Prefixs) {
        return Helper.response(false, "Prefix not found", [], res, 404);
      }
      // Format date and time in IST
      const formattedPrefix = {
        ...Prefixs.toJSON(),
        createdAt: Helper.formatToIST(Prefixs.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      };

      return Helper.response(
        true,
        "Prefix fetched successfully",
        formattedPrefix,
        res,
        200
      );
    } else {
      const Prefixs = await Prefix.findAll({
        where: { tenantId,branchId },
        order: [["createdAt", "DESC"]],
      });

      const data = Prefixs.map((dept) => ({
        ...dept.toJSON(),
        createdAt: Helper.formatToIST(dept.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      }));
      return Helper.response(
        true,
        "Prefixs fetched successfully",
        data,
        res,
        200
      );
    }
  } catch (error) {
    console.error("Error fetching Prefixs:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.updatePrefix = async (req, res) => {
  const { id, name, status } = req.body;
  const tenantId = req.users && req.users.tenantId; 
   const branchId = req.users && req.users.branchId;
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Prefix ID and Tenant ID are required",
        [],
        res,
        400
      );
    }

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const Prefix1 = await Prefix.findOne({ where: { id, tenantId } });
    if (!Prefix1) {
      return Helper.response(false, "Prefix not found", [], res, 404);
    }
    Prefix1.name = name || Prefix.name;
    Prefix1.status = status || Prefix.status;
    Prefix1.updatedBy = req.users && req.users.id; 
    Prefix1.branchId = branchId; 

    await Prefix1.save();
    return Helper.response(
      true,
      "Prefix updated successfully",
      Prefix,
      res,
      200
    );
  } catch (error) {
    console.error("Error updating Prefix:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.deletePrefix = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId; 
  const branchId = req.users && req.users.branchId;

  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Prefix ID and Tenant ID are required",
        [],
        res,
        400
      );
    }

     if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const deletePrefix = await Prefix.findOne({ where: { id, tenantId,branchId } });
    if (!deletePrefix) {
      return Helper.response(false, "Prefix not found", [], res, 404);
    }
    await deletePrefix.destroy();
    return Helper.response(
      true,
      "Prefix deleted successfully",
      [],
      res,
      200
    );
  } catch (error) {
    console.error("Error deleting Prefix:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.PrefixDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { name } = req.body || {};
  const branchId = req.users && req.users.branchId;
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (name) {
      const Prefixs = await Prefix.findOne({
        where: { name, tenantId,branchId },
      });
      if (!Prefixs) {
        return Helper.response(false, "Prefix not found", [], res, 404);
      }
      return Helper.response(
        true,
        "Prefix fetched successfully",
        Prefixs,
        res,
        200
      );
    } else {
      const Prefixs = await Prefix.findAll({
        where: { tenantId ,branchId},
        order: [["createdAt", "DESC"]],
      });
      const data = Prefixs.map((Prefix) => ({
        value: Prefix.id,
        label: Prefix.name,
      }));
      return Helper.response(
        true,
        "Prefixs fetched successfully",
        data,
        res,
        200
      );
    }
  } catch (error) {
    console.error("Error fetching Prefixs:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};
