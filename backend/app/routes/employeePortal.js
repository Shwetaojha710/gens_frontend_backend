const express = require("express");
const router = express.Router();
const {
  sendEmployeePortalOtp,
  verifyEmployeePortalOtp,
} = require("../controller/tenant/employeePortal");

router.post("/employee-portal/send-otp", sendEmployeePortalOtp);
router.post("/employee-portal/verify-otp", verifyEmployeePortalOtp);

module.exports = router;
