const express = require('express');
const router = express.Router();
const { Admin } = require('../middleware/auth');
const {
  listAppraisalEmployees,
  getAppraisalDetail,
  previewAppraisal,
  applyAppraisal,
  listAppliedAppraisals,
  getAppliedAppraisal,
  previewAppliedAppraisal,
  updateAppliedAppraisal,
} = require('../controller/tenant/appraisal');

router.post('/appraisal/employees', Admin, listAppraisalEmployees);
router.post('/appraisal/detail', Admin, getAppraisalDetail);
router.post('/appraisal/preview', Admin, previewAppraisal);
router.post('/appraisal/apply', Admin, applyAppraisal);
router.post('/appraisal/list', Admin, listAppliedAppraisals);
router.post('/appraisal/record', Admin, getAppliedAppraisal);
router.post('/appraisal/preview-edit', Admin, previewAppliedAppraisal);
router.post('/appraisal/update', Admin, updateAppliedAppraisal);

module.exports = router;
