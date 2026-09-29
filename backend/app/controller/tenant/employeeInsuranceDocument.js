const EmployeeInsuranceDocument = require("../../models/employeeInsuranceDocument");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const path = require("path");
const fs = require("fs");

const ALLOWED_TYPES = ["e_insurance_card", "insurance_policy"];
const TYPE_LABELS = {
  e_insurance_card: "E-Insurance Card",
  insurance_policy: "Insurance Policy Document",
};

const uploadDir = path.join(__dirname, "../../../upload");

function pickUploadedFile(req) {
  if (!req.files || !req.files.length) return null;
  return req.files.find((f) => f.fieldname === "doc_name") || req.files[0];
}

function unlinkQuiet(filename) {
  if (!filename) return;
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Error deleting file ${filename}:`, err);
    }
  }
}

function mapDoc(doc) {
  return {
    id: doc.id,
    employeeId: doc.employeeId,
    insuranceDocType: doc.insuranceDocType,
    typeLabel: TYPE_LABELS[doc.insuranceDocType] || doc.insuranceDocType,
    originalName: doc.originalName,
    doc_type: doc.doc_type,
    doc_name: doc.doc_name,
    status: doc.status,
    createdAt: Helper.formatToIST ? Helper.formatToIST(doc.createdAt) : doc.createdAt,
    updatedAt: Helper.formatToIST ? Helper.formatToIST(doc.updatedAt) : doc.updatedAt,
    url: `${process.env.IMG_BASE_URL}/${doc.doc_name}`,
  };
}

async function assertEmployee(employeeId, tenantId, branchId) {
  const where = { id: employeeId, tenantId };
  if (branchId && branchId !== "null") where.branchId = branchId;
  return empPersonal.findOne({ where });
}

/** Admin/HR: upload or replace one insurance document for an employee */
exports.upsertInsuranceDoc = async (req, res) => {
  const { employeeId, insuranceDocType, status } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!branchId || branchId === "null") {
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!tenantId || !employeeId) {
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(false, "Tenant ID and Employee ID are required", null, res, 400);
  }
  if (!insuranceDocType || !ALLOWED_TYPES.includes(insuranceDocType)) {
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(
      false,
      "insuranceDocType must be e_insurance_card or insurance_policy",
      null,
      res,
      400
    );
  }

  const file = pickUploadedFile(req);
  if (!file) {
    return Helper.response(false, "No file uploaded. Use field name doc_name.", null, res, 400);
  }

  try {
    const employeeExists = await assertEmployee(employeeId, tenantId, branchId);
    if (!employeeExists) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "Employee not found", null, res, 404);
    }

    const existing = await EmployeeInsuranceDocument.findOne({
      where: { tenantId, employeeId, insuranceDocType },
    });

    if (existing) {
      unlinkQuiet(existing.doc_name);
      existing.doc_name = file.filename;
      existing.doc_type = file.mimetype;
      existing.originalName = file.originalname || existing.originalName;
      existing.branchId = branchId;
      existing.status = status || existing.status || "active";
      existing.updatedBy = req.users?.id;
      await existing.save();
      return Helper.response(true, "Insurance document replaced successfully", mapDoc(existing), res, 200);
    }

    const created = await EmployeeInsuranceDocument.create({
      tenantId,
      branchId,
      employeeId,
      insuranceDocType,
      originalName: file.originalname || null,
      doc_type: file.mimetype,
      doc_name: file.filename,
      createdBy: req.users?.id,
      updatedBy: req.users?.id,
      status: status || "active",
    });

    return Helper.response(true, "Insurance document uploaded successfully", mapDoc(created), res, 200);
  } catch (error) {
    console.error("upsertInsuranceDoc error:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(false, error?.message || "Internal server error", null, res, 500);
  }
};

/** Admin/HR: list insurance docs for an employee */
exports.getInsuranceDocs = async (req, res) => {
  const { employeeId } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!branchId || branchId === "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!tenantId || !employeeId) {
    return Helper.response(false, "Tenant ID and Employee ID are required", null, res, 400);
  }

  try {
    const docs = await EmployeeInsuranceDocument.findAll({
      where: { tenantId, employeeId, branchId },
      order: [["insuranceDocType", "ASC"]],
    });

    return Helper.response(
      true,
      docs.length ? "Insurance documents retrieved successfully" : "No insurance documents found",
      docs.map(mapDoc),
      res,
      200
    );
  } catch (error) {
    console.error("getInsuranceDocs error:", error);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

/** Admin/HR: delete one insurance document */
exports.deleteInsuranceDoc = async (req, res) => {
  const { id, employeeId } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!branchId || branchId === "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!tenantId || !employeeId || !id) {
    return Helper.response(false, "Tenant ID, Employee ID and document id are required", null, res, 400);
  }

  try {
    const document = await EmployeeInsuranceDocument.findOne({
      where: { id, tenantId, employeeId, branchId },
    });
    if (!document) {
      return Helper.response(false, "Insurance document not found", null, res, 404);
    }

    unlinkQuiet(document.doc_name);
    await document.destroy();

    return Helper.response(true, "Insurance document deleted successfully", null, res, 200);
  } catch (error) {
    console.error("deleteInsuranceDoc error:", error);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

/** Employee portal / app: list own insurance documents (read-only) */
exports.getAppInsuranceDocs = async (req, res) => {
  const employeeId = req.users?.id;
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!tenantId || !employeeId) {
    return Helper.response(false, "Unauthorized", null, res, 401);
  }

  try {
    const where = { tenantId, employeeId, status: "active" };
    if (branchId && branchId !== "null") where.branchId = branchId;

    const docs = await EmployeeInsuranceDocument.findAll({
      where,
      order: [["insuranceDocType", "ASC"]],
    });

    return Helper.response(
      true,
      docs.length ? "Insurance documents retrieved successfully" : "No insurance documents found",
      docs.map(mapDoc),
      res,
      200
    );
  } catch (error) {
    console.error("getAppInsuranceDocs error:", error);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.INSURANCE_TYPE_LABELS = TYPE_LABELS;
