const express = require('express');
const {Admin} = require('../middleware/auth');
const { createComponent, updateComponent, listComponents, deleteComponent } = require('../controller/tenant/component');
const router = express.Router();

router.post('/create-component',Admin,createComponent)
router.post('/update-component',Admin,updateComponent)
router.post('/get-component',Admin,listComponents)
router.post('/delete-component',Admin,deleteComponent)
module.exports = router