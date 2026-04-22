const express = require('express');
const router = express.Router();
const {Admin} = require('../middleware/auth');
const { createDeductionMaster, getDeductionMaster, updateDeductionMaster } = require('../controller/tenant/deductions');

router.post('/create-deduction-master', Admin, createDeductionMaster);
router.post('/get-deduction-master', Admin,getDeductionMaster)
router.post('/update-deduction-master', Admin, updateDeductionMaster);
module.exports = router;