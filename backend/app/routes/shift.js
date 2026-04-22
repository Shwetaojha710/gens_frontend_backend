const express = require('express');
const router = express.Router();
const {Admin}  = require('../middleware/auth');
const { createShift, getShift, updateShift, deleteShift, generateDummyAttendance } = require('../controller/tenant/shift');

router.post('/createShift',Admin, createShift);
router.post('/getShift', Admin, getShift);
router.post('/updateShift', Admin, updateShift);
router.post('/deleteShift', Admin, deleteShift);

router.post('/generateDummyAttendance',generateDummyAttendance)

module.exports=router;