const express = require('express');
const router = express.Router();
const {Admin} = require('../middleware/auth');
const { createBasic, getBasic, updateBasic, deleteBasic, getBasicById, createVariable } = require('../controller/tenant/basicSalary');

router.post('/createBasic', Admin, createBasic);
router.post('/getBasic', Admin, getBasic);
router.post('/updateBasic', Admin, updateBasic);
router.post('/deleteBasic', Admin, deleteBasic);
router.post('/getBasicSalaryEmployee', Admin, getBasicById);
// router.post('/updateSalarySetUp', Admin, updateSalarySetUp);
router.post('/createVariable', Admin, createVariable);

module.exports = router;