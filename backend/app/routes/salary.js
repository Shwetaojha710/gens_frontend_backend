const express = require('express');
const router = express.Router();
const {Admin}  = require('../middleware/auth');
const { calculateAttendance ,calculateSalaryComponent, generateSalary, GeneratedSalaryList,revertSalary, salarySetup, getActiveSalaryComponents, getBillDetails, updateSalarySetup, employeeMonthlyLeaveAttendanceDetails, saveSalaryDoc} = require('../controller/tenant/salary');
const { getComponentDD } = require('../controller/tenant/component');

router.post('/calculate-attendance', Admin, calculateAttendance);
router.post('/calculate-salary-component', Admin, calculateSalaryComponent);
router.post('/employee-monthly-leave-attendance-details', Admin, employeeMonthlyLeaveAttendanceDetails);
router.post('/generate-Salary', Admin, generateSalary);
router.post('/generate-Salary-list', Admin, GeneratedSalaryList);
router.post('/revert-Salary', Admin, revertSalary);
router.post('/setup-salary',Admin,salarySetup)
router.post('/update-salary',Admin,updateSalarySetup)
router.post('/get-active-salary-component',Admin,getActiveSalaryComponents)
router.post('/getComponentDD',Admin,getComponentDD)
router.post('/getBillDetails',Admin,getBillDetails)
router.post('/SubmitSalaryDoc',Admin,saveSalaryDoc)

module.exports=router;