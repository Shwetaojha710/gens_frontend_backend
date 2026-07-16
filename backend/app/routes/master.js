const express = require('express');
const {Admin} = require('../middleware/auth');
const { createComponent, updateComponent, listComponents, deleteComponent } = require('../controller/tenant/component');
const { getBrandColors, saveBrandColors, getLetterhead, uploadLetterhead, getHandbook, uploadHandbook } = require('../controller/tenant/setting');
const { getTenantUsers, saveUserPermission, getUserPermission, deleteUserPermission } = require('../controller/tenant/userPermission');
const upload = require('../middleware/upload');
const router = express.Router();

router.post('/create-component',Admin,createComponent)
router.post('/update-component',Admin,updateComponent)
router.post('/get-component',Admin,listComponents)
router.post('/delete-component',Admin,deleteComponent)

router.post('/get-brand-colors', Admin, getBrandColors)
router.post('/save-brand-colors', Admin, saveBrandColors)

router.post('/get-letterhead', Admin, getLetterhead)
router.post('/upload-letterhead', Admin, upload.single('letterhead'), uploadLetterhead)

router.post('/get-handbook', Admin, getHandbook)
router.post('/upload-handbook', Admin, upload.single('handbook'), uploadHandbook)

// ── User Permission Management ────────────────────────────────────────────
router.post('/get-tenant-users',    Admin, getTenantUsers)
router.post('/save-user-permission',Admin, saveUserPermission)
router.post('/get-user-permission', Admin, getUserPermission)
router.post('/delete-user-permission', Admin, deleteUserPermission)

module.exports = router