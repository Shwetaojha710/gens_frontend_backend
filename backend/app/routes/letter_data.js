const express = require('express');
const router = express.Router();
const { Admin } = require('../middleware/auth');
const { saveLetterData, getLetterData, getLetterStats } = require('../controller/tenant/letter_data');

router.post('/save-letter-data', Admin, saveLetterData);
router.post('/get-letter-data', Admin, getLetterData);
router.post('/get-letter-stats', Admin, getLetterStats);

module.exports = router;
