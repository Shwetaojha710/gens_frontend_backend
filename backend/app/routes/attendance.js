const express = require('express');
const {Admin} = require('../middleware/auth');
const { attendanceMaster, getAttendanceSettings, updateAttendanceSettings, getMonthlyAttendance, getAttendanceYears,getDateWiseAttendance
  ,addHoliday,getHolidayList,updateHoliday,deleteHoliday,
  deleteAttendance,
  updateAttendance,
  addAttendance,
  uploadAttendance,
  addReimbursement,
  getReimbursement,
  updateReimbursement,
  updateReimbursementStatus,
  deleteReimbursement,
  downloadAttendance,
  uploadLeave,
  getLateAttendance,
  updateempattendance,
  BulkupdateAttendance,
  getWeekendAttendance,
  CreateManuallyCompoff,
  listManuallyCompoff} = require('../controller/tenant/attendance');
const upload = require('../middleware/upload');
const router = express.Router();
const multer = require("multer");

const path = require("path");
const excel_pdf_upload = require('../middleware/excel_pdf_upload');
// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "upload/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload1 = multer({ storage });

router.post('/attendance-setting',Admin, attendanceMaster)
router.post('/get-attendance-setting',Admin,getAttendanceSettings);
router.post('/update-attendance-setting',Admin,updateAttendanceSettings);
router.post('/get-emp-attendance',Admin,getMonthlyAttendance)
router.post('/get-late-attendance',Admin,getLateAttendance)
router.post('/get-weekend-attendance',Admin,getWeekendAttendance)
router.post('/get-date-wise-attendance',Admin,getDateWiseAttendance)
router.post('/get-attendance-year',Admin,getAttendanceYears)
router.post('/add-attendance',Admin,addAttendance);
router.post('/upload-attendance',Admin, upload1.single("file"),uploadAttendance);
router.post('/upload-leave',Admin, upload1.single("file"),uploadLeave);
router.post('/download',Admin, downloadAttendance);
router.post('/update-attendance',Admin,updateAttendance);
router.post('/bulk-update-attendance',Admin,BulkupdateAttendance);
router.post('/update-emp-attendance',Admin,updateempattendance);
router.post('/delete-attendance',Admin,deleteAttendance);

router.post('/add-holiday',Admin,upload.any(),addHoliday)
router.post('/get-holidayList',Admin,getHolidayList);
router.post('/update-holiday',Admin,upload.any(),updateHoliday);
router.post('/delete-holiday',Admin,deleteHoliday);
router.post('/add-reimbursement',Admin, excel_pdf_upload.array('images'),addReimbursement)
router.post('/fetchReimbursement',Admin,getReimbursement);
router.post('/update-reimbursement',Admin,upload.any(),updateReimbursement);
router.post('/update-reimbursement-status',Admin,updateReimbursementStatus);
router.post('/delete-reimbursement',Admin,deleteReimbursement);
router.post('/create-manually-comp-off',Admin,CreateManuallyCompoff);
router.post('/list-manually-comp-off',Admin,listManuallyCompoff);


module.exports = router;
