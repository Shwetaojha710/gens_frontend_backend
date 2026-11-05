const express = require("express");
const router = express.Router();
const { Admin, AppAdmin } = require("../middleware/auth");
const excel_pdf_upload = require("../middleware/excel_pdf_upload");
const hr = require("../controller/tenant/expense");
const portal = require("../controller/tenant/expensePortal");

// ── HR / admin / finance panel ──
router.post("/expense/category/list", Admin, hr.listCategories);
router.post("/expense/category/save", Admin, hr.saveCategory);
router.post("/expense/rule/list", Admin, hr.listRules);
router.post("/expense/rule/save", Admin, hr.saveRule);
router.post("/expense/rule/delete", Admin, hr.deleteRule);
router.post("/expense/settings", Admin, hr.getSettings);
router.post("/expense/settings/save", Admin, hr.saveSettings);
router.post("/expense/claim/list", Admin, hr.listClaims);
router.post("/expense/claim/detail", Admin, hr.claimDetail);
router.post("/expense/claim/act", Admin, hr.actOnClaim);
router.post("/expense/claim/mark-paid", Admin, hr.markPaid);
router.post("/expense/dashboard", Admin, hr.dashboard);
router.post("/expense/report", Admin, hr.report);

// ── Employee portal ──
router.post("/expense/my/categories", AppAdmin, portal.categories);
router.post("/expense/my/receipt", AppAdmin, excel_pdf_upload.single("file"), portal.uploadReceipt);
router.post("/expense/my/validate", AppAdmin, portal.validate);
router.post("/expense/my/submit", AppAdmin, portal.submit);
router.post("/expense/my/claims", AppAdmin, portal.myClaims);
router.post("/expense/my/cancel", AppAdmin, portal.cancel);
router.post("/expense/my/claim-detail", AppAdmin, portal.claimDetail);
router.post("/expense/my/approvals", AppAdmin, portal.approvals);
router.post("/expense/my/act", AppAdmin, portal.act);
router.post("/expense/my/payables", AppAdmin, portal.payables);
router.post("/expense/my/mark-paid", AppAdmin, portal.markPaid);

module.exports = router;
