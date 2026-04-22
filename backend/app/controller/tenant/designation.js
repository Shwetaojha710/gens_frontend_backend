const Designation = require('../../models/designation');
const Tenant = require('../../models/tenant');
const Department = require('../../models/department');
const Helper = require('../../helper/helper');

exports.createDesignation = async (req, res) => {
    const { department, name, status } = req.body;
    const tenantId = req.users && req.users.tenantId;
       const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    try {
        if (!tenantId || !department || !name) {
            return Helper.response(false, 'Tenant ID, Department ID and Name are required', [], res, 400);
        }

        const tenant = await Tenant.findOne({ where: { id: tenantId } });
        if (!tenant) {
            return Helper.response(false, 'Tenant not found', [], res, 404);
        }

        const departmentExists = await Department.findOne({ where: { id: department, tenantId, branchId } });
        if (!departmentExists) {
            return Helper.response(false, 'Department not found', [], res, 404);
        }

        const existing = await Designation.findOne({ where: { name, department, tenantId, branchId } });
        if (existing) {
            return Helper.response(false, 'Designation with this name already exists in the department', [], res, 400);
        }

        const newDesignation = await Designation.create({
            tenantId,
            department,
            name,
            status: status || 'active',
            branchId,
            createdBy: req.users && req.users.id,
            updatedBy: req.users && req.users.id
        });

        return Helper.response(true, 'Designation created successfully', newDesignation, res, 201);
    } catch (error) {
        console.error('Error creating designation:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
}

exports.getDesignation = async (req, res) => {
    const tenantId = req.users && req.users.tenantId;
    const { department } = req.body || {};
        const branchId = req.users && req.users.branchId;   
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    try {
        if (!tenantId) {
            return Helper.response(false, 'Tenant ID is required', [], res, 400);
        }

        const tenant = await Tenant.findOne({ where: { id: tenantId } });
        if (!tenant) {
            return Helper.response(false, 'Tenant not found', [], res, 404);
        }

        let designations = await Helper.getDesig(tenantId,branchId);

        if (!designations || !Array.isArray(designations)) {
            console.error("No designations returned:", designations);
            return Helper.response(false, 'No designations found', [], res, 404);
        }

        
        if (department) {
            const departmentExists = await Department.findOne({ where: { id: department, tenantId,branchId } });
            if (!departmentExists) {
                return Helper.response(false, 'Department not found', [], res, 404);
            }

            designations = designations.filter(d => d.department == department);
            if (designations.length === 0) {
                return Helper.response(false, 'No designations found for this department', [], res, 404);
            }
        }
        const departmentIds = designations.map(desig => desig.department);
        const departmentNames = await Department.findAll({
            where:{ id: departmentIds, tenantId ,branchId},
            attributes: ['id', 'name']
        })
        const data = designations.map(desig => ({
            id:desig.id,
            name: desig.name,
            departmentName: departmentNames.find(dep => dep.id == desig.department)?.name || 'Unknown',
            department: desig.department,
            status: desig.status,
            createdAt: Helper.formatToIST(desig.createdat || desig.createdAt, 'YYYY-MM-DD HH:mm:ss')
        }));

        return Helper.response(true, 'Designations fetched successfully', data, res, 200);
    } catch (error) {
        console.error('Error in getDesignation:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
};

exports.updateDesignation = async (req, res) => {
    const { id, department, name, status } = req.body;
    const tenantId = req.users && req.users.tenantId;
       const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    try {
        if (!id || !tenantId) {
            return Helper.response(false, 'Designation ID and Tenant ID are required', [], res, 400);
        }

        const tenant = await Tenant.findOne({ where: { id: tenantId } });
        if (!tenant) {
            return Helper.response(false, 'Tenant not found', [], res, 404);
        }

        const designation = await Designation.findOne({ where: { id, tenantId, branchId } });
        if (!designation) {
            return Helper.response(false, 'Designation not found', [], res, 404);
        }

        if (department) {
            const departmentExists = await Department.findOne({ where: { id: department, tenantId, branchId } });
            if (!departmentExists) {
                return Helper.response(false, 'Department not found', [], res, 404);
            }
        }
        if(!name){
              return Helper.response(false, 'Name Is Required', [], res, 404);
        }
        if(!department){
            return Helper.response(false, 'Department Is Required', [], res, 404);
        }

        const { Op } = require("sequelize");
        const duplicate = await Designation.findOne({ where: { name, department, tenantId, branchId, id: { [Op.ne]: id } } });
        if (duplicate) {
            return Helper.response(false, 'Designation with this name already exists in the department', [], res, 400);
        }

        designation.name = name || designation.name;
        designation.department = department || designation.department;
        designation.status = status || designation.status;
        designation.updatedBy = req.users && req.users.id;
        designation.branchId = branchId || designation.branchId;

        await designation.save();

        return Helper.response(true, 'Designation updated successfully', designation, res, 200);
    } catch (error) {
        console.error('Error updating designation:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
}

exports.deleteDesignation = async (req, res) => {
    const { id } = req.body;
    const tenantId = req.users && req.users.tenantId;

    
     const branchId = req.users && req.users.branchId;
    
      if (!branchId || branchId=='null') {
        return Helper.response(false, "branchId is required!", {}, res, 200);
      }

    try {
        if (!id || !tenantId) {
            return Helper.response(false, 'Designation ID and Tenant ID are required', [], res, 400);
        }

        const tenant = await Tenant.findOne({ where: { id: tenantId } });
        if (!tenant) {
            return Helper.response(false, 'Tenant not found', [], res, 404);
        }

        const designation = await Designation.findOne({ where: { id, tenantId, branchId } });
        if (!designation) {
            return Helper.response(false, 'Designation not found', [], res, 404);
        }

        await designation.destroy();

        return Helper.response(true, 'Designation deleted successfully', [], res, 200);
    } catch (error) {
        console.error('Error deleting designation:', error);
        return Helper.response(false, 'Internal server error', [], res, 500);
    }
}

exports.getDesignationDD = async (req, res) => {
    const tenantId = req.users && req.users.tenantId;
    let { department ,branchId} = req.body || {};
     
    if(!branchId){
        branchId = req.users && req.users.branchId;
    }

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    try {
        if (!tenantId) {
            return Helper.response(false, 'Tenant ID is required', [], res, 400);
        }

        const tenant = await Tenant.findOne({ where: { id: tenantId } });
        if (!tenant) {
            return Helper.response(false, 'Tenant not found', [], res, 404);
        }

        const getDesignation = await Designation.findAll({
                   where:{
                     department,tenantId,
                     branchId,
                     status:'active'
                   }
        })
       
        const data = getDesignation.map(desig => ({
            value:desig.id,
            label: desig.name,
           
           
        }));

        return Helper.response(true, 'Designations fetched successfully', data, res, 200);
    } catch (error) {
        console.error('Error in getDesignation:', error);
        return Helper.response(false, error?.message, [], res, 500);
    }
};