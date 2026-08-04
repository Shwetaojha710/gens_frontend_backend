const express = require('express');
const router = express.Router();
const { Admin } = require('../middleware/auth');
const { saveLetterData, getLetterData, getLetterStats, generateLetterPdf, generateAllLettersPdf } = require('../controller/tenant/letter_data');

router.post('/save-letter-data', Admin, saveLetterData);
router.post('/get-letter-data', Admin, getLetterData);
router.post('/get-letter-stats', Admin, getLetterStats);
router.post('/generate-letter-pdf', Admin, generateLetterPdf);
router.post('/generate-all-letters-pdf', Admin, generateAllLettersPdf);

module.exports = router;
