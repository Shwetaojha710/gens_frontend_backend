const { Op, Sequelize, fn, where, col, literal } = require("sequelize");
const Helper = require("../../helper/helper");
const attendance = require("../../models/attendance");
const attendanceSetting = require("../../models/attendanceSetting");
const deduction = require("../../models/deductions");
const moment = require("moment");
const Shift = require("../../models/shift");
const empPersonal = require("../../models/empPersonal");
const Holiday = require("../../models/holiday");
const holiday = require("../../models/holiday");
const path = require("path");
const fs = require("fs");
const HolidayType = require("../../models/HolidayType");
const xlsx = require("xlsx");
// const reimbursement = require("../../models/reimbursement");
// const ReimbursementFile = require("../../models/reimbursementfile");
const {
  Reimbursement,
  ReimbursementFile,
} = require("../../models/associations");
const sequelize = require("../../connection/connection");
const reimbursement_file = require("../../models/reimbursementfile");
const reimbursement = require("../../models/reimbursement");
const comp_off = require("../../models/comp_off");

exports.attendanceMaster = async (req, res) => {
  const {
    lateAllowanceMin,
    graceMinutes,
    lateToHalfdayMin,
    halfdayToAbsentMin,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;

  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    const existingSetting = await attendanceSetting.findOne({
      where: { tenantId, branchId },
    });
    if (existingSetting) {
      return Helper.response(
        false,
        "Attendance settings already exist for this tenant.",
        [],
        res,
        400,
      );
    }
    const attendanceSettings = new attendanceSetting();
    attendanceSettings.tenantId = tenantId;
    attendanceSettings.branchId = branchId;
    attendanceSettings.lateAllowanceMin = lateAllowanceMin;
    attendanceSettings.graceMinutes = graceMinutes;
    attendanceSettings.halfDayThreshold = lateToHalfdayMin;
    attendanceSettings.halfdayToAbsentMin = halfdayToAbsentMin;
    if (attendanceSettings.save()) {
      return Helper.response(
        true,
        "Attendance settings created successfully.",
        attendanceSettings,
        res,
        200,
      );
    }
    return Helper.response(
      false,
      "Failed to create attendance settings.",
      [],
      res,
      400,
    );
  } catch (error) {
    console.error("Error creating attendance settings:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.getAttendanceSettings = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  //console.log("tenantId", req.users);
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    const settings = await attendanceSetting.findOne({
      where: { tenantId, branchId },
    });
    if (!settings) {
      return Helper.response(
        false,
        "Attendance settings not found for this tenant.",
        [],
        res,
        404,
      );
    }
    return Helper.response(
      true,
      "Attendance settings retrieved successfully.",
      [settings],
      res,
      200,
    );
  } catch (error) {
    console.error("Error retrieving attendance settings:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.updateAttendanceSettings = async (req, res) => {
  const {
    lateAllowanceMin,
    graceMinutes,
    halfDayThreshold,
    halfdayToAbsentMin,
  } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (
      !lateAllowanceMin ||
      !graceMinutes ||
      !halfDayThreshold ||
      !halfdayToAbsentMin
    ) {
      return Helper.response(false, "All fields are required.", [], res, 400);
    }
    const settings = await attendanceSetting.findOne({
      where: { tenantId, branchId },
    });
    if (!settings) {
      return Helper.response(
        false,
        "Attendance settings not found for this tenant.",
        [],
        res,
        400,
      );
    }

    settings.lateAllowanceMin = lateAllowanceMin;
    settings.graceMinutes = graceMinutes;
    settings.halfDayThreshold = halfDayThreshold;
    settings.halfdayToAbsentMin = halfdayToAbsentMin;
    settings.branchId = branchId;

    if (await settings.save()) {
      return Helper.response(
        true,
        "Attendance settings updated successfully.",
        settings,
        res,
        200,
      );
    }
    return Helper.response(
      false,
      "Failed to update attendance settings.",
      [],
      res,
      400,
    );
  } catch (error) {
    console.error("Error updating attendance settings:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.getMonthlyAttendance = async (req, res) => {
  const { emp_id, month, year } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!emp_id || !month || !year) {
    return Helper.response(
      false,
      "emp_id, month, and year are required.",
      [],
      res,
      200,
    );
  }

  try {
    // const startDate = moment(`${year}-${String(month).padStart(2, "0")}-01`);
    // const endDate = startDate.clone().endOf("month");
    // const totalDays = endDate.date();
    const startDate = moment(
      `${year}-${String(month).padStart(2, "0")}-01`,
      "YYYY-MM-DD",
    );
    const endDate = startDate.clone().endOf("month");

    const today = moment();

    let loopEndDate = endDate;

    if (startDate.isSame(today, "month") && startDate.isSame(today, "year")) {
      loopEndDate = today.clone();
    }

    const totalDays = loopEndDate.date();

    let records = [];
    let employees = [];

    // =========================
    // GET EMPLOYEES
    // =========================

    // Month start
    const monthStart = new Date(year, month - 1, 1);

    // Month end
    const monthEnd = new Date(year, month, 0); // last day of month
    if (emp_id == "All" || emp_id == "all") {
      employees = await empPersonal.findAll({
        where: {
          tenantId,
          branchId,
          status: "active",
          joiningDate: {
            [Op.lte]: monthEnd, // joined on or before month end
          },
        },
        order: [
          ["firstName", "ASC"],
          ["lastName", "ASC"],
        ],

        attributes: ["id", "firstName", "lastName", "shift_id", "empCode"],
        raw: true,
      });

      records = await attendance.findAll({
        where: {
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
    } else {
      const emp = await empPersonal.findOne({
        where: {
          id: emp_id,
          tenantId,
          branchId,
          status: "active",
          joiningDate: {
            [Op.lte]: monthEnd,
          },
        },
        attributes: ["id", "firstName", "lastName", "shift_id", "empCode"],
        raw: true,
      });

      if (!emp)
        return Helper.response(false, "Employee not found", [], res, 404);

      employees = [emp];

      records = await attendance.findAll({
        where: {
          employeeId: emp_id,
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
    }

    // =========================
    // GROUP ATTENDANCE
    // =========================

    const groupedRecords = {};

    records.forEach((r) => {
      const day = moment(r.check_in_time).date();
      if (!groupedRecords[r.employeeId]) groupedRecords[r.employeeId] = {};
      groupedRecords[r.employeeId][day] = {
        checkIn: r.check_in_time,
        checkOut: r.check_out_time,
      };
    });

    // =========================
    // HOLIDAY FETCH (ONCE)
    // =========================

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

    const holidayMap = {};
    holidayList.forEach((h) => {
      holidayMap[moment(h.date).date()] = h;
    });

    // =========================
    // LEAVE FETCH (ONCE)
    // =========================

    const leaveList = await leave_application.findAll({
      where: {
        tenantId,
        branchId,
        status: { [Op.ne]: "self_declined" },
      },
      raw: true,
    });

    // convert leave into employee-wise map
    const leaveMap = {};

    leaveList.forEach((l) => {
      let current = moment(l.fromDate);
      const end = moment(l.toDate);

      while (current.isSameOrBefore(end)) {
        if (!leaveMap[l.employeeId]) leaveMap[l.employeeId] = {};

        leaveMap[l.employeeId][current.date()] = l;

        current.add(1, "day");
      }
    });

    // =========================
    // MAIN LOOP
    // =========================

    const finalResult = [];

    for (const emp of employees) {
      const recordMap = groupedRecords[emp.id] || {};
      const empLeaveMap = leaveMap[emp.id] || {};

      // fetch shift once per employee
      const shiftMap = await Shift.findAll({
        where: {
          tenantId,
          branchId,
          shift: emp.shift_id,
        },
        attributes: ["day_of_week", "is_week_off"],
        raw: true,
      });

      const weekOffDays = shiftMap
        .filter((s) => s.is_week_off)
        .map((s) => s.day_of_week);

      const data = [];

      for (let i = 1; i <= totalDays; i++) {
        const currentDate = moment(`${year}-${month}-${i}`, "YYYY-MM-DD");
        const dayName = currentDate.format("dddd");

        const entry = recordMap[i];

        let status = "Absent";

        if (entry) {
          status = "Present";
        } else {
          // priority logic

          if (holidayMap[i]) {
            status = "Holiday";
          } else if (empLeaveMap[i]) {
            const leave = empLeaveMap[i];

            if (leave.duration_type === "first_half") status = "First Half";
            else if (leave.duration_type === "second_half")
              status = "Second Half";
            else status = "On Leave";
          } else if (weekOffDays.includes(dayName)) {
            status = "Week Off";
          } else {
            status = "Absent";
          }
        }

        data.push({
          date: currentDate.format("YYYY-MM-DD"),
          checkIn: entry?.checkIn || null,
          checkOut: entry?.checkOut || null,
          status,
        });
      }

      finalResult.push({
        employee_name: Helper.capitalizeFirstLetter(
          `${emp.firstName} ${emp.lastName}`,
        ),
        empCode: emp.empCode,
        data,
      });
    }

    return Helper.response(
      true,
      "Record Found Successfully!",
      finalResult,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating attendance settings:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

// exports.getMonthlyAttendance = async (req, res) => {
//   const { emp_id, month, year } = req.body;
//   const tenantId = req.users && req.users.tenantId;
//   const branchId = req.users && req.users.branchId;

//   if (!branchId || branchId=='null') {
//     return Helper.response(false, "branchId is required!", {}, res, 200);
//   }
//   if (!emp_id || !month || !year) {
//     return Helper.response(
//       false,
//       "emp_id, month, and year are required.",
//       [],
//       res,
//       200,
//     );
//   }

//   // try {
//   //     const startDate = moment(`${year}-${month}-01`)
//   //     const endDate = startDate.clone().endOf('month')
//   //     const totalDays = endDate.date()
//   //     let records

//   //     const shiftMap = await Shift.findAll({
//   //         where: {
//   //             status: 'active',
//   //             tenantId
//   //         },
//   //         attributes: ['day_of_week', 'is_week_off'],
//   //         raw: true
//   //     });

//   //     const weekOffDays = shiftMap
//   //         .filter(shift => shift.is_week_off === true)
//   //         .map(shift => shift.day_of_week);

//   //     if (emp_id == 'All') {
//   //         records = await attendance.findAll({
//   //             where: {
//   //                 check_in_time: {
//   //                     [Op.between]: [
//   //                         startDate.format('YYYY-MM-DD 00:00:00'),
//   //                         endDate.format('YYYY-MM-DD 23:59:59')
//   //                     ]
//   //                 }
//   //             },
//   //             raw: true
//   //         });
//   //     } else {
//   //         records = await attendance.findAll({
//   //             where: {
//   //                 employeeId: emp_id,
//   //                 check_in_time: {
//   //                     [Op.between]: [
//   //                         startDate.format('YYYY-MM-DD 00:00:00'),
//   //                         endDate.format('YYYY-MM-DD 23:59:59')
//   //                     ]
//   //                 }
//   //             },
//   //             raw: true
//   //         });
//   //     }
//   //     const result = [];
//   //     const recordMap = {}
//   //     records.forEach(r => {
//   //         const day = moment(r.check_in_time).date();
//   //         recordMap[day] = {
//   //             checkIn: r.check_in_time ? r.check_in_time : null,
//   //             checkOut: r.check_out_time ? r.check_out_time : null,
//   //             status: (r.check_in_time && r.check_out_time) ? 'Present' : 'Absent'
//   //         };
//   //     });
//   //     for (let i = 1; i <= totalDays; i++) {
//   //         const currentDate = moment(`${year}-${month}-${i}`, 'YYYY-MM-DD');
//   //         const dayName = currentDate.format('dddd');

//   //         if (weekOffDays.includes(dayName)) {
//   //             result.push({
//   //                 date: currentDate.format('YYYY-MM-DD'),
//   //                 checkIn: null,
//   //                 checkOut: null,
//   //                 status: 'Week Off'
//   //             });
//   //         } else {
//   //             const data = recordMap[i];
//   //             result.push({
//   //                 date: currentDate.format('YYYY-MM-DD'),
//   //                 checkIn: data?.checkIn || null,
//   //                 checkOut: data?.checkOut || null,
//   //                 status: data?.status || 'Absent'
//   //             });
//   //         }
//   //     }

//   //     console.log(result)
//   //     return false
//   //     return Helper.response(true, "Record Found Successfully!", result, res, 200);
//   // } catch (error) {
//   //     console.error("Error updating attendance settings:", error);
//   //     return Helper.response(false, "Internal server error.", [], res, 500);
//   // }

//   try {
//     const startDate = moment(
//       `${year}-${String(month).padStart(2, "0")}-01`,
//       "YYYY-MM-DD",
//     );
//     const endDate = startDate.clone().endOf("month");
//     const totalDays = endDate.date();

//     // const shiftMap = await Shift.findAll({
//     //   where: {
//     //     tenantId,
//     //     branchId,
//     //   },
//     //   attributes: ["day_of_week", "is_week_off"],
//     //   raw: true,
//     // });

//     // const weekOffDays = shiftMap
//     //   .filter((shift) => shift.is_week_off === true)
//     //   .map((shift) => shift.day_of_week);

//     let records = [];
//     let employees = [];

//     if (emp_id == "All" || emp_id == "all") {
//       employees = await empPersonal.findAll({
//         where: { tenantId, branchId },
//         attributes: ["id", "firstName", "lastName","shift_id","empCode"],
//         raw: true,
//       });

//       records = await attendance.findAll({
//         where: {
//           tenantId,
//           branchId,
//           check_in_time: {
//             [Op.between]: [
//               startDate.format("YYYY-MM-DD 00:00:00"),
//               endDate.format("YYYY-MM-DD 23:59:59"),
//             ],
//           },
//         },
//         raw: true,
//       });
//     } else {
//       const emp = await empPersonal.findOne({
//         where: { id: emp_id, tenantId, branchId },
//         attributes: ["id", "firstName", "lastName","shift_id","empCode"],
//         raw: true,
//       });
//       // console.log(emp, "ddd");
//       if (!emp)
//         return Helper.response(false, "Employee not found", [], res, 404);

//       employees = [emp];

//       records = await attendance.findAll({
//         where: {
//           employeeId: emp_id,
//           tenantId,
//           branchId,
//           check_in_time: {
//             [Op.between]: [
//               startDate.format("YYYY-MM-DD 00:00:00"),
//               endDate.format("YYYY-MM-DD 23:59:59"),
//             ],
//           },
//         },
//         raw: true,
//       });
//     }
//     const groupedRecords = {};
//     records.forEach((r) => {
//       const day = moment(r.check_in_time).date();
//       if (!groupedRecords[r.employeeId]) groupedRecords[r.employeeId] = {};
//       groupedRecords[r.employeeId][day] = {
//         checkIn: r.check_in_time || null,
//         checkOut: r.check_out_time || null,
//         status: r.check_in_time || r.check_out_time ? "Present" : "Absent",
//       };
//     });

//     const finalResult = [];

//     for (const emp of employees) {
//       const recordMap = groupedRecords[emp.id] || {};
//       const data = [];
//       const shiftMap = await Shift.findAll({
//         where: {
//           tenantId,
//           branchId,
//           shift: emp?.shift_id,
//         },
//         attributes: ["day_of_week", "is_week_off"],
//         raw: true,
//       });

//       const weekOffDays = shiftMap
//         .filter((shift) => shift.is_week_off === true)
//         .map((shift) => shift.day_of_week);
//       // console.log(emp, "fffffffff");

//       for (let i = 1; i <= totalDays; i++) {
//         const currentDate = moment(`${year}-${month}-${i}`, "YYYY-MM-DD");
//         const dayName = currentDate.format("dddd");

//         if (weekOffDays.includes(dayName)) {
//           data.push({
//             date: currentDate.format("YYYY-MM-DD"),
//             checkIn: null,
//             checkOut: null,
//             status: "Week Off",
//           });
//         } else {
//           const entry = recordMap[i];
//           data.push({
//             date: currentDate.format("YYYY-MM-DD"),
//             checkIn: entry?.checkIn || null,
//             checkOut: entry?.checkOut || null,
//             status: entry?.status || "Absent",
//           });
//         }
//       }

//       finalResult.push({
//         employee_name: Helper.capitalizeFirstLetter(
//           `${emp.firstName} ${emp.lastName}`,
//         ),
//         empCode:emp.empCode,
//         data,
//       });
//     }

//     return Helper.response(
//       true,
//       "Record Found Successfully!",
//       finalResult,
//       res,
//       200,
//     );
//   } catch (error) {
//     console.error("Error updating attendance settings:", error);
//     return Helper.response(false, "Internal server error.", [], res, 500);
//   }
// };

exports.getLateAttendance = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const { emp_id, month, year } = req.body;

  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId || !month || !year) {
    return Helper.response(false, "Missing required parameters", [], res, 400);
  }

  try {
    const setting = await attendanceSetting.findOne({
      where: { tenantId, branchId },
      attributes: ["graceMinutes"],
      raw: true,
    });
    const graceMinutes = setting?.graceMinutes || 0;

    let employees = [];
    if (emp_id == "All" || emp_id == "all") {
      employees = await empPersonal.findAll({
        where: { tenantId, branchId },
        attributes: ["id", "firstName", "lastName", "shift_id", "empCode"],
        raw: true,
      });
    } else {
      const emp = await empPersonal.findOne({
        where: { id: emp_id, tenantId, branchId },
        attributes: ["id", "firstName", "lastName", "shift_id", "empCode"],
        raw: true,
      });
      if (!emp)
        return Helper.response(false, "Employee not found", [], res, 404);
      employees = [emp];
    }

    // let shiftMap = await Shift.findAll({
    //   where: { tenantId },
    //   attributes: ["id", "day_of_week", "is_week_off", "startTime","shift"],
    //   raw: true,
    // });

    const startDate = moment(
      `${year}-${String(month).padStart(2, "0")}-01`,
      "YYYY-MM-DD",
    );
    const endDate = startDate.clone().endOf("month");

    const attendanceRecords = await attendance.findAll({
      where: {
        tenantId,
        branchId,
        check_in_time: {
          [Op.between]: [
            startDate.format("YYYY-MM-DD 00:00:00"),
            endDate.format("YYYY-MM-DD 23:59:59"),
          ],
        },
      },
      attributes: ["id", "employeeId", "check_in_time"],
      raw: true,
    });

    const finalLateData = [];
    let status;
    for (const emp of employees) {
      const empRecords = attendanceRecords.filter(
        (r) => r.employeeId == emp.id,
      );

      for (const rec of empRecords) {
        let shiftMap = await Shift.findAll({
          where: { tenantId, branchId, shift: emp?.shift_id },
          attributes: [
            "id",
            "day_of_week",
            "is_week_off",
            "startTime",
            "shift",
          ],
          raw: true,
        });

        const checkInTime = moment(rec.check_in_time);
        const dayName = checkInTime.format("dddd");
        shiftMap = shiftMap.filter((item) => item.shift == emp?.shift_id);

        const empShift = shiftMap.find(
          (s) => s.day_of_week == dayName && !s.is_week_off,
        );
        if (!empShift) continue;

        const shiftStart = moment(
          `${checkInTime.format("YYYY-MM-DD")} ${empShift.startTime}`,
          "YYYY-MM-DD HH:mm:ss",
        );
        const allowedTime = shiftStart.clone().add(graceMinutes, "minutes");

        const minutesLate = checkInTime.diff(allowedTime, "minutes");
        let minute;
        if (minutesLate > 0) {
          if (minutesLate >= 60) {
            const hours = Math.floor(minutesLate / 60);
            const mins = minutesLate % 60;
            status = `Late by ${
              hours ? `${hours} hr${hours > 1 ? "s" : ""}` : ""
            } ${mins ? `${mins} min` : ""}`;
            minute = `${hours ? `${hours} hr${hours > 1 ? "s" : ""}` : ""} ${
              mins ? `${mins} min` : ""
            }`;
          } else {
            status = `Late by ${minutesLate} min`;
            minute = `${minutesLate} min`;
          }

          if (checkInTime.isAfter(allowedTime)) {
            finalLateData.push({
              id: rec?.id,
              employeeId: emp.id,
              empCode: emp?.empCode ?? 0,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              date: checkInTime.format("YYYY-MM-DD"),
              shiftStart: empShift.startTime,
              graceMinutes,
              allowedTill: allowedTime.format("HH:mm:ss"),
              checkIn: checkInTime.format("HH:mm:ss"),
              lateByMinutes: minute,
              status: status,
            });
          }
        }
      }
    }

    if (finalLateData.length == 0) {
      return Helper.response(false, "No data Found", [], res, 200);
    }

    return Helper.response(
      true,
      "Late attendance found",
      finalLateData,
      res,
      200,
    );
  } catch (error) {
    console.error("Late attendance error:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getDateWiseAttendance = async (req, res) => {
  const { emp_id, startDate, endDate } = req.body;
  const tenantId = req.users && req.users.tenantId;
  if (!emp_id || !startDate || !endDate) {
    return Helper.response(false, "All Fields are required.", [], res, 200);
  }

  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    let data = [];
    const shiftMap = await Shift.findAll({
      where: {
        status: "active",

        tenantId,
        branchId,
      },
      attributes: ["day_of_week", "is_week_off"],
      raw: true,
    });

    const weekOffDays = shiftMap
      .filter((shift) => shift.is_week_off == true)
      .map((shift) => shift.day_of_week);

    const start = moment(startDate); // convert string to moment
    const end = moment(endDate);
    // const totalDays = end.date() - start.date() + 1;
    const totalDays = end.diff(start, "days") + 1;

    let employees = [];
    let records = [];
    const monthEnd = new Date(endDate);
    if (emp_id == "All" || emp_id == "all") {
      employees = await empPersonal.findAll({
        where: {
          tenantId,
          branchId,
          status: "active",
          joiningDate: {
            [Op.lte]: monthEnd, // joined on or before month end
          },
        },
        attributes: ["id", "firstName", "lastName"],
        raw: true,
      });
      records = await attendance.findAll({
        where: {
          check_in_time: {
            [Op.between]: [
              start.format("YYYY-MM-DD 00:00:00"),
              end.format("YYYY-MM-DD 23:59:59"),
            ],
          },

          tenantId: tenantId,
          branchId: branchId,
        },
        raw: true,
      });
    } else {
      const emp = await empPersonal.findOne({
        where: {
          id: emp_id,
          tenantId,
          branchId,
          joiningDate: {
            [Op.lte]: monthEnd, // joined on or before month end
          },
        },
        attributes: ["id", "firstName", "lastName"],
        raw: true,
      });
      // console.log(emp, "ddd");
      if (!emp)
        return Helper.response(false, "Employee not found", [], res, 404);

      employees = [emp];
      records = await attendance.findAll({
        where: {
          employeeId: emp_id,
          tenantId: tenantId,
          branchId: branchId,
          check_in_time: {
            [Op.between]: [
              start.format("YYYY-MM-DD 00:00:00"),
              end.format("YYYY-MM-DD 23:59:59"),
            ],
          },
        },
        raw: true,
      });
    }

    // if (records.length === 0) {
    //   return Helper.response(
    //     false,
    //     "No attendance records found for the given date.",
    //     [],
    //     res,
    //     404
    //   );
    // }

    const groupedRecords = {};
    records.forEach((r) => {
      const day = moment(r.check_in_time).date();
      if (!groupedRecords[r.employeeId]) groupedRecords[r.employeeId] = {};
      groupedRecords[r.employeeId][day] = {
        id: r.id,
        checkIn: r.check_in_time || null,
        checkOut: r.check_out_time || null,
        status: r.check_in_time && r.check_out_time ? "Present" : "Absent",
      };
    });

    for (const emp of employees) {
      const recordMap = groupedRecords[emp.id] || {};

      const startDate1 = moment(startDate, "YYYY-MM-DD");
      const endDate1 = moment(endDate, "YYYY-MM-DD");
      let currentDate = startDate1.clone();
      while (currentDate.isSameOrBefore(endDate1)) {
        const dayName = currentDate.format("dddd");

        if (weekOffDays.includes(dayName)) {
          data.push({
            date: currentDate.format("YYYY-MM-DD"),
            checkIn: "--",
            checkOut: "--",
            status: "Week Off",
            employee_name: Helper.capitalizeFirstLetter(
              `${emp.firstName} ${emp.lastName}`,
            ),
            employeeId: emp?.id,
          });
        } else {
          // Here you can map data by date instead of day index
          // const entry = recordMap[currentDate.format("YYYY-MM-DD")];
          const dayKey = String(currentDate.date());
          const entry = recordMap[dayKey];
          data.push({
            date: currentDate.format("YYYY-MM-DD"),
            //  checkIn: entry?.checkIn?.split(" ")[1] || "--",
            // checkOut: entry?.checkOut?.split(" ")[1] || "--",
            checkIn: entry?.checkIn?.split(" ")[1]
              ? new Date(entry.checkIn).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  // second: '2-digit'
                })
              : "--",
            checkOut: entry?.checkOut?.split(" ")[1]
              ? new Date(entry.checkOut).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  // second: '2-digit'
                })
              : "--",
            status: entry?.status || "Absent",
            id: entry?.id,
            employee_name: Helper.capitalizeFirstLetter(
              `${emp.firstName} ${emp.lastName}`,
            ),
            employeeId: emp?.id,
          });
        }

        currentDate.add(1, "day");
      }
    }

    return Helper.response(true, "Record Found Successfully!", data, res, 200);
  } catch (error) {
    console.error("Error fetching date-wise attendance:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.getAttendanceYears = async (req, res) => {
  try {
    const years = await attendance.findAll({
      attributes: [
        [Sequelize.literal(`DISTINCT EXTRACT(YEAR FROM "createdAt")`), "year"],
      ],
      order: [[Sequelize.literal(`EXTRACT(YEAR FROM "createdAt")`), "DESC"]],
      raw: true,
    });

    const response = years.map((y) => ({
      value: y.year.toString(),
      label: y.year.toString(),
    }));
    return Helper.response(
      true,
      "Record Found Successfully!",
      response,
      res,
      200,
    );
  } catch (err) {
    console.error("Error fetching years:", err);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

exports.updateAttendance = async (req, res) => {
  const {
    id,
    status = "active",
    checkIn,
    checkOut,
    date,
    employeeId,
  } = req.body;
  const tenantId = req.users?.tenantId;
  const ip_address = await Helper.getIpAddress(req);

  const branchId = req.users && req.users.branchId;
  const month = date.split("-")[1];
  const year = date.split("-")[0];
  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!tenantId || !employeeId) {
      return Helper.response(
        false,
        "Tenant ID and ID are required",
        null,
        res,
        400,
      );
    }

    const employeeExists = await attendance.findOne({
      where: { employeeId: employeeId, tenantId, branchId, date },
    });
    if (!employeeExists) {
      await attendance.create({
        employeeId,
        tenantId,
        branchId,
        status,
        year: parseInt(year),
        month: parseInt(month),
        branchId,
        check_in_time: checkIn,
        check_out_time: checkOut,
        date,
        is_present: true,
        ip_address,
        createdBy: req.users?.id,
      });

      return Helper.response(
        true,
        "Atttendance updated successfully",
        {},
        res,
        200,
      );
      // return Helper.response(false, "Atendance not found", null, res, 404);
    }

    employeeExists.updatedBy = req.users?.id;
    employeeExists.branchId = branchId;
    employeeExists.updatedAt = new Date();
    employeeExists.check_in_time = checkIn??  employeeExists.check_in_time ;
    employeeExists.check_out_time = checkOut??  employeeExists.check_out_time ;
    employeeExists.date = date;
    employeeExists.month = new Date(date).getMonth() + 1;
    employeeExists.year = new Date(date).getFullYear();
    employeeExists.status = status || "active";
    await employeeExists.save();

    return Helper.response(
      true,
      "Atttendance updated successfully",
      {},
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating Atttendance:", error);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.BulkupdateAttendance = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const attendanceList = req.body; // ARRAY DATA

    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const ip_address = await Helper.getIpAddress(req);

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    if (!Array.isArray(attendanceList) || attendanceList.length === 0) {
      return Helper.response(false, "Invalid data format", {}, res, 200);
    }

    for (const item of attendanceList) {
      const { date, checkIn, checkOut, status, employeeId } = item;

      const month = date.split("-")[1];
      const year = date.split("-")[0];

      // Replace "--" with null
      const checkInTime = checkIn == "--" ? null : `${date} ${checkIn}`;
      const checkOutTime = checkOut == "--" ? null : `${date} ${checkOut}`;
      // this.newObj.checkIn = `${data?.date} ${data?.checkIn}`
      //       this.newObj.checkOut = `${data?.date} ${data?.checkOut}`
      const employeeExists = await attendance.findOne({
        where: {
          employeeId,
          tenantId,
          branchId,
          date,
        },
        transaction: t,
      });

      if (!employeeExists) {
        await attendance.create(
          {
            employeeId,
            tenantId,
            branchId,
            status,
            year: parseInt(year),
            month: parseInt(month),
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            date,
            is_present: status === "P",
            ip_address,
            createdBy: req.users?.id,
          },
          { transaction: t },
        );
      } else {
        employeeExists.updatedBy = req.users?.id;
        employeeExists.check_in_time = checkInTime;
        employeeExists.check_out_time = checkOutTime;
        employeeExists.status = status;
        employeeExists.month = parseInt(month);
        employeeExists.year = parseInt(year);

        await employeeExists.save({ transaction: t });
      }
    }

    await t.commit();

    return Helper.response(
      true,
      "Bulk attendance updated successfully",
      {},
      res,
      200,
    );
  } catch (error) {
    await t.rollback();

    console.error("Bulk Update Error:", error);

    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.deleteAttendance = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users?.tenantId;

  try {
    if (!tenantId || !id) {
      return Helper.response(
        false,
        "Tenant ID And ID are required",
        null,
        res,
        400,
      );
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const delteAttendance = await attendance.findOne({
      where: { id: id, tenantId, branchId: req.users?.branchId },
    });

    if (!delteAttendance) {
      return Helper.response(false, "Data not found", null, res, 404);
    }

    await delteAttendance.destroy();

    return Helper.response(
      true,
      "Attendance deleted successfully",
      null,
      res,
      200,
    );
  } catch (error) {
    console.error("Error deleting Attendance:", error);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.updateempattendance = async (req, res) => {
  const { id, allowedTill, date } = req.body;
  const tenantId = req.users?.tenantId;
  const ip_address = await Helper.getIpAddress(req);
  try {
    if (!tenantId || !id) {
      return Helper.response(
        false,
        "Tenant ID and ID are required",
        null,
        res,
        400,
      );
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employeeExists = await attendance.findOne({
      where: { id, branchId },
    });
    if (!employeeExists) {
      return Helper.response(true, "No Attendance Record Found", {}, res, 200);
      // return Helper.response(false, "Atendance not found", null, res, 404);
    }

    employeeExists.check_in_time = `${date} ${allowedTill}`;

    await employeeExists.save();

    return Helper.response(
      true,
      "Atttendance updated successfully",
      {},
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating Atttendance:", error);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.addAttendance = async (req, res) => {
  const { empCode, check_in_time, date } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!tenantId || !empCode || !date) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "TenantId, empCode and date are required.",
        [],
        res,
        400,
      );
    }

    const employeedetails = await empPersonal.findOne({
      where: { empCode, tenantId, branchId, status: "active" },
      attributes: ["id"],
    });

    if (!employeedetails) {
      return Helper.response(false, "Employee not found", [], res, 404);
    }

    const employeeId = employeedetails.id;
    const ip_address = Helper.getIpAddress(req);

    let existingAttendance = await attendance.findOne({
      where: { employeeId, date, tenantId, branchId },
    });

    if (existingAttendance) {
      await existingAttendance.update({
        check_out_time: check_in_time || existingAttendance.check_out_time,
        is_present: true,
        ip_address,
        branchId,
        updatedBy: req.users?.id,
      });

      return Helper.response(
        true,
        "Attendance updated successfully (Check-out)",
        existingAttendance,
        res,
        200,
      );
    } else {
      const createAttendance = await attendance.create({
        employeeId,
        tenantId,
        check_in_time,
        is_present: true,
        date,
        ip_address,
        branchId,
        createdBy: req.users?.id,
        month: new Date(check_in_time).getMonth() + 1,
        year: new Date(check_in_time).getFullYear(),
      });

      return Helper.response(
        true,
        "Attendance added successfully (Check-in)",
        createAttendance,
        res,
        200,
      );
    }
  } catch (error) {
    console.error("Error adding/updating attendance:", error);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.addHoliday = async (req, res) => {
  const { holiday_type, holiday_name, date, status } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!tenantId || !holiday_type || !holiday_name || !date) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Invalid request. Please provide all required fields.",
        [],
        res,
        400,
      );
    }

    const existingHoliday = await Holiday.findOne({
      where: { tenantId, holiday_type, branchId, holiday_name, date },
    });
    if (existingHoliday) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Holiday already exists for this tenant.",
        [],
        res,
        400,
      );
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return Helper.response(false, "No files uploaded", null, res, 400);
    }

    const createdDocs = [];

    for (const file of req.files) {
      const newDoc = await Holiday.create({
        tenantId,
        holiday_type,
        holiday_name,
        branchId,
        date,
        doc_type: file.mimetype,
        image: file.filename,
        createdBy: req.users?.id,
        updatedBy: req.users?.id,
        status: status || "active",
      });
      createdDocs.push(newDoc);
    }

    return Helper.response(
      true,
      "Holiday added successfully",
      createdDocs,
      res,
      200,
    );
  } catch (error) {
    console.error("Error adding document:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(false, "Internal server error", null, res, 500);
  }
};

exports.getHolidayList = async (req, res) => {
  try {
    let year = req.body.year;
    if (!year) {
      year = new Date().getFullYear();
    }
    if (!year) {
      return Helper.response(false, "Year Is Required", {}, res, 200);
    }
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const holidayData = await Holiday.findAll({
      where: {
        tenantId: req.users?.tenantId,
        branchId: req.users?.branchId,
        status: "active",
        [Op.and]: sequelize.where(
          sequelize.fn("DATE_PART", "year", col("date")),
          year,
        ),
      },
      attributes: [
        "id",
        "holiday_type",
        "holiday_name",
        "date",
        "doc_type",
        "image",
        "status",
        [fn("TO_CHAR", col("updatedAt"), "YYYY-MM-DD HH24:MI:SS"), "updatedAt"],
        [fn("TO_CHAR", col("createdAt"), "YYYY-MM-DD HH24:MI:SS"), "createdAt"],

        "createdBy",
      ],
      order: [["createdAt", "desc"]],
      raw: true,
    });

    const data = await Promise.all(
      holidayData.map(async (item) => {
        const holidayname = await HolidayType.findOne({
          where: {
            id: item?.holiday_type,
            tenantId: req.users?.tenantId,
            branchId: req.users?.branchId,
          },
        });
        return {
          ...item,
          holiday_type_name: holidayname?.name,
        };
      }),
    );

    return Helper.response(true, "Record Found Successfully!", data, res, 200);
  } catch (err) {
    console.error("Error fetching Holiday:", err);
    return Helper.response(false, err?.message, [], res, 500);
  }
};

exports.updateHoliday = async (req, res) => {
  const { id, status, holiday_type, holiday_name, date } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;
  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !id) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Tenant ID and Holiday ID are required",
        null,
        res,
        400,
      );
    }

    if (!holiday_type || !holiday_name || !date) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "All fields are required", null, res, 400);
    }

    const holidayExists = await Holiday.findOne({
      where: { id, tenantId, branchId },
    });
    if (!holidayExists) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "Holiday not found", null, res, 404);
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      holidayExists.holiday_type = holiday_type;
      holidayExists.holiday_name = holiday_name;
      holidayExists.date = date;
      holidayExists.branchId = branchId;
      holidayExists.status = status || holidayExists.status;
      holidayExists.updatedBy = req.users?.id;
      holidayExists.updatedAt = new Date();
      await holidayExists.save();

      return Helper.response(
        true,
        "Holiday updated successfully",
        holidayExists,
        res,
        200,
      );
    }

    const updatedHolidays = [];

    for (const file of req.files) {
      // Delete old file if exists
      if (holidayExists.image) {
        const oldFilePath = path.join(
          __dirname,
          "../../../upload",
          holidayExists.image,
        );
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      holidayExists.image = file.filename;
      holidayExists.doc_type = file.mimetype;
      holidayExists.holiday_type = holiday_type;
      holidayExists.branchId = branchId;
      holidayExists.holiday_name = holiday_name;
      holidayExists.date = date;
      holidayExists.status = status || holidayExists.status;
      holidayExists.updatedBy = req.users?.id;
      holidayExists.updatedAt = new Date();

      await holidayExists.save();
      updatedHolidays.push(holidayExists);
    }

    return Helper.response(
      true,
      "Holiday updated successfully (with new file)",
      updatedHolidays,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating holiday:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(
      false,
      error?.message || "Internal server error",
      null,
      res,
      500,
    );
  }
};

// exports.updateHoliday = async (req, res) => {
//   const { id, status, holiday_type, holiday_name, date } = req.body;
//   const tenantId = req.users?.tenantId;

//   try {
//     if (!tenantId || !id || !holiday_name || !holiday_type || !date) {
//       Helper.deleteUploadedFiles(req.files);
//       return Helper.response(
//         false,
//         "All Fields are required",
//         null,
//         res,
//         400
//       );
//     }

//     const employeeExists = await holiday.findOne({
//       where: { id: id, tenantId },
//     });
//     if (!employeeExists) {
//       Helper.deleteUploadedFiles(req.files);
//       return Helper.response(false, "Holiday not found", null, res, 404);
//     }

//     if (!req.files || Object.keys(req.files).length === 0) {
//       return Helper.response(false, "No files uploaded", null, res, 400);
//     }

//     let existingDoc;
//     if (!req.files || Object.keys(req.files).length === 0) {
//       existingDoc = await holiday.findOne({
//         where: { tenantId, id },
//       });

//       if (existingDoc) {
//         existingDoc.updatedBy = req.users?.id;
//         existingDoc.updatedAt = new Date();
//         existingDoc.holiday_type = holiday_type;
//         existingDoc.holiday_name = holiday_name;
//         existingDoc.date = date;
//         existingDoc.status = status || "active";
//         existingDoc.image = null;
//         existingDoc.doc_type = null;
//         await existingDoc.save();

//         return Helper.response(
//           true,
//           "Holiday updated successfully",
//           {},
//           res,
//           200
//         );
//       }
//     }
//     for (const file of req.files) {
//       let existingDoc = await holiday.findOne({
//         where: { tenantId, id },
//       });

//       if (existingDoc) {
//         // ✅ Only build path if image is present
//         let oldFilePath = null;
//         if (existingDoc.image) {
//           oldFilePath = path.join(
//             __dirname,
//             "../../../upload",
//             existingDoc.image
//           );

//           // ✅ Delete old file if it exists
//           if (fs.existsSync(oldFilePath)) {
//             try {
//               fs.unlinkSync(oldFilePath);
//               console.log("Old file deleted:", oldFilePath);
//             } catch (err) {
//               console.error("Error deleting old file:", err);
//             }
//           } else {
//             console.log("Old file not found, skipping delete");
//           }
//         }

//         // ✅ Update with new file info
//         existingDoc.image = file.filename;
//         existingDoc.doc_type = file.mimetype;
//         existingDoc.updatedBy = req.users?.id;
//         existingDoc.updatedAt = new Date();
//         existingDoc.holiday_type = holiday_type;
//         existingDoc.holiday_name = holiday_name;
//         existingDoc.date = date;
//         existingDoc.status = status || "active";

//         await existingDoc.save();
//         console.log("New file uploaded:", file.filename);
//       } else {
//         // ✅ Create new record if not found
//         await holiday.create({
//           tenantId,
//           holiday_type,
//           holiday_name,
//           date,
//           doc_type: file.mimetype,
//           image: file.filename,
//           createdBy: req.users?.id,
//           updatedBy: req.users?.id,
//           status: status || "active",
//         });
//         console.log("New holiday record created with file:", file.filename);
//       }
//     }

//     return Helper.response(
//       true,
//       "Documents updated successfully",
//       {},
//       res,
//       200
//     );
//   } catch (error) {
//     console.error("Error updating documents:", error);
//     Helper.deleteUploadedFiles(req.files);
//     return Helper.response(false, error?.message, null, res, 500);
//   }
// };

exports.deleteHoliday = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!tenantId || !id) {
      return Helper.response(
        false,
        "Tenant ID And ID are required",
        null,
        res,
        400,
      );
    }

    const delteholiday = await holiday.findOne({
      where: { id: id, tenantId, branchId },
    });

    if (!delteholiday) {
      return Helper.response(false, "Document not found", null, res, 404);
    }

    const filePath = path.join(
      __dirname,
      "../../../upload",
      delteholiday.image,
    );
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Error deleting file ${delteholiday.image}:`, err);
      }
    }

    await delteholiday.destroy();

    return Helper.response(
      true,
      "Holiday deleted successfully",
      null,
      res,
      200,
    );
  } catch (error) {
    console.error("Error deleting document:", error);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.downloadAttendance = async (req, res) => {
  try {
    const moment = require("moment");
    const xlsx = require("xlsx");

    const { tenantId } = req.users;
    const branchId = req.users?.branchId;
    const { month, year } = req.body;

    if (!branchId || branchId == "null")
      return Helper.response(false, "branchId is required!", {}, res, 200);

    if (!tenantId)
      return res.status(400).json({ message: "Tenant ID required" });

    if (!month || !year)
      return Helper.response(false, "Month & Year required", null, res, 400);

    /* ================= DAYS ================= */

    const daysInMonth = moment(`${year}-${month}`, "YYYY-MM").daysInMonth();

    /* ================= EMPLOYEES ================= */

    const employees = await empPersonal.findAll({
      where: { tenantId, status: "active", branchId },
      attributes: ["id", "firstName", "lastName", "empCode", "shift_id"],
      raw: true,
      order: [["firstName", "ASC"]],
    });

    /* ================= SHIFT DATA ================= */

    const shifts = await Shift.findAll({
      where: { tenantId, branchId },
      raw: true,
    });

    // Create Shift Map
    const shiftMap = {};

    shifts.forEach((s) => {
      if (!shiftMap[s.shift]) shiftMap[s.shift] = {};
      shiftMap[s.shift][s.day_of_week] = s;
    });

    /* ================= ATTENDANCE ================= */

    const attendances = await attendance.findAll({
      where: { tenantId, branchId, month, year },
      raw: true,
    });

    const attendanceMap = {};

    attendances.forEach((att) => {
      if (!attendanceMap[att.employeeId]) attendanceMap[att.employeeId] = {};

      const day = moment(att.date).date();

      if (att.check_in_time || att.check_out_time) {
        let checkIn = att.check_in_time
          ? moment(att.check_in_time).format("HH:mm")
          : "";

        let checkOut = att.check_out_time
          ? moment(att.check_out_time).format("HH:mm")
          : "";
        if (checkOut == "Invalid date") {
          checkOut = "00:00";
        }
        if (checkIn == "Invalid date") {
          checkIn = "00:00";
        }
        // console.log(checkIn,checkOut);

        attendanceMap[att.employeeId][day] = `${checkIn} ${checkOut}`;
      }
    });

    /* ================= BUILD EXCEL ================= */

    const rows = [];

    const header = ["EmpName", "EmpCode"];

    for (let d = 1; d <= daysInMonth; d++) {
      header.push(d.toString());
    }

    rows.push(header);

    employees.forEach((emp) => {
      const name = `${emp.firstName || ""} ${emp.lastName || ""}`;

      const row = [name, emp.empCode || ""];

      for (let d = 1; d <= daysInMonth; d++) {
        const date = moment(`${year}-${month}-${d}`, "YYYY-MM-DD");

        const dayName = date.format("dddd");

        let value = "A"; // default Absent

        // Check week off from shift table
        const shiftDay = shiftMap?.[emp.shift_id]?.[dayName];

        if (shiftDay && shiftDay.is_week_off) {
          value = "WO";
        }

        // Check attendance timing (override WO if present)
        const attendanceTime = attendanceMap?.[emp.id]?.[d];

        if (attendanceTime) {
          value = attendanceTime;
        }

        row.push(value);
      }

      rows.push(row);
    });

    /* ================= CREATE EXCEL ================= */

    const ws = xlsx.utils.aoa_to_sheet(rows);
    const wb = xlsx.utils.book_new();

    xlsx.utils.book_append_sheet(wb, ws, "Attendance");

    const fileBuffer = xlsx.write(wb, {
      bookType: "xlsx",
      type: "buffer",
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_${month}_${year}.xlsx`,
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(fileBuffer);
  } catch (err) {
    console.error("Download Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// exports.downloadAttendance = async (req, res) => {
//   try {
//     const moment = require("moment");

//     const { tenantId } = req.users;
//     let { month, year } = req.body;
//     const branchId = req.users && req.users.branchId;
//     if (!branchId || branchId=='null') {
//       return Helper.response(false, "branchId is required!", {}, res, 200);
//     }
//     if (!tenantId) {
//       return res.status(400).json({ message: "Tenant ID required" });
//     }

//     // If month or year is not provided, use current month/year
//     if (!month) {
//       return Helper.response(false, "Month is required", null, res, 400);
//       // return res.status(400).json({ message: "Month Is required" });
//     }

//     if (!year) {
//       return Helper.response(false, "Year is required", null, res, 400);
//       //  return res.status(400).json({ message: "Year Is required" });
//     }

//     // Now you have month and year
//     const daysInMonth = moment(`${year}-${month}`, "YYYY-MM").daysInMonth();

//     // Get all employees
//     const employees = await empPersonal.findAll({
//       where: { tenantId, status: "active", branchId },
//       attributes: ["id", "firstName", "lastName", "empCode"],
//       raw: true,
//       order: [["firstName", "ASC"]],
//     });

//     // Get attendance for current month
//     const attendances = await attendance.findAll({
//       where: { tenantId, month, year, branchId },
//       raw: true,
//     });

//     // Map attendance per employee
//     const attendanceMap = {};
//     attendances.forEach((att) => {
//       if (!attendanceMap[att.employeeId]) attendanceMap[att.employeeId] = {};
//       const day = moment(att.date).date();
//       if (att.is_present) {
//         attendanceMap[att.employeeId][day] =
//           (att.check_in_time?.split(" ")[1] || "") +
//           " " +
//           (att.check_out_time?.split(" ")[1] || "");
//       } else {
//         attendanceMap[att.employeeId][day] = "A";
//       }
//     });

//     // Build header row → EmpName, EmpCode, 1,2,...N days
//     const rows = [];
//     const header = ["EmpName", "EmpCode"];
//     for (let d = 1; d <= daysInMonth; d++) header.push(d.toString());
//     rows.push(header);

//     // Add employee rows
//     employees.forEach((emp) => {
//       const name = `${emp.firstName} ${emp.lastName}`;
//       const row = [name, emp.empCode];
//       for (let d = 1; d <= daysInMonth; d++) {
//         row.push(attendanceMap[emp.id]?.[d] || "");
//       }
//       rows.push(row);
//     });

//     // Create Excel
//     const ws = xlsx.utils.aoa_to_sheet(rows);
//     const wb = xlsx.utils.book_new();
//     xlsx.utils.book_append_sheet(wb, ws, "Attendance");

//     const fileBuffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=attendance_${month}_${year}.xlsx`,
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
//     );
//     res.send(fileBuffer);
//   } catch (err) {
//     console.error("Download Error:", err);
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.uploadAttendance = async (req, res) => {

//   const tenantId = req.users?.tenantId;
//   const userId = req.users?.id;
//   const branchId = req.users?.branchId;

//   if (!branchId || branchId=='null') {
//     return Helper.response(false, "branchId is required!", {}, res, 200);
//   }

//   try {

//     if (!req.file) {
//       return Helper.response(false, "No file uploaded", null, res, 400);
//     }

//     if (!tenantId) {
//       return Helper.response(false, "Tenant ID is required", null, res, 400);
//     }

//     /* ================= READ EXCEL ================= */

//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];

//     const jsonData = xlsx.utils.sheet_to_json(
//       workbook.Sheets[sheetName],
//       { header: 1 }
//     );

//     if (jsonData.length <= 1) {
//       return Helper.response(false, "Excel file is empty", null, res, 400);
//     }

//     const month = req.body.month
//       ? parseInt(req.body.month)
//       : new Date().getMonth() + 1;

//     const year = req.body.year
//       ? parseInt(req.body.year)
//       : new Date().getFullYear();

//     const headers = jsonData[0];
//     const dateColumns = headers.slice(2);

//     const ipAddress = (req.ip || "").replace("::ffff:", "");

//     const bulkData = [];
//     const deleteConditions = [];

//     /* ================= LOOP ROWS ================= */

//     for (let i = 1; i < jsonData.length; i++) {

//       const row = jsonData[i];

//       const empName = row[0];
//       const empCode = row[1];

//       if (!empCode) continue;

//       const emp = await empPersonal.findOne({
//         where: {
//           empCode,
//           tenantId,
//           branchId,
//           status: "active",
//         },
//         attributes: ["id"],
//         raw: true,
//       });

//       if (!emp) continue;

//       const employeeId = emp.id;

//       /* ================= LOOP DAYS ================= */

//       for (let d = 0; d < dateColumns.length; d++) {

//         const headerValue = dateColumns[d]; // ex: "01 Thu"
//         const value = row[d + 2];

//         if (!headerValue || value == null) continue;

//         // extract day number
//         const dayNumber = headerValue.toString().split(" ")[0];

//         const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;

//         // skip weekly off
//         if (value === "WO") continue;

//         deleteConditions.push({
//           tenantId,
//           branchId,
//           employeeId,
//           date: dateStr,
//         });

//         let checkIn = null;
//         let checkOut = null;
//         let isPresent = false;

//         /* ================= VALUE PARSING ================= */

//         if (value === "A") {

//           isPresent = false;

//         } else {

//           // expected format:
//           // "09:08 AM - 07:34 PM"
//           const [inPart, outPart] = value.split(" - ");

//           if (inPart) {
//             checkIn = `${dateStr} ${inPart.trim()}`;
//             isPresent = true;
//           }

//           if (outPart && outPart.trim() !== "") {
//             checkOut = `${dateStr} ${outPart.trim()}`;
//           }
//         }

//         bulkData.push({
//           tenantId,
//           branchId,
//           employeeId,
//           date: dateStr,
//           month,
//           year,
//           check_in_time: checkIn,
//           check_out_time: checkOut,
//           is_present: isPresent,
//           createdBy: userId,
//           updatedBy: userId,
//           ip_address: ipAddress,
//         });
//       }
//     }

//     if (!bulkData.length) {
//       return Helper.response(false, "No valid attendance records found", null, res, 400);
//     }

//     /* ================= TRANSACTION ================= */

//     const transaction = await sequelize.transaction();

//     try {

//       await attendance.destroy({
//         where: {
//           [Op.or]: deleteConditions,
//         },
//         transaction,
//       });

//       await attendance.bulkCreate(bulkData, { transaction });

//       await transaction.commit();

//     } catch (err) {

//       await transaction.rollback();
//       throw err;
//     }

//     return Helper.response(
//       true,
//       `${bulkData.length} attendance records uploaded successfully for ${month}-${year}`,
//       null,
//       res,
//       200
//     );

//   } catch (err) {

//     console.error("Upload Error:", err);
//     return Helper.response(false, err.message, null, res, 500);

//   } finally {

//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//   }
// };

// commented by 6feb
exports.uploadAttendance = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const userId = req.users?.id;
  const branchId = req.users?.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!req.file) {
      return Helper.response(false, "No file uploaded", null, res, 400);
    }

    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", null, res, 400);
    }

    // Read Excel
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
    });

    if (jsonData.length <= 1) {
      return Helper.response(false, "Excel file is empty", null, res, 400);
    }

    const month = req.body.month
      ? parseInt(req.body.month)
      : new Date().getMonth() + 1;

    const year = req.body.year
      ? parseInt(req.body.year)
      : new Date().getFullYear();

    const headers = jsonData[0];
    const dateColumns = headers.slice(2); // day numbers

    const ipAddress = (req.ip || "").replace("::ffff:", "");

    const bulkData = [];
    const deleteConditions = [];

    // 🔁 Loop Excel rows
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];

      const empName = row[0];
      const empCode = row[1];

      if (!empCode) continue;

      const emp = await empPersonal.findOne({
        where: {
          empCode,
          tenantId,
          branchId,
          status: "active",
        },
        attributes: ["id", "shift_id"],
        raw: true,
      });

      if (!emp) continue;

      const employeeId = emp.id;

      // 🔁 Loop dates
      for (let d = 0; d < dateColumns.length; d++) {
        const day = dateColumns[d];
        const value = row[d + 2];

        if (!day || !value) continue;
        if (value === "WO") continue; // skip weekly off

        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
          day,
        ).padStart(2, "0")}`;

        // ✅ collect delete condition
        deleteConditions.push({
          tenantId,
          branchId,
          employeeId,
          date: dateStr,
        });

        let checkIn = null;
        let checkOut = null;
        let isPresent = false;

        if (value == "A") {
          isPresent = false;
        } else {
          const parts = value.split(" ");

          if (parts.length >= 2) {
            const checkInTime = parts[0];
            const checkOutTime = parts[1];

            checkIn = `${dateStr} ${checkInTime}`;

            // handle 00:00
            checkOut =
              checkOutTime == "00:00" ? null : `${dateStr} ${checkOutTime}`;

            isPresent = true;
          }
        }

        bulkData.push({
          tenantId,
          branchId,
          employeeId,
          date: dateStr,
          month,
          year,
          check_in_time: checkIn,
          check_out_time: checkOut,
          is_present: isPresent,
          createdBy: userId,
          updatedBy: userId,
          ip_address: ipAddress,
        });
      }
    }

    if (!bulkData.length) {
      return Helper.response(
        false,
        "No valid attendance records found in Excel",
        null,
        res,
        400,
      );
    }

    // 🔐 TRANSACTION (delete + insert)
    const transaction = await sequelize.transaction();

    try {
      await attendance.destroy(
        {
          where: {
            [Op.or]: deleteConditions,
          },
        },
        { transaction },
      );

      await attendance.bulkCreate(bulkData, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }

    return Helper.response(
      true,
      `${bulkData.length} attendance records uploaded successfully for ${month}-${year}`,
      null,
      res,
      200,
    );
  } catch (err) {
    console.error("Upload Error:", err);
    return Helper.response(false, err.message, null, res, 500);
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
};

// exports.uploadAttendance = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const userId = req.users?.id;
//   const branchId = req.users && req.users.branchId;

//   if (!branchId || branchId=='null') {
//     return Helper.response(false, "branchId is required!", {}, res, 200);
//   }

//   try {
//     if (!req.file) {
//       return Helper.response(false, "No file uploaded", null, res, 400);
//     }

//     if (!tenantId) {
//       return Helper.response(false, "Tenant ID is required", null, res, 400);
//     }

//     // Read Excel file
//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
//       header: 1,
//     });

//     if (jsonData.length <= 1) {
//       return Helper.response(false, "Excel file is empty", null, res, 400);
//     }

//     const month = req.body.month
//       ? parseInt(req.body.month)
//       : new Date().getMonth() + 1;
//     const year = req.body.year
//       ? parseInt(req.body.year)
//       : new Date().getFullYear();

//     const headers = jsonData[0];
//     const dateColumns = headers.slice(2);

//     const createdBy = userId;
//     const ipAddress = (req.ip || "").replace("::ffff:", "");

//     const bulkData = [];

//     // Optional: clear previous month data for same tenant
//     const checkAttendanceExists = await attendance.findOne({
//       where: { tenantId, month, year, branchId },
//     });
//     if (checkAttendanceExists) {
//       await attendance.destroy({ where: { tenantId, month, year } });
//     }

//     for (let i = 1; i < jsonData.length; i++) {
//       const row = jsonData[i];
//       const empName = row[0];
//       const empCode = row[1];

//       if (!empCode) continue;

//       const emp = await empPersonal.findOne({
//         where: { empCode, tenantId, status: "active", branchId },
//         attributes: ["id", "shift_id"],
//         raw: true,
//       });

//       if (!emp) continue;

//       const employeeId = emp.id;

//       for (let d = 0; d < dateColumns.length; d++) {
//         const day = dateColumns[d];
//         const value = row[d + 2];
//         if (!day || !value) continue;

//         const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
//           day,
//         ).padStart(2, "0")}`;
//         let checkIn = null;
//         let checkOut = null;
//         let isPresent = false;

//         // Weekly off or absent
//         if (value === "WO") continue;
//         if (value === "A") {
//           isPresent = false;
//         } else {
//           // Example value: "22:30 06:30" or "22:30 06:30 NIGHT"
//           const parts = value.split(" ");
//           if (parts.length >= 2) {
//             const checkInTime = parts[0];
//             const checkOutTime = parts[1];
//             const shiftType =
//               parts[2]?.toLowerCase() || emp.shift_id?.toLowerCase() || "day";

//             // Convert times to moment objects
//             let checkInMoment = moment(
//               `${dateStr} ${checkInTime}`,
//               "YYYY-MM-DD HH:mm",
//             );
//             let checkOutMoment = moment(
//               `${dateStr} ${checkOutTime}`,
//               "YYYY-MM-DD HH:mm",
//             );

//             //  Handle night shift: if shiftType = night OR check-out time < check-in time
//             // if (
//             //   shiftType === "night" ||
//             //   checkOutMoment.isBefore(checkInMoment)
//             // ) {
//             //   checkOutMoment = checkOutMoment.add(1, "day"); // next day
//             // }

//             checkIn = checkInMoment.format("YYYY-MM-DD HH:mm:ss");
//             checkOut = checkOutMoment.format("YYYY-MM-DD HH:mm:ss");
//             isPresent = true;
//           }
//         }

//         bulkData.push({
//           tenantId,
//           employeeId,
//           branchId,
//           ip_address: ipAddress,
//           date: dateStr,
//           month,
//           year,
//           check_in_time: checkIn,
//           check_out_time: checkOut,
//           is_present: isPresent,
//           createdBy,
//           updatedBy: createdBy,
//         });
//       }
//     }

//     if (!bulkData.length) {
//       return Helper.response(
//         false,
//         "No valid attendance records found in Excel",
//         null,
//         res,
//         400,
//       );
//     }

//     await attendance.bulkCreate(bulkData, { ignoreDuplicates: true });

//     return Helper.response(
//       true,
//       `${bulkData.length} attendance records uploaded successfully for ${month}-${year}`,
//       null,
//       res,
//       200,
//     );
//   } catch (err) {
//     console.error("Upload Error:", err);
//     return Helper.response(false, err.message, null, res, 500);
//   } finally {
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//   }
// };

// Helper to map CSV/Excel fields to your model
// exports.uploadAttendance = async (req, res) => {
//   const tenantId = req.users?.tenantId; // must be set from auth middleware
//   const userId = req.users?.id;

//   try {
//     if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
//     if (!tenantId) return res.status(400).json({ success: false, message: "Tenant ID missing" });

//     const workbook = xlsx.readFile(req.file.path);
//     const sheet = workbook.Sheets[workbook.SheetNames[0]];
//     const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

//     if (jsonData.length <= 1)
//       return res.status(400).json({ success: false, message: "Excel is empty" });

//     const month = req.body.month ? parseInt(req.body.month) : new Date().getMonth() + 1;
//     const year = req.body.year ? parseInt(req.body.year) : new Date().getFullYear();

//     const headers = jsonData[0];
//     const dateColumns = headers.slice(2);

//     const ipAddress = (req.ip || "").replace("::ffff:", "");
//     const createdBy = userId;

//     const bulkData = [];

//     // Optional: Clear previous month data
//     //await attendance.destroy({ where: { tenantId, month, year } });

//     for (let i = 20; i < jsonData.length; i++) {
//       const row = jsonData[i];
//       const empName = row[0];
//       const empCode = row[1];
//       if (!empCode) continue;

//       const emp = await empPersonal.findOne({
//         where: { empCode, tenantId, status: "active" },
//         attributes: ["id", "shift_id"],
//         raw: true,
//       });
//       if (!emp) continue;

//       const employeeId = emp.id;

//       for (let d = 0; d < dateColumns.length; d++) {
//         const day = dateColumns[d];
//         const value = row[d + 2];
//         if (!day || !value) continue;

//         const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//         let checkIn = null;
//         let checkOut = null;
//         let isPresent = false;

//         if (value === "WO") continue; // weekly off
//         if (value === "A") {
//           isPresent = false;
//         } else {
//           const cleanValue = value.trim().replace(/\s+/g, " "); // remove leading/trailing & extra spaces
//          const parts = cleanValue.split(" ");
//           if (parts.length >= 2) {
//             const checkInTime = parts[0];
//             const checkOutTime = parts[1];
//             const shiftType = parts[2]?.toLowerCase() || emp.shift_id?.toLowerCase() || "day";

//             let checkInMoment = moment(`${dateStr} ${checkInTime}`, "YYYY-MM-DD HH:mm");
//             let checkOutMoment = moment(`${dateStr} ${checkOutTime}`, "YYYY-MM-DD HH:mm");

//             if (shiftType === "night" || checkOutMoment.isBefore(checkInMoment)) {
//               checkOutMoment.add(1, "day"); // next day
//             }

//             checkIn = checkInMoment.format("YYYY-MM-DD HH:mm:ss");
//             checkOut = checkOutMoment.format("YYYY-MM-DD HH:mm:ss");
//             isPresent = true;
//           }
//         }

//         bulkData.push({
//           tenantId,
//           employeeId,
//           ip_address: ipAddress,
//           date: dateStr,
//           month,
//           year,
//           check_in_time: checkIn,
//           check_out_time: checkOut,
//           is_present: isPresent,
//           createdBy,
//           updatedBy: createdBy,
//         });
//       }
//     }

//     if (!bulkData.length)
//       return Helper.response(false,"No valid records found" ,{},res,200)
//       // return res.status(400).json({ success: false, message: "No valid records found" });

//     await attendance.bulkCreate(bulkData);
//     return Helper.response(true,`${bulkData.length} attendance records uploaded successfully for ${month}-${year}`,{},res,200)

//   } catch (err) {
//     console.error("Upload Error:", err);
//     return Helper.response(false,err?.message,{},res,500)
//     // res.status(500).json({ success: false, message: err.message });
//   } finally {
//     if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
//   }
// }

const mapLeaveData = (row, employeeMap, tenantId, createdBy) => {
  // Map FullHalfType to duration_type
  const mapHalfType = (val) => {
    if (val === "SH") return "second_half";
    if (val === "FH") return "first_half";
    return "full";
  };

  return {
    employeeId: employeeMap[row.EmpCode], // You need a map of EmpCode -> UUID
    leaveTypeId: row?.LeaveType, // You need a map of LeaveType -> UUID
    fromDate: row.LeaveFrom,
    toDate: row.LeaveTo,
    duration_type: mapHalfType(row.FullHalfType),
    to_duration_type: mapHalfType(row.FullHalfType),
    days: parseFloat(row.TotalLeaveDay),
    reason: row.Remarks,
    status: row.ApprovedDate ? "approved" : "pending",
    approverId: null,
    recommendedId: null,
    canceledId: null,
    appliedOn: row.CreatedDate || new Date(),
    tenantId: tenantId,
    createdBy: createdBy,
    updatedBy: null,
  };
};

const XLSX = require("xlsx");
const leave_application = require("../../models/leave_application");
// API route
exports.uploadLeave = async (req, res) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ success: false, message: "File not uploaded" });

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const tenantId = req.users.tenantId;
    const createdBy = req.users.id;

    // Map employees and leave types
    const employeeMap = {};
    const employees = await empPersonal.findAll({
      where: { tenantId },
      raw: true,
    });
    employees.forEach((emp) => (employeeMap[emp.empCode] = emp.id));

    // const leaveTypeMap = {};
    // const leaveTypes = await leaveRecords.findAll();
    // leaveTypes.forEach(lt => leaveTypeMap[lt.name] = lt.id);

    const leaveRecords = data.map((row) =>
      mapLeaveData(row, employeeMap, tenantId, createdBy),
    );

    await leave_application.bulkCreate(leaveRecords);

    return res.status(200).json({
      success: true,
      message: "Leave data uploaded successfully",
      count: leaveRecords.length,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: err.message });
  }
};

// exports.uploadAttendance = async (req, res) => {
//   const tenantId = req.users.tenantId;
//   const userId = req.users.id;

//   try {
//     if (!req.file) {
//       return Helper.response(false, "No file uploaded", null, res, 400);
//     }

//     if (!tenantId) {
//       return Helper.response(false, "Tenant ID is required", null, res, 400);
//     }

//     // Read Excel file
//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
//       header: 1,
//     });

//     if (jsonData.length <= 1) {
//       return Helper.response(false, "Excel file is empty", null, res, 400);
//     }

//     // Extract header (dates start from column 3)
//     const headers = jsonData[0];
//     const dateColumns = headers.slice(2); // [1, 2, 3, 4, ...]

//     const createdBy = userId;
//     const ipAddress = (req.ip || "").replace("::ffff:", "");
//     const currentYear = new Date().getFullYear();
//     const currentMonth = new Date().getMonth() + 1; // 1-12

//     const bulkData = [];

//     // Loop rows (skip header row)
//     for (let i = 1; i < jsonData.length; i++) {
//       const row = jsonData[i];
//       const empName = row[0];
//       const empCode = row[1];

//       if (!empCode) continue;

//       // Find employeeId from empCode
//       const emp = await empPersonal.findOne({
//         where: { empCode, tenantId, status: "active" },
//         attributes: ["id"],
//       });

//       if (!emp) continue;

//       const employeeId = emp.id;

//       // Loop through all date columns
//       for (let d = 0; d < dateColumns.length; d++) {
//         const day = dateColumns[d]; // date number (1, 2, 3..)
//         const value = row[d + 2]; // cell value

//         if (!day || !value) continue;

//         const dateStr = `${currentYear}-${String(currentMonth).padStart(
//           2,
//           "0"
//         )}-${String(day).padStart(2, "0")}`;

//         let checkIn = null;
//         let checkOut = null;
//         let isPresent = false;

//         if (value === "WO") {
//           // Weekly Off → skip storing
//           continue;
//         } else if (value === "A") {
//           isPresent = false;
//         } else {
//           // Time format like "09:10 18:44"
//           const parts = value.split(" ");
//           if (parts.length >= 2) {
//             checkIn = `${dateStr} ${parts[0]}`;
//             checkOut = `${dateStr} ${parts[1]}`;
//             isPresent = true;
//           }
//         }

//         bulkData.push({
//           tenantId,
//           employeeId,
//           ip_address: ipAddress,
//           date: dateStr,
//           month: currentMonth,
//           year: currentYear,
//           check_in_time: checkIn,
//           check_out_time: checkOut,
//           is_present: isPresent,
//           createdBy,
//           updatedBy: createdBy,
//         });
//       }
//     }

//     if (!bulkData.length) {
//       return Helper.response(
//         false,
//         "No valid attendance records found in Excel",
//         null,
//         res,
//         400
//       );
//     }

//     // Bulk insert
//     await attendance.bulkCreate(bulkData, { ignoreDuplicates: true });

//     return Helper.response(
//       true,
//       `${bulkData.length} attendance records uploaded successfully`,
//       null,
//       res,
//       200
//     );
//   } catch (err) {
//     console.error("Upload Error:", err);
//     return Helper.response(false, err.message, null, res, 500);
//   } finally {
//     // Cleanup temp file
//     if (req.file && fs.existsSync(req.file.path)) {
//       fs.unlinkSync(req.file.path);
//     }
//   }
// };

// exports.uploadAttendance = async (req, res) => {
//   const tenantId = req.users.tenantId;
//   const userId = req.users.id;
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file uploaded" });
//     if (!tenantId) {
//       return Helper.response(false, "Tenant ID are required", null, res, 400);
//     }
//     // Read Excel
//     const date = new Date();
//     const workbook = xlsx.readFile(req.file.path);
//     const sheetName = workbook.SheetNames[0];
//     const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
//     const requiredKeys = [
//       "employeeId",
//       "date",
//       "check_in_time",
//       "check_out_time",
//       "is_present",
//     ];
//     if (!jsonData.length) {
//       return Helper.response(true, `Excel file is empty`, null, res, 400);
//     }

//     const createdBy = userId;
//     const ipAddress = (req.ip || "").replace("::ffff:", "");
//     const headers = Object.keys(jsonData[0] || {});

//     const missingKeys = requiredKeys.filter((key) => !headers.includes(key));

//     if (missingKeys.length > 0) {
//       throw new Error(
//         `Invalid Excel format. Missing columns: ${missingKeys.join(", ")}`
//       );
//     }
//     // Map Excel rows into attendance format
//     const mappedData = await Promise.all(jsonData.map(async (row) => {
//       const employeeId = await empPersonal.findOne({
//         where: { empCode: row.employeeId, tenantId, status: "active" },
//         attributes: ["id"],
//       }).then(emp => emp ? emp.id : null);
//       if (!employeeId) {
//         throw new Error("Employee ID is required in each row");
//       }
//       return {
//         tenantId,
//         employeeId: employeeId? employeeId : null,
//         ip_address: ipAddress,
//         date: row.date,
//         month: date.getMonth(),
//         year: date.getFullYear(),
//         check_in_time: row.date + " " + row.check_in_time || null,
//         check_out_time: row.date + " " + row.check_out_time || null,
//         is_present: row.is_present == "P" ? true : false,
//         createdBy,
//         updatedBy: createdBy,
//       };
//     }));

//     console.log("Mapped Data:", mappedData);

//     await attendance.bulkCreate(mappedData, { ignoreDuplicates: true });

//     console.log("Mapped Data:", mappedData);
//     return Helper.response(
//       true,
//       `${mappedData} attendance records uploaded successfully`,
//       null,
//       res,
//       200
//     );
//   } catch (err) {
//     console.error("Upload Error:", err);
//     return Helper.response(false, err?.message, null, res, 500);
//   }
// };

// attendance.js
exports.syncAttendance = async (req, res) => {
  const { attendances } = req.body; // array of attendance objects
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!attendances || attendances.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No attendance data provided" });
    }

    const dataToInsert = attendances.map((item) => ({
      employeeId: item.employeeId,
      date: item.date,
      check_in_time: item.check_in_time,
      check_out_time: item.check_out_time,
      is_present: item.is_present,
      ip_address: item.ip_address,
      tenantId,
      branchId,
      createdBy: req.users?.id,
    }));

    await attendance.bulkCreate(dataToInsert, { ignoreDuplicates: true });
    // `ignoreDuplicates` prevents re-inserting same records if synced again

    return res.json({
      success: true,
      message: "Attendance synced successfully",
    });
  } catch (err) {
    console.error("Sync error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.addReimbursement = async (req, res) => {
  const t = await sequelize.transaction(); // start transaction
  try {
    if (!req.files || req.files.length == 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const reimbursementData = await reimbursement.create(
      {
        tenantId: req.users.tenantId,
        employeeId: req.body.employeeId,
        fromDate: req.body.fromDate,
        toDate: req.body.toDate,
        amount: req.body.amount,
        branchId,
        remark: req.body.remark,
        createdBy: req.users.id,
        updatedBy: req.users.id,
        status: "pending",
      },
      { transaction: t },
    );

    const createdDocs = [];
    for (const file of req.files) {
      const newFile = await ReimbursementFile.create(
        {
          reimbursementId: reimbursementData.id,
          image: file.filename,
          tenantId: req.users.tenantId,
          branchId,
          doc_type: file.mimetype,
          filePath: file.path,
          createdBy: req.users.id,
          updatedBy: req.users.id,
          status: "pending",
        },
        { transaction: t },
      );

      createdDocs.push(newFile);
    }

    await t.commit();

    return res.status(200).json({
      status: true,
      message: "Reimbursement added successfully",
      data: {
        reimbursement: reimbursementData,
        files: createdDocs,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Error adding reimbursement:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// exports.addReimbursement = async (req, res) => {
//   try {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: "No files uploaded" });
//     }

//     const createdDocs = [];

//     for (const file of req.files) {
//       const newDoc = await Reimbursement.create({
//         tenantId: req.users.tenantId,
//         employeeId: req.body.employeeId,
//         fromDate: req.body.fromDate,
//         toDate: req.body.toDate,
//         amount: req.body.amount,
//         remark: req.body.remark,
//         doc_type: file.mimetype,
//         image: file.filename,
//         createdBy: req.users.id,
//         updatedBy: req.users.id,
//         status: 'active',
//       });
//       createdDocs.push(newDoc);
//     }

//     res.status(200).json({
//       status: true,
//       message: "Reimbursement added successfully",
//       data: createdDocs
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ status: false, message: error.message });
//   }
// };

// exports.addReimbursement = async (req, res) => {
//   const {
//     amount,
//     toDate,
//     fromDate,
//     employeeId,
//     remark,
//     status = "active",
//   } = req.body;
//   const tenantId = req.users?.tenantId;

//   try {
//     if (!tenantId || !amount || !toDate || !fromDate || !employeeId) {
//       Helper.deleteUploadedFiles(req.files);
//       return Helper.response(
//         false,
//         "Invalid request. Please provide all required fields.",
//         [],
//         res,
//         400
//       );
//     }

//     const existingHoliday = await Reimbursement.findOne({
//       where: { tenantId, employeeId, fromDate, toDate, amount, remark },
//     });
//     if (existingHoliday) {
//       Helper.deleteUploadedFiles(req.files);
//       return Helper.response(
//         false,
//         "Holiday already exists for this tenant.",
//         [],
//         res,
//         400
//       );
//     }

//     if (!req.files || Object.keys(req.files).length === 0) {
//       return Helper.response(false, "No files uploaded", null, res, 400);
//     }

//     const createdDocs = [];

//     for (const file of req.files) {
//       const newDoc = await Reimbursement.create({
//         tenantId,
//         employeeId,
//         fromDate,
//         toDate,
//         amount,
//         remark,
//         doc_type: file.mimetype,
//         image: file.filename,
//         createdBy: req.users?.id,
//         updatedBy: req.users?.id,
//         status: status || "active",
//       });
//       createdDocs.push(newDoc);
//     }

//     return Helper.response(
//       true,
//       "Reimbrusement added successfully",
//       createdDocs,
//       res,
//       200
//     );
//   } catch (error) {
//     console.error("Error adding document:", error);
//     Helper.deleteUploadedFiles(req.files);
//     return Helper.response(false, error?.message, null, res, 500);
//   }
// };

exports.getReimbursement = async (req, res) => {
  try {
    if (!req.users.tenantId) {
      return Helper.response(false, "Tenant Is not found", {}, res, 200);
    }
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const ReimbursementData = await Reimbursement.findAll({
      raw: true,
      nest: true,
      where: {
        tenantId: req.users?.tenantId,
        branchId,
      },
    });

    const data = await Promise.all(
      ReimbursementData.map(async (item) => {
        const EmployeeName = await empPersonal.findOne({
          where: {
            id: item?.employeeId,
            tenantId: req.users?.tenantId,
            branchId,
          },
        });
        const reimbursmentdFile = await ReimbursementFile.findAll({
          where: {
            reimbursementId: item?.id,
            tenantId: req.users?.tenantId,
            branchId,
          },
        });
        let files = reimbursmentdFile.map((file) => ({
          id: file.id,
          image: file.image,
          doc_type: file.doc_type,
          filePath: file.filePath,
        }));
        return {
          ...item,
          employee_name: `${EmployeeName?.firstName} ${EmployeeName?.lastName}`,
          files: files,
        };
      }),
    );

    return Helper.response(true, "Record Found Successfully!", data, res, 200);
  } catch (err) {
    console.error("Error fetching Holiday:", err);
    return Helper.response(false, err?.message, [], res, 500);
  }
};

exports.updateReimbursementStatus = async (req, res) => {
  const { id, status } = req.body;
  const tenantId = req.users?.tenantId;

  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!tenantId || !id || !status) {
      return Helper.response(
        false,
        "Tenant ID, ID, and Status are required",
        null,
        res,
        400,
      );
    }

    const existingDoc = await Reimbursement.findOne({
      where: { id, tenantId, branchId },
    });

    if (!existingDoc) {
      return Helper.response(false, "Reimbursement not found", null, res, 404);
    }

    await existingDoc.update({
      status,
      branchId,
      updatedBy: req.users?.id,
      updatedAt: new Date(),
    });

    await reimbursement_file.update(
      { status, branchId, updatedBy: req.users?.id, updatedAt: new Date() },
      { where: { reimbursementId: id, tenantId } },
    );

    return Helper.response(
      true,
      "Reimbursement status updated successfully",
      existingDoc,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating reimbursement status:", error);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.updateReimbursement = async (req, res) => {
  const {
    id,
    amount,
    toDate,
    fromDate,
    employeeId,
    remark,
    status = "active",
  } = req.body;

  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  try {
    if (!tenantId || !id) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(
        false,
        "Tenant ID and ID are required",
        null,
        res,
        400,
      );
    }

    const existingDoc = await Reimbursement.findOne({
      where: { id, tenantId, branchId },
    });

    if (!existingDoc) {
      Helper.deleteUploadedFiles(req.files);
      return Helper.response(false, "Reimbursement not found", null, res, 404);
    }

    if (!req.files || req.files.length === 0) {
      existingDoc.amount = amount;
      existingDoc.toDate = toDate;
      existingDoc.fromDate = fromDate;
      existingDoc.employeeId = employeeId;
      existingDoc.remark = remark;
      existingDoc.status = status || "active";
      existingDoc.updatedBy = req.users?.id;
      existingDoc.updatedAt = new Date();

      await existingDoc.save();

      return Helper.response(
        true,
        "Reimbursement updated successfully ",
        {},
        res,
        200,
      );
    }

    for (const file of req.files) {
      // Delete old file if exists
      if (existingDoc.image) {
        const oldFilePath = path.join(
          __dirname,
          "../../../upload",
          existingDoc.image,
        );

        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            console.log("Old file deleted:", oldFilePath);
          } catch (err) {
            console.error("Error deleting old file:", err);
          }
        }
      }

      existingDoc.image = file.filename;
      existingDoc.doc_type = file.mimetype;
      existingDoc.amount = amount;
      existingDoc.toDate = toDate;
      existingDoc.fromDate = fromDate;
      existingDoc.employeeId = employeeId;
      existingDoc.branchId = branchId;
      existingDoc.remark = remark;
      existingDoc.status = status || "active";
      existingDoc.updatedBy = req.users?.id;
      existingDoc.updatedAt = new Date();

      await existingDoc.save();
      console.log("New file uploaded:", file.filename);
    }

    return Helper.response(
      true,
      "Reimbursement updated successfully",
      {},
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating documents:", error);
    Helper.deleteUploadedFiles(req.files);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.deleteReimbursement = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users?.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    if (!tenantId || !id) {
      return Helper.response(
        false,
        "Tenant ID And ID are required",
        null,
        res,
        400,
      );
    }

    const delteholiday = await Reimbursement.findOne({
      where: { id: id, tenantId, branchId },
    });

    if (!delteholiday) {
      return Helper.response(false, "Document not found", null, res, 404);
    }

    const filePath = path.join(
      __dirname,
      "../../../upload",
      delteholiday.image,
    );
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Error deleting file ${delteholiday.image}:`, err);
      }
    }

    await delteholiday.destroy();

    return Helper.response(
      true,
      "Reimbursement deleted successfully",
      null,
      res,
      200,
    );
  } catch (error) {
    console.error("Error deleting document:", error);
    return Helper.response(false, error?.message, null, res, 500);
  }
};

exports.getWeekendAttendance = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const { emp_id, month, year, is_comp_off_approve = false } = req.body;
  const branchId = req.users?.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId || !month || !year) {
    return Helper.response(false, "Missing required parameters", [], res, 400);
  }

  try {
    let employees = [];

    if (emp_id == "All" || emp_id == "all") {
      employees = await empPersonal.findAll({
        where: { tenantId, branchId },
        attributes: ["id", "firstName", "lastName", "shift_id", "empCode"],
        raw: true,
      });
    } else {
      const emp = await empPersonal.findOne({
        where: { id: emp_id, tenantId, branchId },
        attributes: ["id", "firstName", "lastName", "shift_id", "empCode"],
        raw: true,
      });

      if (!emp) {
        return Helper.response(false, "Employee not found", [], res, 404);
      }

      employees = [emp];
    }

    const startDate = moment(
      `${year}-${String(month).padStart(2, "0")}-01`,
      "YYYY-MM-DD",
    );

    const endDate = startDate.clone().endOf("month");

    const attendanceRecords = await attendance.findAll({
      where: {
        tenantId,
        branchId,
        is_comp_off_approve: is_comp_off_approve,
        check_in_time: {
          [Op.between]: [
            startDate.format("YYYY-MM-DD 00:00:00"),
            endDate.format("YYYY-MM-DD 23:59:59"),
          ],
        },
      },
      attributes: [
        "id",
        "employeeId",
        "check_in_time",
        "check_out_time",
        "is_comp_off_approve",
      ],
      raw: true,
    });

    const allShifts = await Shift.findAll({
      where: { tenantId, branchId },
      attributes: ["id", "day_of_week", "is_week_off", "startTime", "shift"],
      raw: true,
    });

    const shiftMapByShiftId = {};

    for (const shift of allShifts) {
      if (!shiftMapByShiftId[shift.shift]) {
        shiftMapByShiftId[shift.shift] = [];
      }
      shiftMapByShiftId[shift.shift].push(shift);
    }

    const attendanceMap = {};

    for (const record of attendanceRecords) {
      if (!attendanceMap[record.employeeId]) {
        attendanceMap[record.employeeId] = [];
      }
      attendanceMap[record.employeeId].push(record);
    }

    const weekendAttendance = [];

    for (const emp of employees) {
      const empRecords = attendanceMap[emp.id] || [];

      const shiftMap = shiftMapByShiftId[emp.shift_id] || [];

      for (const rec of empRecords) {
        const checkInTime = moment(rec.check_in_time);
        const checkOutTime = moment(rec.check_out_time);
        const dayName = checkInTime.format("dddd");

        const empShift = shiftMap.find((s) => s.day_of_week == dayName);

        const durationMinutes = checkOutTime.diff(checkInTime, "minutes");

        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;

        const duration = `${hours} hr ${minutes} min`;

        // console.log(duration);
        if (!empShift) continue;

        // 🎯 MAIN CONDITION:
        // If week off BUT employee present
        if (empShift.is_week_off) {
          weekendAttendance.push({
            id: rec.id,
            employeeId: emp.id,
            empCode: emp.empCode ?? 0,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            date: checkInTime.format("YYYY-MM-DD"),
            day: dayName,
            checkIn: checkInTime.format("HH:mm:ss"),
            checkOut: checkOutTime.format("HH:mm:ss"),
            status: "Present on Week Off",
            is_comp_off_approve: rec?.is_comp_off_approve,
            duration: duration,
          });
        }
      }
    }

    if (weekendAttendance.length == 0) {
      return Helper.response(
        false,
        "No weekend attendance found",
        [],
        res,
        200,
      );
    }

    return Helper.response(
      true,
      "Weekend attendance found",
      weekendAttendance,
      res,
      200,
    );
  } catch (error) {
    console.log("Weekend Attendance Error:", error);
    return Helper.response(false, "Something went wrong", error, res, 500);
  }
};

exports.CreateManuallyCompoff = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    let { employeeId, earnedDate, totalDays } = req.body;
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    if (!tenantId) {
      await transaction.rollback();
      return Helper.response(false, "Tenant ID is required", {}, res, 400);
    }

    if (!branchId) {
      await transaction.rollback();
      return Helper.response(false, "Branch ID is required", {}, res, 400);
    }

    if (!employeeId || !earnedDate) {
      await transaction.rollback();
      return Helper.response(false, "Employee & Date required", {}, res, 400);
    }

    if (moment(earnedDate).isAfter(moment(), "day")) {
      await transaction.rollback();
      return Helper.response(
        false,
        "Comp-Off can only be added for past dates",
        {},
        res,
        400
      );
    }

    let employeeList = [];

    // ✅ If All Selected
    if (employeeId === "All") {
      const employees = await empPersonal.findAll({
        where: {
          status: "active",
          branchId,
          tenantId,
        },
        attributes: ["id"],
        raw: true,
        transaction,
      });

      employeeList = employees.map((emp) => emp.id);

      if (!employeeList.length) {
        await transaction.rollback();
        return Helper.response(false, "No Active Employees Found", {}, res, 400);
      }

    } else {
      employeeList = [employeeId]; // single employee
    }

    const createdEntries = [];

    for (let empId of employeeList) {

      // ✅ Check duplicate for each employee
      const existsData = await comp_off.findOne({
        where: {
          employeeId: empId,
          branchId,
          tenantId,
          earnedDate,
          status: "active",
          approval_status: { [Op.ne]: "rejected" },
        },
        transaction,
      });

      if (!existsData) {
        const entry = await comp_off.create(
          {
            employeeId: empId,
            branchId,
            tenantId,
            earnedDate,
            expiryDate: moment(earnedDate)
              .add(3, "months")
              .format("YYYY-MM-DD"),
            totalDays: totalDays || 1,
            remainingDays: totalDays || 1,
            usedDays: 0,
            status: "active",
            approval_status: "pending",
            createdBy: req.users?.id,
          },
          { transaction }
        );

        createdEntries.push(entry);
      }
    }

    await transaction.commit();

    return Helper.response(
      true,
      "Comp-Off Added Successfully.",
      createdEntries,
      res,
      200
    );

  } catch (error) {
    await transaction.rollback();
    console.error(error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.listManuallyCompoff = async (req, res) => {
  try {
    const { employeeId, month, year, status = "pending" } = req.body;
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", {}, res, 400);
    }
    if (!branchId) {
      return Helper.response(false, "Branch ID is required", {}, res, 400);
    }

    // if (!employeeId || !year || !month) {
    //   return Helper.response(
    //     false,
    //     "Employee , Month , Year required",
    //     {},
    //     res,
    //     400,
    //   );
    // }
 let whereCondition = {
  approval_status: status,
};

// Add month & year filter
if (month && year) {
  whereCondition = {
    ...whereCondition,
    [Op.and]: [
      where(fn("EXTRACT", literal('MONTH FROM "earnedDate"')), month),
      where(fn("EXTRACT", literal('YEAR FROM "earnedDate"')), year),
    ],
  };
}

// Only add employee filter if not "All"
if (employeeId && employeeId !== "All") {
  whereCondition.employeeId = employeeId;
}

const data = await comp_off.findAll({
  where: whereCondition,
  raw: true,
  order:[["createdAt","desc"]]
});

    // const data = await comp_off.findAll({
    //   where: {
    //     [Op.and]: [
    //       where(fn("EXTRACT", literal('MONTH FROM "earnedDate"')), month),
    //       where(fn("EXTRACT", literal('YEAR FROM "earnedDate"')), year),
    //     ],
    //     approval_status: status,
    //     employeeId: { [Op.in]: employeeId },
    //   },
    //   raw: true,
    // });

    if (data.length == 0) {
      return Helper.response(false, "No Data Found", {}, res, 400);
    }

    const finalData = await Promise.all(
      data.map(async (item) => {
        const employee = await empPersonal.findOne({
          where: {
            id: item?.employeeId,
          },
          raw: true,
        });
        return {
          ...item,
          employeeName: `${employee?.firstName} ${employee?.lastName}`,
        };
      }),
    );

    return Helper.response(
      true,
      "Data Found Successfully.",
      finalData,
      res,
      200,
    );
  } catch (error) {
    console.error(error);
    return Helper.response(false, error?.message, {}, res, 500);
  }
};


