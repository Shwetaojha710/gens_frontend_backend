const EmploymentType = require("../../models/employmentType");
const Helper = require("../../helper/helper");
const HolidayType = require("../../models/HolidayType");
const salary_order = require("../../models/salary_order");
const master_components = require("../../models/master_components");

exports.createEmploymentType = async (req, res) => {
  const { name, status, duration_type } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    const allowedNames = EmploymentType.rawAttributes.name.values;
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!name) {
      return Helper.response(false, "Name is required", {}, res, 400);
    }

    const employmentTypeData = await EmploymentType.create({
      tenantId,
      name,
      branchId,
      duration_type,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });

    return Helper.response(
      true,
      "Employment Type created successfully",
      employmentTypeData,
      res,
      201
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};
exports.getEmploymentTypes = async (req, res) => {
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
      const employmentType = await EmploymentType.findOne({
        where: { name, tenantId, branchId },
      });

      if (!employmentType) {
        return Helper.response(
          false,
          "Employment Type not found",
          [],
          res,
          404
        );
      }

      const formatted = {
        ...employmentType.toJSON(),
        createdAt: Helper.formatToIST(
          employmentType.createdAt,
          "YYYY-MM-DD HH:mm:ss"
        ),
      };

      return Helper.response(
        true,
        "Employment Type fetched successfully",
        formatted,
        res,
        200
      );
    } else {
      const employmentTypes = await EmploymentType.findAll({
        where: { tenantId, branchId },
        order: [["createdAt", "DESC"]],
      });

      const data = employmentTypes.map((emp) => ({
        ...emp.toJSON(),
        createdAt: Helper.formatToIST(emp.createdAt, "YYYY-MM-DD HH:mm:ss"),
      }));

      return Helper.response(
        true,
        "Employment Types fetched successfully",
        data,
        res,
        200
      );
    }
  } catch (error) {
    console.error("Error in getEmploymentTypes:", error);
    return Helper.response(
      false,
      error.message || "Something went wrong",
      [],
      res,
      500
    );
  }
};

exports.editEmploymentType = async (req, res) => {
  const { id, name, status, duration_type } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Employment Type ID and Tenant ID are required",
        {},
        res,
        400
      );
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employmentType = await EmploymentType.findOne({
      where: { id, tenantId, branchId },
    });
    if (!employmentType) {
      return Helper.response(false, "Employment Type not found", {}, res, 404);
    }
    if (!name) {
      return Helper.response(false, "Name Is Required", {}, res, 404);
    }
    if (!duration_type) {
      return Helper.response(false, "Duration Type Is Required", {}, res, 404);
    }

    employmentType.name = name;
    employmentType.duration_type = duration_type;
    employmentType.status = status || employmentType.status;
    employmentType.updatedBy = req.users && req.users.id;
    employmentType.branchId = branchId || employmentType.branchId;
    await employmentType.save();

    return Helper.response(
      true,
      "Employment Type updated successfully",
      employmentType,
      res,
      200
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};

exports.deleteEmploymentType = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Employment Type ID and Tenant ID are required",
        {},
        res,
        400
      );
    }


    const employmentType = await EmploymentType.findOne({
      where: { id, tenantId, branchId },
    });
    if (!employmentType) {
      return Helper.response(false, "Employment Type not found", {}, res, 404);
    }

    await employmentType.destroy();

    return Helper.response(
      true,
      "Employment Type deleted successfully",
      {},
      res,
      200
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};

exports.getEmpDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    let {branchId}=req.body
     if(!branchId){
       branchId = req.users && req.users.branchId;
     }

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employmentTypes = await EmploymentType.findAll({
      where: { status: "active", tenantId, branchId },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    if (employmentTypes.length === 0) {
      return Helper.response(false, "No Employment Types found", [], res, 404);
    }

    const formattedEmploymentTypes = employmentTypes.map((emp) => ({
      value: emp.id,
      label: emp.name,
    }));

    return Helper.response(
      true,
      "Employment Types dropdown fetched successfully",
      formattedEmploymentTypes,
      res,
      200
    );
  } catch (error) {
    console.error("Error fetching Employment Types dropdown:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.createHolidayType = async (req, res) => {
  const { name, status } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!name) {
      return Helper.response(false, "Name is required", {}, res, 400);
    }
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const employmentTypeData = await HolidayType.create({
      tenantId,
      name,
      branchId,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });

    return Helper.response(
      true,
      "Holiday Type created successfully",
      employmentTypeData,
      res,
      201
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};
exports.getHolidayTypes = async (req, res) => {
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
      const employmentType = await HolidayType.findOne({
        where: { name, tenantId, branchId },
      });

      if (!employmentType) {
        return Helper.response(false, "Holiday Type not found", [], res, 404);
      }

      const formatted = {
        ...employmentType.toJSON(),
        createdAt: Helper.formatToIST(
          employmentType.createdAt,
          "YYYY-MM-DD HH:mm:ss"
        ),
      };

      return Helper.response(
        true,
        "Holiday Type fetched successfully",
        formatted,
        res,
        200
      );
    } else {
      const employmentTypes = await HolidayType.findAll({
        where: { tenantId, branchId },
        order: [["createdAt", "DESC"]],
      });

      const data = employmentTypes.map((emp) => ({
        ...emp.toJSON(),
        createdAt: Helper.formatToIST(emp.createdAt, "YYYY-MM-DD HH:mm:ss"),
      }));

      return Helper.response(
        true,
        "holiday Types fetched successfully",
        data,
        res,
        200
      );
    }
  } catch (error) {
    console.error("Error in getEmploymentTypes:", error);
    return Helper.response(
      false,
      error.message || "Something went wrong",
      [],
      res,
      500
    );
  }
};

exports.editHolidayType = async (req, res) => {
  const { id, name, status } = req.body;
  const tenantId = req.users && req.users.tenantId;

  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Holiday Type ID and Tenant ID are required",
        {},
        res,
        400
      );
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employmentType = await HolidayType.findOne({
      where: { id, tenantId ,branchId},
    });
    if (!employmentType) {
      return Helper.response(false, "Holiday Type not found", {}, res, 404);
    }
    if (!name) {
      return Helper.response(false, "Name is required", {}, res, 400);
    }

    employmentType.name = name;
    employmentType.branchId = branchId || employmentType.branchId;

    employmentType.status = status || employmentType.status;
    employmentType.updatedBy = req.users && req.users.id;

    await employmentType.save();

    return Helper.response(
      true,
      "Holiday Type updated successfully",
      employmentType,
      res,
      200
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};

exports.deleteHolidayType = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "Holiday Type ID and Tenant ID are required",
        {},
        res,
        400
      );
    }
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employmentType = await HolidayType.findOne({
      where: { id, tenantId, branchId },
    });
    if (!employmentType) {
      return Helper.response(false, "Holiday Type not found", {}, res, 404);
    }

    await employmentType.destroy();

    return Helper.response(
      true,
      "Holiday Type deleted successfully",
      {},
      res,
      200
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};

exports.getHolidayTypeDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employmentTypes = await HolidayType.findAll({
      where: { status: "active", tenantId, branchId },
      attributes: ["id", "name"],
      order: [["name", "ASC"]],
    });

    if (employmentTypes.length === 0) {
      return Helper.response(false, "No Holiday Types found", [], res, 404);
    }

    const formattedEmploymentTypes = employmentTypes.map((emp) => ({
      value: emp.id,
      label: emp.name,
    }));

    return Helper.response(
      true,
      "Holiday Types dropdown fetched successfully",
      formattedEmploymentTypes,
      res,
      200
    );
  } catch (error) {
    console.error("Error fetching Holiday Types dropdown:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.createSalaryOrder = async (req, res) => {
  const { component, order, status = "active" } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
  try {
    if (!component || !order) {
      return Helper.response(
        false,
        "Name and Order are required",
        {},
        res,
        400
      );
    }

    const createSalOrder = await salary_order.create({
      tenantId,
      component,
      order,
      status,
      branchId,
      createdBy: req.users?.id,
    });

    return Helper.response(
      true,
      "Order created successfully",
      createSalOrder,
      res,
      201
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};
exports.getSalaryOrder = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;

  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }


    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const getSalaryOrder = await salary_order.findAll({
      where: {
        tenantId,
        branchId
      },
      raw: true,
      order: [["createdAt", "desc"]],
    });

    // const data =await Promise.all(
    //   getSalaryOrder.map(async(item)=>{
    //     const componentName=await master_components.findOne({
    //     where:{
    //         id:item?.component,
    //         tenantId
    //     }
    // })
    //     return{
    //          name:componentName?.component_name,
    //          order:item.order,
    //          component:item?.component,
    //          createdAt:Helper.dateFormat(item?.createdAt),
    //          status:item?.status ||'active'

    //     }

    // })

    // )

    return Helper.response(
      true,
      "Salary Order List fetched successfully",
      getSalaryOrder,
      res,
      200
    );
  } catch (error) {
    console.error("Error in getEmploymentTypes:", error);
    return Helper.response(
      false,
      error.message || "Something went wrong",
      [],
      res,
      500
    );
  }
};

exports.editSalaryOrder = async (req, res) => {
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
        "Holiday Type ID and Tenant ID are required",
        {},
        res,
        400
      );
    }

    const employmentType = await HolidayType.findOne({
      where: { id, tenantId, branchId },
    });
    if (!employmentType) {
      return Helper.response(false, "Holiday Type not found", {}, res, 404);
    }
    if (!name) {
      return Helper.response(false, "Name is required", {}, res, 400);
    }

    employmentType.name = name;
    employmentType.branchId = branchId;

    employmentType.status = status || employmentType.status;
    employmentType.updatedBy = req.users && req.users.id;

    await employmentType.save();

    return Helper.response(
      true,
      "Holiday Type updated successfully",
      employmentType,
      res,
      200
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};

exports.deleteSalaryOrder = async (req, res) => {
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
        "Holiday Type ID and Tenant ID are required",
        {},
        res,
        400
      );
    }

    const employmentType = await HolidayType.findOne({
      where: { id, tenantId, branchId },
    });
    if (!employmentType) {
      return Helper.response(false, "Holiday Type not found", {}, res, 404);
    }

    await employmentType.destroy();

    return Helper.response(
      true,
      "Holiday Type deleted successfully",
      {},
      res,
      200
    );
  } catch (error) {
    return Helper.response(
      false,
      error.message || "Something went wrong",
      {},
      res,
      500
    );
  }
};

