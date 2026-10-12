const documentType = require('../../models/documentType');
const Helper = require('../../helper/helper');

exports.addDocumentType = async (req, res) => {
    const { type,status } = req.body;
    const tenantId = req.users?.tenantId;
    
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    try {
        if (!tenantId || !type) {
        return Helper.response(false, "Tenant ID and Document Type are required", null, res, 400);
        }

        const existingType = await documentType.findOne({ where: { tenantId, type, branchId } });
        if (existingType) {
        return Helper.response(false, "Document Type already exists", null, res, 409);
        }
    
        const newDocumentType = await documentType.create({
        tenantId,
        type,
        branchId,
        createdBy: req.users?.id,
        updatedBy: req.users?.id,
        status: status || 'active', 
        });
    
        return Helper.response(true, "Document Type added successfully", newDocumentType, res, 201);
    } catch (error) {
        console.error("Error adding document type:", error);
        return Helper.response(false, "Internal server error", null, res, 500);
    }
}

exports.getDocumentTypes = async (req, res) => {
    const tenantId = req.users?.tenantId;
    
    try {
        if (!tenantId) {
            return Helper.response(false, "Tenant ID is required", null, res, 400);
        }
       const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
        const documentTypes = await documentType.findAll({ where: { tenantId, branchId } });
    
        if (documentTypes.length === 0) {
            return Helper.response(false, "No Document Types found", null, res, 404);
        }
    
        return Helper.response(true, "Document Types retrieved successfully", documentTypes, res, 200);
    } catch (error) {
        console.error("Error retrieving document types:", error);
        return Helper.response(false, "Internal server error", null, res, 500);
    }
}

exports.updateDocumentType = async (req, res) => {
    const { id, type,status } = req.body;
    const tenantId = req.users?.tenantId;
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    try {
        if (!tenantId || !id || !type) {
            return Helper.response(false, "Tenant ID, Document Type ID, and Type are required", null, res, 400);
        }

        const documentTypeToUpdate = await documentType.findOne({ where: { id, tenantId, branchId } });
        if (!documentTypeToUpdate) {
            return Helper.response(false, "Document Type not found", null, res, 404);
        }

        documentTypeToUpdate.type = type;
        documentTypeToUpdate.branchId = branchId;
        documentTypeToUpdate.updatedBy = req.users?.id;
        documentTypeToUpdate.status = status || documentTypeToUpdate.status; 
        await documentTypeToUpdate.save();

        return Helper.response(true, "Document Type updated successfully", documentTypeToUpdate, res, 200);
    } catch (error) {
        console.error("Error updating document type:", error);
        return Helper.response(false,error?.message, null, res, 500);
    }
}

exports.deleteDocumentType = async (req, res) => {
    const { id } = req.body;
    const tenantId = req.users?.tenantId;

    try {
        if (!tenantId || !id) {
            return Helper.response(false, "Tenant ID and Document Type ID are required", null, res, 400);
        }

        const documentTypeToDelete = await documentType.findOne({ where: { id, tenantId } });
        if (!documentTypeToDelete) {
            return Helper.response(false, "Document Type not found", null, res, 404);
        }

        await documentTypeToDelete.destroy();

        return Helper.response(true, "Document Type deleted successfully", null, res, 200);
    } catch (error) {
        console.error("Error deleting document type:", error);
        return Helper.response(false, "Internal server error", null, res, 500);
    }
}

exports.getdocumentDD = async (req, res) => {
    const tenantId = req.users?.tenantId;

    try {
        if (!tenantId) {
            return Helper.response(false, "Tenant ID is required", null, res, 400);
        }
        const branchId = req.users && req.users.branchId;

        if (!branchId || branchId=='null') {
        return Helper.response(false, "branchId is required!", {}, res, 200);
        }
        const documentTypes = await documentType.findAll({
            where: { tenantId, branchId, status:'active' },
            attributes: ['id', 'type']
        });

        if (documentTypes.length === 0) {
            return Helper.response(false, "No Document Types found", null, res, 404);
        }
        const formattedDocumentTypes = documentTypes.map(doc => ({
            value: doc.id,
            label: doc.type
        }));

        return Helper.response(true, "Document Types retrieved successfully", formattedDocumentTypes, res, 200);
    } catch (error) {
        console.error("Error retrieving document types:", error);
        return Helper.response(false, "Internal server error", null, res, 500);
    }
}