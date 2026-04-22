const express = require('express');
const router = express.Router();
const {Admin, AppAdmin} = require('../middleware/auth');
const { addDocumentType, getDocumentTypes, updateDocumentType, deleteDocumentType, getdocumentDD } = require('../controller/tenant/documentType');

router.post('/createDocumentType', Admin, addDocumentType);
router.post('/getDocumentType', Admin, getDocumentTypes);
router.post('/updateDocumentType', Admin, updateDocumentType);
router.post('/deleteDocumentType', Admin, deleteDocumentType);
router.post('/getDocumentDD', Admin, getdocumentDD); 
router.post('/getAppDocumentDD', AppAdmin, getdocumentDD); 

module.exports=router;