const Helper = require("../../helper/helper");
const attendance = require("../../models/attendance");
const Department = require("../../models/department");
const Designation = require("../../models/designation");
const empPersonal = require("../../models/empPersonal");
const LetterData = require("../../models/letter_data");
const Tenant = require("../../models/tenant");
const BankAccount = require("../../models/bankAccnt");
const State = require("../../models/state");
const Country = require("../../models/country");
const EmploymentType = require("../../models/employmentType");
const City = require("../../models/city");
const LeaveBalance = require("../../models/leaveBalance");
const leaveMaster = require("../../models/leaveMaster");
const leave_application = require("../../models/leave_application");
const Shift = require("../../models/shift");
const attendanceSetting = require("../../models/attendanceSetting");
// const { Op, fn, col } = require("sequelize");
const { Op, fn, col, where, literal } = require("sequelize");
const moment = require("moment");
const holiday = require("../../models/holiday");
const HolidayType = require("../../models/HolidayType");
const Basic = require("../../models/basic");
const Allowance = require("../../models/allowance");
const deduction = require("../../models/deductions");
const bill_info = require("../../models/bill_info");
const bills = require("../../models/bill");
const base_url = process.env.BASE_URL;
const sequelize = require("../../connection/connection");
const { v4: uuidv4 } = require("uuid");

const PdfPrinter = require("pdfmake");
const dayMap = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const path = require("path");

// Fonts for pdfmake
const fonts = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const printer = new PdfPrinter(fonts);
const fs = require("fs");
const leave_balance = require("../../models/leaveBalance");

const AttendanceRegularization = require("../../models/attendance_regularization");
const { ReimbursementFile } = require("../../models/associations");
const reimbursement = require("../../models/reimbursement");
const branch = require("../../models/branch");
// const branch = require("../../models/branch");

// exports.getDailyAttendance = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const employeeId = req.users?.id;
//   const reportingPersonId = req.users?.reportingPersonId;

//   if (!tenantId || !employeeId) {
//     return Helper.response(false, "User Not Found", [], res, 404);
//   }

//   try {
//     const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

//     // Fetch today's attendance
//     let dailyAttendance = await attendance.findOne({
//       where: {
//         employeeId,
//         tenantId,
//         date: { [Op.eq]: today },
//       },
//       raw: true,
//     });

//     // Fetch reporting person + department + designation in parallel
//     const reportingPersonDetail = await empPersonal.findOne({
//       where: { id: reportingPersonId },
//       raw: true,
//     });

//     if (reportingPersonDetail) {
//       const [department, designation] = await Promise.all([
//         Department.findOne({
//           where: { id: reportingPersonDetail.departmentId, status: "active" },
//         }),
//         Designation.findOne({
//           where: { id: reportingPersonDetail.designationId, status: "active" },
//         }),
//       ]);
//       reportingPersonDetail["department"] = department?.name;
//       reportingPersonDetail["designation"] = designation?.name;
//       // reportingPersonDetail.setDataValue("department", department?.name);
//       // reportingPersonDetail.setDataValue("designation", designation?.name);
//     }
//     // if (!dailyAttendance) {
//     //   return Helper.response(
//     //     false,
//     //     "Attendance Record Not Found",
//     //     [],
//     //     res,
//     //     404
//     //   );
//     // }

//     console.log(dailyAttendance, "daily attendance");

//     //  if(dailyAttendance&&dailyAttendance.length>0){
//     //  }

//     if (!dailyAttendance) {
//         dailyAttendance={
//          "id": null,
//         "tenantId": tenantId,
//         "employeeId": employeeId,

//         "date": today,
//         "check_in_time": 0,
//         "check_out_time": 0,
//         "is_present": null,
//         "createdBy": null,
//         "updatedBy": null
//       }
//       dailyAttendance.reportingPersonDetail =  reportingPersonDetail ;
//     } else {
//       // enrich with reporting person
//       dailyAttendance.reportingPersonDetail = reportingPersonDetail
//         ? reportingPersonDetail
//         : null;
//     }
//     //  dailyAttendance.reportingPersonDetail = reportingPersonDetail? reportingPersonDetail: null;

//     return Helper.response(
//       true,
//       "Record Found Successfully!",
//       dailyAttendance,
//       res,
//       200
//     );
//   } catch (error) {
//     console.error("Error fetching date-wise attendance:", error);
//     return Helper.response(false, error.message, [], res, 500);
//   }
// };

// exports.upcomingLeave = async (req, res) => {
//   const { date } = req.body;
//   const tenantId = req.users && req.users.tenantId;
//   const emp_id = req.users?.id;
//   if (!tenantId) {
//     return Helper.response(false, "Tenant Not Found", [], res, 200);
//   }
//   if (!date) {
//     return Helper.response(
//       false,
//       "month, and year are required.",
//       [],
//       res,
//       200
//     );
//   }

//   try {
//     const leaveData = await leave_application.findAll({
//       where: {
//         fromDate: {
//           [Op.gt]: date,
//         },
//         employeeId:emp_id,
//         tenantId
//       },
//       raw: true,
//       order: [["createdAt", "desc"]],
//     });

//     if (leaveData.length == 0) {
//       return Helper.response(false, "No Data Found", [], res, 200);
//     }

//     const data = await Promise.all(
//       leaveData.map(async (item) => {
//         const empdata = await empPersonal.findOne({
//           where: {
//             id: item?.approverId,
//           },
//         });
//         const leavetype = await leaveMaster.findOne({
//           where: {
//             id: item?.leaveTypeId,
//           },
//         });
//         return {
//           ...item,
//           approvedBy: `${empdata?.firstName} ${empdata?.lastName}`,
//           leaveType: leavetype?.leaveName,
//         };
//       })
//     );

//     return Helper.response(true, "Record Found Successfully!", data, res, 200);
//   } catch (error) {
//     console.error("Error updating attendance settings:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

exports.getDailyAttendance = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const employeeId = req.users?.id;
  const reportingPersonId = req.users?.reportingPersonId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId || !employeeId) {
    return Helper.response(false, "User Not Found", [], res, 404);
  }

  try {
    const currentDate = moment();
    const today = currentDate.format("YYYY-MM-DD");
    const dayName = currentDate.format("dddd");

    // Fetch today's attendance
    let dailyAttendance = await attendance.findOne({
      where: {
        employeeId,
        tenantId,
        branchId,
        date: today,
      },
      raw: true,
    });

    // Fetch attendance settings and reporting person details
    const [AttendanceSettings, reportingPersonDetail] = await Promise.all([
      attendanceSetting.findOne({ where: { branchId, tenantId }, raw: true }),
      empPersonal.findOne({
        where: { branchId, id: reportingPersonId },
        raw: true,
      }),
    ]);

    // Enrich reporting person with department & designation
    if (reportingPersonDetail) {
      const [department, designation] = await Promise.all([
        Department.findOne({
          where: {
            branchId,
            id: reportingPersonDetail.departmentId,
            status: "active",
          },
          raw: true,
        }),
        Designation.findOne({
          where: {
            branchId,
            id: reportingPersonDetail.designationId,
            status: "active",
          },
          raw: true,
        }),
      ]);

      reportingPersonDetail.department = department?.name ?? null;
      reportingPersonDetail.designation = designation?.name ?? null;
    }

    if (!dailyAttendance) {
      const holidayData = await holiday.findOne({
        where: { branchId, date: today, tenantId, status: "active" },
        raw: true,
      });

      if (holidayData) {
        const holidayType = await HolidayType.findOne({
          where: { branchId, id: holidayData?.holiday_type },
          raw: true,
        });
        dailyAttendance = {
          id: null,
          tenantId,
          employeeId,
          date: today,
          status: "Holiday",
          name: holidayData?.holiday_name ?? "",
          holiday_type: holidayType?.name ?? "",
          check_in_time: null,
          check_out_time: null,
          leaveStatus: 0,
          image: holidayData?.image ?? "",
        };
      } else {
        const shiftData = await Shift.findOne({
          where: {
            branchId,
            tenantId,
            day_of_week: dayName,
            is_week_off: true,
            status: "inactive",
          },
          raw: true,
        });

        if (shiftData) {
          dailyAttendance = {
            id: null,
            tenantId,
            employeeId,
            date: today,
            status: "Week Off",
            check_in_time: null,
            check_out_time: null,
            leaveStatus: 0,
            image: "",
          };
        } else {
          const leaveData = await leave_application.findOne({
            where: {
              branchId,
              employeeId,
              tenantId,
              [Op.or]: [{ fromDate: today }, { toDate: today }],
              status: {
                [Op.ne]: "self_declined",
              },
            },
            raw: true,
          });

          if (leaveData) {
            if (leaveData?.duration_type == "first_half") {
              dailyAttendance = {
                id: null,
                tenantId,
                employeeId,
                date: today,
                status: "First Half",
                leaveStatus: leaveData?.duration_type ?? "",
                check_in_time: null,
                check_out_time: null,
                image: "",
              };
            } else if (leaveData?.duration_type == "second_half") {
              dailyAttendance = {
                id: null,
                tenantId,
                employeeId,
                date: today,
                status: "Second Half",
                leaveStatus: leaveData?.duration_type ?? "",
                check_in_time: null,
                check_out_time: null,
                image: "",
              };
            } else {
              dailyAttendance = {
                id: null,
                tenantId,
                employeeId,
                date: today,
                status: "On Leave",
                leaveStatus: leaveData?.duration_type ?? "",
                check_in_time: null,
                check_out_time: null,
                image: "",
              };
            }
          } else {
            dailyAttendance = {
              id: null,
              tenantId,
              employeeId,
              date: today,
              status: "Absent",
              check_in_time: null,
              check_out_time: null,
              leaveStatus: 0,
              image: "",
            };
          }
        }
      }
    } else {
      // Attendance found → evaluate Late / Half Day / On Time
      const shiftData = await Shift.findOne({
        where: {
          branchId,
          shift: req.users?.shift_id,
          tenantId,
          status: "active",
          day_of_week: dayName,
        },
        raw: true,
      });

      let status = "On Time";

      if (shiftData) {
        const shiftStart = moment(
          `${today} ${shiftData.startTime}`,
          "YYYY-MM-DD HH:mm:ss",
        );
        const shiftEnd = moment(
          `${today} ${shiftData.endTime}`,
          "YYYY-MM-DD HH:mm:ss",
        );

        if (shiftEnd.isBefore(shiftStart)) shiftEnd.add(1, "day");

        const checkInTime = moment(dailyAttendance.check_in_time);
        const checkOutTime = moment(dailyAttendance.check_out_time);
        const allowedTime = shiftStart
          .clone()
          .add(AttendanceSettings?.graceMinutes || 0, "minutes");

        if (checkInTime.isAfter(allowedTime)) {
          const minutesLate = checkInTime.diff(allowedTime, "minutes");
          if (minutesLate >= 60) {
            const hours = Math.floor(minutesLate / 60);
            const mins = minutesLate % 60;
            status = `Late by ${
              hours ? `${hours} hr${hours > 1 ? "s" : ""}` : ""
            } ${mins ? `${mins} min` : ""}`;
          } else {
            status = `Late by ${minutesLate} min`;
          }
        } else if (checkOutTime.isBefore(shiftEnd)) {
          status = "Half Day";
        } else {
          status = "On Time";
        }
      } else {
        status = "Absent";
      }

      dailyAttendance.status = status;
    }

    // Attach reporting person detail
    dailyAttendance.reportingPersonDetail = reportingPersonDetail || null;

    return Helper.response(
      true,
      "Record Found Successfully!",
      dailyAttendance,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching date-wise attendance:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.upcomingLeave = async (req, res) => {
  const { date } = req.body;
  const tenantId = req.users?.tenantId;
  const userId = req.users?.id;
  const role = req.users?.role;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId) {
    return Helper.response(false, "Tenant Not Found", [], res, 200);
  }

  if (!date) {
    return Helper.response(false, "Date is required.", [], res, 200);
  }

  try {
    let employeeIds = [];

    // 👇 Role-based logic
    if (role == "teamLeader") {
      // Team Leader: own + reportees
      const reportees = await empPersonal.findAll({
        where: {
          branchId,
          reportingPersonId: userId,
          tenantId,
          status: "active",
        },
        attributes: ["id"],
        raw: true,
      });

      employeeIds = reportees.map((r) => r.id);
      employeeIds.push(userId); // include self
    } else if (role === "manager" || role === "director") {
      // Manager/Director: own + all subordinates under them
      const subordinates = await Helper.getAllSubordinates(
        userId,
        branchId,
        tenantId,
      );
      employeeIds = [...subordinates, userId]; // include self
    } else {
      // Employee: only their own leaves
      employeeIds = [userId];
    }

    //  Fetch upcoming leaves
    const leaveData = await leave_application.findAll({
      where: {
        branchId,
        fromDate: { [Op.gt]: date },
        employeeId: { [Op.in]: employeeIds },
        tenantId,
      },
      raw: true,
      order: [["createdAt", "desc"]],
    });

    if (!leaveData.length) {
      return Helper.response(false, "No Data Found", [], res, 200);
    }

    // 👇 Add employee name, approver & leave type info
    const data = await Promise.all(
      leaveData.map(async (item) => {
        const [employee, approver, leaveType] = await Promise.all([
          empPersonal.findOne({
            where: { id: item.employeeId },
            attributes: ["firstName", "lastName"],
            raw: true,
          }),
          empPersonal.findOne({
            where: { branchId, id: item.approverId },
            attributes: ["firstName", "lastName"],
            raw: true,
          }),
          leaveMaster.findOne({
            where: { branchId, id: item.leaveTypeId },
            attributes: ["leaveName"],
            raw: true,
          }),
        ]);

        return {
          ...item,
          employeeName: employee
            ? `${employee.firstName} ${employee.lastName}`.trim()
            : null,
          approvedBy: approver
            ? `${approver.firstName} ${approver.lastName}`
            : null,
          leaveType: leaveType?.leaveName || null,
        };
      }),
    );

    return Helper.response(true, "Record Found Successfully!", data, res, 200);
  } catch (error) {
    console.error("Error fetching upcoming leaves:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.getAttendance = async (req, res) => {
  const { month, year } = req.body;
  const tenantId = req.users?.tenantId;
  const emp_id = req.users?.id;
  const shift_id = req.users?.shift_id;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!month || !year) {
    return Helper.response(false, "Month and year are required.", [], res, 400);
  }

  try {
    const startDate = moment(
      `${year}-${String(month).padStart(2, "0")}-01`,
      "YYYY-MM-DD",
    );
    const endDate = startDate.clone().endOf("month");
    // const totalDays = endDate.date();/
    // Get today's date for comparison
    const today = moment();

    // Determine the last day to loop up to
    let loopEndDate = endDate;

    // If selected month and year are current, stop at today’s date
    if (startDate.isSame(today, "month") && startDate.isSame(today, "year")) {
      loopEndDate = today.clone();
    }

    const totalDays = loopEndDate.date();
    let shiftMap = await Shift.findAll({
      where: { tenantId, shift: shift_id, branchId },
      attributes: ["day_of_week", "is_week_off", "startTime", "endTime"],
      raw: true,
    });

    // Map day_of_week to number
    shiftMap.forEach((s) => {
      s.day_num =
        typeof s.day_of_week == "string"
          ? dayMap[s.day_of_week]
          : s.day_of_week;
    });

    const weekOffDays = shiftMap
      .filter((s) => s.is_week_off)
      .map((s) => s.day_num);

    const emp = await empPersonal.findOne({
      where: { id: emp_id, branchId },
      attributes: ["id", "firstName", "lastName"],
      raw: true,
    });
    if (!emp) return Helper.response(false, "Employee not found", [], res, 404);

    const records = await attendance.findAll({
      where: {
        employeeId: emp_id,
        check_in_time: {
          [Op.between]: [
            startDate.format("YYYY-MM-DD 00:00:00"),
            endDate.format("YYYY-MM-DD 23:59:59"),
          ],
        },
        branchId,
      },
      raw: true,
    });

    const AttendanceSettings = await attendanceSetting.findOne({
      where: { tenantId, branchId },
      raw: true,
    });
    // const HolidayData = await holiday.findAll({
    //   where: {
    //     tenantId,
    //     [Op.and]: [
    //       where(fn("MONTH", col("date")), month),
    //       where(fn("YEAR", col("date")), year),
    //     ],
    //   },
    //   order: [["date", "ASC"]], // optional, sort by date
    //   raw: true,
    // });

    // Group attendance by day
    const groupedRecords = {};
    records.forEach((r) => {
      const day = moment(r.check_in_time).date();
      if (!groupedRecords[r.employeeId]) groupedRecords[r.employeeId] = {};
      groupedRecords[r.employeeId][day] = {
        checkIn: r.check_in_time || null,
        checkOut: r.check_out_time || null,
      };
    });

    const finalResult = [];
    const recordMap = groupedRecords[emp.id] || {};
    let data = [];

    for (let i = 1; i <= totalDays; i++) {
      let HolidayData;
      const currentDate = moment(`${year}-${month}-${i}`, "YYYY-MM-DD");
      const dayNum = currentDate.day();
      const entry = recordMap[i];
      let status;

      if (!entry) {
        HolidayData = await holiday.findOne({
          where: {
            tenantId,

            date: currentDate,
          },
          order: [["date", "ASC"]],
          raw: true,
        });
        if (HolidayData) {
          status = "Holiday";
        } else {
          const leaveData = await leave_application.findOne({
            where: {
              employeeId: emp_id,
              tenantId,
              branchId,
              fromDate: { [Op.lte]: currentDate },
              toDate: { [Op.gte]: currentDate },
              status: {
                [Op.ne]: "self_declined",
              },
            },
          });
          //           const leaveData = await leave_application.findOne({
          //   where: {
          //     [Op.or]: [
          //       { fromDate: new Date(currentDate) },
          //       { toDate: new Date(currentDate) }
          //     ]
          //   }
          // })
          if (leaveData) {
            if (leaveData?.duration_type == "first_half") {
              status = "First Half";
            } else if (leaveData?.duration_type == "second_half") {
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
      }
      // Absent
      // else if (!entry?.checkIn || !entry?.checkOut) {
      //   status = "Present";
      // }
      // Check shift
      else if (shiftMap.length > 0) {
        const shiftForDay = shiftMap.find((s) => s.day_num == dayNum);
        if (shiftForDay) {
          let shiftStart = moment(
            `${currentDate.format("YYYY-MM-DD")} ${shiftForDay.startTime}`,
            "YYYY-MM-DD HH:mm:ss",
          );
          let shiftEnd = moment(
            `${currentDate.format("YYYY-MM-DD")} ${shiftForDay.endTime}`,
            "YYYY-MM-DD HH:mm:ss",
          );

          // Handle overnight shift
          if (shiftEnd.isBefore(shiftStart)) shiftEnd.add(1, "day");

          // const checkInTime = moment(entry.checkIn);
          // const checkOutTime = moment(entry.checkOut);
          // const allowedTime = shiftStart
          //   .clone()
          //   .add(AttendanceSettings.graceMinutes, "minutes");

          const checkInTime = moment(entry.checkIn).seconds(0).milliseconds(0);
          const checkOutTime = moment(entry.checkOut)
            .seconds(0)
            .milliseconds(0);
          const allowedTime = shiftStart
            .clone()
            .add(AttendanceSettings?.graceMinutes, "minutes")
            .seconds(0)
            .milliseconds(0);

          if (checkInTime.isAfter(allowedTime)) {
            // const minutesLate = checkInTime.diff(allowedTime, "minutes");
            // status = `Late by ${minutesLate} Min`;
            const minutesLate = checkInTime.diff(allowedTime, "minutes");
            if (minutesLate > 0) {
              // const leavelateData = await leave_application.findOne({
              //   where: {
              //     employeeId: emp_id,
              //     tenantId,
              //     branchId,
              //     status: {
              //       [Op.ne]: "self_declined",
              //     },
              //     [Op.or]: [
              //       { fromDate: currentDate },
              //       { toDate: currentDate },
              //       {
              //         fromDate: { [Op.lte]: currentDate },
              //         toDate: { [Op.gte]: currentDate },
              //       },
              //     ],
              //   },
              // });
              const leavelateData = await leave_application.findOne({
                where: {
                  employeeId: emp_id,
                  tenantId,
                  branchId,
                  status: { [Op.ne]: "self_declined" },
                  fromDate: { [Op.lte]: currentDate },
                  toDate: { [Op.gte]: currentDate },
                },
              });

              if (leavelateData) {
                if (leavelateData?.duration_type == "first_half") {
                  status = "First Half";
                } else if (leavelateData?.duration_type == "second_half") {
                  status = "Second Half";
                } else {
                  status = "On Leave";
                }
              } else {
                if (!AttendanceSettings) {
                  status = "On Time";
                } else {
                  if (minutesLate >= 60) {
                    const hours = Math.floor(minutesLate / 60);
                    const mins = minutesLate % 60;

                    if (mins === 0) {
                      status = `Late by ${hours} hr${hours > 1 ? "s" : ""}`;
                    } else {
                      status = `Late by ${hours} hr${
                        hours > 1 ? "s" : ""
                      } ${mins} min`;
                    }
                  } else {
                    status = `Late by ${minutesLate} min`;
                  }
                }
              }
            } else {
              status = "Absent";
            }
          } else if (checkOutTime.isBefore(shiftEnd)) {
            status = "Half Day";
          } else {
            status = "On Time";
          }
        } else {
          status = "Absent";
        }
      }

      data.push({
        date: currentDate.format("YYYY-MM-DD"),
        checkIn: entry?.checkIn ? moment(entry.checkIn).format("HH:mm") : null,
        checkOut: entry?.checkOut
          ? moment(entry.checkOut).format("HH:mm")
          : null,
        status,
        day: currentDate.format("dddd"),
        image: HolidayData?.image ?? null,
        holidayName: HolidayData?.holiday_name ?? null,
      });
    }
    data = data.sort((a, b) => new Date(b.date) - new Date(a.date));
    finalResult.push({
      employee_name: Helper.capitalizeFirstLetter(
        `${emp.firstName} ${emp.lastName}`,
      ),
      data,
    });

    const holidayData = await holiday.findAll({
      where: {
        tenantId,
        branchId,
        [Op.and]: [
          where(fn("EXTRACT", literal('MONTH FROM "date"')), month),
          where(fn("EXTRACT", literal('YEAR FROM "date"')), year),
        ],
      },
      order: [["date", "ASC"]],
      raw: true,
    });

    let workingDays = Helper.getWorkingholidays(
      year,
      month,
      weekOffDays,
      holidayData,
    );

    const summary = Helper.calculateAttendanceSummary(
      finalResult,
      shiftMap,
      AttendanceSettings,
      workingDays,
    );

    const dataAsc = [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const latePayrollPreview = Helper.computeLatePayrollPreview(
      shiftMap,
      dataAsc,
      AttendanceSettings,
    );

    return Helper.response(
      true,
      "Record Found Successfully!",
      {
        AttendanceList: finalResult,
        summary,
        latePayrollPreview,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};
// exports.getAttendance = async (req, res) => {
//   const { month, year } = req.body;
//   const tenantId = req.users?.tenantId;
//   const emp_id = req.users?.id;
//   const shift_id = req.users?.shift_id;
//   const branchId = req.users && req.users.branchId;

//   if (!branchId || branchId == "null") {
//     return Helper.response(false, "branchId is required!", {}, res, 200);
//   }
//   if (!month || !year) {
//     return Helper.response(false, "Month and year are required.", [], res, 400);
//   }

//   try {
//     const startDate = moment(
//       `${year}-${String(month).padStart(2, "0")}-01`,
//       "YYYY-MM-DD",
//     );
//     const endDate = startDate.clone().endOf("month");
//     // const totalDays = endDate.date();/
//     // Get today's date for comparison
//     const today = moment();

//     // Determine the last day to loop up to
//     let loopEndDate = endDate;

//     // If selected month and year are current, stop at today’s date
//     if (startDate.isSame(today, "month") && startDate.isSame(today, "year")) {
//       loopEndDate = today.clone();
//     }

//     const totalDays = loopEndDate.date();
//     let shiftMap = await Shift.findAll({
//       where: { tenantId, shift: shift_id, branchId },
//       attributes: ["day_of_week", "is_week_off", "startTime", "endTime"],
//       raw: true,
//     });

//     // Map day_of_week to number
//     shiftMap.forEach((s) => {
//       s.day_num =
//         typeof s.day_of_week == "string"
//           ? dayMap[s.day_of_week]
//           : s.day_of_week;
//     });

//     const weekOffDays = shiftMap
//       .filter((s) => s.is_week_off)
//       .map((s) => s.day_num);

//     const emp = await empPersonal.findOne({
//       where: { id: emp_id, branchId },
//       attributes: ["id", "firstName", "lastName"],
//       raw: true,
//     });
//     if (!emp) return Helper.response(false, "Employee not found", [], res, 404);

//     const records = await attendance.findAll({
//       where: {
//         employeeId: emp_id,
//         check_in_time: {
//           [Op.between]: [
//             startDate.format("YYYY-MM-DD 00:00:00"),
//             endDate.format("YYYY-MM-DD 23:59:59"),
//           ],
//         },
//         branchId,
//       },
//       raw: true,
//     });

//     const AttendanceSettings = await attendanceSetting.findOne({
//       where: { tenantId, branchId },
//       raw: true,
//     });
//     // const HolidayData = await holiday.findAll({
//     //   where: {
//     //     tenantId,
//     //     [Op.and]: [
//     //       where(fn("MONTH", col("date")), month),
//     //       where(fn("YEAR", col("date")), year),
//     //     ],
//     //   },
//     //   order: [["date", "ASC"]], // optional, sort by date
//     //   raw: true,
//     // });

//     // Group attendance by day
//     const groupedRecords = {};
//     records.forEach((r) => {
//       const day = moment(r.check_in_time).date();
//       if (!groupedRecords[r.employeeId]) groupedRecords[r.employeeId] = {};
//       groupedRecords[r.employeeId][day] = {
//         checkIn: r.check_in_time || null,
//         checkOut: r.check_out_time || null,
//       };
//     });

//     const finalResult = [];
//     const recordMap = groupedRecords[emp.id] || {};
//     let data = [];

//     for (let i = 1; i <= totalDays; i++) {
//       let HolidayData;
//       const currentDate = moment(`${year}-${month}-${i}`, "YYYY-MM-DD");
//       const dayNum = currentDate.day();
//       const entry = recordMap[i];
//       let status;

//       if (!entry) {
//         HolidayData = await holiday.findOne({
//           where: {
//             tenantId,

//             date: currentDate,
//           },
//           order: [["date", "ASC"]],
//           raw: true,
//         });
//         if (HolidayData) {
//           status = "Holiday";
//         } else {
//           const leaveData = await leave_application.findOne({
//             where: {
//               employeeId: emp_id,
//               tenantId,
//               branchId,
//               fromDate: { [Op.lte]: currentDate },
//               toDate: { [Op.gte]: currentDate },
//               status: {
//                 [Op.ne]: "self_declined",
//               },
//             },
//           });
//           //           const leaveData = await leave_application.findOne({
//           //   where: {
//           //     [Op.or]: [
//           //       { fromDate: new Date(currentDate) },
//           //       { toDate: new Date(currentDate) }
//           //     ]
//           //   }
//           // })
//           if (leaveData) {
//             if (leaveData?.duration_type == "first_half") {
//               status = "First Half";
//             } else if (leaveData?.duration_type == "second_half") {
//               status = "Second Half";
//             } else {
//               status = "On Leave";
//             }
//           } else if (weekOffDays.includes(dayNum)) {
//             status = "Week Off";
//           } else {
//             status = "Absent";
//           }
//         }
//       }
//       // Absent
//       // else if (!entry?.checkIn || !entry?.checkOut) {
//       //   status = "Present";
//       // }
//       // Check shift
//       else if (shiftMap.length > 0) {
//         const shiftForDay = shiftMap.find((s) => s.day_num == dayNum);
//         if (shiftForDay) {
//           let shiftStart = moment(
//             `${currentDate.format("YYYY-MM-DD")} ${shiftForDay.startTime}`,
//             "YYYY-MM-DD HH:mm:ss",
//           );
//           let shiftEnd = moment(
//             `${currentDate.format("YYYY-MM-DD")} ${shiftForDay.endTime}`,
//             "YYYY-MM-DD HH:mm:ss",
//           );

//           // Handle overnight shift
//           if (shiftEnd.isBefore(shiftStart)) shiftEnd.add(1, "day");

//           // const checkInTime = moment(entry.checkIn);
//           // const checkOutTime = moment(entry.checkOut);
//           // const allowedTime = shiftStart
//           //   .clone()
//           //   .add(AttendanceSettings.graceMinutes, "minutes");

//           const checkInTime = moment(entry.checkIn).seconds(0).milliseconds(0);
//           const checkOutTime = moment(entry.checkOut)
//             .seconds(0)
//             .milliseconds(0);
//           const allowedTime = shiftStart
//             .clone()
//             .add(AttendanceSettings?.graceMinutes, "minutes")
//             .seconds(0)
//             .milliseconds(0);

//           if (checkInTime.isAfter(allowedTime)) {
//             // const minutesLate = checkInTime.diff(allowedTime, "minutes");
//             // status = `Late by ${minutesLate} Min`;
//             const minutesLate = checkInTime.diff(allowedTime, "minutes");
//             if (minutesLate > 0) {
//               // const leavelateData = await leave_application.findOne({
//               //   where: {
//               //     employeeId: emp_id,
//               //     tenantId,
//               //     branchId,
//               //     status: {
//               //       [Op.ne]: "self_declined",
//               //     },
//               //     [Op.or]: [
//               //       { fromDate: currentDate },
//               //       { toDate: currentDate },
//               //       {
//               //         fromDate: { [Op.lte]: currentDate },
//               //         toDate: { [Op.gte]: currentDate },
//               //       },
//               //     ],
//               //   },
//               // });
//               const leavelateData = await leave_application.findOne({
//                 where: {
//                   employeeId: emp_id,
//                   tenantId,
//                   branchId,
//                   status: { [Op.ne]: "self_declined" },
//                   fromDate: { [Op.lte]: currentDate },
//                   toDate: { [Op.gte]: currentDate },
//                 },
//               });

//               if (leavelateData) {
//                 if (leavelateData?.duration_type == "first_half") {
//                   status = "First Half";
//                 } else if (leavelateData?.duration_type == "second_half") {
//                   status = "Second Half";
//                 } else {
//                   status = "On Leave";
//                 }
//               } else {
//                 if (!AttendanceSettings) {
//                   status = "On Time";
//                 } else {
//                   if (minutesLate >= 60) {
//                     const hours = Math.floor(minutesLate / 60);
//                     const mins = minutesLate % 60;

//                     if (mins === 0) {
//                       status = `Late by ${hours} hr${hours > 1 ? "s" : ""}`;
//                     } else {
//                       status = `Late by ${hours} hr${
//                         hours > 1 ? "s" : ""
//                       } ${mins} min`;
//                     }
//                   } else {
//                     status = `Late by ${minutesLate} min`;
//                   }
//                 }
//               }
//             } else {
//               status = "Absent";
//             }
//           } else if (checkOutTime.isBefore(shiftEnd)) {
//             status = "Half Day";
//           } else {
//             status = "On Time";
//           }
//         } else {
//           status = "Absent";
//         }
//       }

//       data.push({
//         date: currentDate.format("YYYY-MM-DD"),
//         checkIn: entry?.checkIn ? moment(entry.checkIn).format("HH:mm") : null,
//         checkOut: entry?.checkOut
//           ? moment(entry.checkOut).format("HH:mm")
//           : null,
//         status,
//         day: currentDate.format("dddd"),
//         image: HolidayData?.image ?? null,
//         holidayName: HolidayData?.holiday_name ?? null,
//       });
//     }
//     data = data.sort((a, b) => new Date(b.date) - new Date(a.date));
//     finalResult.push({
//       employee_name: Helper.capitalizeFirstLetter(
//         `${emp.firstName} ${emp.lastName}`,
//       ),
//       data,
//     });

//     const holidayData = await holiday.findAll({
//       where: {
//         tenantId,
//         branchId,
//         [Op.and]: [
//           where(fn("EXTRACT", literal('MONTH FROM "date"')), month),
//           where(fn("EXTRACT", literal('YEAR FROM "date"')), year),
//         ],
//       },
//       order: [["date", "ASC"]],
//       raw: true,
//     });

//     let workingDays = Helper.getWorkingholidays(
//       year,
//       month,
//       weekOffDays,
//       holidayData,
//     );

//     const summary = Helper.calculateAttendanceSummary(
//       finalResult,
//       shiftMap,
//       AttendanceSettings,
//       workingDays,
//     );

//     return Helper.response(
//       true,
//       "Record Found Successfully!",
//       {
//         AttendanceList: finalResult,
//         summary,
//       },
//       res,
//       200,
//     );
//   } catch (error) {
//     console.error("Error fetching attendance:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };
// exports.getAttendance = async (req, res) => {
//   const { month, year } = req.body;
//   const tenantId = req.users?.tenantId;
//   const emp_id = req.users?.id;
//   const shift_id = req.users?.shift_id;
//   const branchId = req.users && req.users.branchId;

//   if (!branchId || branchId=='null') {
//     return Helper.response(false, "branchId is required!", {}, res, 200);
//   }

//   if (!month || !year) {
//     return Helper.response(false, "Month and year are required.", [], res, 400);
//   }

//   try {
//     const startDate = moment(
//       `${year}-${String(month).padStart(2, "0")}-01`,
//       "YYYY-MM-DD"
//     );
//     const endDate = startDate.clone().endOf("month");
//     // const totalDays = endDate.date();/
//     // Get today's date for comparison
//     const today = moment();

//     // Determine the last day to loop up to
//     let loopEndDate = endDate;

//     // If selected month and year are current, stop at today’s date
//     if (startDate.isSame(today, "month") && startDate.isSame(today, "year")) {
//       loopEndDate = today.clone();
//     }

//     const totalDays = loopEndDate.date();
//     let shiftMap = await Shift.findAll({
//       where: { branchId, tenantId, shift: shift_id },
//       attributes: ["day_of_week", "is_week_off", "startTime", "endTime"],
//       raw: true,
//     });

//     // Map day_of_week to number
//     shiftMap.forEach((s) => {
//       s.day_num =
//         typeof s.day_of_week == "string"
//           ? dayMap[s.day_of_week]
//           : s.day_of_week;
//     });

//     const weekOffDays = shiftMap
//       .filter((s) => s.is_week_off)
//       .map((s) => s.day_num);

//     const emp = await empPersonal.findOne({
//       where: { id: emp_id },
//       attributes: ["id", "firstName", "lastName"],
//       raw: true,
//     });
//     if (!emp) return Helper.response(false, "Employee not found", [], res, 404);

//     const records = await attendance.findAll({
//       where: {
//         branchId,
//         employeeId: emp_id,
//         check_in_time: {
//           [Op.between]: [
//             startDate.format("YYYY-MM-DD 00:00:00"),
//             endDate.format("YYYY-MM-DD 23:59:59"),
//           ],
//         },
//       },
//       raw: true,
//     });

//     const AttendanceSettings = await attendanceSetting.findOne({
//       where: { branchId, tenantId },
//       raw: true,
//     });
//     // const HolidayData = await holiday.findAll({
//     //   where: {
//     //     tenantId,
//     //     [Op.and]: [
//     //       where(fn("MONTH", col("date")), month),
//     //       where(fn("YEAR", col("date")), year),
//     //     ],
//     //   },
//     //   order: [["date", "ASC"]], // optional, sort by date
//     //   raw: true,
//     // });

//     // Group attendance by day
//     const groupedRecords = {};
//     records.forEach((r) => {
//       const day = moment(r.check_in_time).date();
//       if (!groupedRecords[r.employeeId]) groupedRecords[r.employeeId] = {};
//       groupedRecords[r.employeeId][day] = {
//         checkIn: r.check_in_time || null,
//         checkOut: r.check_out_time || null,
//       };
//     });

//     const finalResult = [];
//     const recordMap = groupedRecords[emp.id] || {};
//     let data = [];

//     for (let i = 1; i <= totalDays; i++) {
//       let HolidayData;
//       const currentDate = moment(`${year}-${month}-${i}`, "YYYY-MM-DD");
//       const dayNum = currentDate.day();
//       const entry = recordMap[i];
//       let status;

//       if (!entry) {
//         HolidayData = await holiday.findOne({
//           where: {
//             branchId,
//             tenantId,

//             date: currentDate,
//           },
//           order: [["date", "ASC"]],
//           raw: true,
//         });
//         if (HolidayData) {
//           status = "Holiday";
//         } else {
//           const leaveData = await leave_application.findOne({
//             where: {
//               branchId,
//               employeeId: emp_id,
//               tenantId,
//               [Op.or]: [
//                 { fromDate: { [Op.lte]: currentDate } }, // fromDate <= currentDate
//                 { toDate: { [Op.gte]: currentDate } }, // toDate >= currentDate
//               ],
//               // [Op.or]: {
//               //   fromDate: currentDate,
//               //   toDate: currentDate,
//               // },
//               status: {
//                 [Op.ne]: "self_declined",
//               },
//             },
//           });
//           //           const leaveData = await leave_application.findOne({
//           //   where: {
//           //     [Op.or]: [
//           //       { fromDate: new Date(currentDate) },
//           //       { toDate: new Date(currentDate) }
//           //     ]
//           //   }
//           // })
//           if (leaveData) {
//             if (leaveData?.duration_type == "first_half") {
//               status = "First Half";
//             } else if (leaveData?.duration_type == "second_half") {
//               status = "Second Half";
//             } else {
//               status = "On Leave";
//             }
//           } else if (weekOffDays.includes(dayNum)) {
//             status = "Week Off";
//           } else {
//             status = "Absent";
//           }
//         }
//       }
//       // Absent
//       // else if (!entry?.checkIn || !entry?.checkOut) {
//       //   status = "Present";
//       // }
//       // Check shift
//       else if (shiftMap.length > 0) {
//         const shiftForDay = shiftMap.find((s) => s.day_num == dayNum);
//         if (shiftForDay) {
//           let shiftStart = moment(
//             `${currentDate.format("YYYY-MM-DD")} ${shiftForDay.startTime}`,
//             "YYYY-MM-DD HH:mm:ss"
//           );
//           let shiftEnd = moment(
//             `${currentDate.format("YYYY-MM-DD")} ${shiftForDay.endTime}`,
//             "YYYY-MM-DD HH:mm:ss"
//           );

//           // Handle overnight shift
//           if (shiftEnd.isBefore(shiftStart)) shiftEnd.add(1, "day");

//           // const checkInTime = moment(entry.checkIn);
//           // const checkOutTime = moment(entry.checkOut);
//           // const allowedTime = shiftStart
//           //   .clone()
//           //   .add(AttendanceSettings.graceMinutes, "minutes");

//           const checkInTime = moment(entry.checkIn).seconds(0).milliseconds(0);
//           const checkOutTime = moment(entry.checkOut)
//             .seconds(0)
//             .milliseconds(0);
//           const allowedTime = shiftStart
//             .clone()
//             .add(AttendanceSettings.graceMinutes, "minutes")
//             .seconds(0)
//             .milliseconds(0);

//           if (checkInTime.isAfter(allowedTime)) {
//             // const minutesLate = checkInTime.diff(allowedTime, "minutes");
//             // status = `Late by ${minutesLate} Min`;
//             const minutesLate = checkInTime.diff(allowedTime, "minutes");
//             if (minutesLate > 0) {
//               const leavelateData = await leave_application.findOne({
//                 where: {
//                   employeeId: emp_id,
//                   tenantId,
//                   branchId,
//                   status: {
//                     [Op.ne]: "self_declined",
//                   },
//                   [Op.or]: [
//                     { fromDate: currentDate },
//                     { toDate: currentDate },
//                     {
//                       fromDate: { [Op.lte]: currentDate },
//                       toDate: { [Op.gte]: currentDate },
//                     },
//                   ],
//                 },
//               });

//               if (leavelateData) {
//                 if (leavelateData?.duration_type == "first_half") {
//                   status = "First Half";
//                 } else if (leavelateData?.duration_type == "second_half") {
//                   status = "Second Half";
//                 } else {
//                   status = "On Leave";
//                 }
//               } else {
//                 if (minutesLate >= 60) {
//                   const hours = Math.floor(minutesLate / 60);
//                   const mins = minutesLate % 60;

//                   if (mins === 0) {
//                     status = `Late by ${hours} hr${hours > 1 ? "s" : ""}`;
//                   } else {
//                     status = `Late by ${hours} hr${
//                       hours > 1 ? "s" : ""
//                     } ${mins} min`;
//                   }
//                 } else {
//                   status = `Late by ${minutesLate} min`;
//                 }
//               }
//             } else {
//               status = "Absent";
//             }
//           } else if (checkOutTime.isBefore(shiftEnd)) {
//             status = "Half Day";
//           } else {
//             status = "On Time";
//           }
//         } else {
//           status = "Absent";
//         }
//       }

//       data.push({
//         date: currentDate.format("YYYY-MM-DD"),
//         checkIn: entry?.checkIn ? moment(entry.checkIn).format("HH:mm") : null,
//         checkOut: entry?.checkOut
//           ? moment(entry.checkOut).format("HH:mm")
//           : null,
//         status,
//         day: currentDate.format("dddd"),
//         image: HolidayData?.image ?? null,
//         holidayName: HolidayData?.holiday_name ?? null,
//       });
//     }
//     data = data.sort((a, b) => new Date(b.date) - new Date(a.date));
//     finalResult.push({
//       employee_name: Helper.capitalizeFirstLetter(
//         `${emp.firstName} ${emp.lastName}`
//       ),
//       data,
//     });

//     const holidayData = await holiday.findAll({
//       where: {
//         tenantId,
//         branchId,
//         [Op.and]: [
//           where(fn("EXTRACT", literal('MONTH FROM "date"')), month),
//           where(fn("EXTRACT", literal('YEAR FROM "date"')), year),
//         ],
//       },
//       order: [["date", "ASC"]],
//       raw: true,
//     });

//     let workingDays = Helper.getWorkingholidays(
//       year,
//       month,
//       weekOffDays,
//       holidayData
//     );

//     const summary = Helper.calculateAttendanceSummary(
//       finalResult,
//       shiftMap,
//       AttendanceSettings,
//       workingDays
//     );

//     return Helper.response(
//       true,
//       "Record Found Successfully!",
//       {
//         AttendanceList: finalResult,
//         summary,
//       },
//       res,
//       200
//     );
//   } catch (error) {
//     console.error("Error fetching attendance:", error);
//     return Helper.response(false, error?.message, [], res, 500);
//   }
// };

exports.employeeByDepartment = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const reportingPersonId = req.users?.id;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId) {
    return Helper.response(false, "User Not Found", [], res, 404);
  }

  try {
    // Fetch all active departments
    const departments = await Department.findAll({
      where: {
        tenantId,
        branchId,
        status: "active",
      },
    });

    // For each department, fetch employees
    const data = await Promise.all(
      departments.map(async (dept) => {
        const employees = await empPersonal.findAll({
          where: {
            tenantId,
            status: "active",
            reportingPersonId,
            branchId,
            departmentId: dept.id,
          },
          raw: true,
          attributes: [
            "id",
            "tenantId",
            "firstName",
            "lastName",
            "email",
            "mobile",
            "alternateMobile",
            "permanentAddress",
            "dateOfBirth",
            "age",
            "designationId",
            "empCode",
            "reportingPersonId",
            "empType",
            "joiningDate",
            "city",
            "country",
            "status",
            "state",
            "pinCode",
            "nationality",
            "bloodGroup",
            "shift_id",
            "fatherName",
            "motherName",
            "panNo",
            "adhaarNo",
            "martialStatus",
            "gender",
          ],
        });

        return {
          departmentName: dept.name,
          employees: employees, // clean JSON
        };
      }),
    );
    if (data.length == 0) {
      return Helper.response(false, "No Data Found", [], res, 200);
    }
    return Helper.response(true, "Data Found Successfully", data, res, 200);
  } catch (error) {
    console.error("Error fetching employees by department:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.TeamsAttendance = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const reportingPersonId = req.users?.id;
    const role = req.users?.role;

    if (!tenantId) {
      return Helper.response(false, "User Not Found", [], res, 404);
    }

    let branchIds = [];
    const userBranchId = req.users?.branchId;

    // Director may not have a specific branchId assigned — allow them through
    if (!userBranchId && role !== "director") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    // ✅ Handle branch filter
    if (req.query.branchId) {
      if (req.query.branchId == "All") {
        const branches = await branch.findAll({
          where: { tenantId, status: "active" },
          attributes: ["id"],
          raw: true,
        });
        branchIds = branches.map((b) => b.id);
      } else {
        branchIds = [req.query.branchId];
      }
    } else if (userBranchId) {
      branchIds = [userBranchId];
    } else {
      // Director with no branchId and no query param → fetch all branches
      const branches = await branch.findAll({
        where: { tenantId, status: "active" },
        attributes: ["id"],
        raw: true,
      });
      branchIds = branches.map((b) => b.id);
    }

    // ✅ Fetch Employees
    let employeeWhere = {
      tenantId,
      branchId: { [Op.in]: branchIds },
      status: "active",
    };

    if (role == "director") {
      // Director sees all employees across fetched branches — no hierarchy filter
    } else if (role == "manager") {
      const branchFilter = req.query.branchId === "All" ? "All" : (req.query.branchId || userBranchId);
      const subordinateIds = await Helper.getAllSubordinates(reportingPersonId, branchFilter, tenantId);
      employeeWhere.id = { [Op.in]: [...subordinateIds, reportingPersonId] };
    } else {
      employeeWhere.reportingPersonId = reportingPersonId;
    }

    const teamEmployees = await empPersonal.findAll({
      where: employeeWhere,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "shift_id",
        "departmentId",
        "designationId",
        "joiningDate",
        "dateOfBirth",
        "profileImage",
        "branchId", // ✅ IMPORTANT
      ],
      raw: true,
      order: [["createdAt", "desc"]],
    });

    if (!teamEmployees.length) {
      return Helper.response(
        true,
        "No Employee is present in the team",
        [],
        res,
        200,
      );
    }

    const employeeIds = teamEmployees.map((e) => e.id);
    const today = moment().format("YYYY-MM-DD");
    const currentDay = moment().format("dddd");

    // Collect unique IDs for batch fetching
    const uniqueBranchIds  = [...new Set(teamEmployees.map((e) => e.branchId).filter(Boolean))];
    const uniqueDesigIds   = [...new Set(teamEmployees.map((e) => e.designationId).filter(Boolean))];
    const uniqueDeptIds    = [...new Set(teamEmployees.map((e) => e.departmentId).filter(Boolean))];
    const uniqueShiftIds   = [...new Set(teamEmployees.map((e) => e.shift_id).filter(Boolean))];

    // Single round-trip: fetch everything in parallel
    const [
      records,
      allSettings,
      allDesignations,
      allBranches,
      allDepartments,
      allShifts,
      todayHoliday,
      allLeaves,
    ] = await Promise.all([
      attendance.findAll({
        where: { employeeId: { [Op.in]: employeeIds }, tenantId, date: today },
        attributes: ["employeeId", "check_in_time", "check_out_time", "is_present"],
        raw: true,
      }),
      attendanceSetting.findAll({
        where: { branchId: { [Op.in]: uniqueBranchIds }, tenantId },
        raw: true,
      }),
      Designation.findAll({
        where: { id: { [Op.in]: uniqueDesigIds } },
        attributes: ["id", "name", "branchId"],
        raw: true,
      }),
      branch.findAll({
        where: { id: { [Op.in]: uniqueBranchIds }, tenantId },
        attributes: ["id", "name"],
        raw: true,
      }),
      Department.findAll({
        where: { id: { [Op.in]: uniqueDeptIds } },
        attributes: ["id", "name", "branchId"],
        raw: true,
      }),
      Shift.findAll({
        where: { shift: { [Op.in]: uniqueShiftIds }, tenantId, status: "active" },
        raw: true,
      }),
      holiday.findOne({ where: { date: today } }),
      leave_application.findAll({
        where: {
          employeeId: { [Op.in]: employeeIds },
          fromDate: { [Op.lte]: today },
          toDate:   { [Op.gte]: today },
        },
        raw: true,
      }),
    ]);

    // Build lookup maps
    const settingsMap   = new Map(allSettings.map((s) => [s.branchId, s]));
    const designMap     = new Map(allDesignations.map((d) => [d.id, d]));
    const branchMapLkp  = new Map(allBranches.map((b) => [b.id, b]));
    const deptMap       = new Map(allDepartments.map((d) => [d.id, d]));
    const leaveMap      = new Map(allLeaves.map((l) => [l.employeeId, l]));

    // Synchronous map — zero per-employee DB calls
    const data = teamEmployees.map((emp) => {
      const record            = records.find((r) => r.employeeId == emp.id);
      const attendanceSettings = settingsMap.get(emp.branchId);
      const designation       = designMap.get(emp.designationId);
      const branchDetails     = branchMapLkp.get(emp.branchId);
      const department        = deptMap.get(emp.departmentId);
      const empShifts         = allShifts.filter((s) => s.shift === emp.shift_id && s.branchId === emp.branchId);
      const todayShift        = empShifts.find((s) => s.day_of_week == currentDay);

      let status  = "Absent";
      let checkIn  = null;
      let checkOut = null;

      if (record) {
        checkIn  = record.check_in_time  ? record.check_in_time.split(" ")[1]  : null;
        checkOut = record.check_out_time ? record.check_out_time.split(" ")[1] : null;

        if (checkIn && todayShift) {
          const allowedTime  = moment(todayShift.startTime, "HH:mm:ss");
          const actualCheckIn = moment(checkIn, "HH:mm:ss");
          const graceMinutes = attendanceSettings?.graceMinutes || 0;
          const graceLimit   = allowedTime.clone().add(graceMinutes, "minutes");

          if (actualCheckIn.isAfter(graceLimit)) {
            const minutesLate = actualCheckIn.diff(graceLimit, "minutes");
            if (minutesLate >= 60) {
              const hoursLate     = Math.floor(minutesLate / 60);
              const remainingMins = minutesLate % 60;
              status = `Late by ${hoursLate} hr ${remainingMins} min`;
            } else {
              status = `Late by ${minutesLate} min`;
            }
          } else {
            status = "On Time";
          }
        }
      } else {
        if (todayHoliday) {
          status = "holiday";
        } else {
          const leaveData = leaveMap.get(emp.id);
          if (leaveData) {
            if (leaveData.fromDate == today && leaveData.toDate == today) {
              if (leaveData.duration_type == "first_half")       status = "First Half Leave";
              else if (leaveData.duration_type == "second_half") status = "Second Half Leave";
              else                                                status = "Full Day Leave";
            } else if (leaveData.fromDate == today) {
              status = leaveData.duration_type == "second_half" ? "Second Half Leave" : "Full Day Leave";
            } else if (leaveData.toDate == today) {
              status = leaveData.to_duration_type == "first_half" ? "First Half Leave" : "Full Day Leave";
            } else {
              status = "Full Day Leave";
            }
          }
        }
      }

      return {
        employeeId:   emp.id,
        employee_name: `${emp.firstName} ${emp.lastName}`,
        date:         today,
        checkIn,
        checkOut,
        status,
        branchId:     emp.branchId,
        branchName:   branchDetails?.name  ?? null,
        designation:  designation?.name    ?? null,
        department:   department?.name     ?? null,
        day:          currentDay,
        joiningDate:  emp.joiningDate,
        dateOfBirth:  emp.dateOfBirth,
        profileImage: emp.profileImage     ?? null,
      };
    });

    return Helper.response(
      true,
      "Today's Team Attendance Found Successfully!",
      data,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching today's team attendance:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};


// exports.TeamsAttendance = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const reportingPersonId = req.users?.id;
//   const role = req.users.role;
//   if (!tenantId) {
//     return Helper.response(false, "User Not Found", [], res, 404);
//   }
//   let branchId = req.users && req.users.branchId;

//   if (!branchId || branchId == "null") {
//     return Helper.response(false, "branchId is required!", {}, res, 200);
//   }
//   let branches
//   if(req.query.branchId){
//     branchId=req.query.branchId
//    if(branchId=='All'){
//    branches=await branch.findAll({
//       where:{
//         tenantId,
//         status:'active'
//       },
//       raw:true,
//       attributes:['id']
//      })
//         branchId=branches.length>0?branches.map((item)=>item?.id):null

//    }else{
//     branchId=[branchId]
//    }
//   }
//   try {
//     let teamEmployees;
//     if (role == "manager" || role == "director") {
//       if (branchId == "All") {

//        teamEmployees = await empPersonal.findAll({
//         where: {
//           tenantId,
//           // branchId,
//           status: "active",
//         },
//         attributes: [
//           "id",
//           "firstName",
//           "lastName",
//           "shift_id",
//           "departmentId",
//           "designationId",
//           "joiningDate",
//           "dateOfBirth",
//         ],
//         raw: true,
//         order: [["createdAt", "desc"]],
//       });
//       } else {

//         teamEmployees = await empPersonal.findAll({
//         where: {
//           tenantId,
//           branchId,
//           status: "active",
//         },
//         attributes: [
//           "id",
//           "firstName",
//           "lastName",
//           "shift_id",
//           "departmentId",
//           "designationId",
//           "joiningDate",
//           "dateOfBirth",
//         ],
//         raw: true,
//         order: [["createdAt", "desc"]],
//       })
//       }
//       // teamEmployees = await empPersonal.findAll({
//       //   where: {
//       //     tenantId,
//       //     branchId,
//       //     status: "active",
//       //   },
//       //   attributes: [
//       //     "id",
//       //     "firstName",
//       //     "lastName",
//       //     "shift_id",
//       //     "departmentId",
//       //     "designationId",
//       //     "joiningDate",
//       //     "dateOfBirth",
//       //   ],
//       //   raw: true,
//       //   order: [["createdAt", "desc"]],
//       // });
//     } else {
//       teamEmployees = await empPersonal.findAll({
//         where: {
//           tenantId,
//           branchId,
//           reportingPersonId,
//           status: "active",
//         },
//         attributes: [
//           "id",
//           "firstName",
//           "lastName",
//           "shift_id",
//           "departmentId",
//           "designationId",
//           "joiningDate",
//           "dateOfBirth",
//         ],
//         raw: true,
//         order: [["createdAt", "desc"]],
//       });
//     }

//     if (teamEmployees.length == 0) {
//       return Helper.response(
//         false,
//         "No Employee is present in the team",
//         [],
//         res,
//         404,
//       );
//     }

//     const employeeIds = teamEmployees.map((e) => e.id);

//     const today = moment().format("YYYY-MM-DD");
//     const momentToday = moment(today, "YYYY-MM-DD");

//     const records = await attendance.findAll({
//       where: {
//         employeeId: { [Op.in]: employeeIds },
//         tenantId,
//         branchId,
//         date: today,
//       },
//       attributes: [
//         "employeeId",
//         "check_in_time",
//         "check_out_time",
//         "is_present",
//       ],
//       raw: true,
//     });

//     const attendanceSettings = await attendanceSetting.findOne({
//       where: { branchId, tenantId },
//       raw: true,
//     });

//     const currentDay = momentToday.format("dddd");

//     const data = await Promise.all(
//       teamEmployees.map(async (emp) => {
//         const record = records.find((r) => r.employeeId == emp.id);
//         const designation = await Designation.findOne({
//           where: {
//             branchId,
//             id: emp?.designationId,
//           },
//         });
//         const branchDetails = await branch.findOne({
//           where: {

//             id: emp?.branchId,
//             tenantId
//           },
//           raw:true,
//           attributes:["name"]
//         });
//         const department = await Department.findOne({
//           where: {
//             branchId,
//             id: emp?.departmentId,
//           },
//         });
//         const shiftMap = await Shift.findAll({
//           where: {
//             shift: emp?.shift_id,
//             branchId,
//             tenantId,
//             status: "active",
//           },
//           raw: true,
//         });

//         // Pick the current day's shift details
//         const todayShift = shiftMap.find((s) => s.day_of_week == currentDay);

//         let status = "Absent";
//         let checkIn = null;
//         let checkOut = null;

//         if (record) {
//           checkIn = record.check_in_time
//             ? record.check_in_time.split(" ")[1]
//             : null;
//           checkOut = record.check_out_time
//             ? record.check_out_time.split(" ")[1]
//             : null;

//           if (!checkIn && !checkOut) {
//             status = "Absent";
//           } else if (todayShift && checkIn) {
//             const allowedTime = moment(todayShift.startTime, "HH:mm:ss");
//             const actualCheckIn = moment(checkIn, "HH:mm:ss");
//             const graceMinutes = attendanceSettings?.graceMinutes || 0;

//             const graceLimit = allowedTime.clone().add(graceMinutes, "minutes");

//             if (actualCheckIn.isAfter(graceLimit)) {
//               // Calculate minutes late
//               const minutesLate = actualCheckIn.diff(graceLimit, "minutes");
//               if (minutesLate >= 60) {
//                 const hoursLate = Math.floor(minutesLate / 60);
//                 const remainingMins = minutesLate % 60;
//                 status = `Late by ${hoursLate} hr ${remainingMins} min`;
//               } else {
//                 status = `Late by ${minutesLate} min`;
//               }
//             } else {
//               status = "On Time";
//             }
//           } else {
//             status = "On Time";
//           }
//         }

//         return {
//           employeeId: emp.id,
//           employee_name: `${emp.firstName} ${emp.lastName}`,
//           date: today,
//           checkIn,
//           checkOut,
//           status,
//           branchName:branchDetails?.name??null,
//           designation: designation?.name,
//           department: department?.name,
//           day: currentDay,
//           joiningDate: emp?.joiningDate,
//           dateOfBirth: emp?.dateOfBirth,
//         };
//       }),
//     );

//     return Helper.response(
//       true,
//       "Today's Team Attendance Found Successfully!",
//       data,
//       res,
//       200,
//     );
//   } catch (error) {
//     console.error("Error fetching today's team attendance:", error);
//     return Helper.response(false, error.message, [], res, 500);
//   }
// };

exports.EmployeeDetails = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const employeeId = req.users?.id; // current logged-in employee

  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId) {
    return Helper.response(false, "User Not Found", [], res, 404);
  }

  if (!employeeId) {
    return Helper.response(false, "Employee ID is required", [], res, 400);
  }

  try {
    const employee = await empPersonal.findOne({
      where: {
        tenantId,
        branchId,
        id: employeeId,
        status: "active",
      },
      attributes: [
        "id",
        "tenantId",
        "firstName",
        "lastName",
        "email",
        "mobile",
        "alternateMobile",
        "permanentAddress",
        "currentAddress",
        "dateOfBirth",
        "age",
        "designationId",
        "departmentId",
        "empCode",
        "reportingPersonId",
        "empType",
        "joiningDate",
        "city",
        "country",
        "status",
        "state",
        "pinCode",
        "nationality",
        "bloodGroup",
        "shift_id",
        "fatherName",
        "motherName",
        "panNo",
        "adhaarNo",
        "martialStatus",
        "gender",
        "role",
        "isofflineAtt",
        "isLocation",
        "isofflineAllTimeAtt",
        "profileImage",
        "emp_status",
      ],
      raw: true,
    });

    if (!employee) {
      return Helper.response(false, "Employee Not Found", [], res, 404);
    }

    const isStateInt = Number.isInteger(Number(employee?.state)) && employee?.state !== null && employee?.state !== "";
    const isCountryInt = Number.isInteger(Number(employee?.country)) && employee?.country !== null && employee?.country !== "";
    const isCityInt = Number.isInteger(Number(employee?.city)) && employee?.city !== null && employee?.city !== "";

    const [
      bank_account,
      designation,
      department,
      state,
      country,
      city,
      employmentType,
      reportingPerson,
    ] = await Promise.all([
      BankAccount.findAll({
        where: {
          employeeId: employee.id,
          tenantId,
          branchId,
          status: "active",
        },
        raw: true,
        attributes: [
          "id",
          "tenantId",
          "employeeId",
          "status",
          "ifscCode",
          "accountNumber",
          "bankBranch",
          "bankName",
          "accountHolderName",
        ],
        order: [["createdAt", "desc"]],
      }),
      Designation.findOne({
        where: {
          id: employee?.designationId,
          tenantId,
          branchId,
          status: "active",
        },
        attributes: ["name"],
        raw: true,
      }),
      Department.findOne({
        where: {
          id: employee?.departmentId,
          tenantId,
          branchId,
          status: "active",
        },
        attributes: ["name"],
        raw: true,
      }),
      isStateInt
        ? State.findOne({
            where: { id: employee?.state },
            attributes: ["name"],
            raw: true,
          })
        : employee?.state,
      isCountryInt
        ? Country.findOne({
            where: { id: employee?.country },
            attributes: ["name"],
            raw: true,
          })
        :employee?.country,
      isCityInt
        ? City.findOne({
            where: { id: employee?.city},
            attributes: ["name"],
            raw: true,
          })
        : employee?.city,
      EmploymentType.findOne({
        where: {
          id: employee?.empType,
          tenantId,
          branchId,
          status: "active",
        },
        attributes: ["name"],
        raw: true,
      }),
      empPersonal.findOne({
        where: {
          id: employee?.reportingPersonId,
          // branchId,
        },
      }),
    ]);

    const empAttendance = await attendance.findOne({
      where: {
        employeeId: employee.id,
        tenantId,
        branchId,
        date: moment().format("YYYY-MM-DD"),
      },
      order: [["createdAt", "desc"]],
      raw: true,
    });
    // Merge response
    const data = {
      ...employee,
      bank_account,
      department: department?.name || null,
      designation: designation?.name || null,
      state: isStateInt ? (state?.name || null) : (employee?.state || null),
      country: isCountryInt ? (country?.name || null) : (employee?.country || null),
      city: isCityInt ? (city?.name || null) : (employee?.city || null),
      empType: employmentType?.name,
      //  check_in_flag:  false ,
      // check_out_flag: true ,
      check_in_time: empAttendance?.check_in_time ?? "",
      check_out_time: empAttendance?.check_out_time ?? "",
      profileImage: (employee?.profileImage && String(employee.profileImage).trim()) || (empAttendance?.profileImage && String(empAttendance.profileImage).trim()) || "",
      reportingPersonName: `${reportingPerson?.firstName} ${reportingPerson?.lastName} `,
    };

    return Helper.response(
      true,
      "Employee Details Found Successfully!",
      data,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching employee details:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.getAppLeaveTypes = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!tenantId) {
    return Helper.response(false, "TenantId is required!", {}, res, 200);
  }

  try {
    const leaveTypes = await leaveMaster.findAll({
      where: { branchId, tenantId },
    });
    const data = [];
    leaveTypes.map((r) => {
      const value = {
        value: r.id,
        label: r.leaveName,
        leaveCode: r.leaveCode,
        allowedPerYear: r.allowedPerYear,
      };
      data.push(value);
    });
    return Helper.response(
      true,
      "Leave types fetched successfully.",
      data,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching leave types:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};

//leaveList
exports.EmployeeLeaveList = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const employeeId = req.users?.id;

  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  if (!tenantId) {
    return Helper.response(false, "User Not Found", [], res, 404);
  }

  try {
    const leaveList = await LeaveBalance.findAll({
      where: { tenantId, employeeId, branchId },
      raw: true,
      order: [["createdAt", "desc"]],
      limit: 1,
    });

    if (leaveList.length == 0) {
      return Helper.response(false, "No Leave present", [], res, 404);
    }

    // const totalLeave = leaveList.reduce(
    //   (acc, curr) => acc + (Number(curr?.remainingLeaves) || 0),
    //   0
    // );

    const leaveStatusCount = await leave_application.findAll({
      attributes: ["status", [fn("SUM", col("days")), "totalDays"]],
      where: { tenantId, employeeId, branchId },
      group: ["status"],
      raw: true,
    });

    const LeaveMaster = await leaveMaster.findAll({
      where: { tenantId, branchId },
      raw: true,
      order: [["leaveName", "asc"]],
    });

    const leaveData = await Promise.all(
      LeaveMaster.map(async (item) => {
        const isCompOff =
          String(item?.leaveCode || "").toLowerCase().startsWith("co") ||
          String(item?.leaveName || "").toLowerCase().includes("comp");

        if (isCompOff) {
          const compOffRecords = await comp_off.findAll({
            where: { tenantId, employeeId, branchId },
            raw: true,
          });
          const total_leave = compOffRecords.reduce((s, r) => s + Number(r.totalDays || 0), 0);
          const used_leave = compOffRecords.reduce((s, r) => s + Number(r.usedDays || 0), 0);
          const available_leave = compOffRecords.reduce((s, r) => s + Number(r.remainingDays || 0), 0);
          return {
            name: item?.leaveName,
            code: item?.leaveCode,
            available_leave,
            used_leave,
            total_leave,
          };
        }

        const leavebal = await leave_balance.findOne({
          where: { tenantId, employeeId, leaveTypeId: item?.id, branchId },
          order: [["createdAt", "desc"]],
        });
        return {
          name: item?.leaveName,
          code: item?.leaveCode,
          available_leave: leavebal?.remainingLeaves ?? 0,
          used_leave: leavebal?.usedLeaves ?? 0,
          total_leave:
            leavebal?.totalAssigned < leavebal?.remainingLeaves
              ? (leavebal?.remainingLeaves ?? 0)
              : (leavebal?.totalAssigned ?? 0),
        };
      }),
    );

    // const leaveData = await Promise.all(
    //   leaveList.map(async (item) => {
    //     const leaveName = await leaveMaster.findOne({
    //       where: { id: item?.leaveTypeId, tenantId },
    //     });
    //     return {
    //       name: leaveName?.leaveName,
    //       code: leaveName?.leaveCode,
    //       available_leave: item?.remainingLeaves,
    //       total_leave: totalLeave,
    //     };
    //   })
    // );

    const responseData = {
      leaveBalances: leaveData,
      appliedLeaveSummary: leaveStatusCount,
    };

    return Helper.response(
      true,
      "Leave List Found Successfully!",
      responseData,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching employee leave list:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

// exports.getAppAppliedLeaves = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const employeeId = req.users?.id;

//   try {
//     // // Get all employees reporting to this user
//     // const reportees = await empPersonal.findAll({
//     //   where: { reportingPersonId: employeeId },
//     //   attributes: ["id"],
//     //   raw: true,
//     //   order: [["createdAt", "asc"]],
//     // });

//     // // Extract only the IDs
//     // const reporteeIds = reportees.map((r) => r.id);

//     // if (reporteeIds.length === 0) {
//     //   return Helper.response(false, "no leave Record", [], res, 404);
//     // }

//     // Get applied leaves of those reportees
//     const appliedLeaves = await leave_application.findAll({
//       where: {
//         tenantId,
//         employeeId: employeeId,
//       },
//       order: [["appliedOn", "DESC"]],
//     });

//     // Format response
//     const all = await Promise.all(
//       appliedLeaves.map(async (r) => {
//         const employee = await empPersonal.findByPk(r.employeeId, {
//           attributes: ["firstName", "lastName", "email"],
//         });
//         const leaveType = await leaveMaster.findByPk(r.leaveTypeId);

//         return {
//           id: r.id,
//           employeeId: r.employeeId,
//           employeeName: `${employee?.firstName ?? ""} ${
//             employee?.lastName ?? ""
//           }`.trim(),
//           employeeEmail: employee?.email ?? null,
//           appliedOn: r.appliedOn,
//           reason: r.reason,
//           duration_type: r.duration_type,
//           duration_type_name:
//             r.duration_type === "full"
//               ? "Full Day"
//               : r.duration_type === "first_half"
//               ? "First Half"
//               : "Second Half",
//           fromDate: r.fromDate,
//           toDate: r.toDate,
//           days: r.days,
//           status: r.status,
//           leaveTypeId: r.leaveTypeId,
//           leaveName: leaveType?.leaveName ?? null,
//           leaveCode: leaveType?.leaveCode ?? null,
//           createdAt: Helper.dateFormat(r.createdAt),
//         };
//       })
//     );

//     if (all.length > 0) {
//       return Helper.response(
//         true,
//         "Applied leaves fetched successfully.",
//         all,
//         res,
//         200
//       );
//     } else {
//       return Helper.response(
//         false,
//         "No applied leaves found for your team.",
//         [],
//         res,
//         200
//       );
//     }
//   } catch (error) {
//     console.error("Error fetching applied leaves:", error);
//     return Helper.response(false, "Internal server error.", [], res, 500);
//   }
// };

exports.AppapplyForLeave = async (req, res) => {
  const {
    employeeId,
    leaveTypeId,
    fromDate,
    toDate,
    reason,
    duration_type = "full", // from duration type
    to_duration_type = "full", // to duration type
  } = req.body;

  // compOffId array aa sakta hai frontend se, string mein convert karo
  const rawCompOffId = req.body.compOffId;
  const compOffId = Array.isArray(rawCompOffId) ? rawCompOffId[0] : rawCompOffId ?? null;

  const tenantId = req.users && req.users.tenantId;
  const createdBy = req.users && req.users.id;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  if (!employeeId || !leaveTypeId || !tenantId) {
    return Helper.response(false, "Required fields missing", [], res, 200);
  }

  try {
    let days = moment(toDate).diff(moment(fromDate), "days") + 1;

    if (fromDate == toDate) {
      if (duration_type == "full") {
        days = 1;
      } else {
        days = 0.5;
      }
    } else {
      if (duration_type == "first_half" || duration_type == "second_half") {
        days -= 0.5;
      }

      if (
        to_duration_type == "first_half" ||
        to_duration_type == "second_half"
      ) {
        days -= 0.5;
      }
    }
    // =============================================
    // COMP-OFF VALIDATION (only when compOffId sent)
    // =============================================
    if (compOffId) {
      const compOffRecord = await comp_off.findOne({
        where: { id: compOffId, employeeId, tenantId, branchId },
      });

      if (!compOffRecord) {
        return Helper.response(false, "Comp-off record not found", {}, res, 200);
      }
      if (compOffRecord.approval_status !== "approved") {
        return Helper.response(false, "Comp-off is not approved yet", {}, res, 200);
      }
      if (compOffRecord.status === "used") {
        return Helper.response(false, "Comp-off is already fully used", {}, res, 200);
      }
      // if (compOffRecord.status === "expired") {
        // return Helper.response(false, "Comp-off has expired", {}, res, 200);
      // }
      // if (compOffRecord.expiryDate && moment().isAfter(moment(compOffRecord.expiryDate), "day")) {
      //   return Helper.response(false, "Comp-off has expired", {}, res, 200);
      // }
      if (Number(compOffRecord.remainingDays) < days) {
        return Helper.response(
          false,
          `Insufficient comp-off balance. Available: ${compOffRecord.remainingDays} day(s), Requested: ${days} day(s)`,
          {},
          res,
          200,
        );
      }
    }

    const existsLeave = await leave_application.findOne({
      where: {
        employeeId,
        leaveTypeId,
        fromDate,
        toDate,
        duration_type,
        to_duration_type,
        days,
        branchId,
        tenantId,
        status: { [Op.ne]: "self_declined" },
        ...(compOffId ? { compOffId } : {}),
      },
    });
    if (existsLeave) {
      return Helper.response(false, "Data Already Exists", {}, res, 200);
    }

    const leaveApplication = await leave_application.create({
      employeeId,
      leaveTypeId,
      fromDate,
      toDate,
      duration_type,
      to_duration_type,
      days,
      reason,
      tenantId,
      compOffId: compOffId ?? null,
      branchId,
      createdBy,
    });

    // =============================================
    // UPDATE COMP-OFF BALANCE after leave applied
    // =============================================
    if (compOffId) {
      const compOffRecord = await comp_off.findOne({ where: { id: compOffId } });
      const newUsed = Number(compOffRecord.usedDays) + days;
      const newRemaining = Number(compOffRecord.remainingDays) - days;
      await comp_off.update(
        {
          usedDays: newUsed,
          remainingDays: newRemaining,
          status: newRemaining <= 0 ? "used" : "active",
        },
        { where: { id: compOffId } },
      );
    }

    return Helper.response(
      true,
      "Leave application submitted successfully.",
      leaveApplication,
      res,
      200,
    );
  } catch (error) {
    console.error("Error applying for leave:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.getAppliedLeaves = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const employeeId = req.users && req.users.id;
  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }
  try {
    const appliedLeaves = await leave_application.findAll({
      where: { tenantId, branchId },
      order: [["appliedOn", "DESC"]],
      raw: true,
    });

    const all = await Promise.all(
      appliedLeaves.map(async (r) => {
        const employee = await empPersonal.findByPk(r.employeeId, {
          attributes: ["firstName", "lastName", "email"],
        });
        const leaveType = await leaveMaster.findByPk(r.leaveTypeId);
        return {
          leaveTypeId: r?.leaveTypeId,
          id: r?.id,
          employeeId: r?.employeeId,
          employeeName: `${employee?.firstName} ${employee?.lastName}`,
          employeeEmail: employee?.email,
          appliedOn: r.appliedOn,
          reason: r.reason,
          duration_type_name:
            r?.duration_type === "full"
              ? "Full Day"
              : r?.duration_type == "first_half"
                ? "First Half"
                : "Second Half",
          duration_type: r?.duration_type,
          fromDate: r.fromDate,
          toDate: r.toDate,
          days: r.days,
          status: r.status,
          to_duration_type: r?.to_duration_type,
          leaveName: leaveType.leaveName,
          leaveCode: leaveType.leaveCode,
          createdAt: Helper.dateFormat(r.createdAt),
        };
      }),
    );
    if (all.length > 0) {
      return Helper.response(
        true,
        "Applied leaves fetched successfully.",
        all,
        res,
        200,
      );
    } else {
      return Helper.response(
        false,
        "No applied leaves found for this employee.",
        [],
        res,
        404,
      );
    }
  } catch (error) {
    console.error("Error fetching applied leaves:", error);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};
exports.AppupdatedApplyLeaveStatus = async (req, res) => {
  let { id, status, reason } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const existingLeave = await leave_application.findOne({ where: { id } });
    let { employeeId, leaveTypeId, days, appliedOn } = existingLeave;
    const year = new Date(appliedOn).getFullYear();
    const leaveBalances = await LeaveBalance.findOne({
      where: {
        tenantId,
        leaveTypeId: leaveTypeId,
        employeeId: employeeId,
        year,
        branchId,
      },
    });
    // if (!leaveBalances) {
    //   return Helper.response(false, "Assigned Leave First", [], res, 400);
    // }

    existingLeave.status = status;
    existingLeave.reason = reason || leaveBalances?.reason;
    existingLeave.updatedBy = req.users && req.users.id;

    if (status == "approved") {
      existingLeave.approverId = req.users && req.users.id;
    }
    if (status == "rejected") {
      existingLeave.canceledId = req.users && req.users.id;
    }
    if (status == "recommended") {
      existingLeave.recommendedId = req.users && req.users.id;
    }

    // if(req.users.role=='manager'){
    //  existingLeave.approverId = req.users && req.users.id;
    // }else{

    // }

    let remainingLeaves;
    if (await existingLeave.save()) {
      if (status == "approved") {
        const fromDate = new Date(existingLeave.fromDate);
        const fromMonth = fromDate.getMonth() + 1;
        const fromYear = fromDate.getFullYear();
        const leaveDays = Number(existingLeave.days || 0);

        const balanceRecord = await LeaveBalance.findOne({
          where: { tenantId, branchId, leaveTypeId: existingLeave.leaveTypeId, employeeId: existingLeave.employeeId, year: fromYear, month: fromMonth },
        });
        if (balanceRecord) {
          const newUsed = Number(balanceRecord.usedLeaves || 0) + leaveDays;
          const newRemaining = Math.max(Number(balanceRecord.remainingLeaves || 0) - leaveDays, 0);
          await LeaveBalance.update(
            { usedLeaves: newUsed.toFixed(1), remainingLeaves: newRemaining.toFixed(1), updatedBy: req.users?.id },
            { where: { id: balanceRecord.id } },
          );
        }

        if (existingLeave.compOffId) {
          const compOffRecord = await comp_off.findOne({ where: { id: existingLeave.compOffId } });
          if (compOffRecord) {
            const newUsed = Number(compOffRecord.usedDays || 0) + leaveDays;
            const newRemaining = Math.max(Number(compOffRecord.remainingDays || 0) - leaveDays, 0);
            await comp_off.update(
              { usedDays: newUsed.toFixed(1), remainingDays: newRemaining.toFixed(1), status: newRemaining <= 0 ? "used" : "active" },
              { where: { id: existingLeave.compOffId } },
            );
          }
        }
      }

      return Helper.response(
        true,
        "Leave updated successfully.",
        existingLeave,
        res,
        200,
      );
    }
    return Helper.response(false, "Failed to create leave.", [], res, 400);
  } catch (error) {
    console.error("Error creating leaves:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.AppgetHolidayList = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const holidayData = await holiday.findAll({
      where: {
        tenantId: req.users?.tenantId,
        branchId,
        status: "active",
        [Op.and]: sequelize.where(
          sequelize.fn("DATE_PART", "year", col("date")),
          currentYear,
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
      order: [["date", "desc"]],
      raw: true,
    });

    const data = await Promise.all(
      holidayData.map(async (item) => {
        const holidayname = await HolidayType.findOne({
          where: {
            id: item?.holiday_type,
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

exports.AppgetBillDetails = async (req, res) => {
  try {
    const tenantId = req.users && req.users.tenantId;
    const employeeId = req.users?.id;
    const { year, month } = req.body;
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!tenantId) {
      return Helper.response(false, "TenantId is required", [], res, 400);
    }

    if (!year || !month) {
      return Helper.response(false, "Year ,Month are  required", [], res, 400);
    }
    const totalSalary = await bills.findOne({
      where: {
        month,
        year,
        tenantId,
        employeeId,
        branchId,
      },
    });

    // Get salary records from bill_info
    const getSalaryData = await bill_info.findAll({
      where: {
        employeeId,
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
          where: { tenantId, id: item.pay_component_id, branchId },
          raw: true,
        });

        const allowances = await Allowance.findOne({
          where: { tenantId, id: item.pay_component_id, branchId },
          raw: true,
        });

        const deductions = await deduction.findOne({
          where: { tenantId, id: item.pay_component_id, branchId },
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

    if (data.length == 0) {
      return Helper.response(
        false,
        "No active salary components found",
        [],
        res,
        404,
      );
    }

    const EarningArr = data.filter((item) => item.pay_code == "PAY");
    const DeductionArr = data.filter((item) => item.pay_code == "DED");

    const FinalData = {
      EarningArr,
      DeductionArr,
      totalSalary,
    };

    return Helper.response(
      true,
      "Active Salary Components",
      FinalData,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching salary components:", error);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

exports.PrintBill = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const employeeId = req.users?.id;
    const { year, month } = req.body;
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    // Read and convert to base64
    const logoPath = path.join(__dirname, "../../../logo-quaere.png");
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    const logo = "data:image/png;base64," + logoBase64;
    if (!tenantId) {
      return Helper.response(false, "TenantId is required", [], res, 400);
    }
    if (!year || !month) {
      return Helper.response(false, "Year, Month are required", [], res, 400);
    }

    const employee = await empPersonal.findOne({
      where: { id: employeeId, branchId },
      raw: true,
    });
    if (!employee) {
      return Helper.response(false, "Employee not found", [], res, 404);
    }
    const designation = await Designation.findOne({
      where: {
        id: employee?.designationId,
        branchId,
      },
    });
    const getSalaryData = await bill_info.findAll({
      where: { employeeId, month, year, tenantId, branchId },
      raw: true,
      order: [["createdAt", "desc"]],
    });

    if (!getSalaryData.length) {
      return Helper.response(
        false,
        "No active salary components found",
        [],
        res,
        404,
      );
    }

    const data = await Promise.all(
      getSalaryData.map(async (item) => {
        const basics = await Basic.findOne({
          where: { tenantId, id: item.pay_component_id, branchId },
          raw: true,
        });
        const allowances = await Allowance.findOne({
          where: { tenantId, id: item.pay_component_id, branchId },
          raw: true,
        });
        const deductions = await deduction.findOne({
          where: { tenantId, id: item.pay_component_id, branchId },
          raw: true,
        });

        return {
          ...item,
          name:
            item.pay_code === "PAY"
              ? basics
                ? basics.name
                : allowances?.name
              : deductions?.name,
          finalAmount: item.amount,
        };
      }),
    );

    const earnings = data.filter((d) => d.pay_code === "PAY");
    const deductionsData = data.filter((d) => d.pay_code === "DED");
    const currentDate = new Date().toLocaleDateString("en-GB");

    const grossSalary = earnings.reduce(
      (sum, e) => sum + parseFloat(e.finalAmount),
      0,
    );
    const totalDeductions = deductionsData.reduce(
      (sum, d) => sum + parseFloat(d.finalAmount),
      0,
    );
    const netSalary = grossSalary - totalDeductions;

    //  Create Earnings vs Deductions Table
    const maxRows = Math.max(earnings.length, deductionsData.length);
    const tableBody = [
      [
        { text: "Earnings", style: "tableHeader" },
        { text: "Amount", style: "tableAmountHeader" },
        { text: "Deductions", style: "tableHeader" },
        { text: "Amount", style: "tableAmountHeader" },
      ],
    ];

    for (let i = 0; i < maxRows; i++) {
      const earning = earnings[i];
      const deduction = deductionsData[i];
      tableBody.push([
        earning ? { text: earning.name } : "",
        earning ? { text: earning.finalAmount, alignment: "right" } : "",
        deduction ? { text: deduction.name } : "",
        deduction ? { text: deduction.finalAmount, alignment: "right" } : "",
      ]);
    }

    tableBody.push([
      { text: "Gross Salary", bold: true },
      {
        text: `${employee.currency || "INR"} ${grossSalary.toFixed(2)}`,
        bold: true,
        alignment: "right",
      },
      { text: "Total Deductions", bold: true },
      {
        text: `${employee.currency || "INR"} ${totalDeductions.toFixed(2)}`,
        bold: true,
        alignment: "right",
      },
    ]);

    tableBody.push([
      { text: ``, colSpan: 2, fillColor: "#f0f0f0" },
      {},
      { text: "NET Salary", bold: true, fillColor: "#f0f0f0" },
      {
        text: `${employee.currency || "INR"} ${netSalary.toFixed(2)}`,
        bold: true,
        alignment: "right",
        fillColor: "#f0f0f0",
      },
    ]);

    tableBody.push([
      {
        colSpan: 4,
        alignment: "left",
        fillColor: "#f0f0f0",
        stack: [
          {
            columns: [
              {
                text: "NET Salary (In Words):",
                bold: true,
                alignment: "left",
                italics: true,
              },
              {
                text: Helper.convertNumberToWords(Math.floor(netSalary)).toUpperCase(),
                alignment: "right",
                bold: true,
                italics: true,
              },
            ],
          },
        ],
      },
      {},
      {},
      {},
    ]);

    const docDefinition = {
      content: [
        { image: logo, width: 140, alignment: "left" },
        {
          columns: [
            { text: "Quaere eTechnologies Pvt. Ltd.", style: "header" },
            {
              text: "PAY SLIP",
              bold: true,
              alignment: "right",
              color: "#005495",
            },
          ],
        },
        {
          text: "www.quaeretech.com | +91-522 406 7760",
          alignment: "left",
          fontSize: 10,
        },
        {
          text: "7th Floor, Cyber Tower, Pickup Road, Vibhuti Khand, Gomti Nagar, Lucknow-226010",
          alignment: "left",
          fontSize: 10,
          margin: [0, 0, 0, 10],
        },

        {
          canvas: [
            { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 },
          ],
          margin: [0, 0, 0, 10],
        },

        // Employee Heading (Net Pay)
        {
          style: "tableExample",
          table: {
            widths: ["50%", "50%"],
            body: [
              [
                { text: "Employee Details", fontSize: 10 },
                {
                  columns: [
                    { text: "Net Pay", fontSize: 10 },
                    {
                      text: `${employee.currency || "INR"} ${netSalary.toFixed(
                        2,
                      )}`,
                      fontSize: 10,
                      alignment: "right",
                      color: "#005495",
                      bold: true,
                    },
                  ],
                },
              ],
            ],
          },
        },

        // Employee Details Block
        {
          style: "tableExample",
          table: {
            widths: ["50%", "50%"],
            body: [
              [{ text: `Month : ${month}` }, { text: `Year : ${year}` }],
              [
                {
                  text: `Employee Name : ${
                    `${employee?.firstName} ${employee?.lastName}` || "NA"
                  }`,
                },
                 { text: "" },
                // { text: `Department : ${employee.department || "NA"}` },
              ],
              [
                { text: `Employee Code : ${employee.empCode || "NA"}` },
                { text: `E-mail ID : ${employee.email || "NA"}` },
              ],
              [
                { text: `Contact No : ${employee.mobile || "NA"}` },
                { text: `Pay Period : ${currentDate}` },
              ],
              [
                { text: `UAN No.: ${employee.uan_no || "NA"}` },
                { text: `ESIC No.: ${employee.esic_no || "NA"}` },
              ],
              [
                { text: `Designation : ${designation?.name || "NA"}` },
                { text: "" },
              ],
            ],
          },
        },

        // Earnings vs Deductions Table
        {
          style: "tableExample",
          table: { widths: ["*", "auto", "*", "auto"], body: tableBody },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#f2f2f2" : null),
            hLineColor: () => "#000",
            vLineColor: () => "#000",
          },
        },
      ],
      styles: {
        header: { fontSize: 10, bold: true },
        tableExample: { margin: [0, 5, 0, 15], fontSize: 10 },
        tableHeader: { fontSize: 12, bold: true, fillColor: "#f0f0f0" },
        tableAmountHeader: {
          fontSize: 12,
          bold: true,
          alignment: "right",
          fillColor: "#f0f0f0",
        },
      },
    };
    const fileName = `payslip_${employee.empCode}_${month}_${year}.pdf`;
    const filePath = path.join(__dirname, "../../../uploads/pdfs", fileName);
    console.log(filePath);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // make sure folder exists
    // fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.end();

    // return download URL
    const downloadUrl = `${base_url}/uploads/pdfs/${fileName}`;
    return Helper.response(
      true,
      "PDF generated successfully",
      { downloadUrl },
      res,
      200,
    );
  } catch (err) {
    console.error("Error generating payslip:", err);
    return Helper.response(false, err?.message, [], res, 500);
  }
};

// team leader leave maange

// exports.TeamLeaderLeaveList = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const employeeId = req.users?.id;

//   if (!tenantId) {
//     return Helper.response(false, "User Not Found", [], res, 404);
//   }

//   try {
//     // Get team employee IDs
//     const employees = await empPersonal.findAll({
//       where: {
//         reportingPersonId: employeeId,
//         status: "active",
//       },
//       attributes: ["id", "firstName", "lastName"],
//       raw: true,
//     });

//     const employeeIds = employees.map((item) => item.id);

//     const leaveStatusCount = await leave_application.findAll({
//       attributes: [
//         "id",
//         "employeeId",
//         "leaveTypeId",
//         "fromDate",
//         "toDate",
//         "duration_type",
//         "days",
//         "reason",
//         "status",
//       ],
//       where: {
//         tenantId,

//         employeeId: { [Op.in]: employeeIds },
//       },

//       raw: true,
//     });

//     const leaveData = await Promise.all(
//       leaveStatusCount.map(async (item) => {
//         const leaveName = await leaveMaster.findOne({
//           where: { id: item?.leaveTypeId, tenantId },
//         });
//         const employee = await empPersonal.findOne({
//           where: {
//             id: item?.employeeId,
//           },
//         });
//         return {
//           ...item,
//           name: leaveName?.leaveName,
//           code: leaveName?.leaveCode,
//           employeeName: `${employee?.firstName} ${employee?.lastName}`,
//         };
//       })
//     );

//     // const responseData = {
//     //   leaveBalances: leaveData,
//     //   appliedLeaveSummary: leaveStatusCount,
//     // };

//     return Helper.response(
//       true,
//       "Leave List Found Successfully!",
//       leaveData,
//       res,
//       200
//     );
//   } catch (error) {
//     console.error("Error fetching employee leave list:", error);
//     return Helper.response(false, error.message, [], res, 500);
//   }
// };

// //// Director leader leave maange

// exports.DirectorLeaveList = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const directorId = req.users?.id;

//   if (!tenantId) {
//     return Helper.response(false, "User Not Found", [], res, 404);
//   }

//   try {
//     const allEmployees = await empPersonal.findAll({
//       where: { reportingPersonId: directorId, tenantId, status: "active" },
//       attributes: ["id"],
//       raw: true,
//     });

//     const teamLeaderIds = allEmployees.map((e) => e.id);

//     const subordinateIds = await Helper.getAllSubordinates(
//       directorId,
//       tenantId
//     );

//     const teamLeaders = teamLeaderIds;
//     const employees = subordinateIds.filter((id) => !teamLeaders.includes(id));

//     const leaveApplications = await leave_application.findAll({
//       where: {
//         tenantId,
//         [Op.or]: [
//           { employeeId: { [Op.in]: teamLeaders } },
//           {
//             employeeId: { [Op.in]: employees },
//             status: "recommended",
//           },
//         ],
//       },
//       attributes: [
//         "id",
//         "employeeId",
//         "leaveTypeId",
//         "fromDate",
//         "toDate",
//         "duration_type",
//         "days",
//         "reason",
//         "status",
//         "approverId",
//       ],
//       raw: true,
//     });

//     const leaveData = await Promise.all(
//       leaveApplications.map(async (item) => {
//         const leaveName = await leaveMaster.findOne({
//           where: { id: item?.leaveTypeId, tenantId },
//           attributes: ["leaveName", "leaveCode"],
//         });

//         const employee = await empPersonal.findOne({
//           where: { id: item?.employeeId, tenantId },
//           attributes: ["firstName", "lastName"],
//         });
//         const employeeApprove = await empPersonal.findOne({
//           where: { id: item?.approverId, tenantId },
//           attributes: ["firstName", "lastName"],
//         });

//         return {
//           ...item,
//           leaveName: leaveName?.leaveName,
//           leaveCode: leaveName?.leaveCode,
//           employeeName: `${employee?.firstName} ${employee?.lastName}`,
//           approvedBy: `${employeeApprove?.firstName} ${employeeApprove?.lastName}`,
//         };
//       })
//     );

//     return Helper.response(
//       true,
//       "Director Leave List Found",
//       leaveData,
//       res,
//       200
//     );
//   } catch (error) {
//     console.error("Error fetching Director Leave List:", error);
//     return Helper.response(false, error.message, [], res, 500);
//   }
// };

// exports.notification = async (req, res) => {
//   try {
//     const { tenantId } = req.users;

//     if (!tenantId) {
//       return Helper.response(false, "User Not Found", [], res, 404);
//     }

//       // const deviceId = await empPersonal.findOne({
//       //   where: {
//       //     id: req.users.id,
//       //   },
//       // });
//        const data = await leave_application.findAll({
//         where:{
//           status:'approved'
//         },
//         raw:true,
//         order:[["createdAt","desc"]]
//        })

//       // const response = await Helper.sendNotification(
//       //   deviceId?.deviceIdPOS,
//       //   "New File Alert",
//       //   `New file Alert Raised ${data?.vehicleId}`
//       // );
//       // console.log(response, "response");

//       if(data.length>0){
//         return Helper.response(true,"data Found Succcessfully",data,res,200)
//       }else{
//         return Helper.response(false,"No data Found",[],res,200)
//       }

//   } catch (error) {
//     return Helper.response(false, error.message, {}, res, 500);
//   }
// };
exports.notification = async (req, res) => {
  try {
    // const { tenantId, id: userId, role } = req.users;
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const role = req.users?.role; // e.g., 'employee', 'teamLeader', 'director'
    const status = req.body?.status || "pending";
    if (!tenantId) {
      return Helper.response(false, "User Not Found", [], res, 404);
    }

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    let employeeIds = [];
    const today = new Date().toISOString().split("T")[0];
    // Role-based logic
    if (role == "teamLeader") {
      // Team Leader: own + reportees
      const reportees = await empPersonal.findAll({
        where: {
          reportingPersonId: userId,
          tenantId,
          branchId,
          status: "active",
        },
        attributes: ["id"],
        raw: true,
      });

      employeeIds = reportees.map((r) => r.id);
      employeeIds.push(userId); // include self
    } else if (role == "manager" || role == "director") {
      // Manager/Director: their own + all subordinates under them
      const subordinates = await Helper.getAllSubordinates(userId, tenantId);
      employeeIds = [...subordinates, userId]; // include self
    } else {
      employeeIds = [userId];
    }

    // Fetch approved leaves related to those employee IDs
    const data = await leave_application.findAll({
      where: {
        tenantId,
        branchId,
        employeeId: { [Op.in]: employeeIds },
      },
      raw: true,
      order: [["createdAt", "desc"]],
    });
    const Attendacedata = await attendance.findAll({
      where: {
        tenantId,
        branchId,
        employeeId: { [Op.in]: employeeIds },
        date: today,
      },
      raw: true,
      order: [["createdAt", "desc"]],
    });

    if (data.length == 0) {
      return Helper.response(false, "No data Found", [], res, 200);
    }

    // Fetch user device token
    const deviceInfo = await empPersonal.findOne({
      where: { id: userId },
      raw: true,
    });

    // If user has FCM token, send push notification
    if (deviceInfo?.deviceToken) {
      const leaveCount = data.length;
      // await Helper.sendNotification(
      //   deviceInfo.deviceId,
      //   "Leave Approval Updates",
      //   `${leaveCount} leave(s) have been approved in your team.`
      // );
      const response = await Helper.sendNotification(
        deviceInfo.deviceId,
        "Leave Approval Updates",
        `${leaveCount} leave(s) have been approved in your team.`,
      );
      // console.log(response, "response");
    }

    // Prepare detailed data
    const finalData = await Promise.all(
      data.map(async (item) => {
        const leaveType = item?.leaveTypeId
          ? await leaveMaster.findOne({
              where: { id: item.leaveTypeId },
              raw: true,
            })
          : null;

        const approver = item?.approverId
          ? await empPersonal.findOne({
              where: { id: item.approverId },
              raw: true,
            })
          : null;

        const creator = await empPersonal.findOne({
          where: { id: item.createdBy },
          raw: true,
        });

        return {
          ...item,
          leaveType: leaveType?.leaveName ?? null,
          approvedBy: approver
            ? `${approver.firstName} ${approver.lastName}`
            : null,
          createdBy: creator
            ? `${creator.firstName} ${creator.lastName}`
            : null,
          createdAt: Helper.dateFormat(item.createdAt),
          updatedAt: Helper.dateFormat(item.updatedAt),
        };
      }),
    );
    const mergedData = [
      ...finalData, // leave data (with detailed info)
      ...Attendacedata, // today's attendance
    ];

    return Helper.response(
      true,
      "Data Found Successfully",
      mergedData,
      res,
      200,
    );
  } catch (error) {
    console.error("Notification API Error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getAppAppliedLeaves = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    const role = req.users?.role;
    let branchId = req.users?.branchId;

    if (!tenantId) {
      return Helper.response(false, "User Not Found", [], res, 404);
    }

    if (!branchId || branchId == "null") {
      return Helper.response(false, "BranchId is required!", [], res, 400);
    }

    const { month, year } = req.body || {};

    let employeeIds = [];

    /* =====================================================
        ROLE BASED EMPLOYEE FILTERING
    ===================================================== */

    // if (role == "employee") {

    // }

    if (role == "teamLeader") {
      const reportees = await empPersonal.findAll({
        where: {
          reportingPersonId: userId,
          tenantId,
          branchId,
          status: "active",
        },
        attributes: ["id"],
        raw: true,
      });

      employeeIds = reportees.map((e) => e.id);
      employeeIds.push(userId);
    } else if (role == "director") {
      if (!req.body.branchId) {
        return Helper.response(false, "Branch Id Is Required", {}, res, 200);
      }

      if (req.body.branchId) {
        branchId = req.body.branchId;
      }

      const directReportees = await empPersonal.findAll({
        where: {
          tenantId,
          branchId: branchId == "All" ? { [Op.ne]: null } : branchId,
          status: "active",
        },
        attributes: ["id"],
        raw: true,
      });

      const directIds = directReportees.map((e) => e.id);

      const subordinateIds = await Helper.getAllSubordinates(
        userId,
        branchId,
        tenantId,
      );

      employeeIds = [...new Set([...directIds, ...subordinateIds])];
    } else if (role == "manager") {
      let directReportees;
      branchId = req.body.branchId ? req.body.branchId : branchId;
      if (branchId == "All") {
        directReportees = await empPersonal.findAll({
          where: {
            reportingPersonId: userId,
            tenantId,
            // branchId,
            status: "active",
          },
          attributes: ["id"],
          raw: true,
        });
      } else {
        branchId = req.body.branchId ? req.body.branchId : branchId;
        directReportees = await empPersonal.findAll({
          where: {
            reportingPersonId: userId,
            tenantId,
            branchId,
            status: "active",
          },
          attributes: ["id"],
          raw: true,
        });
      }

      // const directReportees = await empPersonal.findAll({
      //   where: {
      //     reportingPersonId: userId,
      //     tenantId,
      //     branchId,
      //     status: "active",
      //   },
      //   attributes: ["id"],
      //   raw: true,
      // });

      var teamLeaderIds = directReportees.map((e) => e.id);

      const subordinateIds = await Helper.getAllSubordinates(
        userId,
        branchId,
        tenantId,
      );

      var employeeSubordinates = subordinateIds.filter(
        (id) => !teamLeaderIds.includes(id),
      );

      employeeIds = [...teamLeaderIds, ...employeeSubordinates];
    } else {
      employeeIds = [userId];
    }

    if (!employeeIds.length) {
      return Helper.response(false, "No leave records found", [], res, 200);
    }

    /* =====================================================
        FETCH LEAVES
    ===================================================== */

    const andClauses = [];
    if (month) andClauses.push(where(fn("EXTRACT", literal('MONTH FROM "fromDate"')), month));
    if (year) andClauses.push(where(fn("EXTRACT", literal('YEAR FROM "fromDate"')), year));

    const leaveApplications = await leave_application.findAll({
      where: {
        tenantId,
        branchId: branchId == "All" ? { [Op.ne]: null } : branchId,
        employeeId: { [Op.in]: employeeIds },
        ...(andClauses.length > 0 && { [Op.and]: andClauses }),
      },
      order: [["appliedOn", "DESC"]],
      raw: true,
    });

    if (!leaveApplications.length) {
      return Helper.response(true, "No leave records found", [], res, 200);
    }

    /* =====================================================
        FETCH REQUIRED MASTER DATA (OPTIMIZED)
    ===================================================== */

    const allEmployeeIds = [
      ...new Set(leaveApplications.map((l) => l.employeeId)),
    ];

    const employees = await empPersonal.findAll({
      where: { id: { [Op.in]: allEmployeeIds }, tenantId },
      attributes: ["id", "firstName", "lastName", "branchId"],
      raw: true,
    });

    const branches = await branch.findAll({
      attributes: ["id", "name"],
      raw: true,
    });

    const leaveTypes = await leaveMaster.findAll({
      where: { tenantId },
      attributes: ["id", "leaveName", "leaveCode"],
      raw: true,
    });

    /* =====================================================
        MAP DATA
    ===================================================== */

    const leaveData = leaveApplications.map((item) => {
      const employee = employees.find((e) => e.id === item.employeeId);
      const branchData = branches.find((b) => b.id === employee?.branchId);
      const leaveType = leaveTypes.find((l) => l.id === item.leaveTypeId);

      return {
        ...item,
        employeeName:
          `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim(),
        branchName: branchData?.name ?? null,
        leaveName: leaveType?.leaveName ?? null,
        leaveCode: leaveType?.leaveCode ?? null,
        leaveStatus: item.employeeId == userId ? "self" : "team",
      };
    });

    return Helper.response(
      true,
      "Leave List fetched successfully",
      leaveData,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching leave list:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

exports.getMyLeaveHistory = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const employeeId = req.users?.id;
  const branchId = req.users?.branchId;

  if (!tenantId || !branchId || branchId === "null") {
    return Helper.response(false, "Required fields missing", [], res, 400);
  }

  try {
    const { leaveTypeId, month, year } = req.body || {};

    const andClauses = [];
    if (year) andClauses.push(where(fn("EXTRACT", literal('YEAR FROM "fromDate"')), year));
    if (month) andClauses.push(where(fn("EXTRACT", literal('MONTH FROM "fromDate"')), month));

    const whereClause = {
      tenantId,
      employeeId,
      branchId,
      ...(leaveTypeId && { leaveTypeId }),
      ...(andClauses.length > 0 && { [Op.and]: andClauses }),
    };

    const leaves = await leave_application.findAll({
      where: whereClause,
      order: [["fromDate", "DESC"]],
      raw: true,
    });

    const leaveTypes = await leaveMaster.findAll({
      where: { tenantId },
      attributes: ["id", "leaveName", "leaveCode"],
      raw: true,
    });
    const ltMap = Object.fromEntries(leaveTypes.map((l) => [l.id, l]));

    const data = leaves.map((l) => ({
      ...l,
      leaveName: ltMap[l.leaveTypeId]?.leaveName ?? null,
      leaveCode: ltMap[l.leaveTypeId]?.leaveCode ?? null,
    }));

    return Helper.response(true, "Leave history fetched", data, res, 200);
  } catch (error) {
    console.error("Error fetching leave history:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

// exports.getAppAppliedLeaves = async (req, res) => {
//   const tenantId = req.users?.tenantId;
//   const userId = req.users?.id;
//   const role = req.users?.role; // e.g., 'employee', 'teamLeader', 'director'
//   console.log(tenantId);

//   if (!tenantId) {
//     return Helper.response(false, "User Not Found", [], res, 404);
//   }

//   let branchId = req.users && req.users.branchId;

//   if (!branchId || branchId == "null") {
//     return Helper.response(false, "branchId is required!", {}, res, 200);
//   }

//   try {
//     const date = new Date();

//     const currentMonth = date.getMonth() + 1;
//     const currentYear = date.getFullYear();

//     const { month = currentMonth, year = currentYear } = req.body || {};
//     let employeeIds = [];
//     let leaveApplications;
//     if (role == "teamLeader") {
//       const reportees = await empPersonal.findAll({
//         where: {
//           reportingPersonId: userId,
//           status: "active",
//           tenantId,
//           branchId,
//         },
//         attributes: ["id"],
//         raw: true,
//       });
//       employeeIds = reportees.map((e) => e.id);
//       employeeIds.push(userId);
//     } else if (role == "director") {
//       let directReportees;
//       if (branchId == "All") {
//         directReportees = await empPersonal.findAll({
//           where: {
//             // reportingPersonId: userId,
//             tenantId,
//             // branchId,
//             status: "active",
//           },
//           attributes: ["id"],
//           raw: true,
//         });
//       } else {
//         branchId = req.body.branchId ? req.body.branchId : branchId;
//         directReportees = await empPersonal.findAll({
//           where: {
//             // reportingPersonId: userId,
//             tenantId,
//             branchId,
//             status: "active",
//           },
//           attributes: ["id"],
//           raw: true,
//         });
//       }
//       //  directReportees = await empPersonal.findAll({
//       //   where: {
//       //     // reportingPersonId: userId,
//       //     tenantId,
//       //     branchId,
//       //     status: "active",
//       //   },
//       //   attributes: ["id"],
//       //   raw: true,
//       // });

//       var teamLeaderIds = directReportees.map((e) => e.id);

//       const subordinateIds = await Helper.getAllSubordinates(
//         userId,
//         branchId,
//         tenantId,
//       );

//       var employeeSubordinates = subordinateIds.filter(
//         (id) => !teamLeaderIds.includes(id),
//       );

//       employeeIds = [...teamLeaderIds, ...employeeSubordinates];
//     } else if (role === "manager") {

//       let directReportees;
//       if (branchId == "All") {
//         directReportees = await empPersonal.findAll({
//           where: {
//             reportingPersonId: userId,
//             tenantId,
//             // branchId,
//             status: "active",
//           },
//           attributes: ["id"],
//           raw: true,
//         });
//       } else {
//         branchId = req.body.branchId ? req.body.branchId : branchId;
//         directReportees = await empPersonal.findAll({
//           where: {
//             reportingPersonId: userId,
//             tenantId,
//             branchId,
//             status: "active",
//           },
//           attributes: ["id"],
//           raw: true,
//         });
//       }

//       // const directReportees = await empPersonal.findAll({
//       //   where: {
//       //     reportingPersonId: userId,
//       //     tenantId,
//       //     branchId,
//       //     status: "active",
//       //   },
//       //   attributes: ["id"],
//       //   raw: true,
//       // });

//       var teamLeaderIds = directReportees.map((e) => e.id);

//       const subordinateIds = await Helper.getAllSubordinates(
//         userId,
//         branchId,
//         tenantId,
//       );

//       var employeeSubordinates = subordinateIds.filter(
//         (id) => !teamLeaderIds.includes(id),
//       );

//       employeeIds = [...teamLeaderIds, ...employeeSubordinates];
//     } else {
//       employeeIds = [userId];
//     }

//     if (employeeIds.length == 0) {
//       return Helper.response(false, "No leave records found", [], res, 200);
//     }

//     // Fetch leave applications
//     if (role == "manager") {
//       const teamleaderLeave = await leave_application.findAll({
//         where: {
//           tenantId,
//           branchId,
//           employeeId: { [Op.in]: teamLeaderIds },
//           [Op.and]: [
//             where(fn("EXTRACT", literal('MONTH FROM "fromDate"')), month),
//             where(fn("EXTRACT", literal('YEAR FROM "fromDate"')), year),
//           ],
//         },
//         raw: true,
//         order: [["appliedOn", "desc"]],
//       });
//       const employeeSubordinator = await leave_application.findAll({
//         where: {
//           tenantId,
//           branchId,
//           employeeId: { [Op.in]: employeeSubordinates },
//           [Op.and]: [
//             where(fn("EXTRACT", literal('MONTH FROM "fromDate"')), month),
//             where(fn("EXTRACT", literal('YEAR FROM "fromDate"')), year),
//           ],
//           status: {
//             [Op.ne]: "pending",
//           },
//         },
//         raw: true,
//         order: [["appliedOn", "desc"]],
//       });

//       leaveApplications = [...teamleaderLeave, ...employeeSubordinator];
//     } else {
//       leaveApplications = await leave_application.findAll({
//         where: {
//           tenantId,
//           branchId,
//           employeeId: { [Op.in]: employeeIds },
//           [Op.and]: [
//             where(fn("EXTRACT", literal('MONTH FROM "fromDate"')), month),
//             where(fn("EXTRACT", literal('YEAR FROM "fromDate"')), year),
//           ],
//         },
//         order: [["appliedOn", "desc"]],
//         raw: true,
//       });
//     }

//     const leaveData = await Promise.all(
//       leaveApplications.map(async (item) => {
//         const employee = await empPersonal.findOne({
//           where: { id: item.employeeId, tenantId, branchId },
//           attributes: ["firstName", "lastName"],
//         });
//         const branchName = await branch.findOne({
//           where: { id: employee?.branchId },
//           raw:true,
//           attributes: ["name"],
//         });

//         const leaveType = await leaveMaster.findOne({
//           where: { id: item.leaveTypeId, tenantId, branchId },
//           attributes: ["leaveName", "leaveCode"],
//         });

//         let approvedBy = null;
//         let recommendBy = null;
//         let CanceledBy = null;
//         if (item.approverId) {
//           const approver = await empPersonal.findOne({
//             where: { id: item.approverId, tenantId, branchId },
//             attributes: ["firstName", "lastName"],
//           });
//           approvedBy = `${approver?.firstName ?? ""} ${
//             approver?.lastName ?? ""
//           }`.trim();
//         }
//         if (item.recommendedId) {
//           const approver = await empPersonal.findOne({
//             where: { id: item.recommendedId, tenantId, branchId },
//             attributes: ["firstName", "lastName"],
//           });
//           recommendBy = `${approver?.firstName ?? ""} ${
//             approver?.lastName ?? ""
//           }`.trim();
//         }
//         if (item.canceledId) {
//           const approver = await empPersonal.findOne({
//             where: { id: item.canceledId, tenantId, branchId },
//             attributes: ["firstName", "lastName"],
//           });
//           CanceledBy = `${approver?.firstName ?? ""} ${
//             approver?.lastName ?? ""
//           }`.trim();
//         }
//         let leavestaus;
//         if (item.employeeId == userId) {
//           leavestaus = "self";
//         } else {
//           leavestaus = "team";
//         }
//         return {
//           ...item,
//           employeeName: `${employee?.firstName ?? ""} ${
//             employee?.lastName ?? ""
//           }`.trim(),
//           leaveName: leaveType?.leaveName ?? null,
//           leaveCode: leaveType?.leaveCode ?? null,
//           approvedBy,
//           branchName:branchName?.name??null,
//           leavestaus: leavestaus,
//           recommendBy: recommendBy ?? null,
//           CanceledBy: CanceledBy ?? null,
//         };
//       }),
//     );

//     return Helper.response(
//       true,
//       "Leave List fetched successfully",
//       leaveData,
//       res,
//       200,
//     );
//   } catch (error) {
//     console.error("Error fetching leave list:", error);
//     return Helper.response(false, error.message, [], res, 500);
//   }
// };

exports.applyRegularization = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { attendanceDate, inTimeRequested, outTimeRequested, reason } =
      req.body;

    const employeeId = req.users?.id;
    const tenantId = req.users?.tenantId;
    const createdBy = req.users?.id;
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if(!inTimeRequested && !outTimeRequested){
      return Helper.response(
        false,
        "Either inTimeRequested or outTimeRequested must be provided",
        {},
        res,
        400,
      );
    }

    if (!employeeId || !attendanceDate || !reason || !tenantId) {
      return Helper.response(
        false,
        "employeeId, attendanceDate, reason & tenantId are required",
        {},
        res,
        400,
      );
    }

    const today = new Date();
    const attDate = new Date(attendanceDate);

    today.setHours(0, 0, 0, 0);
    attDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - attDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays > 2) {
      await t.rollback();
      return Helper.response(
        false,
        "Regularization allowed only within 2 days from attendance date",
        {},
        res,
        200,
      );
    }

    const payload = {
      employeeId,
      attendanceDate,
      inTimeRequested,
      outTimeRequested,
      reason,
      tenantId,
      branchId,
      createdBy,
      status: "pending",
    };

    const existing = await AttendanceRegularization.findOne({
      where: {
        employeeId,
        tenantId,
        attendanceDate,
        branchId,
      },
      transaction: t,
    });

    let request;

    if (!existing) {
      request = await AttendanceRegularization.create(payload, {
        transaction: t,
      });
    } else {
      await AttendanceRegularization.update(payload, {
        where: { id: existing.id },
        transaction: t,
      });

      request = await AttendanceRegularization.findByPk(existing.id, {
        transaction: t,
      });
    }

    await t.commit();
    return Helper.response(
      true,
      "Regularization request submitted",
      request,
      res,
      200,
    );
  } catch (err) {
    await t.rollback();
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.getMyRegularizations = async (req, res) => {
  try {
    const employeeId = req.users.id;
    const tenantId = req.users.tenantId;
    const date = new Date();

    const currentMonth = date.getMonth() + 1;
    const currentYear = date.getFullYear();

    const { month = currentMonth, year = currentYear } = req.body || {};
    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const list = await AttendanceRegularization.findAll({
      where: {
        employeeId,
        tenantId,
        branchId,
        [Op.and]: [
          where(fn("EXTRACT", literal('MONTH FROM "attendanceDate"')), month),
          where(fn("EXTRACT", literal('YEAR FROM "attendanceDate"')), year),
        ],
      },
      order: [["createdAt", "DESC"]],
      raw: true,
    });
    if (list.length == 0) {
      return Helper.response(false, "No Data Found", [], res, 200);
    }

    const finalData = await Promise.all(
      list.map(async (item) => {
        const empData = await empPersonal.findOne({
          where: {
            id: item?.employeeId,
            branchId,
          },
        });
        return {
          ...item,
          name: empData ? `${empData?.firstName} ${empData?.lastName}` : null,
          empCode: empData ? `${empData?.empCode}` : null,
          email: empData ? `${empData?.email}` : null,
        };
      }),
    );

    return Helper.response(
      true,
      "Data Found Successfully",
      finalData,
      res,
      200,
    );
  } catch (err) {
    console.log("error:", err);

    return Helper.response(false, err?.message, {}, res, 500);
  }
};

exports.getPendingApproverRequests = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const approverId = req.users?.id;

    const { startDate, endDate, emp_id, status = "pending" } = req.body;

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const whereCondition = { status: status };

    if (emp_id && emp_id !== "All") {
      whereCondition.employeeId = emp_id;
    }

    if (startDate && endDate) {
      whereCondition.attendanceDate = {
        [Op.between]: [startDate, endDate],
      };
    }

    if (tenantId) {
      whereCondition.tenantId = tenantId;
    }
    if (branchId) {
      whereCondition.branchId = branchId;
    }

    const list = await AttendanceRegularization.findAll({
      where: whereCondition,
      raw: true,
      order: [["createdAt", "DESC"]],
    });

    if (!Array.isArray(list) || list.length === 0) {
      return Helper.response(false, "No Data Found", [], res, 200);
    }

    // Enrich with employee details (N+1 query — consider using include)
    const finalData = await Promise.all(
      list.map(async (item) => {
        const empData = await empPersonal.findOne({
          where: { id: item?.employeeId, status: "active" },
          raw: true,
        });

        return {
          ...item,
          name: empData
            ? `${empData.firstName ?? ""} ${empData.lastName ?? ""}`.trim()
            : null,
          empCode: empData ? (empData.empCode ?? null) : null,
          email: empData ? (empData.email ?? null) : null,
        };
      }),
    );

    return Helper.response(
      true,
      "Data Found Successfully",
      finalData,
      res,
      200,
    );
  } catch (err) {
    console.error("getPendingApproverRequests error:", err);
    return Helper.response(
      false,
      err?.message || "Internal Server Error",
      {},
      res,
      500,
    );
  }
};

exports.updateRegularizationStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let { ids, status } = req.body;
    const approverId = req.users?.id;

    const branchId = req.users && req.users.branchId;

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!ids) {
      ids = req.body.id;
    }

    if (!ids || !status) {
      return Helper.response(
        false,
        "id and valid status (approved/rejected) are required",
        {},
        res,
        400,
      );
    }

    // Convert single ID into array
    const ids1 = Array.isArray(ids) ? ids : [ids];

    // Fetch all requests
    const requests = await AttendanceRegularization.findAll({
      where: { id: { [Op.in]: ids1 }, branchId },
      transaction: t,
    });

    if (requests.length == 0) {
      return Helper.response(false, "No matching requests found", {}, res, 404);
    }

    // Process each request
    for (const request of requests) {
      request.status = status;
      request.approverId = approverId;
      request.approvedAt = new Date();

      // Only process attendance if approved
      if (status == "approved") {
        const attendanceDate = request.attendanceDate;
        const dateObj = new Date(attendanceDate);

        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();

        const formatDateTime = (rawTime, baseDate) => {
          if (!rawTime) return null;

          let timePart = rawTime.includes(" ")
            ? rawTime.split(" ")[1]
            : rawTime;

          if (timePart.length == 5) timePart += ":00";

          return `${baseDate} ${timePart}`;
        };

        const checkIn = formatDateTime(request.inTimeRequested, attendanceDate);
        const checkOut = formatDateTime(
          request.outTimeRequested,
          attendanceDate,
        );

        const existingAttendance = await attendance.findOne({
          where: {
            employeeId: request.employeeId,
            date: attendanceDate,
            tenantId: request.tenantId,
            branchId,
          },
          transaction: t,
        });

        if (existingAttendance) {
          // Store originals so they can be restored if this approval is reverted
          request.originalCheckIn = existingAttendance.check_in_time;
          request.originalCheckOut = existingAttendance.check_out_time;
          request.wasNewAttendance = false;

          await attendance.update(
            {
              check_in_time: checkIn || existingAttendance.check_in_time,
              check_out_time: checkOut || existingAttendance.check_out_time,
              updatedBy: approverId,
            },
            {
              where: {
                employeeId: request.employeeId,
                date: attendanceDate,
                tenantId: request.tenantId,
                branchId,
              },
              transaction: t,
            },
          );
        } else {
          // No prior attendance record — we are creating one fresh
          request.originalCheckIn = null;
          request.originalCheckOut = null;
          request.wasNewAttendance = true;

          await attendance.create(
            {
              id: uuidv4(),
              tenantId: request.tenantId,
              employeeId: request.employeeId,
              ip_address: "REGULARIZATION",
              date: attendanceDate,
              month,
              year,
              check_in_time: checkIn,
              check_out_time: checkOut,
              is_present: true,
              createdBy: approverId,
              branchId,
            },
            { transaction: t },
          );
        }
      }

      await request.save({ transaction: t });
    }

    await t.commit();
    return Helper.response(true, "Updated successfully", {}, res, 200);
  } catch (err) {
    await t.rollback();
    console.error(err);
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.markattendance = async (req, res) => {
  try {
    const { tenantId, id: employeeId } = req.users;
    const branchId = req.users?.branchId || null;

    if (!tenantId || !employeeId) {
      return Helper.response(false, "User not found", {}, res, 404);
    }

    const today = new Date();
    const date = today.toISOString().split("T")[0];
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    // Format: YYYY-MM-DD HH:mm:ss  e.g. 2026-06-01 09:30:50
    const pad = (n) => String(n).padStart(2, "0");
    const datetime = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())} ${pad(today.getHours())}:${pad(today.getMinutes())}:${pad(today.getSeconds())}`;

    const ip_address =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // Find today's attendance
    let attendanceRecord = await attendance.findOne({
      where: { tenantId, employeeId, date },
    });

    if (!attendanceRecord) {
      attendanceRecord = await attendance.create({
        tenantId,
        employeeId,
        branchId,
        date,
        month,
        year,
        ip_address,
        Inlatitude: req.body.latitude || null,
        Inlongitude: req.body.longitude || null,
        check_in_time: datetime,
        is_present: true,
        createdBy: employeeId,
        check_in_img: req.files?.[0]?.filename || null,
      });

      return Helper.response(
        true,
        "Check-in successful",
        attendanceRecord,
        res,
        200,
      );
    }

    // if (attendanceRecord.check_out_time) {
    //   return Helper.response(
    //     false,
    //     "Attendance already marked for today",
    //     attendanceRecord,
    //     res,
    //     400
    //   );
    // }

    attendanceRecord.check_out_time = datetime;
    attendanceRecord.check_out_img = req.files?.[0]?.filename || null;
    attendanceRecord.updatedBy = employeeId;
    attendanceRecord.Outlatitude = req.body.latitude || null;
    attendanceRecord.Outlongitude = req.body.longitude || null;
    await attendanceRecord.save();

    return Helper.response(
      true,
      "Check-out successful",
      attendanceRecord,
      res,
      200,
    );
  } catch (error) {
    console.error("Attendance Error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

// exports.updateRegularizationStatus = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const { id, status } = req.body;
//     const approverId = req.users?.id;

//     if (!id || !["approved", "rejected"].includes(status)) {
//       return Helper.response(
//         false,
//         "id and valid status (approved/rejected) are required",
//         {},
//         res,
//         400
//       );
//     }

//     const request = await AttendanceRegularization.findByPk(id, {
//       transaction: t,
//     });

//     if (!request) {
//       return Helper.response(false, "Request not found", {}, res, 404);
//     }

//     // Update status of the regularization request
//     request.status = status;
//     request.approverId = approverId;
//     request.approvedAt = new Date();
//     await request.save({ transaction: t });

//     if (status === "approved") {
//       const attendanceDate = request.attendanceDate; // "2025-10-06"
//       const dateObj = new Date(attendanceDate);

//       const month = dateObj.getMonth() + 1;
//       const year = dateObj.getFullYear();

//       const formatDateTime = (rawTime, baseDate) => {
//         if (!rawTime) return null;

//         // rawTime may be: "2025-10-06 09:12:00" OR "09:12:00"
//         let timePart = rawTime.includes(" ") ? rawTime.split(" ")[1] : rawTime;

//         // Safety: ensure HH:mm:ss format
//         if (timePart.length === 5) timePart += ":00";

//         const finalString = `${baseDate} ${timePart}`; // "2025-10-06 09:12:00"
//         return finalString;
//       };

//       const checkIn = formatDateTime(request.inTimeRequested, attendanceDate);
//       const checkOut = formatDateTime(request.outTimeRequested, attendanceDate);

//       const existingAttendance = await attendance.findOne({
//         where: {
//           employeeId: request.employeeId,
//           date: attendanceDate,
//           tenantId: request.tenantId,
//         },
//         transaction: t,
//       });

//       if (existingAttendance) {
//         await attendance.update(
//           {
//             check_in_time: checkIn || existingAttendance.check_in_time,
//             check_out_time: checkOut || existingAttendance.check_out_time,
//             updatedBy: approverId,
//           },
//           {
//             where: {
//               employeeId: request.employeeId,
//               date: attendanceDate,
//               tenantId: request.tenantId,
//             },
//             transaction: t,
//           }
//         );
//       } else {
//         await attendance.create(
//           {
//             id: uuidv4(),
//             tenantId: request.tenantId,
//             employeeId: request.employeeId,
//             ip_address: "REGULARIZATION",
//             date: attendanceDate,
//             month,
//             year,
//             check_in_time: checkIn,
//             check_out_time: checkOut,
//             is_present: true,
//             createdBy: approverId,
//           },
//           { transaction: t }
//         );
//       }
//     }

//     await t.commit();
//     return Helper.response(true, "Updated successfully", {}, res, 200);
//   } catch (err) {
//     await t.rollback();
//     return Helper.response(false, err.message, {}, res, 500);
//   }
// };

exports.addAppReimbursement = async (req, res) => {
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
        employeeId: req.users.id,
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

exports.reimbursementList = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const employeeId = req.users?.id;
    const branchId = req.users && req.users.branchId;
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!tenantId) {
      return Helper.response(false, "User Not Found", [], res, 404);
    }
    const ReimbursementData = await reimbursement.findAll({
      where: { tenantId, employeeId, branchId },
      order: [["createdAt", "DESC"]],
      raw: true,
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

    return Helper.response(true, "Reimbursement List Found", data, res, 200);
  } catch (error) {
    console.error("Error fetching Reimbursement List:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

/** Team reimbursements — manager/director/teamleader/Senior Accountant: all branch records; others: own only.
 *  Accepts optional body param `status` (e.g. "pending", "recommended", "approved", "rejected") for filtering.
 */
exports.getTeamReimbursements = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const employeeId = req.users?.id;
    const branchId = req.users?.branchId;
    const role = (req.users?.role || '').toLowerCase();
    const statusFilter = req.body?.status || req.query?.status || null;

    if (!branchId || branchId === 'null') {
      return Helper.response(false, 'branchId is required!', {}, res, 200);
    }
    if (!tenantId) {
      return Helper.response(false, 'User Not Found', [], res, 404);
    }

    // Check if the employee holds a "Senior Accountant" designation
    let isSeniorAccountant = false;
    const empInfo = await empPersonal.findByPk(employeeId, { attributes: ['designationId'], raw: true });
    if (empInfo?.designationId) {
      const desig = await Designation.findByPk(empInfo.designationId, { attributes: ['name'], raw: true });
      isSeniorAccountant = (desig?.name || '').toLowerCase().trim() === 'senior accountant';
    }

    const isTeamRole = role === 'manager' || role === 'director' || role === 'teamleader' || isSeniorAccountant;
    const where = isTeamRole
      ? { tenantId, branchId }
      : { tenantId, branchId, employeeId };

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    const rows = await reimbursement.findAll({
      where,
      order: [['createdAt', 'DESC']],
      raw: true,
    });

    const data = await Promise.all(
      rows.map(async (item) => {
        const emp = await empPersonal.findOne({
          where: { id: item.employeeId, tenantId },
          attributes: ['firstName', 'lastName'],
          raw: true,
        });
        const files = await ReimbursementFile.findAll({
          where: { reimbursementId: item.id, tenantId, branchId },
          attributes: ['id', 'image', 'doc_type'],
          raw: true,
        });
        return {
          ...item,
          employee_name: emp ? `${emp.firstName} ${emp.lastName}` : '—',
          files,
        };
      }),
    );

    return Helper.response(true, 'Team Reimbursements Found', data, res, 200);
  } catch (error) {
    console.error('getTeamReimbursements error:', error);
    return Helper.response(false, error.message, [], res, 500);
  }
};

/** Update reimbursement status with role-based restrictions.
 *  Senior Accountant  → can only set status to "recommended"
 *  Manager / Director → can set status to "approved" or "rejected"
 */
exports.updateAppReimbursementStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const tenantId = req.users?.tenantId;
    const approverId = req.users?.id;
    const branchId = req.users?.branchId;
    const role = (req.users?.role || '').toLowerCase();

    const validStatuses = ['approved', 'rejected', 'recommended'];
    if (!id || !validStatuses.includes(status)) {
      return Helper.response(false, "id and valid status (approved/rejected/recommended) are required", null, res, 400);
    }

    // Determine if caller is Senior Accountant
    let isSeniorAccountant = false;
    const empInfo = await empPersonal.findByPk(approverId, { attributes: ['designationId'], raw: true });
    if (empInfo?.designationId) {
      const desig = await Designation.findByPk(empInfo.designationId, { attributes: ['name'], raw: true });
      isSeniorAccountant = (desig?.name || '').toLowerCase().trim() === 'senior accountant';
    }

    const isManagerOrDirector = role === 'manager' || role === 'director' || role === 'teamleader';

    // Role-based permission check
    if (isSeniorAccountant && status !== 'recommended') {
      return Helper.response(false, 'Senior Accountant can only recommend reimbursements', null, res, 403);
    }
    if (!isSeniorAccountant && !isManagerOrDirector) {
      return Helper.response(false, 'You do not have permission to update reimbursement status', null, res, 403);
    }
    if (isManagerOrDirector && status === 'recommended') {
      return Helper.response(false, 'Manager/Director cannot set status to recommended', null, res, 403);
    }

    const record = await reimbursement.findOne({ where: { id, tenantId, branchId } });
    if (!record) {
      return Helper.response(false, 'Reimbursement not found', null, res, 404);
    }

    // Senior Accountant can only recommend pending records
    if (isSeniorAccountant && record.status !== 'pending') {
      return Helper.response(false, 'Only pending reimbursements can be recommended', null, res, 400);
    }

    await record.update({ status, updatedBy: approverId, updatedAt: new Date() });

    return Helper.response(true, `Reimbursement ${status} successfully`, record, res, 200);
  } catch (error) {
    console.error('updateAppReimbursementStatus error:', error);
    return Helper.response(false, error.message, null, res, 500);
  }
};

const comp_off=require('../../models/comp_off')

exports.CompoffData=async(req,res)=>{
  try {
     const tenantId = req.users?.tenantId;
    const employeeId = req.users?.id;
    const branchId = req.users && req.users.branchId;
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    if (!tenantId) {
      return Helper.response(false, "User Not Found", [], res, 404);
    }

    const data=await comp_off.findAll({
      where:{
        employeeId,tenantId,branchId,
        status: "active",
        remainingDays: { [require('sequelize').Op.gt]: 0 },
      },
      raw:true,
      attributes:["earnedDate","id","branchId","employeeId","tenantId","remainingDays","totalDays","status"]
    })
    
    if(data.length==0){
      return Helper.response(false,"No Data Found",{},res,400)
    }
    
    return Helper.response(true,"Data Found Successfully",data,res,200)
  }catch (error) {
    console.error("Error fetching Reimbursement List:", error);
    return Helper.response(false, error.message, [], res, 500);
  }
}

exports.updateAppEmp = async (req, res) => {
  const {
   
    firstName,
    lastName,
    mobile,
    email,
    permanentAddress,
    alternateMobile,
    currentAddress,
    dateOfBirth,
    age,
    gender,
    martialStatus,
    adhaarNo,
    panNo,
    fatherName,
    motherName,
    bloodGroup,
    nationality,
  
    pinCode,
    country,
    city,
    state,
  } = req.body;
console.log(req.body,"body data");

  // const image = req.file ? req.file.filename : null;
const id=req.users.id;
if(!id){  
  return Helper.response(false,"Employee ID is required",[],res,400)
}
  const tenantId = req.users && req.users.tenantId;
  let branchId = req.body?.branchId;
  if (!branchId || branchId == "null") {
    branchId = req.users && req.users.branchId;
  }
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (!id) {
      return Helper.response(false, "Employee ID is required", [], res, 400);
    }
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    // const existingEmp = await empPersonal.findOne({ where: { id, tenantId,branchId } });
    const existingEmp = await empPersonal.findOne({ where: { id, tenantId } });

    if (!existingEmp) {
      return Helper.response(false, "Employee not found", [], res, 404);
    }

    if (!id || !tenantId) {
      return Helper.response(
        false,
        "id and tenetId must be provided",
        [],
        res,
        400,
      );
    }

    if (email && !Helper.isValidEmail(email)) {
      return Helper.response(false, "Invalid email format", [], res, 400);
    }

    if (adhaarNo && !Helper.isValidAadhaar(adhaarNo)) {
      return Helper.response(
        false,
        "Invalid Aadhaar number format",
        [],
        res,
        400,
      );
    }

    if (panNo && !Helper.isValidPAN(panNo)) {
      return Helper.response(false, "Invalid PAN number format", [], res, 400);
    }

    if (mobile && !Helper.isValidMobile(mobile)) {
      return Helper.response(
        false,
        "Invalid mobile number format",
        [],
        res,
        400,
      );
    }

    if (dateOfBirth && !Helper.isValidDOB(dateOfBirth)) {
      return Helper.response(
        false,
        "DOB must be in dd/mm/yyyy format",
        [],
        res,
        400,
      );
    }

    if (age && !Helper.isAgeAbove18(age)) {
      return Helper.response(false, "Age must be 18 or above", [], res, 400);
    }

    if (gender) {
      const allowedGender = empPersonal.rawAttributes.gender.values;
      if (!allowedGender.includes(gender)) {
        return Helper.response(
          false,
          `Gender must be one of: ${allowedGender.join(", ")}`,
          {},
          res,
          400,
        );
      }
    }

    if (martialStatus) {
      const allowedMartialStatus =
        empPersonal.rawAttributes.martialStatus.values;
      if (!allowedMartialStatus.includes(martialStatus)) {
        return Helper.response(
          false,
          `Marital Status must be one of: ${allowedMartialStatus.join(", ")}`,
          {},
          res,
          400,
        );
      }
    }

    if (bloodGroup) {
      const allowedBloodGroups = empPersonal.rawAttributes.bloodGroup.values;
      if (!allowedBloodGroups.includes(bloodGroup)) {
        return Helper.response(
          false,
          `Blood Group must be one of: ${allowedBloodGroups.join(", ")}`,
          {},
          res,
          400,
        );
      }
    }

    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (email !== undefined) updateData.email = email;

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth
        ? new Date(dateOfBirth.split("/").reverse().join("-"))
        : null;
    }

    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (martialStatus !== undefined) updateData.martialStatus = martialStatus;
    if (adhaarNo !== undefined) updateData.adhaarNo = adhaarNo;
    if (panNo !== undefined) updateData.panNo = panNo;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (motherName !== undefined) updateData.motherName = motherName;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (state !== undefined) updateData.state = state;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    // if (status !== undefined) updateData.status = status;
    if (permanentAddress !== undefined)
      updateData.permanentAddress = permanentAddress;
    if (alternateMobile !== undefined)
      updateData.alternateMobile = alternateMobile;
    if (currentAddress !== undefined)
      updateData.currentAddress = currentAddress;
    // if (image !== undefined) updateData.profileImage = image;
    // if (empType !== undefined) updateData.empType = empType;
    // if (designationId !== undefined) updateData.designationId = designationId;
    // if (departmentId !== undefined) updateData.departmentId = departmentId;
    // if (shift_id !== undefined) updateData.shift_id = shift_id;
    // if (reportingPersonId !== undefined)
    //   updateData.reportingPersonId = reportingPersonId;
    // if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
    // if (empCode != undefined) updateData.empCode = empCode;
    // if (guarantorName != undefined) updateData.guarantorName = guarantorName;
    // if (empCode !== undefined) updateData.empCode = empCode;
    // if (branchId !== undefined) updateData.branchId = branchId;
    // if(type=='pending_employee'){
    //   updateData.emp_status = emp_status || 'pending'
    // }
    updateData.updatedBy = req.users && req.users.id;
    updateData.deviceId = Helper.getIpAddress(req);
    // updateData.role = role;

    await existingEmp.update(updateData);
    // if (
    //   req.body.branchId !== undefined &&
    //   req.body.branchId !== existingEmp.branchId
    // ) {
    //   await Helper.updateEmployeeBranchEverywhere({
    //     employeeId: id,
    //     tenantId,
    //     newBranchId: req.body.branchId,
    //     updatedBy: req.users.id,
    //   });
    // }

    return Helper.response(
      true,
      "Employee updated successfully",
      existingEmp,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating employee:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.getEmpLetterDocs = async (req, res) => {
  try {
    const employeeId = req.users.id;
    const tenantId = req.users.tenantId;

    const emp = await empPersonal.findOne({ where: { id: employeeId, tenantId }, raw: true });
    if (!emp) return Helper.response(false, 'Employee not found.', [], res, 404);

    if (emp.status !== 'active') {
      return Helper.response(true, 'Inactive', { active: false }, res, 200);
    }

    const [designation, department, tenant, records] = await Promise.all([
      emp.designationId ? Designation.findOne({ where: { id: emp.designationId, tenantId }, raw: true }) : null,
      emp.departmentId ? Department.findOne({ where: { id: emp.departmentId, tenantId }, raw: true }) : null,
      Tenant.findOne({ where: { id: tenantId }, attributes: ['companyName', 'companyAddress'], raw: true }),
      LetterData.findAll({ where: { employeeId, tenantId, type: ['offer', 'appointment', 'relieving'] } })
    ]);

    const letters = { offer: null, appointment: null, relieving: null };
    records.forEach(r => {
      letters[r.type] = { generated: true, data: r.data, updatedAt: r.updatedAt };
    });

    const empData = {
      firstName: emp.firstName,
      lastName: emp.lastName,
      empCode: emp.empCode,
      gender: emp.gender,
      fatherName: emp.fatherName,
      permanentAddress: emp.permanentAddress,
      joiningDate: emp.joiningDate,
      designation: designation?.name || '',
      department: department?.name || ''
    };

    const tenantData = {
      companyName: tenant?.companyName || '',
      companyAddress: tenant?.companyAddress || ''
    };

    return Helper.response(true, 'Success', { active: true, letters, emp: empData, tenant: tenantData }, res, 200);
  } catch (error) {
    console.error('getEmpLetterDocs error:', error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.saveEmpLetterSignature = async (req, res) => {
  try {
    const employeeId = req.users.id;
    const tenantId = req.users.tenantId;
    const { signature } = req.body;
    if (!signature) return Helper.response(false, 'Signature is required.', [], res, 400);

    const record = await LetterData.findOne({ where: { employeeId, tenantId, type: 'appointment' } });
    if (!record) return Helper.response(false, 'Appointment letter not found. Please contact HR.', [], res, 404);

    const existing = record.data || {};
    await record.update({ data: { ...existing, signature } });
    return Helper.response(true, 'Signature saved successfully.', {}, res, 200);
  } catch (error) {
    console.error('saveEmpLetterSignature error:', error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};
