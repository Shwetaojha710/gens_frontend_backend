const express = require("express");
const router = express.Router();
const { Admin } = require("../middleware/auth");
const { listAuditLogs } = require("../controller/tenant/audit");

router.post("/audit/list", Admin, listAuditLogs);

module.exports = router;