const workExp = require("../../models/workExp");
const empPersonal = require("../../models/empPersonal");
const Helper = require("../../helper/helper");

exports.createWorkExp = async (req, res) => {
  const {
    employeeId,
    companyName,
    designation,
    description,
    from,
    to,
    status
  } = req.body;

  const tenantId = req.users && req.users.tenantId;

  try {
    if (!employeeId || !companyName || !designation || !from) {
      return Helper.response(false, "All fields are required", null, res, 400);
    }

      const branchId = req.users && req.users.branchId;
     if( !branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingEmp = await empPersonal.findOne({ where: { id: employeeId, tenantId,branchId } });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    // const formattedFrom = await Helper.dateFormat(from);
    // const formattedTo = to ? await Helper.dateFormat(to) : null;

    const newWorkExp = await workExp.create({
      tenantId,
      employeeId,
      companyName,
      designation,
      description,
      branchId,
      from:from|| null,
       to:to || null,
      status: status || 'active',
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id
    });

    return Helper.response(true, "Work experience created successfully", newWorkExp, res, 201);
  } catch (err) {
    console.error("Error creating work experience:", err);
    return Helper.response(false, err?.message, null, res, 500);
  }
};

exports.getWorkExp = async (req, res) => {
    const { id, employeeId } = req.body;
    const tenantId = req.users && req.users.tenantId;
    
        const branchId = req.users && req.users.branchId;   
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    try {
        const existingEmp = await empPersonal.findOne({ where: { id:employeeId, tenantId,branchId } });
        if (!existingEmp) {
            return Helper.response(false, "Employee not found", null, res, 404);
        }

        const workExperiences = await workExp.findAll({
            where: {employeeId, tenantId, branchId},
            order: [['createdAt', 'DESC']]
        });

        const formattedData = workExperiences.map(exp => ({
            id: exp.id,
            companyName: exp.companyName,
            designation: exp.designation,
            description: exp.description,
            from: exp.from ? Helper.formatToIST(exp.from) : null,
            to: exp.to ? Helper.formatToIST(exp.to) : null,
            status: exp.status,
            createdAt: Helper.formatToIST(exp.createdAt)
        }));

        return Helper.response(true, "Work experiences retrieved successfully", formattedData, res, 200);
    } catch (err) {
        console.error("Error retrieving work experiences:", err);
        return Helper.response(false, "Internal server error", null, res, 500);
    }
}

exports.updateWorkExp = async (req, res) => {
  const {
    id,
    employeeId,
    companyName,
    designation,
    description,
    from,
    to,
    status
  } = req.body;

  const tenantId = req.users && req.users.tenantId;

  try {
     if (!employeeId || !companyName || !designation || !from) {
      return Helper.response(false, "All fields are required", null, res, 400);
    }
      const branchId = req.users && req.users.branchId;
     if( !branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const existingEmp = await empPersonal.findOne({ where: { id: employeeId, tenantId,branchId } });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const workExperience = await workExp.findOne({ where: { id, employeeId, tenantId,branchId } });
    if (!workExperience) {
      return Helper.response(false, "Work experience not found", null, res, 404);
    }

    // const formattedFrom = from ? await Helper.dateFormat(from) : workExperience.from;
    // const formattedTo = to ? await Helper.dateFormat(to) : workExperience.to;

    await workExperience.update({
      companyName,
      designation,
      description,
      from: from,
      to: to,
      status: status || 'active',
      updatedBy: req.users && req.users.id,
      branchId
    });

    return Helper.response(true, "Work experience updated successfully", workExperience, res, 200);
  } catch (err) {
    console.error("Error updating work experience:", err);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};


exports.deleteWorkExp = async (req, res) => {
    const { id, employeeId } = req.body;
    const tenantId = req.users && req.users.tenantId;
      const branchId = req.users && req.users.branchId;
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    try {
        const existingEmp = await empPersonal.findOne({ where: { id: employeeId, tenantId,branchId } });
        if (!existingEmp) {
            return Helper.response(false, "Employee not found", null, res, 404);
        }

        const workExperience = await workExp.findOne({ where: { id, employeeId, tenantId,branchId } });
        if (!workExperience) {
            return Helper.response(false, "Work experience not found", null, res, 404);
        }

        await workExp.destroy({ where: { id, employeeId, tenantId,branchId } });
        return Helper.response(true, "Work experience deleted successfully", null, res, 200);
    } catch (err) {
        console.error("Error deleting work experience:", err);
        return Helper.response(false, "Internal server error", null, res, 500);
    }
}


exports.createAppWorkExp = async (req, res) => {
  const {

    companyName,
    designation,
    description,
    from,
    to,
    status
  } = req.body;

  const tenantId = req.users && req.users.tenantId;
   const employeeId = req.users && req.users.id;
  try {
    if (!employeeId || !companyName || !designation || !from) {
      return Helper.response(false, "All fields are required", null, res, 400);
    }

      const branchId = req.users && req.users.branchId;
     if( !branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const existingEmp = await empPersonal.findOne({ where: { id: employeeId, tenantId,branchId } });
    if (!existingEmp) {
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const duplicateWorkExp = await workExp.findOne({
      where: { employeeId, tenantId, branchId, companyName, designation, from },
    });
    if (duplicateWorkExp) {
      return Helper.response(
        false,
        "Work experience with the same company, designation, and start date already exists",
        null,
        res,
        409,
      );
    }

    // const formattedFrom = await Helper.dateFormat(from);
    // const formattedTo = to ? await Helper.dateFormat(to) : null;

    const newWorkExp = await workExp.create({
      tenantId,
      employeeId,
      companyName,
      designation,
      description,
      branchId,
      from:from|| null,
       to:to || null,
      status: status || 'active',
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id
    });

    return Helper.response(true, "Work experience created successfully", newWorkExp, res, 201);
  } catch (err) {
    console.error("Error creating work experience:", err);
    return Helper.response(false, err?.message, null, res, 500);
  }
};

exports.getAppWorkExp = async (req, res) => {
    const { id } = req.body;
    const tenantId = req.users && req.users.tenantId;
    const employeeId = req.users && req.users.id;
    if (!employeeId) {
      return Helper.response(false, "employeeId is required!", {}, res, 200);
    }
        const branchId = req.users && req.users.branchId;   
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    try {
        const existingEmp = await empPersonal.findOne({ where: { id:employeeId, tenantId,branchId } });
        if (!existingEmp) {
            return Helper.response(false, "Employee not found", null, res, 404);
        }

        const workExperiences = await workExp.findAll({
            where: {employeeId, tenantId, branchId},
            order: [['createdAt', 'DESC']]
        });

        const formattedData = workExperiences.map(exp => ({
            id: exp.id,
            companyName: exp.companyName,
            designation: exp.designation,
            description: exp.description,
            from: exp.from ? Helper.formatToIST(exp.from) : null,
            to: exp.to ? Helper.formatToIST(exp.to) : null,
            status: exp.status,
            createdAt: Helper.formatToIST(exp.createdAt)
        }));

        return Helper.response(true, "Work experiences retrieved successfully", formattedData, res, 200);
    } catch (err) {
        console.error("Error retrieving work experiences:", err);
        return Helper.response(false, "Internal server error", null, res, 500);
    }
}