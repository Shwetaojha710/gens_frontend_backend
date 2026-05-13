const express = require('express');
const {Admin} = require('../middleware/auth');
const { createComponent, updateComponent, listComponents, deleteComponent } = require('../controller/tenant/component');
const { getBrandColors, saveBrandColors } = require('../controller/tenant/setting');
const router = express.Router();

router.post('/create-component',Admin,createComponent)
router.post('/update-component',Admin,updateComponent)
router.post('/get-component',Admin,listComponents)
router.post('/delete-component',Admin,deleteComponent)

router.post('/get-brand-colors', Admin, getBrandColors)
router.post('/save-brand-colors', Admin, saveBrandColors)

module.exports = router