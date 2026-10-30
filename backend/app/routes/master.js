const express = require('express');
const {Admin, AppAdmin} = require('../middleware/auth');
const { createComponent, updateComponent, listComponents, deleteComponent } = require('../controller/tenant/component');
const { getBrandColors, saveBrandColors, getLetterhead, uploadLetterhead, getHandbook, uploadHandbook, getInsurancePolicy, uploadInsurancePolicy, getCompanyProfile, updateCompanyProfile, getCompanyLogo, uploadCompanyLogo, removeCompanyLogo } = require('../controller/tenant/setting');
const { getAppConfig, saveAppConfig } = require('../controller/tenant/appConfig');
const { getTenantUsers, saveUserPermission, getUserPermission, deleteUserPermission } = require('../controller/tenant/userPermission');
const upload = require('../middleware/upload');
const logoUpload = require('../middleware/logoUpload');
const router = express.Router();

router.post('/create-component',Admin,createComponent)
router.post('/update-component',Admin,updateComponent)
router.post('/get-component',Admin,listComponents)
router.post('/delete-component',Admin,deleteComponent)

router.post('/get-brand-colors', Admin, getBrandColors)
router.post('/save-brand-colors', Admin, saveBrandColors)

router.post('/get-app-config', Admin, getAppConfig)
router.post('/save-app-config', Admin, saveAppConfig)

router.post('/get-letterhead', Admin, getLetterhead)
router.post('/upload-letterhead', Admin, upload.single('letterhead'), uploadLetterhead)

router.post('/get-handbook', Admin, getHandbook)
router.post('/upload-handbook', Admin, upload.single('handbook'), uploadHandbook)

router.post('/get-insurance-policy', Admin, getInsurancePolicy)
router.post('/upload-insurance-policy', Admin, upload.single('insurancePolicy'), uploadInsurancePolicy)

// ── User Permission Management ────────────────────────────────────────────
router.post('/get-tenant-users',    Admin, getTenantUsers)
router.post('/save-user-permission',Admin, saveUserPermission)
router.post('/get-user-permission', Admin, getUserPermission)
router.post('/delete-user-permission', Admin, deleteUserPermission)

router.post('/get-company-profile', AppAdmin, getCompanyProfile);
router.post('/update-company-profile', Admin, logoUpload(['logo']), updateCompanyProfile);

// ── Company logo ─────────────────────────────────────────────────────────
router.post('/get-company-logo', Admin, getCompanyLogo)
router.post('/upload-company-logo', Admin, logoUpload(['logo', 'logoDark']), uploadCompanyLogo)
router.post('/remove-company-logo', Admin, removeCompanyLogo)
router.post('/get-app-company-logo', AppAdmin, getCompanyLogo)
module.exports = router