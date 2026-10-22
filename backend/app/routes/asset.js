const express = require("express");
const router = express.Router();
const { Admin, AppAdmin } = require("../middleware/auth");
const hr = require("../controller/tenant/asset");
const portal = require("../controller/tenant/assetPortal");

// ── HR / admin panel ──
router.post("/asset/category/list", Admin, hr.listCategories);
router.post("/asset/category/save", Admin, hr.saveCategory);
router.post("/asset/list", Admin, hr.listAssets);
router.post("/asset/register", Admin, hr.registerAssets);
router.post("/asset/update", Admin, hr.updateAsset);
router.post("/asset/detail", Admin, hr.assetDetail);
router.post("/asset/status", Admin, hr.setStatus);
router.post("/asset/scan", Admin, hr.scan);
router.post("/asset/labels", Admin, hr.labels);
router.post("/asset/allocate", Admin, hr.allocate);
router.post("/asset/return", Admin, hr.receiveReturn);
router.post("/asset/maintenance/open", Admin, hr.openMaintenance);
router.post("/asset/maintenance/close", Admin, hr.closeMaintenance);
router.post("/asset/employee", Admin, hr.employeeAssets);
router.post("/asset/clearance", Admin, hr.clearanceReport);
router.post("/asset/clearance/override", Admin, hr.logClearanceOverride);
router.post("/asset/dashboard", Admin, hr.dashboard);

// ── Employee portal ──
router.post("/asset/my/list", AppAdmin, portal.myAssets);
router.post("/asset/my/acknowledge", AppAdmin, portal.acknowledge);
router.post("/asset/my/request-return", AppAdmin, portal.requestReturn);

module.exports = router;
