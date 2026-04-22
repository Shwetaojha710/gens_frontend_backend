const express = require('express');
const router = express.Router();
const {Admin, AppAdmin} = require('../middleware/auth');
const { createBankAccnt, getBankAccnt, updateBankAccnt, deleteBankAccnt, createAppBankAccnt, getAppBankAccnt, updateAppBankAccnt, deleteAppBankAccnt } = require('../controller/tenant/bankAccnt');

router.post('/createBank',Admin, createBankAccnt);
router.post('/getBank', Admin, getBankAccnt);
router.post('/updateBank', Admin, updateBankAccnt);
router.post('/deleteBank',Admin, deleteBankAccnt);

router.post('/createAppBank',AppAdmin, createAppBankAccnt);
router.post('/getAppBank', AppAdmin, getAppBankAccnt);
router.post('/updateAppBank', AppAdmin, updateAppBankAccnt);
router.post('/deleteAppBank',AppAdmin, deleteAppBankAccnt);

module.exports=router;