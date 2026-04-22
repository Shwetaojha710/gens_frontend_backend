const express = require('express');
const router = express.Router();
const {Admin} = require('../middleware/auth');
const {createDepartment, getDepartments, updateDepartment, deleteDepartment, departmentDD} = require('../controller/tenant/department');
const { createPrefix, getPrefixs, updatePrefix, deletePrefix } = require('../controller/tenant/prefix');
const { createCurrency,getCurrency,deleteCurrency,updateCurrency } = require('../controller/tenant/currency');
const { getDesignationDD } = require('../controller/tenant/designation');
const { createBranch, getBranch, updateBranch, deleteBranch, branchDD } = require('../controller/tenant/branch');
const upload = require('../middleware/upload');

router.post('/createDepartment', Admin, createDepartment);
router.post('/getDepartments', Admin, getDepartments);
router.post('/updateDepartment', Admin, updateDepartment);
router.post('/deleteDepartment', Admin, deleteDepartment);
router.post('/department-dd', Admin, departmentDD); 
router.post('/designation-dd', Admin, getDesignationDD); 
router.post('/add-prefix', Admin, createPrefix);
router.post('/get-prefix', Admin, getPrefixs);
router.post('/update-prefix', Admin, updatePrefix);
router.post('/delete-prefix', Admin, deletePrefix);
router.post('/add-Currency', Admin, createCurrency);
router.post('/get-Currency', Admin, getCurrency);
router.post('/update-Currency', Admin, updateCurrency);
router.post('/delete-Currency', Admin, deleteCurrency);




router.post('/createBranch', Admin,upload.any(), createBranch);
router.post('/getBranch', Admin, getBranch);
router.post('/updateBranch', Admin,upload.any(), updateBranch);
router.post('/deleteBranch', Admin, deleteBranch);
router.post('/branch-dd',Admin, branchDD); 

module.exports= router;