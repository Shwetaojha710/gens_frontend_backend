const express = require('express');
const router = express.Router();
const {Admin, AppAdmin} = require('../middleware/auth');
const { createWorkExp, getWorkExp, updateWorkExp, deleteWorkExp, createAppWorkExp, getAppWorkExp } = require('../controller/tenant/workExp');

router.post('/createWorkExp', Admin, createWorkExp);
router.post('/getWorkExp', Admin, getWorkExp);
router.post('/updateWorkExp', Admin, updateWorkExp);
router.post('/deleteWorkExp', Admin, deleteWorkExp);
router.post('/createAppWorkExp', AppAdmin, createAppWorkExp);
router.post('/getAppWorkExp', AppAdmin, getAppWorkExp);
module.exports = router;