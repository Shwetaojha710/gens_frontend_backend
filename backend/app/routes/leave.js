const express = require("express");
const { Admin } = require("../middleware/auth");
const {
  createLeave,
  getLeaves,
  updatedLeave,
  destroy,
  assignLeave,
  getLeaveTypes,
  getLeaveByEmployee,
  applyForLeave,
  getAppliedLeaves,
  getAppAppliedLeaves,
  updatedApplyLeaveStatus,
  updateAssignedLeave,
  deleteAssignedLeave,
  generateCompOffLeave,
  approveCompOffLeave,
} = require("../controller/tenant/leave");

const router = express.Router();

router.post("/create-leave", Admin, createLeave);
router.post("/get-leaves", Admin, getLeaves);
router.post("/update-leaves", Admin, updatedLeave);
router.post("/delete-leaves", Admin, destroy);

router.post("/assign-leave", Admin, assignLeave);
router.post("/update-assign-leave", Admin, updateAssignedLeave);
router.post("/delete-assign-leave", Admin, deleteAssignedLeave);
router.post("/get-leave-type-dd", Admin, getLeaveTypes);
router.post("/get-leave-by-emp", Admin, getLeaveByEmployee);
router.post("/apply-leave", Admin, applyForLeave);
router.post("/update-apply-leave-status", Admin, updatedApplyLeaveStatus);
router.post("/get-applied-leaves", Admin, getAppliedLeaves);
router.post("/generate-comp-off-leave", Admin, generateCompOffLeave);
router.post("/approve-comp-off-leave", Admin, approveCompOffLeave);
// router.post('/get-app-applied-leaves',Admin,getAppAppliedLeaves)

module.exports = router;
