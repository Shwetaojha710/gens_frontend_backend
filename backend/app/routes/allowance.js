const express = require('express');
const {Admin} = require('../middleware/auth');
const { createAllowance, getAllowance, deleteAllowance, updateAllowance } = require('../controller/tenant/allowance');
const router = express.Router();

router.post('/createAllowance', Admin, createAllowance);
router.post('/getAllowance', Admin, getAllowance);
router.post('/updateAllowance', Admin, updateAllowance);
router.post('/deleteAllowance', Admin, deleteAllowance);

module.exports = router;