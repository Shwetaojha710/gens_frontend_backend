const express = require('express');
const router = express.Router();
const {Admin,WebcamAdmin} = require('../middleware/auth');
const { createEmp, getEmp, updateEmp, deleteEmp, uploadImage, getUploadedImage, employeeList, RegisterAppEmp, AppemployeeList, CheckTenant, checkEmpByMobile, assignBranches } = require('../controller/tenant/empPersonal');
const upload = require('../middleware/upload');
const faceUpload = require('../middleware/faceUpload');

router.post('/createEmp', Admin, faceUpload.single('image'), createEmp);
router.post('/RegisterAppEmp', faceUpload.single('profileImage'), RegisterAppEmp);
router.post('/check-tenant', CheckTenant);
router.post('/getEmp', Admin, getEmp);
router.post('/getEmpForwebcam', WebcamAdmin, getEmp);
router.post('/updateEmp', Admin, updateEmp);
router.post('/deleteEmp', Admin, deleteEmp);
router.post('/uploadImage', Admin, faceUpload.single('profileImage'), uploadImage);
router.post('/getUploadImage', Admin,getUploadedImage );
router.post('/get-emp-list',Admin,employeeList)
router.post('/get-ai-emp-list',WebcamAdmin,employeeList)
router.post('/app-emp-list',Admin,AppemployeeList)
router.post('/checkEmpByMobile', Admin, checkEmpByMobile);
router.post('/assign-branches', Admin, assignBranches);
module.exports=router;