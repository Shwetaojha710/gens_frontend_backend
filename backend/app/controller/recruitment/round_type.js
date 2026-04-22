const RoundType = require("../../models/round_type");
const Helper = require("../../helper/helper");

exports.createRoundType = async (req, res) => {
  const { name, status } = req.body;
  const tenantId = req.users && req.users.tenantId;
     const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == 'null') {
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
    const existing = await RoundType.findOne({ where: { name, tenantId, branchId } });
    if (existing) {
      return Helper.response(false, "Round Type with this name already exists", [], res, 400);
    }

    const newRoundType = await RoundType.create({
      tenantId,
      name,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,branchId
    });
    return Helper.response(
      true,
      "Round Type created successfully",
      newRoundType,
      res,
      201
    );
  } catch (error) {
    console.error("Error creating Round Type:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getRoundType = async (req, res) => {
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
      const RoundType = await RoundType.findOne({
        where: { name, tenantId, branchId },
      });
      if (!RoundType) {
        return Helper.response(false, "Round Type not found", [], res, 404);
      }
      // Format date and time in IST
      const formattedRoundType = {
        ...RoundType.toJSON(),
        createdAt: Helper.formatToIST(RoundType.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      };
      return Helper.response(
        true,
        "Round Type fetched successfully",
        formattedRoundType,
        res,
        200
      );
    } else {
      const RoundTypes = await RoundType.findAll({
        where: { tenantId, branchId },
        order: [["createdAt", "DESC"]],
      });

      const data = RoundTypes.map((dept) => ({
        ...dept.toJSON(),
        createdAt: Helper.formatToIST(dept.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      }));
      if(data.length>0){
      return Helper.response(
        true,
        "Round Types fetched successfully",
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
    console.error("Error fetching Round Types:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.updateRoundType = async (req, res) => {
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
        "Round Type ID and Tenant ID are required",
        [],
        res,
        400
      );
    }
    const RoundType1 = await RoundType.findOne({ where: { id, tenantId, branchId } });
    if (!RoundType1) {
      return Helper.response(false, "Round Type not found", [], res, 404);
    }

    // if (name && name != RoundType1.name) {
      const { Op } = require("sequelize");
      const duplicate = await RoundType.findOne({ where: { name, tenantId, branchId, id: { [Op.ne]: id } } });
      if (duplicate) {
        return Helper.response(false, "Round Type with this name already exists", [], res, 400);
      }
    // }

    RoundType1.name = name || RoundType1.name;
    RoundType1.status = status || RoundType1.status;
    RoundType1.updatedBy = req.users && req.users.id; 
    RoundType1.branchId = branchId; 

    await RoundType1.save();
    return Helper.response(
      true,
      "Round Type updated successfully",
      RoundType1,
      res,
      200
    );
  } catch (error) {
    console.error("Error updating Round Type:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.deleteRoundType = async (req, res) => {
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
        "Round Type ID and Tenant ID are required",
        [],
        res,
        400
      );
    }
    const deleteRoundType = await RoundType.findOne({ where: { id, tenantId, branchId } });
    if (!deleteRoundType) {
      return Helper.response(false, "Round Type not found", [], res, 404);
    }
    await deleteRoundType.destroy();
    return Helper.response(
      true,
      "Round Type    deleted successfully",
      [],
      res,
      200
    );
  } catch (error) {
    console.error("Error deleting Round Type:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};


exports.getRoundTypeDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
 
      const RoundTypes = await RoundType.findAll({
        where: { tenantId, branchId },
        raw:true,
        attributes: [['id', 'value'], ['name', 'label']],
      
        order: [["createdAt", "DESC"]],
      });

   
      if(RoundTypes.length>0){
      return Helper.response(
        true,
        "Round Types fetched successfully",
        RoundTypes,
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
      

  } catch (error) {
    console.error("Error fetching Round Types:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};