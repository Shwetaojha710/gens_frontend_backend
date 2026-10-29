const express = require('express');
const { login, logout, AIlogin,Applogin, verifyOtp, Applogout, UpdatePassword, checkToken, interViewerlogin, InterviewerverifyOtp } = require('../controller/auth/login');
const {Admin, AppAdmin} = require('../middleware/auth');
const { Companyregistration } = require('../controller/auth/register');
const router = express.Router();
const logoUpload = require('../middleware/logoUpload');
const { snapToRoads } = require('../helper/googlemap');


router.post('/login',login)
router.post('/update-password',UpdatePassword)
router.post('/app-login',Applogin)
router.get('/check-token',checkToken)
router.post('/verify-otp',verifyOtp)
router.post('/AIlogin',AIlogin)
router.post('/logout',Admin,logout)
router.post('/app-logout',AppAdmin,Applogout)
router.post('/snap-to-roads',Admin,snapToRoads)
router.post('/company-register',logoUpload(['image', 'imageDark']), Companyregistration)
router.post('/send-otp',interViewerlogin)
router.post('/verify-otp-login',InterviewerverifyOtp)
module.exports = router