const router = require('express').Router();
const { Admin } = require('../middleware/auth');
const {
  getEmployeeReport,
  getPayrollReport,
  getSalaryRegisterReport,
} = require('../controller/tenant/report');

router.post('/employee-report', Admin, getEmployeeReport);
router.post('/payroll-report', Admin, getPayrollReport);
router.post('/salary-register-report', Admin, getSalaryRegisterReport);

module.exports = router;
