const express = require('express');
const router = express.Router();
const {Admin,WebcamAdmin} = require('../middleware/auth');
const { createEmp, getEmp, updateEmp, deleteEmp, uploadImage, getUploadedImage, employeeList, RegisterAppEmp, AppemployeeList, CheckTenant, checkEmpByMobile } = require('../controller/tenant/empPersonal');
const upload = require('../middleware/upload');

router.post('/createEmp', Admin,upload.single('image'), createEmp);
router.post('/RegisterAppEmp', RegisterAppEmp);
router.post('/check-tenant', CheckTenant);
router.post('/getEmp', Admin, getEmp);
router.post('/getEmpForwebcam', WebcamAdmin, getEmp);
router.post('/updateEmp', Admin, updateEmp);
router.post('/deleteEmp', Admin, deleteEmp);
router.post('/uploadImage', Admin, upload.single('profileImage'), uploadImage);
router.post('/getUploadImage', Admin,getUploadedImage );
router.post('/get-emp-list',Admin,employeeList)
router.post('/get-ai-emp-list',WebcamAdmin,employeeList)
router.post('/app-emp-list',Admin,AppemployeeList)
router.post('/checkEmpByMobile', Admin, checkEmpByMobile);
module.exports=router;