const express = require('express');
const router = express.Router();
const { Admin } = require('../middleware/auth');
const {
  getVariableCatalog,
  createTemplate,
  updateTemplate,
  listTemplates,
  getTemplate,
  deleteTemplate,
  previewDocument,
  saveGeneratedDocument,
  listGeneratedDocuments,
  getGeneratedDocument,
} = require('../controller/tenant/documentTemplate');

router.post('/hr-template-variables', Admin, getVariableCatalog);
router.post('/hr-template-create', Admin, createTemplate);
router.post('/hr-template-update', Admin, updateTemplate);
router.post('/hr-template-list', Admin, listTemplates);
router.post('/hr-template-get', Admin, getTemplate);
router.post('/hr-template-delete', Admin, deleteTemplate);
router.post('/hr-template-preview', Admin, previewDocument);
router.post('/hr-template-save-generated', Admin, saveGeneratedDocument);
router.post('/hr-template-generated-list', Admin, listGeneratedDocuments);
router.post('/hr-template-generated-get', Admin, getGeneratedDocument);

module.exports = router;
