const express = require('express');
const router = express.Router();
const {AppAdmin, Admin} = require('../middleware/auth');
const {getDailyAttendance,getAttendance, employeeByDepartment, TeamsAttendance,EmployeeDetails, EmployeeLeaveList,getAppAppliedLeaves, AppupdatedApplyLeaveStatus,AppapplyForLeave, getAppLeaveTypes, AppgetHolidayList, upcomingLeave, AppgetBillDetails, PrintBill, TeamLeaderLeaveList, DirectorLeaveList, notification, applyRegularization, getMyRegularizations, getPendingApproverRequests, updateRegularizationStatus, markattendance, addAppReimbursement, reimbursementList, getTeamReimbursements, updateAppReimbursementStatus, updateAppEmp, getEmpLetterDocs, saveEmpLetterSignature, getMyLeaveHistory, uploadEmpImage, getEmployeeUploadedImage, getAppHandbook}=require("../controller/tenant/appApi");
const { trackLocation, getLatestLocation, PinnedtrackLocation, listVistData, updateTrackRemark } = require('../controller/tenant/tracking');
const { generateAllLettersPdf } = require('../controller/tenant/letter_data');
const upload = require('../middleware/upload');
const excel_pdf_upload = require('../middleware/excel_pdf_upload');
const { branchDD } = require('../controller/tenant/branch');

router.get('/get-Emp-Details', AppAdmin, EmployeeDetails);

//attendance
router.post('/get-daily-attendance', AppAdmin, getDailyAttendance);
router.post('/get-monthly-attendance', AppAdmin, getAttendance);
router.get('/emp-by-department', AppAdmin, employeeByDepartment);
router.get('/team-attendances', AppAdmin, TeamsAttendance);


//leave
router.post('/apply-leaves',AppAdmin,AppapplyForLeave)
router.post('/update-apply-leaves-status',AppAdmin,AppupdatedApplyLeaveStatus)
router.post('/get-emp-leave-list', AppAdmin, EmployeeLeaveList);
router.post('/get-applied-leave-list', AppAdmin, getAppAppliedLeaves);
router.post('/get-my-leave-history', AppAdmin, getMyLeaveHistory);
router.post('/get-app-leave-type-dd',AppAdmin,getAppLeaveTypes)
router.post('/app-branch-dd',AppAdmin, branchDD); 
router.post('/UpComming-leave',AppAdmin,upcomingLeave)
// router.post('/team-leave-list',AppAdmin,TeamLeaderLeaveList)
// router.post('/director-leave-list',AppAdmin,DirectorLeaveList)

//holiday

router.get('/get-app-holidayList',AppAdmin,AppgetHolidayList);

//salary 
router.post('/get-app-bill-details',AppAdmin,AppgetBillDetails);
router.post('/print-bill',AppAdmin,PrintBill);
router.get('/notification',AppAdmin,notification);

router.post("/create-regularization", AppAdmin,applyRegularization);
router.post("/regularization-list",AppAdmin, getMyRegularizations);
router.post("/pending-regularize-list", Admin,getPendingApproverRequests);
router.post("/update-status",Admin, updateRegularizationStatus);
router.post("/track-location",AppAdmin, trackLocation);
router.post("/list-track-location",AppAdmin, listVistData);
router.post("/pinned-track-location",AppAdmin, PinnedtrackLocation);
router.post("/update-track-remark",AppAdmin,upload.any(), updateTrackRemark);
router.get("/latest-location",AppAdmin, getLatestLocation);

router.post('/mark-attendance',AppAdmin,upload.any(),markattendance );

router.post('/add-app-reimbursement',AppAdmin, excel_pdf_upload.array('images'),addAppReimbursement)
router.get('/reimbursement-list',AppAdmin,reimbursementList)
router.post('/team-reimbursements',AppAdmin,getTeamReimbursements)
router.post('/update-app-reimbursement-status',AppAdmin,updateAppReimbursementStatus)
router.post('/update-app-emp',AppAdmin,updateAppEmp)
router.get('/get-emp-letter-docs', AppAdmin, getEmpLetterDocs)
router.post('/save-emp-letter-signature', AppAdmin, saveEmpLetterSignature)
router.post('/get-app-letter-pdfs', AppAdmin, generateAllLettersPdf)
router.get('/get-app-handbook', AppAdmin, getAppHandbook)

router.post('/uploadEmpImage', Admin, upload.single('profileImage'), uploadEmpImage);
router.post('/getEmployeeUploadedImage', Admin,getEmployeeUploadedImage );

module.exports = router