const express = require('express');
const router = express.Router();
const {Admin,WebcamAdmin} = require('../middleware/auth');
const upload = require('../middleware/upload');
const { createJobRequirement, deleteJobRequirement, getJobRequirements, getSkills, updateJobRequirement, publishJob, saveJobLink, saveOfferLetter, getOfferLetters, checkDuplicateOfferLetter, generateOfferLetterPdf, getOfferLetterByPhone } = require('../controller/recruitment/job');

router.post('/createJobRequirement', Admin, createJobRequirement);
router.post('/updateJobRequirement', Admin, updateJobRequirement);
router.post('/deleteJobRequirement', Admin,deleteJobRequirement);
router.post('/getJobRequirements', Admin, getJobRequirements);
router.post('/publishJob', Admin, publishJob);
router.post('/get-skills', Admin, getSkills);
router.post('/saveJobLink', Admin, saveJobLink);
router.post('/save-offer-letter', Admin, saveOfferLetter);
router.post('/get-offer-letters', Admin, getOfferLetters);
router.post('/check-duplicate-offer-letter', Admin, checkDuplicateOfferLetter);
router.post('/generate-offer-letter-pdf', Admin, generateOfferLetterPdf);
router.post('/get-offer-letter-by-phone', Admin, getOfferLetterByPhone);

module.exports=router;