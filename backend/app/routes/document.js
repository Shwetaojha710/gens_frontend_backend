const express = require('express');
const router = express.Router();
const {Admin, AppAdmin} = require('../middleware/auth');
const upload = require('../middleware/upload');
const { addDocument, updateDocument, deleteDocument, getDocument, deleteDocumentField, addAppDocument, updateAppDocument, getAppDocument, deleteAppDocument } = require('../controller/tenant/document');

router.post('/createDocument', Admin, upload.any(), addDocument); 
router.post('/editDocument', Admin, upload.any(), updateDocument);
router.post('/getDocument', Admin, getDocument);
router.post('/deleteDocument', Admin, deleteDocument);
router.post('/createAppDocument', AppAdmin, upload.any(), addAppDocument); 
router.post('/editAppDocument', AppAdmin, upload.any(), updateAppDocument);
router.post('/getAppDocument', AppAdmin, getAppDocument);
router.post('/deleteAppDocument', AppAdmin, deleteAppDocument);

module.exports = router;