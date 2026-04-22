const router = require('express').Router();
const { CompoffData } = require('../controller/tenant/appApi');
const { getDashboardData, todayAttendance, getAttendanceChart, getAttendanceByDepartment } = require('../controller/tenant/dashboard');
const {createEmploymentType, getEmploymentTypes, editEmploymentType, deleteEmploymentType, getEmpDD,deleteHolidayType,editHolidayType,getHolidayTypes,createHolidayType,getHolidayTypeDD, createSalaryOrder, deleteSalaryOrder, editSalaryOrder, getSalaryOrder} = require('../controller/tenant/employmentType');
const { activeLocation, getStateDistrict } = require('../controller/tenant/empPersonal');
const { getLocationHistory, getActiveLocationEmp, getempLocationHistory, getappActiveLocationEmp, getliveLocationHistory, getVisitReport, getVisitPlace } = require('../controller/tenant/tracking');
const {Admin, AppAdmin} = require('../middleware/auth');

router.post('/createEmpType', Admin, createEmploymentType);
router.post('/getEmpTypes', Admin, getEmploymentTypes);
router.post('/editEmpType', Admin, editEmploymentType); 
router.post('/deleteEmpType', Admin, deleteEmploymentType); 
router.post('/getEmpTypeDD',Admin, getEmpDD);
router.get('/getVisitPlaceDD',Admin, getVisitPlace);

router.post('/createHolidayType', Admin, createHolidayType);
router.post('/getHolidayTypes', Admin, getHolidayTypes);
router.post('/editHolidayType', Admin, editHolidayType); 
router.post('/deleteHolidayType', Admin, deleteHolidayType); 
router.post('/getHolidayTypeDD',Admin, getHolidayTypeDD);
router.post('/dashboard',Admin, getDashboardData);
router.post('/dashboard-attendance-chart', Admin, getAttendanceChart);
router.post('/dashboard-attendance-by-department', Admin, getAttendanceByDepartment);
router.post('/today-attendance',Admin, todayAttendance);


router.post('/createSalaryOrder', Admin, createSalaryOrder);
router.post('/getSalaryOrder', Admin, getSalaryOrder);
router.post('/editSalaryOrder', Admin, editSalaryOrder); 
router.post('/deleteSalaryOrder', Admin, deleteSalaryOrder); 

router.post("/track-location-history",Admin, getLocationHistory);
router.post("/track-live-location-history",Admin, getliveLocationHistory);
router.get("/active-location-emp",Admin, getActiveLocationEmp);
router.post("/update-active-location",Admin, activeLocation);

router.get("/app-active-location-emp",AppAdmin, getappActiveLocationEmp);
router.post("/app-track-location-history",AppAdmin, getempLocationHistory);
router.post("/visit-report",Admin, getVisitReport);
router.get("/comp-off-list",AppAdmin, CompoffData);
router.post("/get-state-district",getStateDistrict)
module.exports= router;
