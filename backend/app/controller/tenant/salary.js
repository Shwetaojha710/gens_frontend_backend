const { Op, where, fn, col, and } = require("sequelize");
const attendance = require("../../models/attendance");
const empPersonal = require("../../models/empPersonal");
const moment = require("moment");
const Shift = require("../../models/shift");
const Helper = require("../../helper/helper");
const attendanceSetting = require("../../models/attendanceSetting");
const leave_application = require("../../models/leave_application");
const Basic = require("../../models/basic");
const leave_balance = require("../../models/leaveBalance");
const holiday = require("../../models/holiday");
const allowance = require("../../models/allowance");
const deductionS = require("../../models/deductions");
const bill_info = require("../../models/bill_info");
const bill = require("../../models/bill");
const Designation = require("../../models/designation");
const MasterComponents = require("../../models/master_components");
const sequelize = require("../../connection/connection");
const EmploymentType = require("../../models/employmentType");
const Departments = require("../../models/department");
const bankAccnt = require("../../models/bankAccnt");
const leaveMaster = require("../../models/leaveMaster");
const HolidayType = require("../../models/HolidayType");
const comp_off = require("../../models/comp_off");
const { literal } = require("sequelize");
const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};
//commented by me
// exports.calculateAttendance = async (req, res) => {
//     const { employeeId, month, year } = req.body;
//     const tenantId = req.users && req.users.tenantId;

//     if (!tenantId || !employeeId) {
//         return Helper.response(false, "TenantId and employeeId required", [], res, 400);
//     }

//     try {
//         // Attendance setting
//         const deduction = await attendanceSetting.findOne({ where: { tenantId } });
//         const GRACE_MINUTES = deduction.graceMinutes;
//         const HALF_DAY_THRESHOLD = deduction.halfdayToAbsentMin; // hours
//         const HALF_DAY_CUTOFF_MINUTES = deduction.halfDayThreshold; // minutes
//         const lateAllowanceMin = deduction.lateAllowanceMin;
//         const CtcValue= await Basic.findOne({
//           where:{
//             tenantId,
//             employeeId:employeeId,
//             dependent:'CTC',
//             status:'active'
//           }
//         })
//        const totalCTC =CtcValue?.amount
//         // Dates
//         const startDate = moment(`${year}-${String(month).padStart(2, '0')}-01`, "YYYY-MM-DD").startOf('month');
//         const endDate = moment(startDate).endOf('month');
//         const totalDaysInMonth = endDate.date();
//         const perMonthSalary = totalCTC / 12;
//         const perDaySalary = perMonthSalary / totalDaysInMonth;

//         // Approved Leaves Map
//         const leaveRecords = await leave_application.findAll({
//             where: {
//                 employeeId: employeeId,
//                 status: 'approved',
//                 [Op.or]: [
//                     {
//                         fromDate: {
//                             [Op.between]: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//                         }
//                     },
//                     {
//                         toDate: {
//                             [Op.between]: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//                         }
//                     },
//                     {
//                         fromDate: { [Op.lte]: startDate.format('YYYY-MM-DD') },
//                         toDate: { [Op.gte]: endDate.format('YYYY-MM-DD') }
//                     }
//                 ]
//             },
//             raw: true
//         });

//         const leaveDateMap = {};
//         for (const leave of leaveRecords) {
//             const leaveStart = moment(leave.fromDate);
//             const leaveEnd = moment(leave.toDate);
//             for (let d = moment(leaveStart); d <= leaveEnd; d.add(1, 'days')) {
//                 const dateKey = d.format('YYYY-MM-DD');
//                 leaveDateMap[dateKey] = leave.duration_type || 'full'; // full, first_half, second_half
//             }
//         }

//         // Collect working days with shifts
//         const workingDays = [];
//         let dynamicWorkingDays = 0;

//         for (let d = moment(startDate); d <= endDate; d.add(1, 'days')) {
//             const dayName = d.format('dddd');
//             const shift = await Shift.findOne({
//                 where: {
//                     day_of_week: dayName,
//                     status: 'active',
//                     tenantId
//                 },
//                 raw: true
//             });

//             workingDays.push({ date: d.clone(), shift });
//             dynamicWorkingDays++;
//         }

//         let fullDays = 0;
//         let halfDays = 0;
//         let lateDays = 0;
//         let graceLateCount = 0;
//         let absentDays = 0;

//         for (let entry of workingDays) {
//             const date = entry.date;
//             const shift = entry.shift;
//             const dayStr = date.format("YYYY-MM-DD");

//             const startOfDayUTC = `${dayStr} 00:00:00`;
//             const endOfDayUTC = `${dayStr} 23:59:59`;

//             if (!shift || shift.is_week_off) {
//                 fullDays++;
//                 continue;
//             }

//             const attendances = await attendance.findOne({
//                 where: {
//                     employeeId,
//                     check_in_time: {
//                         [Op.between]: [startOfDayUTC, endOfDayUTC],
//                     }
//                 },
//                 raw: true
//             });

//             if (!attendances || !attendances.check_in_time || !attendances.check_out_time) {
//                 const leaveType = leaveDateMap[dayStr];

//                 if (leaveType === 'full') {
//                     fullDays++;
//                 } else if (leaveType === 'first_half' || leaveType === 'second_half') {
//                     halfDays++;
//                 } else {
//                     absentDays++;
//                 }
//                 continue;
//             }

//             const shiftStart = moment(`${dayStr} ${shift.startTime}`, "YYYY-MM-DD HH:mm:ss");
//             const checkIn = moment(attendances.check_in_time);
//             const checkOut = moment(attendances.check_out_time);
//             const workedHours = moment.duration(checkOut.diff(checkIn)).asHours();
//             const graceTime = shiftStart.clone().add(GRACE_MINUTES, 'minutes');
//             const halfDayTime = shiftStart.clone().add(HALF_DAY_CUTOFF_MINUTES, 'minutes');

//             if (workedHours < HALF_DAY_THRESHOLD) {
//                 absentDays++;
//                 continue;
//             }

//             if (checkIn.isAfter(halfDayTime)) {
//                 halfDays++;
//             } else if (checkIn.isAfter(graceTime)) {
//                 lateDays++;
//                 if (graceLateCount < lateAllowanceMin) {
//                     graceLateCount++;
//                     fullDays++;
//                 } else {
//                     halfDays++;
//                 }
//             } else {
//                 if (workedHours < parseFloat(shift.workingHours)) {
//                     halfDays++;
//                 } else {
//                     fullDays++;
//                 }
//             }
//         }

//         const basePay = (fullDays * perDaySalary) + (halfDays * perDaySalary * 0.5);

//         const totalLeaveDays = Object.values(leaveDateMap).reduce((acc, type) => {
//             return acc + (type === 'full' ? 1 : 0.5);
//         }, 0);

//         return Helper.response(true, "Attendance summary", {
//             employeeId,
//             month,
//             year,
//             fullDays,
//             halfDays,
//             lateDays,
//             graceLateUsed: graceLateCount,
//             absentDays,
//             totalWorkingDays: dynamicWorkingDays,
//             totalDaysInMonth,
//             perDaySalary: perDaySalary.toFixed(2),
//             totalLeaveDays,
//             basePay: basePay.toFixed(2),
//             totalDeduction: (perMonthSalary - basePay).toFixed(2)
//         }, res, 200);

//     } catch (error) {
//         console.error("Attendance calculation error:", error);
//         return Helper.response(false, error?.message, [], res, 500);
//     }
// };

// exports.calculateAttendance = async (req, res) => {
//     const { employeeId, month, year, totalCTC } = req.body;
//     const tenantId = req.users && req.users.tenantId;
//     const perMonthSalary = totalCTC / 12;

//     const GRACE_MINUTES = 15;
//     const HALF_DAY_THRESHOLD = 4; // in hours
//     const HALF_DAY_CUTOFF_MINUTES = 45; // a
//     const lateAllowanceMin = 3

//     if (!tenantId || !employeeId) {
//         return Helper.response(false, "TenantId and employeeId required", [], res, 400);
//     }

//     try {
//         const startDate = moment(`${year}-${month}-01`, "YYYY-MM-DD").startOf('month');
//         const endDate = moment(startDate).endOf('month');

//         const workingDays = [];
//         let dynamicWorkingDays = 0;

//         for (let d = moment(startDate); d <= endDate; d.add(1, 'days')) {
//             if (d.day() === 0) continue; // Skip Sundays

//             const shift = await Shift.findOne({
//                 where: {
//                     day_of_week: d.format('dddd'),
//                     status: 'active',
//                     tenantId
//                 },
//                 raw: true
//             });

//             if (!shift || shift.is_week_off) continue;

//             workingDays.push(d.clone());
//             dynamicWorkingDays++;
//         }

//         console.log("Working Days:", workingDays.map(d => d.format("YYYY-MM-DD")));

//         let fullDays = 0;
//         let halfDays = 0;
//         let lateDays = 0;
//         let graceLateCount = 0;
//         let absentDays = 0;

//         for (let date of workingDays) {
//             const day_of_week = date.format('dddd');

//             const shift = await Shift.findOne({
//                 where: {
//                     day_of_week,
//                     status: 'active',
//                     tenantId
//                 },
//                 raw: true
//             });

//             if (!shift || shift.is_week_off) continue;

//             console.log(date.format("YYYY-MM-DD HH:mm:ss"), 'ffffffff')

//             const startOfDayUTC = date.format("YYYY-MM-DD 00:00:00");

//             const endOfDayUTC = date.format("YYYY-MM-DD 23:59:59");

//             const attendances = await attendance.findOne({
//                 where: {
//                     employeeId,
//                     check_in_time: {
//                         [Op.between]: [startOfDayUTC, endOfDayUTC],
//                     }
//                 },
//                 raw: true
//             });

//             if (!attendances || !attendances.check_in_time || !attendances.check_out_time) {
//                 console.warn("Invalid or missing attendance for date", date.format("YYYY-MM-DD"), attendances);
//                 absentDays++;
//                 continue;
//             }

//             const shiftStart = moment(`${date.format("YYYY-MM-DD")} ${shift.startTime}`, "YYYY-MM-DD HH:mm:ss");
//             const checkIn = moment(attendances.check_in_time);
//             const checkOut = moment(attendances.check_out_time);
//             const workedHours = moment.duration(checkOut.diff(checkIn)).asHours();
//             const rawLateByMinutes = Math.floor(moment.duration(checkIn.diff(shiftStart)).asMinutes());

//             const graceTime = shiftStart.clone().add(GRACE_MINUTES, 'minutes');
//             const halfDayTime = shiftStart.clone().add(HALF_DAY_CUTOFF_MINUTES, 'minutes');

//             if (workedHours < HALF_DAY_THRESHOLD) {
//                 absentDays++;
//                 continue;
//             }
//             // After 09:45 → always half-day
//             if (checkIn.isAfter(halfDayTime)) {
//                 halfDays++;
//             } else if (checkIn.isAfter(graceTime)) {
//                 // After 09:15 but before 09:45
//                 lateDays++;
//                 if (graceLateCount < lateAllowanceMin) {
//                     graceLateCount++;
//                     fullDays++;
//                 } else {
//                     halfDays++;
//                 }
//             } else {
//                 // On or before 09:15
//                 if (workedHours < parseFloat(shift.workingHours)) {
//                     halfDays++;
//                 } else {
//                     fullDays++;
//                 }
//             }
//         }

//         const perDaySalary = perMonthSalary / dynamicWorkingDays;
//         const basePay = (fullDays * perDaySalary) + (halfDays * perDaySalary * 0.5);

//         return Helper.response(true, "Attendance summary", {
//             employeeId,
//             month,
//             year,
//             fullDays,
//             halfDays,
//             lateDays,
//             graceLateUsed: graceLateCount,
//             absentDays,
//             totalWorkingDays: dynamicWorkingDays,
//             basePay: basePay.toFixed(2)
//         }, res, 200);

//     } catch (error) {
//         console.error("Attendance calculation error:", error);
//         return Helper.response(false, "Internal Server Error", [], res, 500);
//     }
// };

// exports.calculateAttendance = async (req, res) => {
//     const { employeeId, month, year, totalCTC } = req.body;
//     const tenantId = req.users && req.users.tenantId;

//     const deduction = await attendanceSetting.findOne({ where: { tenantId } });
//     const GRACE_MINUTES = deduction.lateAllowanceMin;
//     const HALF_DAY_THRESHOLD = deduction.halfdayToAbsentMin; // in hours
//     const HALF_DAY_CUTOFF_MINUTES = deduction.halfDayThreshold; // in minutes
//     const lateAllowanceMin = deduction.lateAllowanceMin;

//     if (!tenantId || !employeeId) {
//         return Helper.response(false, "TenantId and employeeId required", [], res, 400);
//     }

//     try {
//         const startDate = moment(`${year}-${month}-01`, "YYYY-MM-DD").startOf('month');
//         const endDate = moment(startDate).endOf('month');

//         const totalDaysInMonth = endDate.date(); //
//         const perMonthSalary = totalCTC / 12;
//         // base salary for 31 days, not only working
//         const perDaySalary = perMonthSalary / totalDaysInMonth;

//         const workingDays = [];
//         let dynamicWorkingDays = 0;

//         for (let d = moment(startDate); d <= endDate; d.add(1, 'days')) {
//             const dayName = d.format('dddd');

//             const shift = await Shift.findOne({
//                 where: {
//                     day_of_week: dayName,
//                     status: 'active',
//                     tenantId
//                 },
//                 raw: true
//             });

//             // Even if shift is week off, we count the day to track attendance for pay
//             workingDays.push({ date: d.clone(), shift });
//             dynamicWorkingDays++; // Total calendar days for attendance scan
//         }

//         let fullDays = 0;
//         let halfDays = 0;
//         let lateDays = 0;
//         let graceLateCount = 0;
//         let absentDays = 0;

//         for (let entry of workingDays) {
//             const date = entry.date;
//             const shift = entry.shift;

//             const dayStr = date.format("YYYY-MM-DD");

//             const startOfDayUTC = dayStr + " 00:00:00";
//             const endOfDayUTC = dayStr + " 23:59:59";

//             if (!shift || shift.is_week_off) {
//                 fullDays++; // Treat week-offs as paid by default
//                 continue;
//             }

//             const attendances = await attendance.findOne({
//                 where: {
//                     employeeId,
//                     check_in_time: {
//                         [Op.between]: [startOfDayUTC, endOfDayUTC],
//                     }
//                 },
//                 raw: true
//             });

//             if (!attendances || !attendances.check_in_time || !attendances.check_out_time) {
//                 absentDays++;
//                 continue;
//             }

//             const shiftStart = moment(`${dayStr} ${shift.startTime}`, "YYYY-MM-DD HH:mm:ss");
//             const checkIn = moment(attendances.check_in_time);
//             const checkOut = moment(attendances.check_out_time);
//             const workedHours = moment.duration(checkOut.diff(checkIn)).asHours();
//             const graceTime = shiftStart.clone().add(GRACE_MINUTES, 'minutes');
//             const halfDayTime = shiftStart.clone().add(HALF_DAY_CUTOFF_MINUTES, 'minutes');

//             if (workedHours < HALF_DAY_THRESHOLD) {
//                 absentDays++;
//                 continue;
//             }

//             if (checkIn.isAfter(halfDayTime)) {
//                 halfDays++;
//             } else if (checkIn.isAfter(graceTime)) {
//                 lateDays++;
//                 if (graceLateCount < lateAllowanceMin) {
//                     graceLateCount++;
//                     fullDays++;
//                 } else {
//                     halfDays++;
//                 }
//             } else {
//                 if (workedHours < parseFloat(shift.workingHours)) {
//                     halfDays++;
//                 } else {
//                     fullDays++;
//                 }
//             }
//         }

//         const basePay = (fullDays * perDaySalary) + (halfDays * perDaySalary * 0.5);

//         return Helper.response(true, "Attendance summary", {
//             employeeId,
//             month,
//             year,
//             fullDays,
//             halfDays,
//             lateDays,
//             graceLateUsed: graceLateCount,
//             absentDays,
//             totalWorkingDays: dynamicWorkingDays,
//             totalDaysInMonth,
//             perDaySalary: perDaySalary.toFixed(2),
//             basePay: basePay.toFixed(2)
//         }, res, 200);

//     } catch (error) {
//         console.error("Attendance calculation error:", error);
//         return Helper.response(false, "Internal Server Error", [], res, 500);
//     }
// };

// exports.calculateAttendance = async (req, res) => {
//   let { employeeId, month, year } = req.body;
//   const tenantId = req.users && req.users.tenantId;
//   let leavebalance;
//   let data = [];
//   if (!tenantId || !employeeId) {
//     return Helper.response(
//       false,
//       "TenantId and employeeId required",
//       [],
//       res,
//       400
//     );
//   }

//   try {
//     const empData = await empPersonal.findAll({
//       where: {
//         id: {
//           [Op.in]: employeeId,
//         },
//       },
//       attributes: ["id", "shift_id"],
//       raw: true,
//     });
//     if (!empData || empData.length == 0) {
//       return Helper.response(false, "Employee not found", [], res, 400);
//     }

//     const checkshift = await Shift.findAll({
//       where: {
//         tenantId,
//         shift: {
//           [Op.ne]: empData.map((i) => i.shift_id).filter((s) => s != null)[0],
//         },
//       },
//     });
//     if (!checkshift) {
//       return Helper.response(false, "Create Shift First", [], res, 400);
//     }
//     // Attendance setting
//     const deduction = await attendanceSetting.findOne({ where: { tenantId } });
//     const GRACE_MINUTES = deduction.graceMinutes;
//     const HALF_DAY_THRESHOLD = deduction.halfdayToAbsentMin; // hours
//     const HALF_DAY_CUTOFF_MINUTES = deduction.halfDayThreshold; // minutes
//     const lateAllowanceMin = deduction.lateAllowanceMin;

//     const employees = await bill.findAll({
//       where: {
//         employeeId: { [Op.in]: employeeId },
//         tenantId,
//         month,
//         year,
//       },
//       raw: true,
//       attributes: ["employeeId"],
//     });

//     employeeId = employeeId.filter((item) => {
//       return !employees.some((emp) => emp.employeeId == item);
//     });

//     for (let i = 0; i < employeeId.length; i++) {
//       // Dates
//       const startDate = moment(
//         `${year}-${String(month).padStart(2, "0")}-01`,
//         "YYYY-MM-DD"
//       ).startOf("month");
//       const endDate = moment(startDate).endOf("month");
//       const CtcValue = await Basic.findOne({
//         where: {
//           tenantId,
//           employeeId: employeeId[i],
//           dependent: "CTC",
//           status: "active",
//           startDate: {
//             [Op.lte]: startDate,
//           },
//         },
//       });

//       if (!CtcValue) {
//         continue;
//         //  Helper.response(
//         //   false,
//         //   "Add Salary Component First",
//         //   [],
//         //   res,
//         //   400
//         // );
//       }
//       const PersonalInfo = await empPersonal.findOne({
//         where: {
//           id: employeeId[i],
//         },
//       });
//       const totalCTC = CtcValue?.amount;

//       const totalDaysInMonth = endDate.date();
//       const perMonthSalary = totalCTC / 12;
//       const perDaySalary = perMonthSalary / totalDaysInMonth;

//       console.clear();
//       // Approved Leaves Map
//       let leaveRecords = await leave_application.findAll({
//         where: {
//           employeeId: employeeId[i],
//           status: "approved",
//           [Op.or]: [
//             {
//               fromDate: {
//                 [Op.between]: [
//                   startDate.format("YYYY-MM-DD"),
//                   endDate.format("YYYY-MM-DD"),
//                 ],
//               },
//             },
//             {
//               toDate: {
//                 [Op.between]: [
//                   startDate.format("YYYY-MM-DD"),
//                   endDate.format("YYYY-MM-DD"),
//                 ],
//               },
//             },
//             {
//               fromDate: { [Op.lte]: startDate.format("YYYY-MM-DD") },
//               toDate: { [Op.gte]: endDate.format("YYYY-MM-DD") },
//             },
//           ],
//         },
//         raw: true,
//       });
//       leavebalance = await leave_balance.findAll({
//         where: {
//           employeeId: employeeId[i],
//           tenantId,
//           year,
//         },
//         raw: true,
//       });

//       // Collect all holidays for tenant
//       const holidayList = await holiday.findAll({
//         where: {
//           tenantId,
//           date: {
//             [Op.between]: [
//               startDate.format("YYYY-MM-DD"),
//               endDate.format("YYYY-MM-DD"),
//             ],
//           },
//         },
//         raw: true,
//       });
//       const holidays = holidayList.map((h) => h.date);

//       // Apply sandwich rule
//       let applysandwitchleave = Helper.applySandwichRule(
//         leaveRecords,
//         holidays,
//         startDate,
//         endDate
//       );
//       const leaveDateMap1 = {};
//       for (const leave of applysandwitchleave) {
//         const leaveStart = moment(leave.fromDate);
//         const leaveEnd = moment(leave.toDate);
//         for (let d = moment(leaveStart); d <= leaveEnd; d.add(1, "days")) {
//           const dateKey = d.format("YYYY-MM-DD");
//           leaveDateMap1[dateKey] = leave.duration_type || "full"; // full, first_half, second_half
//         }
//       }

//       leaveRecords = Helper.adjustLeaveRecords(
//         leavebalance,
//         applysandwitchleave
//       );
//       const leaveDateMap = {};
//       for (const leave of leaveRecords) {
//         const leaveStart = moment(leave.fromDate);
//         const leaveEnd = moment(leave.toDate);
//         for (let d = moment(leaveStart); d <= leaveEnd; d.add(1, "days")) {
//           const dateKey = d.format("YYYY-MM-DD");
//           // leaveDateMap[dateKey] = leave.duration_type || "full"; // full, first_half, second_half
//           leaveDateMap[dateKey] = {
//             duration_type: leave.duration_type || "full", // full, first_half, second_half
//             leavestatus: leave.leavestatus,
//           };
//         }
//       }

//       // Collect working days with shifts
//       const workingDays = [];
//       let dynamicWorkingDays = 0;

//       for (let d = moment(startDate); d <= endDate; d.add(1, "days")) {
//         const dayName = d.format("dddd");
//         const shift = await Shift.findOne({
//           where: {
//             day_of_week: dayName,
//             status: "active",
//             shift: PersonalInfo?.shift_id,
//             tenantId,
//           },
//           raw: true,
//         });

//         workingDays.push({ date: d.clone(), shift });
//         dynamicWorkingDays++;
//       }

//       let fullDays = 0;
//       let halfDays = 0;
//       let lateDays = 0;
//       let graceLateCount = 0;
//       let absentDays = 0;

//       for (let entry of workingDays) {
//         const date = entry.date;
//         const shift = entry.shift;
//         const dayStr = date.format("YYYY-MM-DD");

//         const startOfDayUTC = `${dayStr} 00:00:00`;
//         const endOfDayUTC = `${dayStr} 23:59:59`;

//         if (!shift || shift.is_week_off) {
//           fullDays++;
//           continue;
//         }
//         const getMonthlyAttendance = await attendance.findAll({
//           where: {
//             employeeId: employeeId[i],
//             tenantId,
//             month,
//             year,
//           },
//           raw: true,
//         });
//         if (getMonthlyAttendance && getMonthlyAttendance.length > 0) {
//           if (!shift || shift.is_week_off) {
//             fullDays++;
//             continue;
//           }
//         }
//         // else if(getMonthlyAttendance.length == 0)
//         //   {
//         //         absentDays++;
//         //     continue;
//         // }

//         const attendances = await attendance.findOne({
//           where: {
//             employeeId: employeeId[i],
//             check_in_time: {
//               [Op.between]: [startOfDayUTC, endOfDayUTC],
//             },
//           },
//           raw: true,
//         });
//         // console.log(attendances, "attendance data");
//         // console.log(startOfDayUTC, endOfDayUTC);
//         if (
//           !attendances ||
//           !attendances.check_in_time ||
//           !attendances.check_out_time
//         ) {
//           const leaveType = leaveDateMap[dayStr];
//           const holidaydata = await holiday.findOne({
//             where: {
//               tenantId,
//               date: dayStr,
//             },
//             raw: true,
//           });

//           if (
//             leaveType?.duration_type == "full" &&
//             leaveType?.leavestatus == "unpaid"
//           ) {
//             // fullDays++;
//             absentDays++;
//           } else if (
//             leaveType?.duration_type === "first_half" ||
//             leaveType?.duration_type === "second_half"
//           ) {
//             halfDays++;
//           }
//           //  else if (
//           //   getMonthlyAttendance &&
//           //   getMonthlyAttendance.length > 0
//           // ) {

//           //   fullDays++;
//           // }
//           else if (holidaydata) {
//             fullDays++;
//           } else if (leaveType?.duration_type === "half_full") {
//             halfDays++;
//           } else if (leaveType?.leavestatus == "approved") {
//             fullDays++;
//           } else {
//             absentDays++;
//           }
//           continue;
//         }

//         const shiftStart = moment(
//           `${dayStr} ${shift.startTime}`,
//           "YYYY-MM-DD HH:mm:ss"
//         );
//         const checkIn = moment(attendances.check_in_time);
//         const checkOut = moment(attendances.check_out_time);

//         const workedHours = moment.duration(checkOut.diff(checkIn)).asHours();
//         const graceTime = shiftStart.clone().add(GRACE_MINUTES, "minutes");
//         const halfDayTime = shiftStart
//           .clone()
//           .add(HALF_DAY_CUTOFF_MINUTES, "minutes");

//         if (workedHours < HALF_DAY_THRESHOLD) {
//           absentDays++;
//           continue;
//         }

//         if (checkIn.isAfter(halfDayTime)) {
//           halfDays++;
//         } else if (checkIn.isAfter(graceTime)) {
//           lateDays++;
//           if (graceLateCount < lateAllowanceMin) {
//             graceLateCount++;
//             fullDays++;
//           } else {
//             halfDays++;
//           }
//         } else {
//           // if (workedHours < parseFloat(shift.workingHours)) {
//           //   halfDays++;
//           // } else {
//           //   fullDays++;
//           // }
//           fullDays++;
//           //console.log("Full day for", halfDays,"Worked Hours:", workedHours,"Working Hours:",shift.workingHours);
//         }
//       }

//       const totalLeaveDays = Object.values(leaveDateMap1).reduce(
//         (acc, type) => {
//           return acc + (type == "full" ? 1 : 0.5);
//         },
//         0
//       );

//       const bonusallowanceamount = await allowance.findOne({
//         where: {
//           employeeId: employeeId[i],
//           status: "active",
//           type: "is_special",
//           [Op.and]: [
//             { startDate: { [Op.lte]: endDate } }, // record starts before your range ends
//             {
//               [Op.or]: [
//                 { endDate: { [Op.gte]: startDate } }, // record ends after your range starts
//                 { endDate: null }, // OR no endDate (open-ended)
//               ],
//             },
//           ],
//         },
//         raw: true,
//         attributes: [[fn("SUM", col("finalAmount")), "totalBonus"]],
//       });
//       const bonusdedamount = await deductionS.findOne({
//         where: {
//           employeeId: employeeId[i],
//           status: "active",
//           type: "is_special",
//           [Op.and]: [
//             { startDate: { [Op.lte]: endDate } }, // record starts before your range ends
//             {
//               [Op.or]: [
//                 { endDate: { [Op.gte]: startDate } }, // record ends after your range starts
//                 { endDate: null }, // OR no endDate (open-ended)
//               ],
//             },
//           ],
//         },
//         raw: true,
//         attributes: [[fn("SUM", col("finalAmount")), "totalBonus"]],
//       });
//       let bonusamount =
//         Number(bonusallowanceamount?.totalBonus) +
//         Number(bonusdedamount?.totalBonus);
//       let basePay = (
//         fullDays * perDaySalary +
//         halfDays * perDaySalary * 0.5
//       ).toFixed(2);
//       const allowedLeave = leavebalance.reduce((acc, remainingLeaves) => {
//         return acc + Number(remainingLeaves.remainingLeaves);
//       }, 0);

//       fullDays = fullDays + halfDays * 0.5;
//       const TotalSalary = totalDaysInMonth * perDaySalary;
//       data.push({
//         employeeId: employeeId[i],
//         employeeName: `${PersonalInfo?.firstName} ${PersonalInfo?.lastName}`,
//         empCode: PersonalInfo?.empCode,
//         month,
//         year,
//         fullDays,
//         halfDays,
//         lateDays,
//         graceLateUsed: graceLateCount,
//         absentDays,
//         allowedLeave,
//         bonusamount,
//         totalWorkingDays: dynamicWorkingDays,
//         TotalSalary: TotalSalary.toFixed(2),
//         totalDaysInMonth,
//         perDaySalary: perDaySalary.toFixed(2),
//         totalLeaveDays,
//         basePay: Number(basePay) + bonusamount,
//         totalDeduction: (perMonthSalary.toFixed(2) - Number(basePay)).toFixed(
//           2
//         ),
//       });
//     }
//     if (data.length == 0) {
//       return Helper.response(
//         false,
//         "Salary already generated for all selected employees",
//         [],
//         res,
//         400
//       );
//     }
//     return Helper.response(true, "Record Found Successfully!", data, res, 200);
//   } catch (error) {
//     console.error("Attendance calculation error:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };
exports.calculateAttendance = async (req, res) => {
  let { employeeId, month, year } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  let leavebalance;
  let data = [];
  if (!tenantId || !employeeId) {
    return Helper.response(
      false,
      "TenantId and employeeId required",
      [],
      res,
      400,
    );
  }

  try {
    const empData = await empPersonal.findAll({
      where: {
        id: {
          [Op.in]: employeeId,
        },
        branchId,
      },
      attributes: ["id", "shift_id", "joiningDate"],
      raw: true,
    });
    if (!empData || empData.length == 0) {
      return Helper.response(false, "Employee not found", [], res, 400);
    }

    const checkshift = await Shift.findAll({
      where: {
        tenantId,
        branchId,
        shift: {
          [Op.ne]: empData.map((i) => i.shift_id).filter((s) => s != null)[0],
        },
      },
      raw: true,
    });
    if (!checkshift) {
      return Helper.response(false, "Create Shift First", [], res, 400);
    }
    // Attendance setting
    const deduction = await attendanceSetting.findOne({
      where: { tenantId, branchId },
    });
    const GRACE_MINUTES = deduction.graceMinutes;
    const HALF_DAY_THRESHOLD = deduction.halfdayToAbsentMin; // hours
    const HALF_DAY_CUTOFF_MINUTES = deduction.halfDayThreshold; // minutes
    const lateAllowanceMin = deduction.lateAllowanceMin;

    const employees = await bill.findAll({
      where: {
        employeeId: { [Op.in]: employeeId },
        tenantId,
        branchId,
        month,
        year,
      },
      raw: true,
      attributes: ["employeeId"],
    });

    employeeId = employeeId.filter((item) => {
      return !employees.some((emp) => emp.employeeId == item);
    });
    const attendanceEmployees = await attendance.findAll({
      where: {
        employeeId: { [Op.in]: employeeId },
        month,
        branchId,
        year,
        tenantId,
      },
      attributes: ["employeeId"],
      raw: true,
    });

    const employeesWithAttendance = attendanceEmployees.map(
      (emp) => emp.employeeId,
    );

    employeeId = employeeId.filter((id) =>
      employeesWithAttendance.includes(id),
    );

    if (employeeId.length == 0) {
      return Helper.response(
        false,
        "No attendance found for the selected month/year. Salary not generated.",
        {},
        res,
        200,
      );
    }

    // console.log("Proceeding salary generation for:", employeeId);
    let absentdaysArr = [];
    for (let i = 0; i < employeeId.length; i++) {
      absentdaysArr = [];
      let startDate = moment(
        `${year}-${String(month).padStart(2, "0")}-01`,
        "YYYY-MM-DD",
      ).startOf("month");
      let endDate = moment(startDate).endOf("month");
      const employee = await empPersonal.findOne({
        where: { id: employeeId[i], tenantId },
        attributes: ["joiningDate", "exitDate"],
        raw: true,
      });
      let newEnddate;
      // Adjust end date based on exit date
      if (employee?.exitDate) {
        const exitMoment = moment(employee.exitDate);
        // If exit is before month end, end at exit date
        if (exitMoment.isBefore(endDate)) {
          newEnddate = exitMoment.clone();
        }
      }

      // Check if employee was active at all during this month
      // if (startDate.isAfter(endDate)) {
      //   console.log(`Skipping ${employeeId[i]} — not active in ${month}/${year}`);
      //   continue;
      // }

      let effectiveStartDate = moment(startDate); // keep as Moment

      if (employee && employee.joiningDate) {
        const joiningMoment = moment(employee.joiningDate);

        const sameMonth =
          joiningMoment.month() == effectiveStartDate.month() &&
          joiningMoment.year() == effectiveStartDate.year();

        if (sameMonth && joiningMoment.isAfter(effectiveStartDate)) {
          effectiveStartDate = joiningMoment.clone(); // keep as Moment
          startDate = effectiveStartDate;
        }
      }
      const CtcValue = await Basic.findOne({
        where: {
          tenantId,
          branchId,
          employeeId: employeeId[i],
          dependent: "CTC",
          status: "active",
          startDate: {
            [Op.lte]: effectiveStartDate,
          },
        },
      });
      if (!CtcValue) {
        continue;
        //  Helper.response(
        //   false,
        //   "Add Salary Component First",
        //   [],
        //   res,
        //   400
        // );
      }
      const PersonalInfo = await empPersonal.findOne({
        where: {
          id: employeeId[i],
          branchId,
        },
      });
      const empTypeData = await EmploymentType.findOne({
        where: {
          id: PersonalInfo?.empType,
          status: "active",
        },
        raw: true,
      });

       const designationData=await Designation.findOne({
          where:{
            id:PersonalInfo?.designationId
          },
          raw:true
        })

      // Apply employment type rule on CTC
      let totalCTC = CtcValue?.amount;

      if (empTypeData?.duration_type == "half_paid") {
        totalCTC = totalCTC / 2;
      }
      // const totalCTC = CtcValue?.amount;

      const totalDaysInMonth = endDate.date();
      const perMonthSalary = totalCTC / 12;
      const perDaySalary = perMonthSalary / totalDaysInMonth;

      // console.clear();
      // Applied leaves are considered for sandwich detection; only approved
      // leave is later treated as paid leave after balance adjustment.
      let leaveRecords = await leave_application.findAll({
        where: {
          employeeId: employeeId[i],
          branchId,
          status: { [Op.in]: ["pending", "recommended", "approved"] },
          [Op.or]: [
            {
              fromDate: {
                [Op.between]: [
                  startDate.format("YYYY-MM-DD"),
                  endDate.format("YYYY-MM-DD"),
                ],
              },
            },
            {
              toDate: {
                [Op.between]: [
                  startDate.format("YYYY-MM-DD"),
                  endDate.format("YYYY-MM-DD"),
                ],
              },
            },
            {
              fromDate: { [Op.lte]: startDate.format("YYYY-MM-DD") },
              toDate: { [Op.gte]: endDate.format("YYYY-MM-DD") },
            },
          ],
        },
        raw: true,
      });
      const leaveTypeIds = [...new Set(leaveRecords.map((item) => item.leaveTypeId).filter(Boolean))];
      const leaveTypeList = leaveTypeIds.length
        ? await leaveMaster.findAll({
            where: {
              id: { [Op.in]: leaveTypeIds },
              branchId,
            },
            attributes: ["id", "leaveName", "leaveCode"],
            raw: true,
          })
        : [];
      const leaveTypeMap = Object.fromEntries(
        leaveTypeList.map((item) => [item.id, item]),
      );
      leaveRecords = leaveRecords.map((item) => {
        const leaveTypeInfo = leaveTypeMap[item.leaveTypeId] || {};
        const leaveName = String(leaveTypeInfo.leaveName || "").trim().toLowerCase();
        const leaveCode = String(leaveTypeInfo.leaveCode || "").trim().toLowerCase();
        const normalizedLeaveName = leaveName.replace(/\s+/g, " ");
        return {
          ...item,
          leave_name: leaveTypeInfo.leaveName || null,
          leave_code: leaveTypeInfo.leaveCode || null,
          isRestrictedHolidayLeave:
            normalizedLeaveName.includes("restricted") || leaveCode.startsWith("rh"),
        };
      });
      leavebalance = await leave_balance.findAll({
        where: {
          employeeId: employeeId[i],
          branchId,
          tenantId,
          year,
          month,
        },
        raw: true,
      });
      leavebalance = await Promise.all(
        leavebalance.map(async (item) => {
          const leaveName = await leaveMaster.findOne({
            where: {
              id: item?.leaveTypeId,
              branchId,
            },
          });
          return {
            ...item,
            leave_name: leaveName?.leaveName,
          };
        }),
      );

      // Collect all holidays for tenant
      const holidayList = await holiday.findAll({
        where: {
          tenantId,
          branchId,
          date: {
            [Op.between]: [
              startDate.format("YYYY-MM-DD"),
              endDate.format("YYYY-MM-DD"),
            ],
          },
        },
        raw: true,
      });
      const holidayTypeIds = [...new Set(holidayList.map((item) => item.holiday_type).filter(Boolean))];
      const holidayTypeList = holidayTypeIds.length
        ? await HolidayType.findAll({
            where: {
              id: { [Op.in]: holidayTypeIds },
              tenantId,
              branchId,
              status: "active",
            },
            attributes: ["id", "name"],
            raw: true,
          })
        : [];
      const holidayTypeMap = Object.fromEntries(
        holidayTypeList.map((item) => [item.id, item.name]),
      );
      const holidayMap = Object.fromEntries(
        holidayList.map((item) => {
          const typeName = String(holidayTypeMap[item.holiday_type] || "").trim().toLowerCase();
          return [
            item.date,
            {
              ...item,
              holiday_type_name: holidayTypeMap[item.holiday_type] || null,
              isRestrictedHoliday: typeName === "restricted holiday",
            },
          ];
        }),
      );
      leaveRecords = leaveRecords.map((item) => {
        if (item.isRestrictedHolidayLeave) {
          return item;
        }
        const fromDate = item.fromDate;
        const toDate = item.toDate || item.fromDate;
        const isSingleDayRestrictedHoliday =
          fromDate &&
          toDate &&
          fromDate === toDate &&
          holidayMap[fromDate]?.isRestrictedHoliday;
        return {
          ...item,
          isRestrictedHolidayLeave: !!isSingleDayRestrictedHoliday,
        };
      });
      const holidays = holidayList
        .filter((item) => !holidayMap[item.date]?.isRestrictedHoliday)
        .map((item) => item.date);

      const shiftWeekOffDates = [];
      for (let d = moment(startDate); d.isSameOrBefore(endDate); d.add(1, "days")) {

        console.log(d.format("dddd"));
        
        const shift = await Shift.findOne({
          where: {
            day_of_week: d.format("dddd"),
            branchId,
            // status: "active",
            shift: PersonalInfo?.shift_id,
            tenantId,
          },
          raw: true,
        });
        if (shift?.is_week_off) {
          shiftWeekOffDates.push(d.format("YYYY-MM-DD"));
        }
      }
      const sandwichNonWorkingDays = [...new Set([...holidays, ...shiftWeekOffDates])];

      // Apply sandwich rule
      let applysandwitchleave = Helper.applySandwichRule(
        leaveRecords.filter((item) => !item.isRestrictedHolidayLeave),
        sandwichNonWorkingDays,
        startDate,
        endDate,
      );
      applysandwitchleave = [
        ...applysandwitchleave,
        ...leaveRecords
          .filter((item) => item.isRestrictedHolidayLeave)
          .map((item) => ({
            ...item,
            leavestatus: item.status === "approved" ? "approved" : "unpaid",
          })),
      ];
      const leaveDateMap1 = {};
      for (const leave of applysandwitchleave) {
        const leaveStart = moment(leave.fromDate);

        // Handle case when toDate is null → treat as single-day leave
        const leaveEnd = leave.toDate
          ? moment(leave.toDate)
          : moment(leave.fromDate);

        for (
          let d = moment(leaveStart);
          d.isSameOrBefore(leaveEnd);
          d.add(1, "days")
        ) {
          const dateKey = d.format("YYYY-MM-DD");
          leaveDateMap1[dateKey] = leave.duration_type || "full"; // full, first_half, second_half
        }
      }

      // Adjust leave records
      const nonRestrictedLeaves = applysandwitchleave.filter(
        (item) => !item.isRestrictedHolidayLeave,
      );
      const restrictedHolidayLeaves = applysandwitchleave
        .filter((item) => item.isRestrictedHolidayLeave)
        .map((item) => ({
          ...item,
          leavestatus: item.status === "approved" ? "approved" : "unpaid",
        }));

      // Comp-off leaves use comp_off balance, not regular leave_balance
      const compOffLeaveIds = nonRestrictedLeaves
        .filter((r) => r.compOffId)
        .map((r) => r.compOffId);
      const compOffRecords = compOffLeaveIds.length
        ? await comp_off.findAll({
            where: { id: { [Op.in]: compOffLeaveIds } },
            raw: true,
          })
        : [];
      const compOffMap = Object.fromEntries(
        compOffRecords.map((r) => [r.id, r]),
      );
      const compOffLeaves = nonRestrictedLeaves
        .filter((r) => r.compOffId)
        .map((r) => {
          const compOffRecord = compOffMap[r.compOffId];
          const isValid =
            compOffRecord &&
            (compOffRecord.status === "used" ||
              compOffRecord.status === "active");
          return {
            ...r,
            leavestatus:
              r.status === "approved" && isValid ? "approved" : "unpaid",
            isCompOff: true,
          };
        });
      const normalLeaves = nonRestrictedLeaves.filter((r) => !r.compOffId);

      leaveRecords = [
        ...Helper.adjustLeaveRecords(leavebalance, normalLeaves),
        ...compOffLeaves,
        ...restrictedHolidayLeaves,
      ];

      const leaveDateMap = {};
      for (const leave of leaveRecords) {
        const leaveStart = moment(leave.fromDate);

        // Handle null toDate safely again
        const leaveEnd = leave.toDate
          ? moment(leave.toDate)
          : moment(leave.fromDate);

        for (
          let d = moment(leaveStart);
          d.isSameOrBefore(leaveEnd);
          d.add(1, "days")
        ) {
          const dateKey = d.format("YYYY-MM-DD");
          leaveDateMap[dateKey] = {
            duration_type: leave.duration_type || "full", // full, first_half, second_half
            leavestatus: leave.leavestatus,
            isRestrictedHolidayLeave: !!leave.isRestrictedHolidayLeave,
            isSandwich: !!leave.isSandwich,
            isCompOff: !!leave.isCompOff,
          };
        }
      }

      // Collect working days with shifts
      const workingDays = [];
      let dynamicWorkingDays = 0;

      for (let d = moment(startDate); d <= endDate; d.add(1, "days")) {
        const dayName = d.format("dddd");
        const shift = await Shift.findOne({
          where: {
            day_of_week: dayName,
            branchId,
            status: "active",
            shift: PersonalInfo?.shift_id,
            tenantId,
          },
          raw: true,
        });

        workingDays.push({ date: d.clone(), shift });
        dynamicWorkingDays++;
      }

      let fullDays = 0;
      let halfDays = 0;
      let lateDays = 0;
      let graceLateCount = 0;
      let absentDays = 0;

      for (let entry of workingDays) {
        const date = entry.date;
        const shift = entry.shift;
        const dayStr = date.format("YYYY-MM-DD");

        const startOfDayUTC = `${dayStr} 00:00:00`;
        const endOfDayUTC = `${dayStr} 23:59:59`;
        if (new Date(newEnddate) < new Date(date)) {
          absentdaysArr.push({
            date: dayStr,
            reason: "Left Employee",
          });
          absentDays++;
          continue;
        }
        if (!shift || shift.is_week_off) {
          const sandwichLeave = leaveDateMap[dayStr];
          if (sandwichLeave?.isSandwich && sandwichLeave?.leavestatus === "unpaid") {
            absentdaysArr.push({ date: dayStr, reason: "Sandwich leave unpaid" });
            absentDays++;
          } else {
            fullDays++;
          }
          continue;
        }
        const getMonthlyAttendance = await attendance.findAll({
          where: {
            employeeId: employeeId[i],
            tenantId,
            branchId,
            month,
            year,
          },
          raw: true,
        });
        if (getMonthlyAttendance && getMonthlyAttendance.length > 0) {
          if (!shift || shift.is_week_off) {
            fullDays++;
            continue;
          }
        }
        // else if(getMonthlyAttendance.length == 0)
        //   {
        //         absentDays++;
        //     continue;
        // }
        
       

        const attendances = await attendance.findOne({
          where: {
            employeeId: employeeId[i],
            branchId,
            check_in_time: {
              [Op.between]: [startOfDayUTC, endOfDayUTC],
            },
          },
          raw: true,
        });
        // console.log(attendances,"attendance data")
        // console.log(startOfDayUTC,endOfDayUTC)
        if (
          !attendances ||
          !attendances.check_in_time ||
          !attendances.check_out_time
        ) {
          const leaveType = leaveDateMap[dayStr];
          const holidaydata = holidayMap[dayStr];

          // if(holidaydata){
          //   fullDays++
          // }

          // else
          if (
            holidaydata?.isRestrictedHoliday &&
            leaveType?.isRestrictedHolidayLeave &&
            leaveType?.leavestatus == "approved"
          ) {
            fullDays++;
          } else if (leaveType?.leavestatus == "approved") {
            if (
              leaveType?.duration_type == "first_half" ||
              leaveType?.duration_type == "second_half"
            ) {
              halfDays++;
            } else {
              fullDays++;
            }
          } else if (
            leaveType?.duration_type == "full" &&
            leaveType?.leavestatus == "unpaid"
          ) {
            absentdaysArr.push({
              date: dayStr,
              reason: "Leave Not Available",
            });
            absentDays++;
          } else if (
            leaveType?.duration_type == "first_half" ||
            leaveType?.duration_type == "second_half"
          ) {
            absentdaysArr.push({
              date: dayStr,
              reason: "halfDays applied",
            });
            halfDays++;
          }
          //  else if (
          //   getMonthlyAttendance &&
          //   getMonthlyAttendance.length > 0
          // ) {

          //   fullDays++;
          // }
          else if (holidaydata && !holidaydata.isRestrictedHoliday) {
            fullDays++;
          } else if (leaveType?.duration_type == "half_full") {
            absentdaysArr.push({
              date: dayStr,
              reason: "halfDays applied",
            });
            halfDays++;
          } else if (leaveType?.leavestatus == "approved") {
            fullDays++;
          } else {
            absentdaysArr.push({
              date: dayStr,
              reason: "Attendance and Leave not available",
            });
            // console.log("absentdayasss");
            absentDays++;
          }
          continue;
        }

        // const shiftStart = moment(
        //   `${dayStr} ${shift.startTime}`,
        //   "YYYY-MM-DD HH:mm:ss"
        // );
        const shiftStart = moment(
          `${dayStr} ${shift.startTime}`,
          "YYYY-MM-DD HH:mm:ss",
        )
          .seconds(0)
          .milliseconds(0);

        const checkIn = moment(attendances.check_in_time)
          .seconds(0)
          .milliseconds(0);
        // const checkIn = moment(attendances.check_in_time);
        const checkOut = moment(attendances.check_out_time);

        const workedHours = moment.duration(checkOut.diff(checkIn)).asHours();
        const graceTime = shiftStart.clone().add(GRACE_MINUTES, "minutes");
        const halfDayTime = shiftStart
          .clone()
          .add(HALF_DAY_CUTOFF_MINUTES, "minutes");

        if (workedHours < HALF_DAY_THRESHOLD) {
          absentdaysArr.push({
            date: dayStr,
            reason: "Late Attendance",
          });
          absentDays++;
          continue;
        }
        const leaveType = leaveDateMap[dayStr];

        if (checkIn.isAfter(halfDayTime)) {
          if (leaveType && leaveType.leavestatus == "approved") {
            fullDays++;
          } else {
            absentdaysArr.push({
              date: dayStr,
              reason: "late Attendance halfDays",
            });
            halfDays++;
          }
          // halfDays++;
        } else if (checkIn.isAfter(graceTime)) {
          lateDays++;
          if (graceLateCount < lateAllowanceMin) {
            graceLateCount++;
            fullDays++;
          } else {
            if (leaveType && leaveType.leavestatus == "approved") {
              fullDays++;
            } else {
              absentdaysArr.push({
                date: dayStr,
                reason: "late attendance halfDays",
              });
              halfDays++;
            }
            // halfDays++;
          }
        } else {
          // if (workedHours < parseFloat(shift.workingHours)) {
          //   halfDays++;
          // } else {
          //   fullDays++;
          // }
          fullDays++;
          //console.log("Full day for", halfDays,"Worked Hours:", workedHours,"Working Hours:",shift.workingHours);
        }
      }

      const totalLeaveDays = Object.values(leaveDateMap1).reduce(
        (acc, type) => {
          return acc + (type == "full" ? 1 : 0.5);
        },
        0,
      );

      const bonusallowanceamount = await allowance.findOne({
        where: {
          employeeId: employeeId[i],
          branchId,
          status: "active",
          type: "is_special",
          [Op.and]: [
            { startDate: { [Op.lte]: endDate } }, // record starts before your range ends
            {
              [Op.or]: [
                { endDate: { [Op.gte]: startDate } }, // record ends after your range starts
                { endDate: null }, // OR no endDate (open-ended)
              ],
            },
          ],
        },
        raw: true,
        attributes: [[fn("SUM", col("finalAmount")), "totalBonus"]],
      });
      const bonusdedamount = await deductionS.findOne({
        where: {
          employeeId: employeeId[i],
          branchId,
          status: "active",
          type: "is_special",
          [Op.and]: [
            { startDate: { [Op.lte]: endDate } }, // record starts before your range ends
            {
              [Op.or]: [
                { endDate: { [Op.gte]: startDate } }, // record ends after your range starts
                { endDate: null }, // OR no endDate (open-ended)
              ],
            },
          ],
        },
        raw: true,
        attributes: [[fn("SUM", col("finalAmount")), "totalBonus"]],
      });
      let bonusamount =
        Number(bonusallowanceamount?.totalBonus) +
        Number(bonusdedamount?.totalBonus);

      const allowedLeave = leavebalance.reduce((acc, remainingLeaves) => {
        return acc + Number(remainingLeaves.remainingLeaves);
      }, 0);

      // let basePay = (
      //   fullDays * perDaySalary +
      //   halfDays * perDaySalary * 0.5
      // ).toFixed(2);
      let basePay = fullDays * perDaySalary + halfDays * perDaySalary * 0.5;
      basePay = Math.round(basePay);
      fullDays = fullDays + halfDays * 0.5;

      const TotalSalary = totalDaysInMonth * perDaySalary;

      const shiftName = await Shift.findOne({
        where: {
          shift: PersonalInfo?.shift_id,
        },
        raw: true,
      });

      data.push({
        employeeId: employeeId[i],
        employeeName: `${PersonalInfo?.firstName} ${PersonalInfo?.lastName}`,
        empCode: PersonalInfo?.empCode,
        month,
        year,
        fullDays,
        halfDays,
        lateDays,
        graceLateUsed: graceLateCount,
        absentDays,
        absentdaysArr,
        allowedLeave,
        bonusamount,
        leavebalance,
        empType: empTypeData?.duration_type,
        totalWorkingDays: dynamicWorkingDays,
        TotalSalary: Math.round(TotalSalary),
        totalDaysInMonth,
        perDaySalary: Math.round(perDaySalary),
        totalLeaveDays,
        applysandwitchleave,
        basePay: basePay + bonusamount,
        totalDeduction: Math.round(perMonthSalary - basePay),
        shift_id: shiftName?.id,
        shift_name: shiftName?.shift,
        designation_name: designationData?.name,
      });
    }
    if (data.length == 0) {
      return Helper.response(
        false,
        "Salary already generated for all selected employees",
        [],
        res,
        400,
      );
    }
    return Helper.response(true, "Record Found Successfully!", data, res, 200);
  } catch (error) {
    console.error("Attendance calculation error:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.calculateSalaryComponent = async (req, res) => {
  try {
    const {
      employeeId,
      fullDays,
      totalDaysInMonth,
      totalDeduction,
      year,
      month,
    } = req.body;

    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!tenantId || !employeeId) {
      return Helper.response(
        false,
        "TenantId and employeeId are required",
        [],
        res,
        400,
      );
    }

    // ============================
    // FETCH EMPLOYEE EMPLOYMENT TYPE
    // ============================
    const empInfo = await empPersonal.findOne({
      where: { id: employeeId, tenantId, branchId },
      raw: true,
    });

    const empTypeId = empInfo?.empType;

    let typeMultiplier = 1;

    if (empTypeId) {
      const empTypeData = await EmploymentType.findOne({
        where: {
          id: empTypeId,
          tenantId,
          branchId,
          status: "active",
        },
        raw: true,
      });

      if (empTypeData?.duration_type === "half_paid") {
        typeMultiplier = 0.5;
      }
    }

    // ============================
    // HELPER FUNCTION
    // ============================
    const fetchAndTransform = async (Model, payCode) => {
      const records = await Model.findAll({
        where: { tenantId, branchId, employeeId, status: "active" },
        raw: true,
        order: [["createdAt", "desc"]],
      });

      return records.map((item) => {
        const isNormalType =
          item.type !== "is_special" && item.type !== "deduction";

        let payAmount = isNormalType ? item.finalAmount / 12 : item.finalAmount;

        // 👉 APPLY EMPLOYMENT TYPE MULTIPLIER
        payAmount = payAmount * typeMultiplier;

        return {
          ...item,
          pay_code: payCode,
          pay_amount: parseFloat(payAmount.toFixed(2)),
          deduct_amount: parseFloat(
            Math.abs(item.finalAmount - payAmount).toFixed(2),
          ),
        };
      });
    };

    const endOfMonth = moment(`${year}-${month}-01`).endOf("month");

    // ============================
    // LEAVE DEDUCTION
    // ============================
    await deductionS.update(
      { status: "inactive" },
      {
        where: {
          tenantId,
          branchId,
          employeeId,
          name: "Leave Deduction",
          status: "active",
        },
      },
    );

    await deductionS.create({
      id: Helper.generateUUID().toString(),
      tenantId,
      employeeId,
      branchId,
      name: "Leave Deduction",
      type: "deduction",
      dependent: null,
      amount: parseFloat(totalDeduction || 0),
      typeValue: null,
      finalAmount: parseFloat(totalDeduction || 0),
      finalCTC: null,
      status: "active",
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${endOfMonth.date()}`,
    });

    // ============================
    // FETCH COMPONENTS
    // ============================
    const [basicData, allowanceData, deductionData] = await Promise.all([
      fetchAndTransform(Basic, "PAY"),
      fetchAndTransform(allowance, "PAY"),
      fetchAndTransform(deductionS, "DED"),
    ]);

    let salaryComponents = [...basicData, ...allowanceData, ...deductionData];

    salaryComponents = salaryComponents.filter((item) => {
      if (item.type != "is_special") return true;

      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);

      return (
        (start <= monthEnd && end >= monthStart) || item.endDate == "all_period"
      );
    });

    return Helper.response(true, "Salary breakup", salaryComponents, res, 200);
  } catch (error) {
    console.error("Salary calculation error:", error);
    return Helper.response(
      false,
      error?.message || "Internal server error",
      [],
      res,
      500,
    );
  }
};

// exports.calculateSalaryComponent = async (req, res) => {
//   try {
//     const {
//       employeeId,
//       fullDays,
//       totalDaysInMonth,
//       totalDeduction,
//       year,
//       month,
//     } = req.body;
//     const tenantId = req.users?.tenantId;
//     const branchId = req.users && req.users.branchId;

//     if (!branchId || branchId=='null') {
//       return Helper.response(false, "branchId is required!", {}, res, 200);
//     }

//     if (!tenantId || !employeeId) {
//       return Helper.response(
//         false,
//         "TenantId and employeeId are required",
//         [],
//         res,
//         400
//       );
//     }

//     // Helper function to fetch and transform salary components
//     const fetchAndTransform = async (Model, payCode) => {
//       const records = await Model.findAll({
//         where: { tenantId,branchId, employeeId, status: "active" },
//         raw: true,
//         order: [["createdAt", "desc"]],
//       });

//       return records.map((item) => {
//         const isNormalType =
//           item.type !== "is_special" && item.type !== "deduction";

//         const payAmount = isNormalType
//           ? (item.finalAmount / 12).toFixed(2)
//           : item.finalAmount;

//         // const payAmount =item.type !== "is_special" || item.type !='deduction'
//         //     ? (item.finalAmount / 12).toFixed(2)
//         //     : item.finalAmount;

//         return {
//           ...item,
//           pay_code: payCode,
//           pay_amount: parseFloat(payAmount),
//           deduct_amount: parseFloat(Math.abs(item.finalAmount - payAmount)),
//         };
//       });
//     };

//     const endOfMonth = moment(`${year}-${month}-01`).endOf("month");

//     // Ensure leave deduction exists in DB

//     let leaveDeduction = {};
//     const existingLeaveDeduction = await deductionS.findOne({
//       where: {
//         tenantId,
//         branchId,
//         employeeId,
//         name: "Leave Deduction",
//         status: "active",
//         endDate: `${year}-${month}-${endOfMonth.date()}`,
//         startDate: `${year}-${month}-01`,
//       },
//     });

//     if (!existingLeaveDeduction) {
//       let uuid = Helper.generateUUID().toString();

//       await deductionS.update(
//         {
//           status: "inactive",

//         },
//         {
//           where: {
//             tenantId,branchId,
//             employeeId,
//             name: "Leave Deduction",
//             status: "active",
//           },
//         }
//       );

//       await deductionS.create({
//         id: uuid,
//         tenantId,
//         employeeId,
//         branchId,
//         name: "Leave Deduction",
//         type: "deduction",
//         dependent: null, //
//         amount: parseFloat(totalDeduction || 0),
//         typeValue: null, //
//         finalAmount: parseFloat(totalDeduction || 0),
//         finalCTC: null,
//         status: "active",
//         startDate: `${year}-${month}-01`,
//         endDate: `${year}-${month}-${endOfMonth.date()}`,
//       });
//       // leaveDeduction = {
//       //   id: uuid,
//       //   tenantId,
//       //   employeeId,
//       //   name: "Leave Deduction",
//       //   type: "is_special",
//       //   dependent: "",
//       //   amount: parseFloat(totalDeduction || 0),
//       //   typeValue: "",
//       //   finalAmount: parseFloat(totalDeduction || 0),
//       //   finalCTC: null,
//       //   status: "active",
//       //   startDate: `${year}-${month}-01`,
//       //   endDate: null,
//       //   pay_code: "DED",
//       //   pay_amount: parseFloat(totalDeduction || 0),
//       // };
//       // deductionData.push(leaveDeduction);
//     } else {
//       let uuid = Helper.generateUUID().toString();
//       await deductionS.update(
//         {
//           status: "inactive",
//         },
//         {
//           where: {
//             tenantId,
//             employeeId,
//             branchId,
//             name: "Leave Deduction",
//             status: "active",
//           },
//         }
//       );
//       await deductionS.create({
//         id: uuid,
//         tenantId,
//         branchId,
//         employeeId,
//         name: "Leave Deduction",
//         type: "deduction",
//         dependent: null, //
//         amount: parseFloat(totalDeduction || 0),
//         typeValue: null, //
//         finalAmount: parseFloat(totalDeduction || 0),
//         finalCTC: null,
//         status: "active",
//         startDate: `${year}-${month}-01`,
//         endDate: `${year}-${month}-${endOfMonth.date()}`,
//       });
//     }
//     // Fetch basic, allowance, and deduction data in parallel
//     const [basicData, allowanceData, deductionData] = await Promise.all([
//       fetchAndTransform(Basic, "PAY"),
//       fetchAndTransform(allowance, "PAY"),
//       fetchAndTransform(deductionS, "DED"),
//     ]);
//     let salaryComponents = [...basicData, ...allowanceData, ...deductionData];
//     salaryComponents = salaryComponents.filter((item) => {
//       if (item.type != "is_special") return true;

//       const start = new Date(item.startDate);
//       const end = new Date(item.endDate);
//       const monthStart = new Date(year, month - 1, 1);
//       const monthEnd = new Date(year, month, 0);

//       const overlaps =
//         (start <= monthEnd && end >= monthStart) ||
//         item.endDate == "all_period";

//       return overlaps; // keep only applicable "is_special"
//     });
//     return Helper.response(true, "Salary breakup", salaryComponents, res, 200);
//   } catch (error) {
//     console.error("Salary calculation error:", error);
//     return Helper.response(
//       false,
//       error?.message || "Internal server error",
//       [],
//       res,
//       500
//     );
//   }
// };

// exports.generateSalary = async (req, res) => {
//   const t = await bill_info.sequelize.transaction();
//   const tenantId = req.users?.tenantId;
//   const createdBy = req.users?.id;

//   try {
//     const employees = req.body;
//     if (!tenantId || !employees || employees.length === 0) {
//       return Helper.response(
//         false,
//         "Required fields are missing",
//         {},
//         res,
//         400
//       );
//     }

//     const skippedEmployees = [];
//     const billRecords = [];
//     const billInfoRecords = [];

//     for (const emp of employees) {
//       if (!emp.employeeId || !emp.components) continue;

//       // Check if salary already exists
//       const existing = await bill.findOne({
//         where: {
//           tenantId,
//           employeeId: emp.employeeId,
//           year: emp.year,
//           month: emp.month,
//         },
//         transaction: t,
//       });

//       if (existing) {
//         skippedEmployees.push({
//           employeeId: emp.employeeId,
//           year: emp.year,
//           month: emp.month,
//           reason: "Salary already generated",
//         });
//         continue;
//       }

//       await leave_balance.update(
//         {
//           usedLeaves: emp?.totalLeaveDays,
//           remainingLeaves:
//             emp?.allowedLeave - emp?.totalLeaveDays < 0
//               ? 0
//               : emp?.allowedLeave - emp?.totalLeaveDays,
//         },
//         {
//           where: { employeeId: emp?.employeeId, tenantId, year: emp?.year },
//           transaction: t,
//         }
//       );

//       // --- Insert into bill (summary)
//       const billData = {
//         tenantId,
//         employeeId: emp.employeeId,
//         year: Number(emp.year),
//         month: Number(emp.month),
//         bill_date: new Date(),
//         net_amount: emp.basePay, // from payload
//         full_days: emp?.fullDays || 0,
//         absent_days: emp?.absentDays || 0,
//         hours_worked: emp?.hoursWorked || null,
//         bill_desc: "Auto-generated salary",
//         status: "active",
//         createdBy,
//       };

//       const billRow = await bill.create(billData, { transaction: t });

//       // --- Insert into bill_info (component breakdown)
//       emp.components.forEach((comp) => {
//         billInfoRecords.push({
//           tenantId,
//           employeeId: emp.employeeId,
//           year: Number(emp.year),
//           month: Number(emp.month),
//           bill_date: new Date(),
//           bill_id: billRow.bill_id, // link bill_info → bill
//           pay_component_id: comp.id,
//           pay_code: comp.pay_code,
//           amount: comp.pay_amount,
//           status: "active",
//           createdBy,
//         });
//       });

//       billRecords.push(billRow);
//     }

//     // Save all bill_info rows
//     if (billInfoRecords.length > 0) {
//       await bill_info.bulkCreate(billInfoRecords, { transaction: t });
//       const LeaveData=await leave_balance.findOne({
//         where:{
//           month,
//           year,
//           employeeId,
//           tenantId
//         }
//       })
//       await leave_balance.create({
//         leavetypeId,
//         employeeId,
//          year,
//         month
//       })
//     }

//     await t.commit();

//     // return Helper.response(true, "Salary generation completed", {
//     //   generatedCount: billRecords.length,
//     //   skippedCount: skippedEmployees.length,
//     //   skippedEmployees,
//     //   generatedSalaries: billRecords,
//     // }, res, 200);

//     if (billRecords.length == 0) {
//       return Helper.response(
//         false,
//         "Salary already generated for all selected employees",
//         {
//           generatedCount: billRecords.length,
//           skippedCount: skippedEmployees.length,
//           skippedEmployees,
//           generatedSalaries: billRecords,
//         },
//         res,
//         200
//       );
//     }
//     return Helper.response(
//       true,
//       "Salary generation completed",
//       {
//         generatedCount: billRecords.length,
//         skippedCount: skippedEmployees.length,
//         skippedEmployees,
//         generatedSalaries: billRecords,
//       },
//       res,
//       200
//     );
//   } catch (error) {
//     await t.rollback();
//     console.error("Error saving salaries:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

// exports.generateSalary = async (req, res) => {
//   const t = await bill_info.sequelize.transaction();
//   const tenantId = req.users?.tenantId;
//   const createdBy = req.users?.id;

//   try {
//     const employees = req.body;
//     if (!tenantId || !employees || employees.length === 0) {
//       return Helper.response(
//         false,
//         "Required fields are missing",
//         {},
//         res,
//         400
//       );
//     }

//     const skippedEmployees = [];
//     const billRecords = [];
//     const billInfoRecords = [];

//     for (const emp of employees) {
//       if (!emp.employeeId || !emp.components) continue;

//       // --- Check if salary already generated ---
//       const existing = await bill.findOne({
//         where: {
//           tenantId,
//           employeeId: emp.employeeId,
//           year: emp.year,
//           month: emp.month,
//         },
//         transaction: t,
//       });

//       if (existing) {
//         skippedEmployees.push({
//           employeeId: emp.employeeId,
//           year: emp.year,
//           month: emp.month,
//           reason: "Salary already generated",
//         });
//         continue;
//       }

//       // --- Update leave balance for current month ---
//       // await leave_balance.update(
//       //   {
//       //     usedLeaves: emp?.totalLeaveDays,
//       //     remainingLeaves:
//       //       emp?.allowedLeave - emp?.totalLeaveDays < 0
//       //         ? 0
//       //         : emp?.allowedLeave - emp?.totalLeaveDays,
//       //   },
//       //   {
//       //     where: { employeeId: emp?.employeeId, tenantId, year: emp?.year },
//       //     transaction: t,
//       //   }
//       // );
//       await leave_balance.update(
//         {
//           usedLeaves: emp?.totalLeaveDays,
//           remainingLeaves: 0,
//         },
//         {
//           where: { employeeId: emp?.employeeId, tenantId, year: emp?.year },
//           transaction: t,
//         }
//       );

//       // --- Create Salary Bill ---
//       const billData = {
//         tenantId,
//         employeeId: emp.employeeId,
//         year: Number(emp.year),
//         month: Number(emp.month),
//         bill_date: new Date(),
//         net_amount: emp.basePay,
//         full_days: emp?.fullDays || 0,
//         absent_days: emp?.absentDays || 0,
//         leave_taken: emp?.totalLeaveDays || 0,
//         allowed_leave: emp?.allowedLeave || 0,
//         half_day: emp?.halfDays || 0,
//         late_attendance: emp?.lateDays || 0,
//         bill_desc: "Auto-generated salary",
//         status: "active",
//         createdBy,
//       };

//       const billRow = await bill.create(billData, { transaction: t });

//       // --- Bill Info ---
//       emp.components.forEach((comp) => {
//         billInfoRecords.push({
//           tenantId,
//           employeeId: emp.employeeId,
//           year: Number(emp.year),
//           month: Number(emp.month),
//           bill_date: new Date(),
//           bill_id: billRow.bill_id,
//           pay_component_id: comp.id,
//           pay_code: comp.pay_code,
//           amount: comp.pay_amount,
//           status: "active",
//           createdBy,
//         });
//       });

//       billRecords.push(billRow);

//       const currentMonth = Number(emp.month);
//       const nextMonth = currentMonth == 12 ? 1 : currentMonth + 1;
//       const nextYear =
//         currentMonth == 12 ? Number(emp.year) + 1 : Number(emp.year);

//       // Check if next month's leave record already exists
//       const existingLeave = await leave_balance.findOne({
//         where: {
//           employeeId: emp.employeeId,
//           tenantId,
//           year: nextYear,
//           month: nextMonth,
//         },
//         transaction: t,
//       });

//       if (!existingLeave) {
//         const leavedata = await leave_balance.findOne({
//           where: {
//             month: emp.month,
//             year: emp.year,
//             employeeId: emp.employeeId,
//             tenantId,
//           },
//           transaction: t,
//         });

//         if (leavedata) {
//           const allowedLeave = Number(leavedata?.totalAssigned ?? 0); // total assigned last month
//           const totalLeaveDays = Number(emp?.totalLeaveDays ?? 0); // from salary data
//           let newRemaining = 0;

//           // Apply your condition logic
//           if (totalLeaveDays > allowedLeave) {
//             newRemaining = 0 + 2;
//           } else if (totalLeaveDays < allowedLeave) {
//             newRemaining = allowedLeave - totalLeaveDays + 2;
//           } else {
//             newRemaining = 0 + 2;
//           }

//           // Create next month's leave record
//           await leave_balance.create(
//             {
//               tenantId,
//               leaveTypeId: leavedata?.leaveTypeId,
//               employeeId: emp.employeeId,
//               year: nextYear,
//               month: nextMonth,
//               usedLeaves: 0,
//               remainingLeaves: newRemaining.toFixed(1),
//               totalAssigned: (allowedLeave + 2).toFixed(1),
//               carryForwarded:
//                 (newRemaining - 2).toFixed(1) < 0
//                   ? 0
//                   : (newRemaining - 2).toFixed(1),
//               prevremainingLeaves: allowedLeave,
//               prevusedLeaves: emp?.totalLeaveDays,
//               status: "active",
//               createdBy,
//             },
//             { transaction: t }
//           );
//         }
//       }
//     }

//     // --- Bulk insert bill info ---
//     if (billInfoRecords.length > 0) {
//       await bill_info.bulkCreate(billInfoRecords, { transaction: t });
//     }

//     await t.commit();
//     if (skippedEmployees.length == employees.length) {
//       return Helper.response(
//         false,
//         "Salary Already Generated",
//         {
//           generatedCount: billRecords.length,
//           skippedCount: skippedEmployees.length,
//           skippedEmployees,
//           generatedSalaries: billRecords,
//         },
//         res,
//         200
//       );
//     } else {
//       return Helper.response(
//         true,
//         "Salary generation completed and next month leave added",
//         {
//           generatedCount: billRecords.length,
//           skippedCount: skippedEmployees.length,
//           skippedEmployees,
//           generatedSalaries: billRecords,
//         },
//         res,
//         200
//       );
//     }
//   } catch (error) {
//     await t.rollback();
//     console.error("Error saving salaries:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

exports.generateSalary = async (req, res) => {
  const t = await bill_info.sequelize.transaction();
  const tenantId = req.users?.tenantId;
  const createdBy = req.users?.id;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    const employees = req.body;
    if (!tenantId || !employees || employees.length === 0) {
      return Helper.response(
        false,
        "Required fields are missing",
        {},
        res,
        400,
      );
    }

    const skippedEmployees = [];
    const billRecords = [];
    const billInfoRecords = [];

    for (const emp of employees) {
      if (!emp.employeeId || !emp.components) continue;

      // --- Check if salary already generated ---
      const existing = await bill.findOne({
        where: {
          tenantId,
          employeeId: emp.employeeId,
          year: emp.year,
          month: emp.month,
          branchId,
        },
        transaction: t,
      });

      if (existing) {
        skippedEmployees.push({
          employeeId: emp.employeeId,
          year: emp.year,
          month: emp.month,
          branchId,
          reason: "Salary already generated",
        });
        continue;
      }

      // --- Calculate leave used per leaveTypeId ---
      const leaveUsageMap = {};

      (emp.applysandwitchleave || []).forEach((lv) => {
        if (lv.status == "approved" && !lv.compOffId) {
          if (!leaveUsageMap[lv.leaveTypeId]) leaveUsageMap[lv.leaveTypeId] = 0;
          leaveUsageMap[lv.leaveTypeId] += Number(lv.days || 0);
        }
      });

      // --- Update leave balances only for used leave types ---
      for (const leaveTypeId of Object.keys(leaveUsageMap)) {
        const usedDays = leaveUsageMap[leaveTypeId];
        const balance = emp.leavebalance.find(
          (l) => l.leaveTypeId === leaveTypeId,
        );

        if (balance) {
          const prevUsed = Number(balance.usedLeaves || 0);
          const prevRemaining = Number(balance.remainingLeaves || 0);
          const newUsed = prevUsed + usedDays;
          const newRemaining = Math.max(prevRemaining - usedDays, 0);

          await leave_balance.update(
            {
              usedLeaves: newUsed.toFixed(1),
              remainingLeaves: 0,
            },
            {
              where: {
                employeeId: emp.employeeId,
                tenantId,
                branchId,
                year: emp.year,
                month: emp.month,
                leaveTypeId,
              },
              transaction: t,
            },
          );
        }
      }

      // --- Deduct comp-off balance for approved comp-off leaves ---
      const compOffUsageMap = {};
      (emp.applysandwitchleave || []).forEach((lv) => {
        if (lv.status === "approved" && lv.compOffId) {
          if (!compOffUsageMap[lv.compOffId]) compOffUsageMap[lv.compOffId] = 0;
          compOffUsageMap[lv.compOffId] += Number(lv.days || 0);
        }
      });

      for (const compOffId of Object.keys(compOffUsageMap)) {
        const daysUsed = compOffUsageMap[compOffId];
        const record = await comp_off.findOne({
          where: { id: compOffId, employeeId: emp.employeeId, tenantId },
          transaction: t,
        });
        if (record) {
          const newUsed = Number(record.usedDays || 0) + daysUsed;
          const newRemaining = Math.max(Number(record.remainingDays || 0) - daysUsed, 0);
          await comp_off.update(
            {
              usedDays: newUsed.toFixed(1),
              remainingDays: newRemaining.toFixed(1),
              status: newRemaining <= 0 ? "used" : "active",
            },
            { where: { id: compOffId }, transaction: t },
          );
        }
      }

      // --- Also update leave_balance for comp-off leave type ---
      const compOffLeaveTypeUsage = {};
      (emp.applysandwitchleave || []).forEach((lv) => {
        if (lv.status === "approved" && lv.compOffId && lv.leaveTypeId) {
          if (!compOffLeaveTypeUsage[lv.leaveTypeId]) compOffLeaveTypeUsage[lv.leaveTypeId] = 0;
          compOffLeaveTypeUsage[lv.leaveTypeId] += Number(lv.days || 0);
        }
      });

      for (const leaveTypeId of Object.keys(compOffLeaveTypeUsage)) {
        const daysUsed = compOffLeaveTypeUsage[leaveTypeId];
        const balance = (emp.leavebalance || []).find((l) => l.leaveTypeId === leaveTypeId);
        if (balance) {
          const prevUsed = Number(balance.usedLeaves || 0);
          const prevRemaining = Number(balance.remainingLeaves || 0);
          const newUsed = prevUsed + daysUsed;
          const newRemaining = Math.max(prevRemaining - daysUsed, 0);
          await leave_balance.update(
            {
              usedLeaves: newUsed.toFixed(1),
              remainingLeaves: newRemaining.toFixed(1),
            },
            {
              where: {
                employeeId: emp.employeeId,
                tenantId,
                branchId,
                year: emp.year,
                month: emp.month,
                leaveTypeId,
              },
              transaction: t,
            },
          );
        }
      }

      // --- Update current month leave usage ---
      // await leave_balance.update(
      //   {
      //     usedLeaves: emp?.totalLeaveDays,
      //     remainingLeaves: 0,
      //   },
      //   {
      //     where: { employeeId: emp?.employeeId, tenantId, year: emp?.year },
      //     transaction: t,
      //   }
      // );

      // --- Create Salary Bill ---
      const billData = {
        tenantId,
        employeeId: emp.employeeId,
        year: Number(emp.year),
        month: Number(emp.month),
        bill_date: new Date(),
        net_amount: emp.basePay,
        branchId,
        full_days: emp?.fullDays || 0,
        absent_days: emp?.absentDays || 0,
        leave_taken: emp?.totalLeaveDays || 0,
        allowed_leave: emp?.allowedLeave || 0,
        half_day: emp?.halfDays || 0,
        late_attendance: emp?.lateDays || 0,
        bill_desc: "Auto-generated salary",
        status: "active",
        createdBy,
      };

      const billRow = await bill.create(billData, { transaction: t });

      // --- Bill Info ---
      emp.components.forEach((comp) => {
        billInfoRecords.push({
          tenantId,
          branchId,
          employeeId: emp.employeeId,
          year: Number(emp.year),
          month: Number(emp.month),
          bill_date: new Date(),
          bill_id: billRow.bill_id,
          pay_component_id: comp.id,
          pay_code: comp.pay_code,
          amount: comp.pay_amount,
          status: "active",
          createdBy,
        });
      });

      billRecords.push(billRow);

      // --- Prepare next month ---
      const currentMonth = Number(emp.month);
      const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextYear =
        currentMonth === 12 ? Number(emp.year) + 1 : Number(emp.year);

      // --- Process next month leave for CL only ---

      // --- Create or update next month CL leave balance ---
      for (const leaveData of emp.leavebalance || []) {
        if (leaveData.leave_name?.toLowerCase() !== "cl") continue; // ✅ Only CL

        // Find all approved CL leaves from sandwich leave list
        const approvedCLLeaves = (emp.applysandwitchleave || []).filter(
          (lv) =>
            lv.leaveTypeId === leaveData.leaveTypeId &&
            lv.status?.toLowerCase() === "approved",
        );

        // Total CL used this month
        const usedCLDays = approvedCLLeaves.reduce(
          (sum, lv) => sum + Number(lv.days || 0),
          0,
        );

        // Current month remaining CL after usage
        const prevRemaining = Number(leaveData.remainingLeaves || 0);
        const newRemaining = Math.max(prevRemaining - usedCLDays, 0);
        const carryForward = newRemaining;

        // Calculate next month and year
        const currentMonth = Number(emp.month);
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear =
          currentMonth === 12 ? Number(emp.year) + 1 : Number(emp.year);

        // Policy: Add +2 CL each month
        const monthlyCLAddition = 2;

        // Find next month record
        const existingLeave = await leave_balance.findOne({
          where: {
            employeeId: emp.employeeId,
            tenantId,
            branchId,
            year: nextYear,
            month: nextMonth,
            leaveTypeId: leaveData.leaveTypeId,
          },
          transaction: t,
        });

        if (existingLeave) {
          // ✅ Update if already exists
          const prevTotal = Number(existingLeave.totalAssigned || 0);
          const prevRemain = Number(existingLeave.remainingLeaves || 0);

          const newTotalAssigned = prevTotal + monthlyCLAddition;
          const updatedRemaining =
            prevRemain + carryForward + monthlyCLAddition;

          await leave_balance.update(
            {
              totalAssigned: newTotalAssigned.toFixed(1),
              remainingLeaves: updatedRemaining.toFixed(1),
              carryForwarded: carryForward.toFixed(1),
              prevremainingLeaves: carryForward.toFixed(1),
              prevusedLeaves: usedCLDays.toFixed(1),
            },
            { where: { id: existingLeave.id }, transaction: t },
          );

          // console.log(
          //   `✅ Updated next month CL for ${emp.employeeName}: used=${usedCLDays}, carry=${carryForward}, +${monthlyCLAddition}`,
          // );
        } else {
          // ✅ Create new record for next month
          const newTotalAssigned =
            Number(leaveData.totalAssigned || 0) + monthlyCLAddition;
          const newRemaining = carryForward + monthlyCLAddition;

          await leave_balance.create(
            {
              tenantId,
              employeeId: emp.employeeId,
              leaveTypeId: leaveData.leaveTypeId,
              year: nextYear,
              month: nextMonth,
              branchId,
              totalAssigned: newTotalAssigned.toFixed(1),
              usedLeaves: 0,
              remainingLeaves: newRemaining.toFixed(1),
              carryForwarded: carryForward.toFixed(1),
              prevremainingLeaves: leaveData?.remainingLeaves,
              prevusedLeaves: usedCLDays.toFixed(1),
              status: "active",
              createdBy,
            },
            { transaction: t },
          );

          // console.log(
          //   `🆕 Created next month CL for ${emp.employeeName}: used=${usedCLDays}, carry=${carryForward}, +${monthlyCLAddition}`,
          // );
        }
      }

      // for (const leaveData of emp.leavebalance || []) {
      //   if (leaveData.leave_name?.toLowerCase() !== "cl") continue; // ✅ Only CL

      //   // Check if next month record already exists
      //   const existingLeave = await leave_balance.findOne({
      //     where: {
      //       employeeId: emp.employeeId,
      //       tenantId,
      //       year: nextYear,
      //       month: nextMonth,
      //       leaveTypeId: leaveData.leaveTypeId,
      //     },
      //     transaction: t,
      //   });

      //   if (!existingLeave) {
      //     const allowedLeave = Number(leaveData.totalAssigned ?? 0);
      //     const remaining = Number(leaveData.remainingLeaves ?? 0);

      //     // Policy: add +2 CL each month
      //     const newAssigned = allowedLeave + 2;
      //     const newRemaining = remaining + 2;

      //     await leave_balance.create(
      //       {
      //         tenantId,
      //         leaveTypeId: leaveData.leaveTypeId,
      //         employeeId: emp.employeeId,
      //         year: nextYear,
      //         month: nextMonth,
      //         totalAssigned: newAssigned.toFixed(1),
      //         usedLeaves: 0,
      //         remainingLeaves: newRemaining.toFixed(1),
      //         carryForwarded: remaining.toFixed(1),
      //         prevremainingLeaves: remaining.toFixed(1),
      //         // prevusedLeaves: leaveData.usedLeaves
      //         //   ? Number(leaveData.usedLeaves).toFixed(1)
      //         //   : 0,
      //         prevusedLeaves: emp?.applysandwitchleave?.days ??0,
      //         status: "active",
      //         createdBy,
      //       },
      //       { transaction: t }
      //     );

      //     console.log(
      //       `Added next month CL leave for ${emp.employeeName} (${emp.empCode})`
      //     );
      //   }
      // }
    }

    // --- Bulk insert bill info ---
    if (billInfoRecords.length > 0) {
      await bill_info.bulkCreate(billInfoRecords, { transaction: t });
    }

    await t.commit();
    if (skippedEmployees.length == employees.length) {
      return Helper.response(
        false,
        "Salary Already Generated",
        {
          generatedCount: billRecords.length,
          skippedCount: skippedEmployees.length,
          skippedEmployees,
          generatedSalaries: billRecords,
        },
        res,
        200,
      );
    } else {
      return Helper.response(
        true,
        "Salary generation completed and next month CL leave added",
        {
          generatedCount: billRecords.length,
          skippedCount: skippedEmployees.length,
          skippedEmployees,
          generatedSalaries: billRecords,
        },
        res,
        200,
      );
    }
  } catch (error) {
    await t.rollback();
    console.error("Error saving salaries:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};
const {  cast } = require("sequelize");
const salarydoc = require("../../models/salarydoc");
exports.GeneratedSalaryList = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const createdBy = req.users?.id;

  try {
    const { employeeId, month, year } = req.body;
    const branchId = req.users && req.users.branchId;
    if (!branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!tenantId || !employeeId || employeeId.length === 0) {
      return Helper.response(
        false,
        "Required fields are missing",
        {},
        res,
        400,
      );
    }
    const result=await bill.findOne({
  attributes: [
    [
      fn(
        "COALESCE",
        fn(
          "SUM",
          cast(col("net_amount"), "DECIMAL")
        ),
        0
      ),
      "totalSum"
    ]
  ],
  where: {
    employeeId: { [Op.in]: employeeId },
    month,
    year,
    branchId,
    tenantId,
    status: "active"
  },
  raw: true
});
const totalSum = Number(result?.totalSum) || 0;

// const total = Number(result?.dataValues?.total) || 0;
//   const totalSum = await bill.findOne('net_amount', {
//   where: {
//     employeeId: { [Op.in]: employeeId },
//     month,
//     year,
//     branchId,
//     tenantId,
//     status: "active"
//   }
// });

const finalTotal = parseFloat(totalSum) || 0;

console.log("Total Salary:", finalTotal);


    const GetSalaryList = await bill.findAll({
      where: {
        employeeId: { [Op.in]: employeeId },
        month,
        branchId,
        year,
        tenantId,
        status: "active",
      },
      order: [["createdAt", "desc"]],
      raw: true,
    });

    if (GetSalaryList.length == 0) {
      return Helper.response(false, "No Data Found", {}, res, 200);
    }
    // Get start and end date of the month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    let data = await Promise.all(
      GetSalaryList.map(async (item) => {
        const personaldetail = await empPersonal.findOne({
          where: {
            id: item?.employeeId,
            branchId,
            status: "active",
          },
        });
        let designation, department;
        if (personaldetail?.designationId) {
          designation = await Designation.findOne({
            where: {
              id: personaldetail?.designationId,
              branchId,
              status: "active",
            },
          });
        }
        if (personaldetail?.departmentId) {
          department = await Departments.findOne({
            where: {
              id: personaldetail?.departmentId,
              branchId,
              status: "active",
            },
          });
        }

        let bankDetails = await bankAccnt.findOne({
          where: {
            employeeId: personaldetail?.id,
            tenantId,
            branchId,
            status: "active",
          },
        });

        const Ctc = await Basic.findOne({
          where: {
            employeeId: item?.employeeId,
            tenantId,
            branchId,
            status: "active",
          },
        });
        const LeaveTaken = await leave_application.findAll({
          raw: true,
          where: {
            employeeId: item?.employeeId,
            tenantId,
            branchId,
            [Op.or]: [
              {
                fromDate: {
                  [Op.between]: [startOfMonth, endOfMonth],
                },
              },
              {
                toDate: {
                  [Op.between]: [startOfMonth, endOfMonth],
                },
              },
              {
                [Op.and]: [
                  { fromDate: { [Op.lte]: startOfMonth } },
                  { toDate: { [Op.gte]: endOfMonth } },
                ],
              },
            ],
          },
        });

        const leaveData = LeaveTaken || [];

        let fullDays = 0;
        let halfDays = 0;

        leaveData.forEach((leave) => {
          if (leave.days) {
            const days = Number(leave.days);
            if (leave.days == 0.5) {
              halfDays += 1; // store 0.5 day as 1 half day
              fullDays += Math.floor(days); // remaining goes to full days
            } else {
              fullDays += days;
            }
          }
        });

        // let prevMonth = month - 1;
        // let prevYear = year;

        // // Handle January → previous December
        // if (prevMonth == 0) {
        //   prevMonth = 12;
        //   prevYear = year - 1;
        // }

        const leaveBalance = await leave_balance.findOne({
          where: {
            month: month,
            year: year,
            branchId,
            employeeId: item?.employeeId,
            tenantId,
          },
        });

        // const Empdesignation=await Designation.findOne({
        //   where:{
        //     tenantId,
        //     employeeId,
        //     status:'active'
        //   }
        // })
        return {
          ...item,
          employeeName: `${personaldetail?.firstName} ${personaldetail?.lastName}`,
          empCode: personaldetail?.empCode,
          email: personaldetail?.email,
          joiningDate: personaldetail?.joiningDate,
          phone: personaldetail?.mobile,
          designation: designation?.name,
          department: department?.name,
          bankAccount: bankDetails?.accountNumber,
          ifscCode: bankDetails?.ifscCode,
          net_amount: Math.round(item?.net_amount).toFixed(0) ?? 0,
          TotalSalary: Math.round(Ctc?.finalCTC / 12).toFixed(0) ?? 0,
          leaveTaken: fullDays ?? 0,
          halfDays: halfDays ?? 0,
          allowedLeave:
            Number(leaveBalance?.remainingLeaves) +
            Number(leaveBalance?.usedLeaves),
          // 'designation':Empdesignation?.name
        };
      }),
    );

   data = data.sort((a, b) =>
  a.employeeName.localeCompare(b.employeeName)
);


    return Helper.response(true, "Salary generation completed",  {
    salaryList: data,
    totalAmount: finalTotal
  }, res, 200);
  } catch (error) {
    console.error("Error saving salaries:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

// exports.revertSalary = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const createdBy = req.users?.id;

//   const t = await bill.sequelize.transaction();

//   try {
//     let { employeeId, month, year, id, bill_id } = req.body;

//     if (!tenantId || !employeeId || !month || !year || !id || !bill_id) {
//       return Helper.response(
//         false,
//         "Required fields are missing",
//         {},
//         res,
//         400
//       );
//     }

//     await bill.destroy({
//       where: { id },
//       transaction: t,
//     });

//     await bill_info.destroy({
//       where: { bill_id, month, year, employeeId },
//       transaction: t,
//     });

//     let nextMonth = parseInt(month);
//     let nextYear = parseInt(year);

//     if (nextMonth === 12) {
//       nextMonth = 1;
//       nextYear += 1;
//     } else {
//       nextMonth += 1;
//     }

//     const nextMonthLeave = await leave_balance.findOne({
//       where: {
//         month: nextMonth,
//         year: nextYear,
//         employeeId,
//         tenantId,
//       },
//       transaction: t,
//     });

//     if (nextMonthLeave) {
//       await leave_balance.destroy({
//         where: { id: nextMonthLeave.id },
//         transaction: t,
//       });
//     }

//     // 4️⃣ Restore current month's leave balance (before salary generation)
//     const currentMonthLeave = await leave_balance.findOne({
//       where: {
//         month,
//         year,
//         employeeId,
//         tenantId,
//       },
//       transaction: t,
//     });

//     if (currentMonthLeave) {
//       // revert to previous leave values
//       await leave_balance.update(
//         {
//           prevusedLeaves: nextMonthLeave.prevusedLeaves || 0,
//           remainingLeaves: nextMonthLeave.prevremainingLeaves || 0,
//           usedLeaves:0
//         },
//         {
//           where: {
//             month,
//             year,
//             tenantId,
//             employeeId,
//           },
//           transaction: t,
//         }
//       );
//     }

//     await t.commit();
//     return Helper.response(
//       true,
//       "Salary and leave reverted successfully",
//       {},
//       res,
//       200
//     );
//   } catch (error) {
//     if (!t.finished) await t.rollback();
//     console.error("Error reverting salary:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

// exports.generateSalary = async (req, res) => {
//   const t = await bill_info.sequelize.transaction();
//   const tenantId = req.users?.tenantId;
//   const createdBy = req.users?.id;

//   try {
//     const employees = req.body;

//     if (!tenantId || !employees || employees.length === 0) {
//       return Helper.response(
//         false,
//         "Required fields are missing",
//         {},
//         res,
//         400
//       );
//     }

//     const records = [];
//     const skippedEmployees = [];

//     for (const emp of employees) {
//       if (!emp.employeeId || !emp.components) continue;

//       const existing = await bill_info.findOne({
//         where: {
//           tenantId,
//           employeeId: emp.employeeId,
//           year: Number(emp.year),
//           month: Number(emp.month),
//         },
//         transaction: t,
//       });

//       if (existing) {
//         skippedEmployees.push({
//           employeeId: emp.employeeId,
//           year: emp.year,
//           month: emp.month,
//           reason: "Salary already generated",
//         });
//         continue;
//       }

//       emp.components.forEach((comp) => {
//         records.push({
//           tenantId,
//           employeeId: emp.employeeId,
//           year: Number(emp.year),
//           month: Number(emp.month),
//           bill_date: new Date(),

//           pay_component_id: comp.id,
//           pay_code: comp.pay_code,
//           amount: comp.pay_amount,
//           net_amount: parseInt(comp.finalAmount),

//           full_days: emp?.fullDays || 0,
//           absent_days: emp?.absentDays || 0,
//           hours_worked: emp?.hoursWorked || null,

//           bill_desc: "Auto-generated salary",
//           status: "active",
//           createdBy,
//         });
//       });
//     }

//     if (records.length === 0) {
//       await t.rollback();

//       return Helper.response(
//         false,
//         "All selected employees already have salary generated",
//         skippedEmployees,
//         res,
//         400
//       );
//     }

//         const billcreate = await bill.bulkCreate(records, { transaction: t });
//     const bills = await bill_info.bulkCreate(records, { transaction: t });
//     await t.commit();

//     const data = {
//       generatedCount: bills.length,
//       skippedCount: skippedEmployees.length,
//       skippedEmployees,
//       generatedSalaries: bills,
//     };
//     return Helper.response(true, "Salary generation completed", data, res, 200);
//   } catch (error) {
//     await t.rollback();
//     console.error("Error saving salaries:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

// exports.salarySetup = async (req, res) => {
//   try {
//     const { employeeId, CTC } = req.body;
//     const tenantId = req.users && req.users.tenantId;

//     if (!tenantId || !employeeId || !CTC) {
//       return Helper.response(false, "Required fields are missing", {}, res, 400);
//     }

//     const salaryComponents = await MasterComponents.findAll({
//       where: { tenantId, status: "active" }
//     });

//     if (!salaryComponents || salaryComponents.length === 0) {
//       return Helper.response(false, "Create Salary Component First", {}, res, 400);
//     }

//     const existingCTC = await Basic.findOne({
//       where: {
//         tenantId,
//         employeeId,
//         dependent: "CTC",
//         status: "active"
//       },
//     });

//     if (existingCTC) {
//       return Helper.response(false, "CTC Component Already Exists", {}, res, 400);
//     }

//     // 🔹 First calculate Basic
//     let basicAmount = 0;
//     let totalAmount = 0
//     const basicComp = salaryComponents.find(c => c.value_type === "basic_dependent");

//     if (basicComp) {
//       basicAmount = CTC * (basicComp.value / 100);
//     }

//     const records = salaryComponents.map((comp) => {
//       let amount = 0;
//       if (comp.component_name.toLowerCase() === "basic") {

//         if (comp.value_type === "percentage" || comp.value_type === "basic_dependent") {
//           amount = CTC * (comp.value / 100);
//         } else {
//           amount = Number(comp.amount);
//         }
//       }

//       else if (comp.component_type === "payable") {
//         if (comp.value_type === "percentage") {
//           amount = basicAmount * (comp.value / 100);
//         } else if (comp.value_type === "basic_dependent") {
//           amount = basicAmount * (comp.value / 100);
//         } else {
//           amount = Number(comp.amount);
//         }
//       }

//       else if (comp.component_type === "deductible") {
//         if (comp.value_type === "percentage") {
//           amount = (basicAmount * (comp.value / 100));
//         } else if (comp.value_type === "basic_dependent") {
//           amount = (basicAmount * (comp.value / 100));
//         } else {
//           amount = Number(comp.amount);
//         }
//       }
//       totalAmount = +amount

//       return {
//         employeeId,
//         tenantId,
//         componentId: comp.id,
//         component_name: comp.component_name,
//         component_type: comp.component_type,
//         value_type: comp.value_type,
//         value: comp.value,
//         calculated_amount: amount,
//         dependent_component_id: comp.dependent_component,
//         dependent: "CTC",
//         status: "active",
//       };
//     });
//     console.log(totalAmount)

//     return Helper.response(true, "Salary Components Created Successfully", records, res, 200);
//   } catch (error) {
//     console.error("Error in salary setup:", error);
//     return Helper.response(false, "Internal Server Error", [], res, 500);
//   }
// };

exports.revertSalary = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const createdBy = req.users?.id;
  const t = await bill.sequelize.transaction();
  const branchId = req.users && req.users.branchId;
  if (!branchId) {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    let { employeeId, month, year, id, bill_id } = req.body;

    if (!tenantId || !employeeId || !month || !year || !id || !bill_id) {
      return Helper.response(
        false,
        "Required fields are missing",
        {},
        res,
        400,
      );
    }

    // 1️⃣ Delete salary bill and its bill info
    await bill.destroy({ where: { id }, transaction: t });
    await bill_info.destroy({
      where: { bill_id, month, year, employeeId },
      transaction: t,
    });

    // 2️⃣ Determine next month (for removing generated CL)
    let nextMonth = parseInt(month);
    let nextYear = parseInt(year);

    if (nextMonth === 12) {
      nextMonth = 1;
      nextYear += 1;
    } else {
      nextMonth += 1;
    }

    // 3️⃣ Fetch all next month leave records for this employee
    const nextMonthLeaves = await leave_balance.findAll({
      where: {
        month: nextMonth,
        year: nextYear,
        employeeId,
        tenantId,
        branchId,
      },
      transaction: t,
    });

    // 4️⃣ For each leaveType, revert previous month’s record and remove next month’s record
    for (const nextLeave of nextMonthLeaves) {
      const { leaveTypeId, prevusedLeaves, prevremainingLeaves } = nextLeave;

      // Delete next month’s leave entry
      await leave_balance.destroy({
        where: { id: nextLeave.id, branchId },
        transaction: t,
      });

      // Revert previous month leave balance
      const prevLeave = await leave_balance.findOne({
        where: {
          month,
          year,
          tenantId,
          employeeId,
          leaveTypeId,
          branchId,
        },
        transaction: t,
      });

      if (prevLeave) {
        await leave_balance.update(
          {
            usedLeaves: Number(prevusedLeaves || 0),
            remainingLeaves: Number(prevremainingLeaves || 0),
            usedLeaves: 0,
          },
          {
            where: {
              id: prevLeave.id,
              branchId,
            },
            transaction: t,
          },
        );
      }
    }

    await t.commit();

    return Helper.response(
      true,
      "Salary and related leave balances reverted successfully (by leaveTypeId)",
      {},
      res,
      200,
    );
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error("Error reverting salary:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.salarySetup = async (req, res) => {
  try {
    const { employeeId, CTC, startDate } = req.body;
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;

    if (!branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!tenantId || !employeeId || !CTC || !startDate) {
      return Helper.response(
        false,
        "Required fields are missing",
        {},
        res,
        400,
      );
    }
    const checkBasic = await Basic.findOne({
      where: {
        employeeId,
        tenantId,
        branchId,
        status: "active",
      },
    });
    // if (checkBasic) {
    //   return Helper.response(
    //     false,
    //     "Data is already present in this range",
    //     {},
    //     res,
    //     400
    //   );
    // }

    const salaryComponents = await MasterComponents.findAll({
      where: {
        tenantId,
        branchId,
        status: "active",
        value_type: {
          [Op.ne]: "is_special", // not equal to 'is_special'
        },
      },
      raw: true,
    });

    if (!salaryComponents || salaryComponents.length === 0) {
      return Helper.response(
        false,
        "Create Salary Component First",
        {},
        res,
        400,
      );
    }

    let gross = 0;
    const computed = {};
    // const checkSalary = await Basic.findOne({
    //   where: {
    //     employeeId,
    //     tenantId,
    //     status: "active",
    //   },
    // });
    // if (checkSalary) {
    //   return Helper.response(
    //     false,
    //     "Salary Component Already Genrated",
    //     {},
    //     res,
    //     400
    //   );
    // }

    salaryComponents.forEach((comp) => {
      if (!comp.dependent_component || comp.value_type == "basic_dependent") {
        let amount = 0;

        if (comp.component_name.toLowerCase() == "basic") {
          amount = (CTC * Number(comp.value)) / 100;
        } else if (  comp.value_type === "percentage" && !comp.dependent_component ) {
          amount = (CTC * Number(comp.value)) / 100;
        } else if (comp.value_type === "fixed" && comp.amount) {
          amount = Number(comp.amount);
        }

        computed[comp.id] = amount;
      }
    });

    const resolveAmount = (comp) => {
      let amount = 0;
      if (comp.value_type === "percentage") {
        if (Array.isArray(comp.dependent_component)) {
          const baseSum = comp.dependent_component.reduce(
            (sum, depId) => sum + (computed[depId] || 0),
            0,
          );
          amount = (baseSum * Number(comp.value)) / 100;
        } else {
          const base = computed[comp.dependent_component] || CTC;
          amount = (base * Number(comp.value)) / 100;
        }
      } else if (comp.value_type === "fixed" && comp.amount) {
        amount = Number(comp.amount);
      }
      return amount;
    };

    //  Second pass: calculate dependents
    salaryComponents.forEach((comp) => {
      if (!computed[comp.id]) {
        computed[comp.id] = resolveAmount(comp);
      }
    });

    //  Build records & calculate gross
    let employerContribution = 0;
    const records = salaryComponents.map((comp) => {
      let amount = computed[comp.id] || 0;

      if (
        comp.component_name.toLowerCase() === "Special Allowance" ||
        comp.component_name == "ESIC" ||
        comp.component_name == "ESIC Employer"
      ) {
        // Skip misc here, will calculate later
        amount = 0;
      }

      if (comp.component_type === "payable") gross += amount;
      // Add employer contributions (PF Employer, ESIC Employer, etc.)
      if (comp.component_name.toLowerCase().includes("employer")) {
        employerContribution += amount;
      }

      return {
        employeeId,
        tenantId,
        componentId: comp.id,
        component_name: comp.component_name,
        component_type: comp.component_type,
        value_type: comp.value_type,
        value: comp.value,
        calculated_amount: Number(amount.toFixed(2)),
        dependent_component_id: comp.dependent_component,
        dependent: "CTC",
        status: "active",
      };
    });
    // 🔹 Miscellaneous = CTC - Gross
    const miscAmount = CTC - Math.round(gross);

    // find Miscellaneous in records
    const miscIndex = records.findIndex(
      (r) => r.component_name == "Special Allowance",
    );

    if (miscIndex !== -1) {
      // update existing misc record
      records[miscIndex].calculated_amount = miscAmount > 0 ? miscAmount : 0;
    } else {
      // fallback: push a new one if not present in master
      records.push({
        employeeId,
        tenantId,
        component_name: "Special Allowance",
        component_type: "payable",
        value_type: "percentage",
        value: 111,
        calculated_amount: miscAmount ? Number(miscAmount.toFixed(2)) : 0,
        dependent: "CTC",
        componentId: Helper.generateUUID(),
        status: "active",
      });
    }

    gross += miscAmount;
    //  ESIC (Employee + Employer)
    const esicEmployee = gross * 0.0075; // 0.75%
    const esicEmployer = gross * 0.0325; // 3.25%
    employerContribution += esicEmployer;
    employerContribution = Math.round(employerContribution);
    records.push(
      {
        employeeId,
        tenantId,
        component_name: "ESIC (Employee)",
        component_type: "deductible",
        value_type: "fixed",
        calculated_amount: Number(esicEmployee.toFixed(2)),
        status: "active",
        value: 0.75,
        componentId: Helper.generateUUID(),
      },
      {
        employeeId,
        tenantId,
        component_name: "ESIC (Employer)",
        component_type: "deductible",
        value_type: "employer",
        calculated_amount: Number(esicEmployer.toFixed(2)),
        status: "active",
        value: 3.25,
        componentId: Helper.generateUUID(),
      },
    );

    //  Total deductions
    const totalDeductions = Math.round(
      records
        .filter(
          (r) =>
            r.component_type === "deductible" &&
            !r.component_name.toLowerCase().includes("employer"),
        )
        .reduce((sum, r) => sum + r.calculated_amount, 0),
    );

    gross = Math.round(gross);
    //  Net Salary
    const netPayableSalary = gross - totalDeductions;
    const FinalDeduction = totalDeductions + employerContribution;
    let netCTC = CTC + employerContribution;
    const FinalRecord = {
      gross,
      totalDeductions,
      netPayableSalary,
      netCTC,
      FinalDeduction,
      employerContribution,
    };

    return Helper.response(
      true,
      "Salary Components Created Successfully",
      { records, FinalRecord },
      res,
      200,
    );
  } catch (error) {
    console.error("Error in salary setup:", error);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

exports.updateSalarySetup = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const data = req.body;
    const bodyData = data.data;
    const tenantId = req.users?.tenantId;
    const employeeId = data.employeeId;
    const { empType } = req.body;
    const branchId = req.users && req.users.branchId;
    if (!branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!tenantId || !employeeId || !data.CTC) {
      await transaction.rollback();
      return Helper.response(
        false,
        "Required fields are missing",
        {},
        res,
        400,
      );
    }

    const empTypedetails = await EmploymentType.findOne({
      where: { id: empType, branchId },
      transaction,
    });

    const salaryComponents = await MasterComponents.findAll({
      where: { tenantId, branchId, status: "active" },
      raw: true,
      transaction,
    });

    if (!salaryComponents || salaryComponents.length === 0) {
      await transaction.rollback();
      return Helper.response(
        false,
        "Create Salary Component First",
        {},
        res,
        400,
      );
    }

    const existingDateCTC = await Basic.findOne({
      where: {
        tenantId,
        employeeId,
        branchId,
        startDate: data.startDate,
        status: "active",
      },
      transaction,
    });
    if (existingDateCTC) {
      await transaction.rollback();
      return Helper.response(
        false,
        `Data for the same date has already been created.`,
        {},
        res,
        400,
      );
    }
    const existingCTC = await Basic.findOne({
      where: {
        tenantId,
        employeeId,
        branchId,
        status: "active",
      },
      transaction,
    });

    // If existing CTC found → close old records
    if (existingCTC) {
      const endDate = new Date(data.startDate);
      endDate.setDate(endDate.getDate() - 1);

      await Basic.update(
        { endDate, status: "inactive" },
        {
          where: { employeeId, branchId, tenantId, status: "active" },
          transaction,
        },
      );

      await allowance.update(
        { endDate, status: "inactive" },
        {
          where: {
            employeeId,
            tenantId,
            branchId,
            status: "active",
            type: { [Op.ne]: "is_special" },
          },
          transaction,
        },
      );

      await deductionS.update(
        { endDate, status: "inactive" },
        {
          where: { employeeId, tenantId, branchId, status: "active" },
          transaction,
        },
      );
    }

    let allowanceRecords = [];
    let deductionRecords = [];
    let basicRecords = [];

    for (const item of bodyData) {
      if (
        item.value_type === "basic_dependent" &&
        item.component_type === "payable"
      ) {
        basicRecords.push({
          employeeId,
          tenantId,
          branchId,
          componentId: item.componentId,
          name: item.component_name,
          typeValue: item.value,
          type: item.value_type,
          amount:
            empTypedetails.duration_type === "half_paid"
              ? (data.CTC / 2).toFixed(0)
              : data.CTC,
          finalAmount:
            empTypedetails.duration_type === "half_paid"
              ? (item.calculated_amount / 2).toFixed(0)
              : item.calculated_amount,
          finalCTC: req.body?.FinalCTC,
          createdBy: req.users.id,
          dependent: "CTC",
          startDate: data.startDate,
          status: item.status,
        });
      }

      if (
        item.component_type === "payable" &&
        item.value_type !== "basic_dependent"
      ) {
        allowanceRecords.push({
          employeeId,
          tenantId,
          branchId,
          componentId: item.componentId,
          name: item.component_name,
          type: item.value_type,
          typeValue: item.value,
          finalAmount:
            empTypedetails.duration_type === "half_paid"
              ? (item.calculated_amount / 2).toFixed(0)
              : item.calculated_amount,
          status: item.status,
          startDate: data.startDate,
          dependent: data.dependent_component_id,
          createdBy: req.users.id,
        });
      }

      if (
        item.component_type === "deductible" &&
        item.value_type !== "basic_dependent"
      ) {
        deductionRecords.push({
          employeeId,
          tenantId,
          branchId,
          componentId: item.componentId,
          name: item.component_name,
          type: item.value_type,
          typeValue: item.value,
          finalAmount:
            empTypedetails.duration_type === "half_paid"
              ? (item.calculated_amount / 2).toFixed(0)
              : item.calculated_amount,
          status: item.status,
          startDate: data.startDate,
          dependent: data.dependent_component_id,
          createdBy: req.users.id,
        });
      }
    }

    const totalBasics = basicRecords.reduce(
      (sum, r) => sum + Number(r.finalAmount),
      0,
    );
    const totalAllowances = allowanceRecords.reduce(
      (sum, r) => sum + Number(r.finalAmount),
      0,
    );
    const totalDeductions = deductionRecords.reduce(
      (sum, r) => sum + Number(r.finalAmount),
      0,
    );

    const calculatedCTC = totalBasics + totalAllowances;

    // Uncomment if you want strict validation
    // if (calculatedCTC !== Number(data.CTC)) {
    //   await transaction.rollback();
    //   return Helper.response(
    //     false,
    //     `CTC mismatch: Expected ${data.CTC}, got ${calculatedCTC}`,
    //     {},
    //     res,
    //     400
    //   );
    // }

    if (basicRecords.length > 0)
      await Basic.bulkCreate(basicRecords, { transaction });
    if (allowanceRecords.length > 0)
      await allowance.bulkCreate(allowanceRecords, { transaction });
    if (deductionRecords.length > 0)
      await deductionS.bulkCreate(deductionRecords, { transaction });

    await transaction.commit();

    return Helper.response(
      true,
      "Salary Created Successfully",
      {
        basics: basicRecords,
        allowances: allowanceRecords,
        deductions: deductionRecords,
        totalCTC: calculatedCTC,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("Error in salary setup:", error);
    await transaction.rollback();
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.getActiveSalaryComponents = async (req, res) => {
  try {
    const tenantId = req.users && req.users.tenantId;
    const { employeeId, status } = req.body;
    const branchId = req.users && req.users.branchId;
    if (!branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!tenantId || !employeeId) {
      return Helper.response(
        false,
        "TenantId and employeeId required",
        [],
        res,
        400,
      );
    }

    const basics = await Basic.findAll({
      where: { tenantId, employeeId, branchId, status },
      raw: true,
    });

    const allowances = await allowance.findAll({
      where: { tenantId, employeeId, branchId, status },
    });

    const deductions = await deductionS.findAll({
      where: {
        tenantId,
        employeeId,
        branchId,
        type: {
          [Op.ne]: "deduction",
        },
        status,
      },
    });

    if (
      basics.length === 0 &&
      allowances.length == 0 &&
      deductions.length == 0
    ) {
      return Helper.response(
        false,
        "No active salary components found",
        [],
        res,
        404,
      );
    }

    return Helper.response(
      true,
      "Active salary components",
      { basics, allowances, deductions },
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching salary components:", error);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};
exports.getBillDetails = async (req, res) => {
  try {
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;
    if (!branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const { bill_id, year, month } = req.body;

    if (!tenantId || !bill_id) {
      return Helper.response(
        false,
        "TenantId and bill_id are required",
        [],
        res,
        400,
      );
    }

    if (!year || !month) {
      return Helper.response(
        false,
        "Year and Month are required",
        [],
        res,
        400,
      );
    }

    // Get salary records from bill_info
    const getSalaryData = await bill_info.findAll({
      where: {
        bill_id,
        month,
        year,
        tenantId,
        branchId,
      },
      raw: true,
      order: [["createdAt", "desc"]],
    });

    const data = await Promise.all(
      getSalaryData.map(async (item) => {
        const basics = await Basic.findOne({
          where: { tenantId, branchId, id: item.pay_component_id },
          raw: true,
        });

        const allowances = await allowance.findOne({
          where: { tenantId, branchId, id: item.pay_component_id },
          raw: true,
        });

        const deductions = await deductionS.findOne({
          where: { tenantId, branchId, id: item.pay_component_id },
          raw: true,
        });

        return {
          ...item,
          name:
            item.pay_code == "PAY"
              ? basics
                ? basics?.name
                : allowances?.name
              : deductions?.name,
          finalAmount: item.amount,
        };
      }),
    );

    if (!data.length) {
      return Helper.response(
        false,
        "No active salary components found",
        [],
        res,
        404,
      );
    }

    return Helper.response(true, "Active salary components", data, res, 200);
  } catch (error) {
    console.error("Error fetching salary components:", error);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};


exports.employeeMonthlyLeaveAttendanceDetails = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const shift_name = req.body?.shift_name;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const { employeeId, month, year } = req.body;

    if (!employeeId || !month || !year) {
      return Helper.response(
        false,
        "employeeId, month and year required",
        {},
        res,
        400,
      );
    }

    const startDate = moment(`${year}-${month}-01`, "YYYY-MM-DD");
    const endDate = startDate.clone().endOf("month");

    // =============================
    // FETCH DATA
    // =============================

    const attendanceList = await attendance.findAll({
      where: {
        employeeId,
        tenantId,
        branchId,
        check_in_time: {
          [Op.between]: [
            startDate.format("YYYY-MM-DD 00:00:00"),
            endDate.format("YYYY-MM-DD 23:59:59"),
          ],
        },
      },
      raw: true,
    });

    const leaveList = await leave_application.findAll({
      where: {
        employeeId,
        tenantId,
        branchId,
        status: { [Op.ne]: "self_declined" },
        [Op.and]: [
          where(fn("EXTRACT", literal('MONTH FROM "fromDate"')), month),
          where(fn("EXTRACT", literal('YEAR FROM "fromDate"')), year),
        ],
        // [Op.and]: [
        //   where(fn("EXTRACT", literal('MONTH FROM "toDate"')), month),
        //   where(fn("EXTRACT", literal('YEAR FROM "toDate"')), year),
        // ],
      },
      raw: true,
    });

    const holidayList = await holiday.findAll({
      where: {
        tenantId,
        branchId,
        [Op.and]: [
          where(fn("EXTRACT", literal('MONTH FROM "date"')), month),
          where(fn("EXTRACT", literal('YEAR FROM "date"')), year),
        ],
      },
      raw: true,
    });

    const shiftMap = await Shift.findAll({
      where: { tenantId, shift: shift_name, branchId },
      attributes: ["day_of_week", "is_week_off", "startTime", "endTime"],
      raw: true,
    });

    const AttendanceSettings = await attendanceSetting.findOne({
      where: { tenantId, branchId },
      raw: true,
    });

    // =============================
    // PREPARE MAPS (FAST ACCESS)
    // =============================

    const attendanceMap = {};
    attendanceList.forEach((a) => {
      const date = moment(a.check_in_time).format("YYYY-MM-DD");
      attendanceMap[date] = a;
    });

    const holidayMap = {};
    holidayList.forEach((h) => {
      holidayMap[moment(h.date).format("YYYY-MM-DD")] = h;
    });

    const leaveMap = {};

    leaveList.forEach((l) => {
      // fallback logic
      let start = l.fromDate ? moment(l.fromDate) : null;
      let end = l.toDate ? moment(l.toDate) : null;

      // if both missing skip
      if (!start && !end) return;

      // if only one exists use same date
      if (!start && end) start = end.clone();
      if (start && !end) end = start.clone();

      // validate moment objects
      if (!start.isValid() || !end.isValid()) return;

      // loop through range
      while (start.isSameOrBefore(end)) {
        leaveMap[start.format("YYYY-MM-DD")] = l;

        start.add(1, "day");
      }
    });

    shiftMap.forEach((s) => {
      s.day_num =
        typeof s.day_of_week == "string"
          ? dayMap[s.day_of_week]
          : s.day_of_week;
    });

    const weekOffDays = shiftMap
      .filter((s) => s.is_week_off)
      .map((s) => s.day_num);

    // =============================
    // MAIN LOOP
    // =============================

    let attendanceData = [];

    const totalDays = endDate.date();

    for (let i = 1; i <= totalDays; i++) {
      const currentDate = moment(`${year}-${month}-${i}`, "YYYY-MM-DD");
      const dateStr = currentDate.format("YYYY-MM-DD");
      const dayNum = currentDate.day();

      const entry = attendanceMap[dateStr];
      const holidayData = holidayMap[dateStr];
      const leaveData = leaveMap[dateStr];

      let status = "";

      // =============================
      // NO ATTENDANCE
      // =============================

      if (!entry) {
        if (holidayData) {
          status = "Holiday";
        } else if (leaveData) {
          if (leaveData.duration_type == "first_half") {
            status = "First Half";
          } else if (leaveData.duration_type == "second_half") {
            status = "Second Half";
          } else {
            status = "On Leave";
          }
        } else if (weekOffDays.includes(dayNum)) {
          status = "Week Off";
        } else {
          status = "Absent";
        }
      }

      // =============================
      // ATTENDANCE EXISTS
      // =============================
      else {
        const shiftForDay = shiftMap.find((s) => s.day_num == dayNum);

        if (!shiftForDay) {
          status = "Absent";
        } else {
          let shiftStart = moment(
            `${dateStr} ${shiftForDay.startTime}`,
            "YYYY-MM-DD HH:mm:ss",
          );
          let shiftEnd = moment(
            `${dateStr} ${shiftForDay.endTime}`,
            "YYYY-MM-DD HH:mm:ss",
          );

          if (shiftEnd.isBefore(shiftStart)) {
            shiftEnd.add(1, "day");
          }

          const checkIn = moment(entry.check_in_time);
          const checkOut = moment(entry.check_out_time);

          const allowedTime = shiftStart
            .clone()
            .add(AttendanceSettings?.graceMinutes || 0, "minutes");

          if (checkIn.isAfter(allowedTime)) {
            const minutesLate = checkIn.diff(allowedTime, "minutes");

            if (leaveData) {
              if (leaveData.duration_type == "first_half") {
                status = "First Half";
              } else if (leaveData.duration_type == "second_half") {
                status = "Second Half";
              } else {
                status = "On Leave";
              }
            } else {
              status =
                minutesLate >= 60
                  ? `Late by ${Math.floor(minutesLate / 60)} hr ${minutesLate % 60} min`
                  : `Late by ${minutesLate} min`;
            }
          } else if (checkOut.isBefore(shiftEnd)) {
            status = "Half Day";
          } else {
            status = "On Time";
          }
        }
      }

      attendanceData.push({
        id:entry?.id,
        employeeId:employeeId,
        branchId:branchId,
        tenantId:tenantId,
        date: dateStr,
        checkIn: entry?.check_in_time
          ? moment(entry.check_in_time).format("HH:mm")
          : null,
        checkOut: entry?.check_out_time
          ? moment(entry.check_out_time).format("HH:mm")
          : null,
        status,
        day: currentDate.format("dddd"),
      });
    }

    // =============================
    // FORMAT LEAVE LIST
    // =============================

    const leaveMasterList = await leaveMaster.findAll({ raw: true });
    const leaveMasterMap = {};
    leaveMasterList.forEach((l) => {
      leaveMasterMap[l.id] = l.leaveName;
    });

    const formattedLeaveList = leaveList.map((item) => ({
      ...item,
      leave_type_name: leaveMasterMap[item.leaveTypeId] ?? "NA",
      duration_type_name:
        item.duration_type == "full"
          ? "Full Day"
          : item.duration_type == "first_half"
            ? "First Half"
            : "Second Half",
      to_duration_type_name:
        item.to_duration_type == "full"
          ? "Full Day"
          : item.to_duration_type == "first_half"
            ? "First Half"
            : "Second Half",
    }));

    // =============================
    // RESPONSE
    // =============================

    return Helper.response(
      true,
      "Employee monthly details fetched",
      {
        attendanceList: attendanceData,
        leaveList: formattedLeaveList,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("Error:", error);

    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.saveSalaryDoc = async (req, res) => {

  try {

    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const userId = req.users?.id;

    if (!branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
   
    if(!tenantId){
      return Helper.response(false,"Tenant Id is Required",{},res,200)
    }

    const {
      month,
      year,
      chequeNo,
      net_amount,
      bill_date
    } = req.body;

    // ======================
    // VALIDATION
    // ======================

    if (!month || !year) {
      return Helper.response(false, "Month & Year required", {}, res, 400);
    }

    if (!chequeNo) {
      return Helper.response(false, "Cheque number required", {}, res, 400);
    }

    // ======================
    // CHECK EXISTING RECORD
    // ======================

    const existing = await salarydoc.findOne({
      where: {
        tenantId,
        branchId,
        month,
        year,
        status: "active"
      }
    });

    let result;

    // ======================
    // UPDATE IF EXISTS
    // ======================

    if (existing) {

      await existing.update({
        chequeNo,
        net_amount,
        bill_date,
        updatedBy: userId
      });

      result = existing;

    } else {

      // ======================
      // CREATE NEW
      // ======================

      result = await salarydoc.create({
        tenantId,
        branchId,
        month,
        year,
        chequeNo,
        net_amount,
        bill_date,
        createdBy: userId
      });

    }

    // ======================
    // RESPONSE
    // ======================

    return Helper.response(
      true,
      existing ? "Salary document updated" : "Salary document saved",
      result,
      res,
      200
    );

  } catch (error) {

    console.error("Error saving salary document:", error);

    return Helper.response(false, error.message, {}, res, 500);

  }

};
