const Department = require("../../models/department");
const Helper = require("../../helper/helper");

exports.createDepartment = async (req, res) => {
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
    const existing = await Department.findOne({ where: { name, tenantId, branchId } });
    if (existing) {
      return Helper.response(false, "Department with this name already exists", [], res, 400);
    }

    const newDepartment = await Department.create({
      tenantId,
      name,
      branchId,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });
    return Helper.response(
      true,
      "Department created successfully",
      newDepartment,
      res,
      201
    );
  } catch (error) {
    console.error("Error creating department:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getDepartments = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { name } = req.body || {};
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
       const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (name) {
      const department = await Department.findOne({
        where: { name, tenantId, branchId },
      });
      if (!department) {
        return Helper.response(false, "Department not found", [], res, 404);
      }
      // Format date and time in IST
      const formattedDepartment = {
        ...department.toJSON(),
        createdAt: Helper.formatToIST(department.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      };
      return Helper.response(
        true,
        "Department fetched successfully",
        formattedDepartment,
        res,
        200
      );
    } else {
      const departments = await Department.findAll({
        where: { tenantId, branchId },
        order: [["createdAt", "DESC"]],
      
      });

      const data = departments.map((dept) => ({
        ...dept.toJSON(),
        createdAt: Helper.formatToIST(dept.createdAt, 'YYYY-MM-DD HH:mm:ss'),
      }));
      return Helper.response(
        true,
        "Departments fetched successfully",
        data,
        res,
        200
      );
    }
  } catch (error) {
    console.error("Error fetching departments:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.updateDepartment = async (req, res) => {
  const { id, name, status } = req.body;
  const tenantId = req.users && req.users.tenantId; 
  const branchId = req.users && req.users.branchId;
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Department ID and Tenant ID are required",
        [],
        res,
        400
      );
    }
    const department = await Department.findOne({ where: { id, tenantId, branchId } });
    if (!department) {
      return Helper.response(false, "Department not found", [], res, 404);
    }
    if (!name) {
      return Helper.response(false, "Name Is Required", [], res, 404);
    }

    // if (name !== department.name) {
      const { Op } = require("sequelize");
      const duplicate = await Department.findOne({ where: { name, tenantId, branchId, id: { [Op.ne]: id } } });
      if (duplicate) {
        return Helper.response(false, "Department with this name already exists", [], res, 400);
      }
    // }

    department.name = name || department.name;
    department.status = status || department.status;
    department.branchId = branchId || department.branchId;
    department.updatedBy = req.users && req.users.id; 

    await department.save();
    return Helper.response(
      true,
      "Department updated successfully",
      department,
      res,
      200
    );
  } catch (error) {
    console.error("Error updating department:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.deleteDepartment = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId; 
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Department ID and Tenant ID are required",
        [],
        res,
        400
      );
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }


    const department = await Department.findOne({ where: { id, tenantId, branchId } });
    if (!department) {
      return Helper.response(false, "Department not found", [], res, 404);
    }
    await department.destroy();
    return Helper.response(
      true,
      "Department deleted successfully",
      [],
      res,
      200
    );
  } catch (error) {
    console.error("Error deleting department:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.departmentDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  let { name,branchId } = req.body || {};
  if(!branchId){

    branchId = req.users && req.users.branchId;
  }

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    
    if (name) {
      const department = await Department.findOne({
        where: { name, tenantId, branchId },
      });
      if (!department) {
        return Helper.response(false, "Department not found", [], res, 404);
      }
      return Helper.response(
        true,
        "Department fetched successfully",
        department,
        res,
        200
      );
    } else {
      const departments = await Department.findAll({
        where: { tenantId, branchId },
        order: [["createdAt", "DESC"]],
      });
      const data = departments.map((department) => ({
        value: department.id,
        label: department.name,
        tenantId: department.tenantId,
        branchId: department.branchId,
      }));
      return Helper.response(
        true,
        "Departments fetched successfully",
        data,
        res,
        200
      );
    }
  } catch (error) {
    console.error("Error fetching departments:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};
