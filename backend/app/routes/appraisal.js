const express = require('express');
const router = express.Router();
const { Admin } = require('../middleware/auth');
const {
  listAppraisalEmployees,
  getAppraisalDetail,
  previewAppraisal,
  applyAppraisal,
} = require('../controller/tenant/appraisal');

router.post('/appraisal/employees', Admin, listAppraisalEmployees);
router.post('/appraisal/detail', Admin, getAppraisalDetail);
router.post('/appraisal/preview', Admin, previewAppraisal);
router.post('/appraisal/apply', Admin, applyAppraisal);

module.exports = router;
