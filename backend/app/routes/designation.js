const express = require('express');
const router = express.Router();
const {Admin} = require('../middleware/auth');
const { createDesignation, getDesignation, updateDesignation, deleteDesignation } = require('../controller/tenant/designation');

router.post('/createDesignation', Admin, createDesignation);
router.post('/getDesignations', Admin, getDesignation);
router.post('/updateDesignation', Admin, updateDesignation);
router.post('/deleteDesignation', Admin, deleteDesignation);

module.exports= router;