const Document = require("../../models/documents");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const path = require("path");
const fs = require("fs");
const documentType = require("../../models/documentType");

exports.addDocument = async (req, res) => {
  const { type, employeeId, status } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !employeeId) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Tenant ID and Employee ID are required",
        null,
        res,
        400,
      );
    }

    const typeD = await documentType.findOne({
      where: { id: type, tenantId, branchId },
    });

    const employeeExists = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    if (!employeeExists) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return Helper.response(false, "No files uploaded", null, res, 400);
    }

    const existingDoc = await Document.findOne({
      where: { employeeId, tenantId, branchId, type },
    });
    if (existingDoc) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Document of this type already exists for the employee",
        null,
        res,
        409,
      );
    }

    const createdDocs = [];

    for (const file of req.files) {
      const newDoc = await Document.create({
        tenantId,
        employeeId,
        type,
        branchId,
        doc_type: file.mimetype,
        doc_name: file.filename,
        createdBy: req.users?.id,
        updatedBy: req.users?.id,
        status: status || "active",
      });
      createdDocs.push(newDoc);
    }

    return Helper.response(
      true,
      "Documents added successfully",
      createdDocs,
      res,
      200,
    );
  } catch (error) {
    console.error("Error adding document:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.getDocument = async (req, res) => {
  const { employeeId } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !employeeId) {
      return Helper.response(
        false,
        "Tenant ID and Employee ID are required",
        null,
        res,
        400,
      );
    }

    const documents = await Document.findAll({
      where: { tenantId, employeeId, branchId },
    });

    if (!documents || documents.length === 0) {
      return Helper.response(false, "No documents found", null, res, 404);
    }

    const data = await Promise.all(
      documents.map(async (doc) => {
        const typeD = await documentType.findOne({
          where: { id: doc.type, tenantId, branchId },
        });
        return {
          id: doc.id,
          employeeId: doc.employeeId,
          type: doc.type,
          typeName: typeD ? typeD.type : null,
          doc_type: doc.doc_type,
          doc_name: doc.doc_name,
          status: doc.status,
          createdAt: Helper.formatToIST(doc.createdAt),
          updatedAt: Helper.formatToIST(doc.updatedAt),
        };
      }),
    );
    return Helper.response(
      true,
      "Documents retrieved successfully",
      data,
      res,
      200,
    );
  } catch (error) {
    console.error("Error retrieving documents:", error);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.updateDocument = async (req, res) => {
  const { employeeId, status, type, doc_name, typeName } = req.body;
  const tenantId = req.users?.tenantId;

  try {
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!tenantId || !employeeId) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Tenant ID and Employee ID are required",
        null,
        res,
        400,
      );
    }
    if (!type || type == "null") {
      return Helper.response(false, "All Fields Are required", null, res, 400);
    }

    const employeeExists = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    if (!employeeExists) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      const existingDocs = await Document.findAll({
        where: { tenantId, employeeId, branchId },
      });

      if (existingDocs.length === 0) {
        return Helper.response(
          false,
          "No documents found to update",
          null,
          res,
          404,
        );
      }

      const updatedDocuments = [];
      for (const doc of existingDocs) {
        doc.status = status || doc.status;
        doc.updatedBy = req.users?.id;
        await doc.save();
        updatedDocuments.push(doc);
      }

      return Helper.response(
        true,
        "Document status updated successfully",
        updatedDocuments,
        res,
        200,
      );
    }

    const updatedDocuments = [];

    for (const file of req.files) {
      const existingDoc = await Document.findOne({
        where: { tenantId, employeeId, type, branchId },
      });

      if (existingDoc) {
        // Delete old file if exists
        const oldFilePath = path.join(
          __dirname,
          "../../../upload",
          existingDoc.doc_name,
        );
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }

        // Update existing document
        existingDoc.doc_name = file.filename;
        existingDoc.doc_type = file.mimetype;
        existingDoc.branchId = branchId;
        existingDoc.updatedBy = req.users?.id;
        existingDoc.type = type || existingDoc.type;
        existingDoc.status = status || existingDoc.status;
        await existingDoc.save();
        updatedDocuments.push(existingDoc);
      } else {
        // Create new document
        const newDoc = await Document.create({
          tenantId,
          employeeId,
          branchId,
          type,
          doc_type: file.mimetype,
          doc_name: file.filename,
          createdBy: req.users?.id,
          updatedBy: req.users?.id,
          status: status || "active",
        });
        updatedDocuments.push(newDoc);
      }
    }

    return Helper.response(
      true,
      "Documents updated successfully",
      updatedDocuments,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating documents:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(
      false,
      error?.message || "Internal server error",
      null,
      res,
      500,
    );
  }
};
exports.deleteDocument = async (req, res) => {
  const { id, employeeId } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !employeeId || !id) {
      return Helper.response(
        false,
        "Tenant ID, Employee ID are required",
        null,
        res,
        400,
      );
    }

    const document = await Document.findOne({
      where: { id: id, tenantId, employeeId, branchId },
    });

    if (!document) {
      return Helper.response(false, "Document not found", null, res, 404);
    }

    const filePath = path.join(__dirname, "../../../upload", document.doc_name);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Error deleting file ${document.doc_name}:`, err);
      }
    }

    await document.destroy();

    return Helper.response(
      true,
      "Document deleted successfully",
      null,
      res,
      200,
    );
  } catch (error) {
    console.error("Error deleting document:", error);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.addAppDocument = async (req, res) => {
  const { type, status } = req.body;
  const employeeId = req.users && req.users.id;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !employeeId) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false,"Tenant ID and Employee ID are required", null,res, 400,);
    }

    const typeD = await documentType.findOne({
      where: { id: type, tenantId, branchId },
    });

    const employeeExists = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    if (!employeeExists) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return Helper.response(false, "No files uploaded", null, res, 400);
    }

    const existingDoc = await Document.findOne({
      where: { employeeId, tenantId, branchId, type },
    });
    if (existingDoc) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Document of this type already exists for the employee",
        null,
        res,
        409,
      );
    }

    const createdDocs = [];

    for (const file of req.files) {
      const newDoc = await Document.create({
        tenantId,
        employeeId,
        type,
        branchId,
        doc_type: file.mimetype,
        doc_name: file.filename,
        createdBy: req.users?.id,
        updatedBy: req.users?.id,
        status: status || "active",
      });
      createdDocs.push(newDoc);
    }

    return Helper.response(
      true,
      "Documents added successfully",
      createdDocs,
      res,
      200,
    );
  } catch (error) {
    console.error("Error adding document:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.getAppDocument = async (req, res) => {
  // const { employeeId } = req.body;
  const employeeId = req.users && req.users.id;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !employeeId) {
      return Helper.response(
        false,
        "Tenant ID and Employee ID are required",
        null,
        res,
        400,
      );
    }

    const documents = await Document.findAll({
      where: { tenantId, employeeId, branchId },
    });

    if (!documents || documents.length === 0) {
      return Helper.response(false, "No documents found", null, res, 404);
    }

    const data = await Promise.all(
      documents.map(async (doc) => {
        const typeD = await documentType.findOne({
          where: { id: doc.type, tenantId, branchId },
        });
        return {
          id: doc.id,
          employeeId: doc.employeeId,
          type: doc.type,
          typeName: typeD ? typeD.type : null,
          doc_type: doc.doc_type,
          doc_name: doc.doc_name,
          status: doc.status,
          createdAt: Helper.formatToIST(doc.createdAt),
          updatedAt: Helper.formatToIST(doc.updatedAt),
        };
      }),
    );
    return Helper.response(
      true,
      "Documents retrieved successfully",
      data,
      res,
      200,
    );
  } catch (error) {
    console.error("Error retrieving documents:", error);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.updateAppDocument = async (req, res) => {
  const { status, type, doc_name, typeName } = req.body;
  const tenantId = req.users?.tenantId;
  const employeeId = req.users && req.users.id;
  try {
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!tenantId || !employeeId) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Tenant ID and Employee ID are required",
        null,
        res,
        400,
      );
    }
    if (!type || type == "null") {
      return Helper.response(false, "All Fields Are required", null, res, 400);
    }

    const employeeExists = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
    });
    if (!employeeExists) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      const existingDocs = await Document.findAll({
        where: { tenantId, employeeId, branchId, type },
      });

      if (existingDocs.length === 0) {
        return Helper.response(
          false,
          "No document of this type found to update",
          null,
          res,
          404,
        );
      }

      const updatedDocuments = [];
      for (const doc of existingDocs) {
        doc.status = status || doc.status;
        doc.updatedBy = req.users?.id;
        await doc.save();
        updatedDocuments.push(doc);
      }

      return Helper.response(
        true,
        "Document status updated successfully",
        updatedDocuments,
        res,
        200,
      );
    }

    const updatedDocuments = [];

    for (const file of req.files) {
      const existingDoc = await Document.findOne({
        where: { tenantId, employeeId, type, branchId },
      });

      if (!existingDoc) {
        Helper.deleteUploadedFiles([file]);
        return Helper.response(
          false,
          "Document of this type not found. Use the create endpoint to add a new document.",
          null,
          res,
          404,
        );
      }

      const oldFilePath = path.join(
        __dirname,
        "../../../upload",
        existingDoc.doc_name,
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      existingDoc.doc_name = file.filename;
      existingDoc.doc_type = file.mimetype;
      existingDoc.branchId = branchId;
      existingDoc.updatedBy = req.users?.id;
      existingDoc.type = type || existingDoc.type;
      existingDoc.status = status || existingDoc.status;
      await existingDoc.save();
      updatedDocuments.push(existingDoc);
    }

    return Helper.response(
      true,
      "Documents updated successfully",
      updatedDocuments,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating documents:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(
      false,
      error?.message || "Internal server error",
      null,
      res,
      500,
    );
  }
};
exports.deleteAppDocument = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;
  const employeeId = req.users && req.users.id;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !employeeId || !id) {
      return Helper.response(
        false,
        "Tenant ID, Employee ID are required",
        null,
        res,
        400,
      );
    }

    const document = await Document.findOne({
      where: { id: id, tenantId, employeeId, branchId },
    });

    if (!document) {
      return Helper.response(false, "Document not found", null, res, 404);
    }

    const filePath = path.join(__dirname, "../../../upload", document.doc_name);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Error deleting file ${document.doc_name}:`, err);
      }
    }

    await document.destroy();

    return Helper.response(
      true,
      "Document deleted successfully",
      null,
      res,
      200,
    );
  } catch (error) {
    console.error("Error deleting document:", error);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};
