const { Op, JSONB, col } = require("sequelize");
const Helper = require("../../helper/helper");
const MasterComponents = require("../../models/master_components");

exports.createComponent = async (req, res) => {
  const {
    component_name,
    component_description,
    component_type,
    value,
    amount,
    value_type,
    dependent_component,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const userId = req.users && req.users.id;
  
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
  }


  try {
    if (!tenantId) {
      return Helper.response(false, "TenantId required", [], res, 400);
    }

    if (!component_name || !component_type || !value_type) {
      return Helper.response(
        false,
        "All required fields must be provided",
        [],
        res,
        400
      );
    }

    const existingComponent = await MasterComponents.findOne({
      where: { component_name, tenantId,branchId },
    });

    if (existingComponent) {
      return Helper.response(
        false,
        "Component with this name already exists",
        [],
        res,
        400
      );
    }

    const newComponent = await MasterComponents.create({
      tenantId,
      component_name,
      component_description,
      dependent_component,
      component_type,
      createdBy: userId,
      value,
      amount,
      value_type,
      branchId,
    });

    return Helper.response(
      true,
      "Component created successfully",
      newComponent,
      res,
      201
    );
  } catch (error) {
    console.error("Error creating component:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.updateComponent = async (req, res) => {
  let {
    id,
    component_name,
    component_description,
    component_type,
    value,
    amount,
    value_type,
    dependent_component,
    status,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const userId = req.users && req.users.id;

  const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }


  try {
    if (!tenantId) {
      return Helper.response(false, "TenantId required", [], res, 400);
    }

    if (!id || !component_name || !component_type || !value_type) {
      return Helper.response(
        false,
        "Id and all required fields must be provided",
        [],
        res,
        400
      );
    }

    const component = await MasterComponents.findOne({
      where: { id, tenantId ,branchId},
    });

    if (!component) {
      return Helper.response(false, "Component not found", [], res, 404);
    }

    const duplicate = await MasterComponents.findOne({
      where: { component_name, tenantId, id: { [Op.ne]: id },branchId },
    });

    if (duplicate) {
      return Helper.response(
        false,
        "Another component with this name already exists",
        [],
        res,
        400
      );
    }
  if(!status){
status=component?.status
  }
    // Update record
    await component.update({
      component_name,
      component_description,
      component_type,
      dependent_component,
      value,
      amount,
      value_type,
      status,branchId,
      updatedBy: userId,
    });

    return Helper.response(
      true,
      "Component updated successfully",
      component,
      res,
      200
    );
  } catch (error) {
    console.error("Error updating component:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.listComponents = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!tenantId) {
      return Helper.response(false, "TenantId required", [], res, 400);
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }


    const components = await MasterComponents.findAll({
      where: {
        tenantId,
        branchId,
      },
      order: [["createdAt", "DESC"]],
    });

    return Helper.response(
      true,
      "Components fetched successfully",
      components,
      res,
      200
    );
  } catch (error) {
    console.error("Error fetching components:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.deleteComponent = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  try {
    if (!tenantId) {
      return Helper.response(false, "TenantId required", [], res, 400);
    }

    if (!id) {
      return Helper.response(false, "Component id is required", [], res, 400);
    }

    const component = await MasterComponents.findOne({
      where: { id, tenantId, branchId },
    });

    if (!component) {
      return Helper.response(false, "Component not found", [], res, 404);
    }

    await component.destroy();

    return Helper.response(
      true,
      "Component deleted successfully",
      [],
      res,
      200
    );
  } catch (error) {
    console.error("Error deleting component:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getComponentDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  
  const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
  try {
    if (!tenantId) {
      return Helper.response(false, "TenantId required", [], res, 400);
    }

    const components = await MasterComponents.findAll({
      where: { tenantId,value_type:'is_special',branchId },
      attributes: [
        ["id", "componentId"],
        ["component_name", "label"],
        "value_type",
        "component_name",
        "amount",
        "dependent_component",
        "component_description",
        "component_type",
        "branchId",
        "status",
      ],
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    return Helper.response(
      true,
      "Components fetched successfully",
      components,
      res,
      200
    );
  } catch (error) {
    console.error("Error fetching components:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

