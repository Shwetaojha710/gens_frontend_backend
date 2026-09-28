const express = require("express");
const router = express.Router();
const { Admin } = require("../middleware/auth");
const {
  getEmployeeSalaryHistory,
  calculateArrear,
  getArrearSalaryList,
  createArrear,
  createBulkArrear,
  updateArrear,
  getArrearDetails,
  getArrearList,
  getPendingArrears,
  submitArrear,
  approveArrear,
  rejectArrear,
  getApprovedArrearsForSalary,
  getArrearStatusHistory,
} = require("../controller/tenant/arrear");

router.post("/get-employee-salary-history", Admin, getEmployeeSalaryHistory);
router.post("/calculate-arrear", Admin, calculateArrear);
router.post("/get-arrear-salary-list", Admin, getArrearSalaryList);
router.post("/create-arrear", Admin, createArrear);
router.post("/create-bulk-arrear", Admin, createBulkArrear);
router.post("/update-arrear", Admin, updateArrear);
router.post("/get-arrear-details", Admin, getArrearDetails);
router.post("/get-arrear-list", Admin, getArrearList);
router.post("/get-pending-arrears", Admin, getPendingArrears);
router.post("/submit-arrear", Admin, submitArrear);
router.post("/approve-arrear", Admin, approveArrear);
router.post("/reject-arrear", Admin, rejectArrear);
router.post("/get-approved-arrears-for-salary", Admin, getApprovedArrearsForSalary);
router.post("/get-arrear-status-history", Admin, getArrearStatusHistory);

module.exports = router;
