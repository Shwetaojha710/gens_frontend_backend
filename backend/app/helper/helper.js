const moment = require("moment-timezone");
const jwt = require("jsonwebtoken");
const db = require("../connection/connection");
const fs = require("fs");
const path = require("path");
const os = require("os");
const Helper = {};
const axios = require("axios");
const admin = require("../notification/notification");
Helper.basicAmountCalc = (amount, typeValue) => {
  return parseFloat(((amount || 0) * (typeValue || 0)) / 100);
};

Helper.deleteUploadedFiles = (files) => {
  if (!files || typeof files !== "object") return;

  try {
    for (const key in files) {
      const fileArray = Array.isArray(files[key]) ? files[key] : [files[key]];

      for (const file of fileArray) {
        if (file?.filename) {
          const filePath = path.join(
            __dirname,
            "../../../upload",
            file.filename,
          );
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      }
    }
  } catch (err) {
    console.error("Error deleting uploaded files:", err);
  }
};
Helper.getCurrentDate = () => {
  const date = new Date();
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  return date.toLocaleDateString("en-IN", options).replace(/\//g, "-");
};

Helper.formatToIST = (
  datetime = new Date(),
  format = "YYYY-MM-DD HH:mm:ss",
) => {
  return moment(datetime).tz("Asia/Kolkata").format(format);
};

Helper.response = (status, message, data = [], res, statusCode) => {
  return res.status(statusCode).json({
    status,
    message,
    data,
  });
};

Helper.verifyToken = (token) => {
  try {
    const secret = process.env.SECRET_KEY || "your_jwt_secret";
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
};

Helper.getDesig = async (tenantId, branchId) => {
  try {
    const query = `SELECT * FROM designations where "tenantId" = '${tenantId}' and "branchId" ='${branchId}' `;
    const rows = await db.query(query);
    return rows[0];
  } catch (err) {
    console.error("DB Error in getDesig:", err);
    return [];
  }
};

Helper.validateAccountNumber = (accountNumber) => {
  const accountRegex = /^\d{11,18}$/;
  return accountRegex.test(accountNumber);
};

Helper.isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
Helper.isValidAadhaar = (aadhaar) => /^\d{12}$/.test(aadhaar);
Helper.isValidPAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
Helper.isValidMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile);
Helper.isValidDOB = (dob) =>
  /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(19|20)\d\d$/.test(dob);

Helper.isAgeAbove18 = (age) => age >= 18;

Helper.formatShiftTime = (shift) => {
  if (!shift || !shift.startTime || !shift.endTime) return shift;

  const jsonShift = shift.toJSON ? shift.toJSON() : shift;

  return {
    ...jsonShift,
    startTime: moment(jsonShift.startTime, "HH:mm:ss").format("hh:mm A"),
    endTime: moment(jsonShift.endTime, "HH:mm:ss").format("hh:mm A"),
  };
};

Helper.calculateWorkingHours = (startTime, endTime) => {
  const start = moment(startTime, "HH:mm");
  const end = moment(endTime, "HH:mm");
  const durationInHours = moment.duration(end.diff(start)).asHours();
  return parseFloat(durationInHours.toFixed(2));
};

Helper.capitalizeFirstLetter = (name) => {
  if (name.length === 0) {
    return "";
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
};

Helper.getIpAddress = (req) => {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    null;

  // Remove IPv6 prefix if present
  if (ip && ip.startsWith("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }

  return ip;
};

Helper.dateFormat = (date) => {
  const istDate = new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // 12-hour format (AM/PM)
    timeZone: "Asia/Kolkata",
  });

  return istDate.replace(/\b(am|pm)\b/, (match) => match.toUpperCase());
};
Helper.newDateFormat = (date) => {
  const istDate = new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "short",
  });

  return istDate;
};

Helper.applySandwichRule = (leaveRecords, holidays, startDate, endDate) => {
  let updatedRecords = [...leaveRecords];
  if (!leaveRecords.length) return updatedRecords;

  const holidaySet = new Set(holidays || []);
  const isNonWorkingDay = (date) => {
    const dateKey = date.format("YYYY-MM-DD");
    return holidaySet.has(dateKey) || date.day() == 0 || date.day() == 6;
  };
  const getSandwichStatus = (prevLeave, nextLeave) => {
    if (prevLeave?.status == "approved" || nextLeave?.status == "approved") {
      return "approved";
    }
    if (
      prevLeave?.status == "recommended" ||
      nextLeave?.status == "recommended"
    ) {
      return "recommended";
    }
    return "pending";
  };
  const getSandwichLeaveType = (prevLeave, nextLeave) => {
    if (prevLeave?.leaveTypeId && prevLeave.leaveTypeId === nextLeave?.leaveTypeId) {
      return prevLeave.leaveTypeId;
    }
    return prevLeave?.leaveTypeId || nextLeave?.leaveTypeId || leaveRecords[0].leaveTypeId;
  };

  // Build leave date indexes for quick lookup.
  let leaveDates = new Set();
  let leaveByDate = new Map();
  for (const leave of leaveRecords) {
    let start = moment(leave.fromDate);
    let end = leave.toDate ? moment(leave.toDate) : moment(leave.fromDate);
    for (let d = moment(start); d.isSameOrBefore(end); d.add(1, "days")) {
      const dateKey = d.format("YYYY-MM-DD");
      leaveDates.add(dateKey);
      leaveByDate.set(dateKey, leave);
    }
  }

  for (let d = moment(startDate); d.isSameOrBefore(endDate); d.add(1, "days")) {
    const dateKey = d.format("YYYY-MM-DD");

    // skip if already leave
    if (leaveDates.has(dateKey)) continue;

    // check if this day is a weekend or a tenant holiday
    if (!isNonWorkingDay(d)) continue;

    // sandwich condition → leave must exist just before & just after
    let prev = moment(d).subtract(1, "days");
    let prevLeave = null;
    while (prev.isSameOrAfter(startDate)) {
      const prevKey = prev.format("YYYY-MM-DD");
      if (leaveDates.has(prevKey)) {
        prevLeave = leaveByDate.get(prevKey);
        break;
      }
      if (!isNonWorkingDay(prev)) break;
      prev.subtract(1, "days");
    }

    let next = moment(d).add(1, "days");
    let nextLeave = null;
    while (next.isSameOrBefore(endDate)) {
      const nextKey = next.format("YYYY-MM-DD");
      if (leaveDates.has(nextKey)) {
        nextLeave = leaveByDate.get(nextKey);
        break;
      }
      if (!isNonWorkingDay(next)) break;
      next.add(1, "days");
    }

    if (!prevLeave || !nextLeave) continue;

    const sandwichLeave = {
      id: uuidv4(),
      employeeId: prevLeave.employeeId || nextLeave.employeeId || leaveRecords[0].employeeId,
      leaveTypeId: getSandwichLeaveType(prevLeave, nextLeave),
      fromDate: dateKey,
      toDate: dateKey,
      duration_type: "full",
      to_duration_type: "full",
      days: 1,
      isSandwich: true,
      status: getSandwichStatus(prevLeave, nextLeave),
      tenantId: prevLeave.tenantId || nextLeave.tenantId || leaveRecords[0].tenantId,
      branchId: prevLeave.branchId || nextLeave.branchId || leaveRecords[0].branchId,
    };

    updatedRecords.push(sandwichLeave);
    leaveDates.add(dateKey);
    leaveByDate.set(dateKey, sandwichLeave);
  }

  return updatedRecords;
};
// Helper.applySandwichRule = (leaveRecords, holidays, startDate, endDate) => {
//   let updatedRecords = [...leaveRecords];
//   if (!leaveRecords.length) return updatedRecords;

//   const holidaySet = new Set(holidays || []);
//   const isNonWorkingDay = (date) => {
//     const dateKey = date.format("YYYY-MM-DD");
//     return holidaySet.has(dateKey) || date.day() == 0 || date.day() == 6;
//   };
//   const getSandwichStatus = (prevLeave, nextLeave) => {
//     if (prevLeave?.status == "approved" || nextLeave?.status == "approved") {
//       return "approved";
//     }
//     if (
//       prevLeave?.status == "recommended" ||
//       nextLeave?.status == "recommended"
//     ) {
//       return "recommended";
//     }
//     return "pending";
//   };
//   const getSandwichLeaveType = (prevLeave, nextLeave) => {
//     if (prevLeave?.leaveTypeId && prevLeave.leaveTypeId === nextLeave?.leaveTypeId) {
//       return prevLeave.leaveTypeId;
//     }
//     return prevLeave?.leaveTypeId || nextLeave?.leaveTypeId || leaveRecords[0].leaveTypeId;
//   };

//   // Build leave date indexes for quick lookup.
//   let leaveDates = new Set();
//   let leaveByDate = new Map();
//   for (const leave of leaveRecords) {
//     let start = moment(leave.fromDate);
//     let end = leave.toDate ? moment(leave.toDate) : moment(leave.fromDate);
//     for (let d = moment(start); d.isSameOrBefore(end); d.add(1, "days")) {
//       const dateKey = d.format("YYYY-MM-DD");
//       leaveDates.add(dateKey);
//       leaveByDate.set(dateKey, leave);
//     }
//   }

//   for (let d = moment(startDate); d.isSameOrBefore(endDate); d.add(1, "days")) {
//     const dateKey = d.format("YYYY-MM-DD");

//     // skip if already leave
//     if (leaveDates.has(dateKey)) continue;

//     // check if this day is a weekend or a tenant holiday
//     if (!isNonWorkingDay(d)) continue;

//     // sandwich condition → leave must exist just before & just after
//     let prev = moment(d).subtract(1, "days");
//     let prevLeave = null;
//     while (prev.isSameOrAfter(startDate)) {
//       const prevKey = prev.format("YYYY-MM-DD");
//       if (leaveDates.has(prevKey)) {
//         prevLeave = leaveByDate.get(prevKey);
//         break;
//       }
//       if (!isNonWorkingDay(prev)) break;
//       prev.subtract(1, "days");
//     }

//     let next = moment(d).add(1, "days");
//     let nextLeave = null;
//     while (next.isSameOrBefore(endDate)) {
//       const nextKey = next.format("YYYY-MM-DD");
//       if (leaveDates.has(nextKey)) {
//         nextLeave = leaveByDate.get(nextKey);
//         break;
//       }
//       if (!isNonWorkingDay(next)) break;
//       next.add(1, "days");
//     }

//     if (!prevLeave || !nextLeave) continue;

//     const sandwichLeave = {
//       id: uuidv4(),
//       employeeId: prevLeave.employeeId || nextLeave.employeeId || leaveRecords[0].employeeId,
//       leaveTypeId: getSandwichLeaveType(prevLeave, nextLeave),
//       fromDate: dateKey,
//       toDate: dateKey,
//       duration_type: "full",
//       to_duration_type: "full",
//       days: 1,
//       isSandwich: true,
//       status: getSandwichStatus(prevLeave, nextLeave),
//       tenantId: prevLeave.tenantId || nextLeave.tenantId || leaveRecords[0].tenantId,
//       branchId: prevLeave.branchId || nextLeave.branchId || leaveRecords[0].branchId,
//     };

//     updatedRecords.push(sandwichLeave);
//     leaveDates.add(dateKey);
//     leaveByDate.set(dateKey, sandwichLeave);
//   }

//   return updatedRecords;
// };

// Helper.applySandwichRule = (leaveRecords, holidays, startDate, endDate) => {
//   let updatedRecords = [...leaveRecords];

//   // Convert leaveRecords into a Set of leave dates for quick lookup
//   let leaveDates = new Set();
//   for (const leave of leaveRecords) {
//     let start = moment(leave.fromDate);
//     let end = moment(leave.toDate);
//     for (let d = moment(start); d <= end; d.add(1, "days")) {
//       leaveDates.add(d.format("YYYY-MM-DD"));
//     }
//   }

//   for (let d = moment(startDate); d <= endDate; d.add(1, "days")) {
//     const dateKey = d.format("YYYY-MM-DD");

//     // skip if already leave
//     if (leaveDates.has(dateKey)) continue;

//     const isHoliday = holidays.includes(dateKey) || d.day() === 0 || d.day() === 6;
//     if (!isHoliday) continue;

//     // find nearest previous leave
//     let prev = moment(d).subtract(1, "days");
//     while (prev >= startDate) {
//       const prevKey = prev.format("YYYY-MM-DD");
//       if (leaveDates.has(prevKey)) break;
//       if (!(holidays.includes(prevKey) || prev.day() === 0 || prev.day() === 6)) {
//         prev = null;
//         break;
//       }
//       prev.subtract(1, "days");
//     }

//     // find nearest next leave
//     let next = moment(d).add(1, "days");
//     while (next <= endDate) {
//       const nextKey = next.format("YYYY-MM-DD");
//       if (leaveDates.has(nextKey)) break;
//       if (!(holidays.includes(nextKey) || next.day() === 0 || next.day() === 6)) {
//         next = null;
//         break;
//       }
//       next.add(1, "days");
//     }

//     // if leave exists on both sides → mark as sandwich leave
//     if (prev && next) {
//       updatedRecords.push({
//         id: uuidv4(),
//         employeeId: leaveRecords[0].employeeId,
//         leaveTypeId: leaveRecords[0].leaveTypeId,
//         fromDate: dateKey,
//         toDate: dateKey,
//         duration_type: "full",
//         isSandwich: true,
//         status: leaveRecords[0].status,
//        tenantId:leaveRecords[0].tenantId,
//        leaveTypeId:leaveRecords[0].leaveTypeId
//       });
//       leaveDates.add(dateKey);
//     }
//   }

//   return updatedRecords;
// };

// Helper.applySandwichRule = (leaveRecords, holidays, startDate, endDate) => {
//   let updatedRecords = [...leaveRecords];

//   // Convert leaveRecords into a Set of leave dates for quick lookup
//   let leaveDates = new Set();
//   for (const leave of leaveRecords) {
//     let start = moment(leave.fromDate);
//     let end = moment(leave.toDate);
//     for (let d = moment(start); d <= end; d.add(1, "days")) {
//       leaveDates.add(d.format("YYYY-MM-DD"));
//     }
//   }

//   for (let d = moment(startDate); d <= endDate; d.add(1, "days")) {
//     const dateKey = d.format("YYYY-MM-DD");

//     // skip if already leave
//     if (leaveDates.has(dateKey)) continue;

//     const isHoliday = holidays.includes(dateKey) || d.day() === 0 || d.day() === 6;
//     if (!isHoliday) continue;

//     // find nearest previous leave
//     let prev = moment(d).subtract(1, "days");
//     while (prev >= startDate) {
//       const prevKey = prev.format("YYYY-MM-DD");
//       if (leaveDates.has(prevKey)) break;
//       if (!(holidays.includes(prevKey) || prev.day() === 0 || prev.day() === 6)) {
//         prev = null;
//         break;
//       }
//       prev.subtract(1, "days");
//     }

//     // find nearest next leave
//     let next = moment(d).add(1, "days");
//     while (next <= endDate) {
//       const nextKey = next.format("YYYY-MM-DD");
//       if (leaveDates.has(nextKey)) break;
//       if (!(holidays.includes(nextKey) || next.day() === 0 || next.day() === 6)) {
//         next = null;
//         break;
//       }
//       next.add(1, "days");
//     }

//     // if leave exists on both sides → mark as sandwich leave
//     if (prev && next) {
//       updatedRecords.push({
//         id: null,
//         employeeId: leaveRecords[0].employeeId,
//         leaveTypeId: null,
//         fromDate: dateKey,
//         toDate: dateKey,
//         duration_type: "full",
//         isSandwich: true,
//         tenantId: leaveRecords[0].tenantId,
//         leaveTypeId: leaveRecords[0].leaveTypeId
//       });
//       leaveDates.add(dateKey);
//     }
//   }

//   return updatedRecords;
// };
const { v4: uuidv4 } = require("uuid");
const empPersonal = require("../models/empPersonal");
const attendance = require("../models/attendance");
const Basic = require("../models/basic");
const Allowance = require("../models/allowance");
const deduction = require("../models/deductions");
const leave_balance = require("../models/leaveBalance");
const leave_application = require("../models/leave_application");
Helper.generateUUID = () => {
  const id = uuidv4();

  console.log("Generated UUID:", id);
  return id;
};
const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Math.floor(days));
  return d.toISOString().split("T")[0];
};


Helper.adjustLeaveRecords = (leaveBalanceArr, leaveRecordsArr) => {
  leaveRecordsArr.forEach((rec) => {
    if (rec.status !== "approved") {
      rec.leavestatus = "unpaid";
    }
  });

  leaveBalanceArr.forEach((balance) => {
    const allowed = Number(balance.remainingLeaves ?? 0);

    const matchingRecords = leaveRecordsArr.filter(
      (rec) =>
        rec.employeeId === balance.employeeId &&
        rec.leaveTypeId === balance.leaveTypeId &&
        rec.status === "approved",
    );

    const appliedLeaveDays = matchingRecords.reduce(
      (total, rec) => total + Number(rec.days || 0),
      0,
    );

    if (appliedLeaveDays > allowed) {
      const sorted = [...matchingRecords].sort(
        (a, b) => new Date(a.fromDate) - new Date(b.fromDate),
      );

      let used = 0;

      for (const rec of sorted) {
        const originalDays = Number(rec.days || 0);
        const remaining = allowed - used;

        if (remaining <= 0) {
          rec.leavestatus = "unpaid";
          continue;
        }

        if (originalDays <= remaining) {
          rec.leavestatus = "approved";
          used += originalDays;
        } else {
          const approvedDays = remaining;
          const unpaidDays = originalDays - remaining;

          // -----------------------
          // APPROVED PART
          // -----------------------
          rec.leavestatus = "approved";
          rec.days = approvedDays;
          rec.toDate = addDays(rec.fromDate, approvedDays);
          rec.to_duration_type =
            approvedDays % 1 === 0.5 ? "first_half" : "full";

          // -----------------------
          // UNPAID PART
          // -----------------------
          const unpaidFromDate = addDays(rec.fromDate, approvedDays);

          leaveRecordsArr.push({
            ...rec,
            id: crypto.randomUUID(),
            days: unpaidDays,
            fromDate: unpaidFromDate,
            toDate: unpaidFromDate, // ✅ SAME DAY
            duration_type: "first_half", // ✅ REQUIRED
            to_duration_type: "first_half",
            leavestatus: "unpaid",
          });

          used += approvedDays;
        }
      }
    } else {
      matchingRecords.forEach((rec) => {
        rec.leavestatus = "approved";
      });
      matchingRecords.forEach((match) => {
        const index = leaveRecordsArr.findIndex((r) => r.id === match.id);

        if (index !== -1) {
          leaveRecordsArr[index].leavestatus = "approved";
        }
      });
      // leaveRecordsArr=matchingRecords
    }
  });

  return leaveRecordsArr;
};

// Helper.adjustLeaveRecords = (leaveBalanceArr, leaveRecordsArr) => {
//   leaveRecordsArr.forEach((rec) => {
//     if (rec.status !== "approved") {
//       rec.leavestatus = "unpaid";
//     }
//   });

//   leaveBalanceArr.forEach((balance) => {
//     const allowed = Number(balance.remainingLeaves ?? 0);

//     const matchingRecords = leaveRecordsArr.filter(
//       (rec) =>
//         rec.employeeId === balance.employeeId &&
//         rec.leaveTypeId === balance.leaveTypeId &&
//         rec.status === "approved",
//     );

//     const appliedLeaveDays = matchingRecords.reduce(
//       (total, rec) => total + Number(rec.days || 0),
//       0,
//     );

//     if (appliedLeaveDays > allowed) {
//       const sorted = [...matchingRecords].sort(
//         (a, b) => new Date(a.fromDate) - new Date(b.fromDate),
//       );

//       let used = 0;

//       for (const rec of sorted) {
//         const originalDays = Number(rec.days || 0);
//         const remaining = allowed - used;

//         if (remaining <= 0) {
//           rec.leavestatus = "unpaid";
//           continue;
//         }

//         if (originalDays <= remaining) {
//           rec.leavestatus = "approved";
//           used += originalDays;
//         } else {
//           const approvedDays = remaining;
//           const unpaidDays = originalDays - remaining;

//           // -----------------------
//           // APPROVED PART
//           // toDate is inclusive, so for N full days: last day = fromDate + (N-1)
//           // -----------------------
//           rec.leavestatus = "approved";
//           rec.days = approvedDays;
//           rec.toDate = addDays(rec.fromDate, Math.max(0, Math.ceil(approvedDays) - 1));
//           rec.to_duration_type =
//             approvedDays % 1 === 0.5 ? "first_half" : "full";

//           // -----------------------
//           // UNPAID PART
//           // Split into full-day record + optional half-day record so leaveDateMap
//           // marks every date with the correct duration_type.
//           // -----------------------
//           const unpaidFromDate = addDays(rec.fromDate, Math.ceil(approvedDays));
//           const unpaidFullDays = Math.floor(unpaidDays);
//           const hasUnpaidHalf = unpaidDays % 1 === 0.5;

//           if (unpaidFullDays > 0) {
//             leaveRecordsArr.push({
//               ...rec,
//               id: crypto.randomUUID(),
//               days: unpaidFullDays,
//               fromDate: unpaidFromDate,
//               toDate: addDays(unpaidFromDate, unpaidFullDays - 1),
//               duration_type: "full",
//               to_duration_type: "full",
//               leavestatus: "unpaid",
//             });
//           }

//           if (hasUnpaidHalf) {
//             const halfDayDate = addDays(unpaidFromDate, unpaidFullDays);
//             leaveRecordsArr.push({
//               ...rec,
//               id: crypto.randomUUID(),
//               days: 0.5,
//               fromDate: halfDayDate,
//               toDate: halfDayDate,
//               duration_type: "first_half",
//               to_duration_type: "first_half",
//               leavestatus: "unpaid",
//             });
//           }

//           used += approvedDays;
//         }
//       }
//     } else {
//       matchingRecords.forEach((rec) => {
//         rec.leavestatus = "approved";
//       });
//       matchingRecords.forEach((match) => {
//         const index = leaveRecordsArr.findIndex((r) => r.id === match.id);

//         if (index !== -1) {
//           leaveRecordsArr[index].leavestatus = "approved";
//         }
//       });
//       // leaveRecordsArr=matchingRecords
//     }
//   });

//   return leaveRecordsArr;
// };

// Helper.adjustLeaveRecords = (leaveBalanceArr, leaveRecordsArr) => {
//   leaveBalanceArr.forEach((balance) => {
//     const allowed = Number(balance.remainingLeaves ?? 0);

//     const matchingRecords = leaveRecordsArr.filter(
//       (rec) =>
//         rec.employeeId === balance.employeeId &&
//         rec.leaveTypeId === balance.leaveTypeId &&
//         rec.status === "approved"
//     );

//     const appliedLeaveDays = matchingRecords.reduce(
//       (total, rec) => total + Number(rec.days || 0),
//       0
//     );

//     if (appliedLeaveDays > allowed) {
//       const sorted = [...matchingRecords].sort(
//         (a, b) => new Date(a.fromDate) - new Date(b.fromDate)
//       );

//       let used = 0;

//       for (const rec of sorted) {
//         const originalDays = Number(rec.days || 0);
//         const remaining = allowed - used;

//         if (remaining <= 0) {
//           rec.leavestatus = "unpaid";
//           continue;
//         }

//         if (originalDays <= remaining) {
//           rec.leavestatus = "approved";
//           used += originalDays;
//         } else {
//           // 🔥 PARTIAL SPLIT
//           const approvedDays = remaining;
//           const unpaidDays = originalDays - remaining;

//           // APPROVED PART
//           rec.leavestatus = "approved";
//           rec.days = approvedDays;
//           rec.toDate = addDays(rec.fromDate, approvedDays);

//           // UNPAID PART
//           leaveRecordsArr.push({
//             ...rec,
//             id: crypto.randomUUID(), //  new record
//             days: unpaidDays,
//             fromDate: addDays(rec.fromDate, approvedDays),
//             toDate: addDays(rec.fromDate, approvedDays + unpaidDays),
//             leavestatus: "unpaid",
//           });

//           used += approvedDays;
//         }
//       }
//     } else {
//       matchingRecords.forEach((rec) => {
//         rec.leavestatus = "approved";
//       });
//     }
//   });

//   return leaveRecordsArr;
// };

// Helper.adjustLeaveRecords = (leaveBalanceArr, leaveRecordsArr) => {
//   leaveBalanceArr.forEach((balance) => {
//     const allowed = Number(balance.remainingLeaves ?? 0);

//     // Find matching leave records for same employee + leaveType (only approved leaves)
//     const matchingRecords = leaveRecordsArr.filter(
//       (rec) =>
//         rec.employeeId == balance.employeeId &&
//         rec.leaveTypeId == balance.leaveTypeId &&
//         rec.status === "approved"
//     );

//     // Total applied leave days
//     const appliedLeaveDays = matchingRecords.reduce(
//       (total, rec) => total + Number(rec.days || 0),
//       0
//     );

//     if (appliedLeaveDays > allowed) {
//       // Sort by fromDate (oldest first)
//       const sorted = [...matchingRecords].sort(
//         (a, b) => new Date(a.fromDate) - new Date(b.fromDate)
//       );

//  let used = 0;

// for (const rec of sorted) {
//   const originalDays = Number(rec.days || 0);
//   const remaining = allowed - used;

//   if (remaining <= 0) {
//     rec.leavestatus = "unpaid";
//     continue;
//   }

//   if (originalDays <= remaining) {
//     rec.leavestatus = "approved";
//     used += originalDays;
//   } else {
//     // 🔥 PARTIAL CASE
//     rec.leavestatus = "approved";
//     rec.days = remaining; // 2.5 approved

//     leaveRecordsArr.push({
//       ...rec,
//       days: originalDays - remaining, // 0.5 unpaid
//       leavestatus: "unpaid",
//     });

//     used += remaining;
//   }
// }

//     } else {
//       // All within balance
//       matchingRecords.forEach((rec) => {
//         rec.leavestatus = "approved";
//       });
//     }
//   });

//   return leaveRecordsArr; // updated array
// };

// Helper.adjustLeaveRecords = (leaveBalanceArr, leaveRecordsArr) => {
//   leaveBalanceArr.forEach((balance) => {
//     const allowed = balance.remainingLeaves ?? 0;

//     // Find matching leave records for same employee + leaveType (only approved leaves matter)
//     const matchingRecords = leaveRecordsArr.filter(
//       (rec) =>
//         rec.employeeId == balance.employeeId &&
//         rec.leaveTypeId == balance.leaveTypeId &&
//         rec.status == 'approved'
//     );
//     const appliedLeaveLength = matchingRecords.reduce((total, record) => {
//   return total + Number(record.days);   // convert string to number
// }, 0);
//     if (appliedLeaveLength > allowed) {
//       // Sort by fromDate (oldest first)
//       const sorted = [...matchingRecords].sort(
//         (a, b) => new Date(a.fromDate) - new Date(b.fromDate)
//       );

//       // Allowed ones
//       //  remain approved, the rest become unpaid
//       sorted.slice(allowed).forEach((rec) => {
//         rec.leavestatus = "unpaid"; //  mark extra ones as unpaid
//       });
//     } else {
//       //  Enough balance, keep them approved (or add your own logic here)
//       matchingRecords.forEach((rec) => {
//         rec.leavestatus = "approved"; // optional if you want to reset status
//       });
//     }
//   });

//   return leaveRecordsArr; // updated array
// };
// Helper.getIpAddress = (req) => {
//   return (
//     req.headers["x-forwarded-for"]?.split(",")[0] ||
//     req.socket?.remoteAddress ||
//     null
//   );
// };

Helper.getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (let name in interfaces) {
    for (let iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1"; // Fallback in case no network is found
};

Helper.sendSMS = async (mobile, otp, templateId) => {
  const msg = `Dear User, OTP for your request is ${otp}, OTP is valid for 5 minute.Quaere`;
  const encodedMessage = encodeURIComponent(msg);

  const url = `http://sms.quaeretech.com/submitsms.jsp?user=QuaereE&key=df87c28c39XX&mobile=${mobile}&message=${encodedMessage}&senderid=QUAERE&accusage=1&entityid=1101596760000028822&tempid=${templateId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Cookie: "JSESSIONID=1A15A5E676AF3873C49C0426F6EF319C",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    return null;
  }
};

Helper.excelDateToJSDate = (serial) => {
  if (!serial) return null;
  const utc_days = Math.floor(serial - 25569); // Excel base date offset
  const utc_value = utc_days * 86400; // seconds
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial % 1;
  if (fractional_day > 0) {
    const total_seconds = Math.floor(86400 * fractional_day);
    date_info.setUTCHours(Math.floor(total_seconds / 3600));
    date_info.setUTCMinutes(Math.floor((total_seconds % 3600) / 60));
    date_info.setUTCSeconds(total_seconds % 60);
  }
  return date_info;
};
// Helper.calculateAttendanceSummary = (
//   finalResult,
//   shiftArray = [],
//   AttendanceSettings,
//   finalWorkingDays,
// ) => {
//   /* ---------------- NORMALIZE SETTINGS ---------------- */
//   const settings =
//     AttendanceSettings && !Array.isArray(AttendanceSettings)
//       ? AttendanceSettings
//       : {};

//   const graceMinutes = Number(settings.graceMinutes) || 0;

//   let totalWorkingHours = 0;
//   let workingDays = 0;
//   let onTimeArrivals = 0;
//   let lateDays = 0;
//   let earlyOutDays = 0;
//   let absentDays = 0;

//   const attendanceData = finalResult?.[0]?.data || [];

//   attendanceData.forEach((day) => {
//     const shift = shiftArray.find(
//       (s) => s.day_of_week?.toLowerCase() === day.day?.toLowerCase(),
//     );

//     const hasCheckIn = day.checkIn && day.checkIn !== "00:00";
//     const hasCheckOut = day.checkOut && day.checkOut !== "00:00";

//     /* ---------- PRESENT ---------- */
//     if (hasCheckIn || hasCheckOut) {
//       workingDays++;

//       const shiftStart = shift?.startTime
//         ? new Date(`1970-01-01T${shift.startTime}`)
//         : null;

//       const shiftEnd = shift?.endTime
//         ? new Date(`1970-01-01T${shift.endTime}`)
//         : null;

//       const checkIn = hasCheckIn
//         ? new Date(`1970-01-01T${day.checkIn}`)
//         : null;

//       const checkOut = hasCheckOut
//         ? new Date(`1970-01-01T${day.checkOut}`)
//         : null;

//       /* ---------- WORKED HOURS ---------- */
//       let workedHours = 0;

//       if (
//         checkIn instanceof Date &&
//         !isNaN(checkIn) &&
//         checkOut instanceof Date &&
//         !isNaN(checkOut)
//       ) {
//         workedHours = (checkOut - checkIn) / (1000 * 60 * 60);
//         if (workedHours < 0 || isNaN(workedHours)) workedHours = 0;
//       }

//       totalWorkingHours += workedHours;

//       /* ---------- LATE CHECK-IN ---------- */
//       const graceMs = graceMinutes * 60 * 1000;

//       if (shiftStart && checkIn && !isNaN(shiftStart) && !isNaN(checkIn)) {
//         if (checkIn - shiftStart > graceMs) lateDays++;
//       }

//       /* ---------- EARLY CHECK-OUT ---------- */
//       if (shiftEnd && checkOut && !isNaN(shiftEnd) && !isNaN(checkOut)) {
//         if (checkOut < shiftEnd) earlyOutDays++;
//       }

//       if (day.status?.toLowerCase().includes("on time")) {
//         onTimeArrivals++;
//       }
//     } else {
//       /* ---------- ABSENT ---------- */
//       if (!shift?.is_week_off) {
//         absentDays++;
//       }
//     }
//   });

//   /* ---------- SAFE CALCULATIONS ---------- */
//   const averageWorkingHours =
//     workingDays > 0
//       ? Number(totalWorkingHours / workingDays).toFixed(2)
//       : "0.00";

//   const totalHours = Number(totalWorkingHours).toFixed(2);

//   const onTimePercent =
//     workingDays > 0
//       ? ((onTimeArrivals / workingDays) * 100).toFixed(2)
//       : "0.00";

//   return {
//     averageWorkingHours,
//     totalWorkingHours: totalHours,
//     onTimePercentage: `${onTimePercent}%`,
//     lateDays:Object.keys(settings || {}).length ? settings : 0,
//     earlyOutDays,
//     presentDays: workingDays,
//     absentDays,
//     workingDays: finalWorkingDays,
//   };
// };

// commentedby_21_01_2026

// commentedby_5_01_2026
// Helper.calculateAttendanceSummary = (
//   finalResult,
//   shiftArray,
//   AttendanceSettings,
//   finalWorkingDays,
// ) => {
//   let totalWorkingHours = 0;
//   let workingDays = 0;
//   let onTimeArrivals = 0;
//   let lateDays = 0;
//   let earlyOutDays = 0;
//   let absentDays = 0;

//   const attendanceData = finalResult?.[0]?.data || [];

//   attendanceData.forEach((day) => {
//     const shift = shiftArray.find(
//       (s) => s.day_of_week?.toLowerCase() === day.day?.toLowerCase(),
//     );

//     const hasCheckIn = day.checkIn && day.checkIn !== "00:00";
//     const hasCheckOut = day.checkOut && day.checkOut !== "00:00";

//     // ---------- PRESENT ----------
//     if (hasCheckIn || hasCheckOut) {
//       workingDays++;

//       const shiftStart = shift?.startTime
//         ? new Date(`1970-01-01T${shift.startTime}`)
//         : null;

//       const shiftEnd = shift?.endTime
//         ? new Date(`1970-01-01T${shift.endTime}`)
//         : null;

//       const checkIn = day.checkIn
//         ? new Date(`1970-01-01T${day.checkIn}`)
//         : null;

//       const checkOut = day.checkOut
//         ? new Date(`1970-01-01T${day.checkOut}`)
//         : null;

//       // ---- Calculate worked hours safely ----
//       let workedHours = 0;

//       if (
//         checkIn instanceof Date &&
//         !isNaN(checkIn) &&
//         checkOut instanceof Date &&
//         !isNaN(checkOut)
//       ) {
//         workedHours = (checkOut - checkIn) / (1000 * 60 * 60);
//         if (isNaN(workedHours)) workedHours = 0;
//       }

//       totalWorkingHours += workedHours;

//       // ----- Late Check-In -----
//       const graceMs = (AttendanceSettings?.graceMinutes || 0) * 60 * 1000;

//       if (shiftStart && checkIn && !isNaN(shiftStart) && !isNaN(checkIn)) {
//         if (checkIn - shiftStart > graceMs) lateDays++;
//       }

//       // ----- Early Check-Out -----
//       if (shiftEnd && checkOut && !isNaN(shiftEnd) && !isNaN(checkOut)) {
//         if (checkOut < shiftEnd) earlyOutDays++;
//       }

//       if (day.status?.toLowerCase().includes("on time")) {
//         onTimeArrivals++;
//       }
//     } else {
//       // ---------- ABSENT ----------
//       if (!shift?.is_week_off) {
//         absentDays++;
//       }
//     }
//   });

//   // ---------- SAFE AVERAGES ----------
//   const averageWorkingHours =
//     workingDays > 0
//       ? Number(totalWorkingHours / workingDays).toFixed(2)
//       : "0.00";

//   const totalHours = Number(totalWorkingHours).toFixed(2);

//   const onTimePercent =
//     workingDays > 0
//       ? ((onTimeArrivals / workingDays) * 100).toFixed(2)
//       : "0.00";

//   return {
//     averageWorkingHours,
//     totalWorkingHours: totalHours,
//     onTimePercentage: `${onTimePercent}%`,
//       lateDays:Object.keys(AttendanceSettings || {}).length ? lateDays : 0,
//     earlyOutDays,
//     presentDays: workingDays,
//     absentDays,
//     workingDays: finalWorkingDays,
//   };
// };

// commentedby_5_01_2026
Helper.calculateAttendanceSummary = (
  finalResult,
  shiftArray,
  AttendanceSettings,
  finalWorkingDays,
) => {
  let totalWorkingHours = 0;
  let workingDays = 0;
  let onTimeArrivals = 0;
  let lateDays = 0;
  let earlyOutDays = 0;
  let absentDays = 0;

  const attendanceData = finalResult?.[0]?.data || [];

  attendanceData.forEach((day) => {
    const shift = shiftArray.find(
      (s) => s.day_of_week?.toLowerCase() === day.day?.toLowerCase(),
    );

    const hasCheckIn = day.checkIn && day.checkIn !== "00:00";
    const hasCheckOut = day.checkOut && day.checkOut !== "00:00";

    // ---------- PRESENT ----------
    if (hasCheckIn || hasCheckOut) {
      workingDays++;

      const shiftStart = shift?.startTime
        ? new Date(`1970-01-01T${shift.startTime}`)
        : null;

      const shiftEnd = shift?.endTime
        ? new Date(`1970-01-01T${shift.endTime}`)
        : null;

      const checkIn = day.checkIn
        ? new Date(`1970-01-01T${day.checkIn}`)
        : null;

      const checkOut = day.checkOut
        ? new Date(`1970-01-01T${day.checkOut}`)
        : null;

      // ---- Calculate worked hours safely ----
      let workedHours = 0;

      if (
        checkIn instanceof Date &&
        !isNaN(checkIn) &&
        checkOut instanceof Date &&
        !isNaN(checkOut)
      ) {
        workedHours = (checkOut - checkIn) / (1000 * 60 * 60);
        if (isNaN(workedHours)) workedHours = 0;
      }

      totalWorkingHours += workedHours;

      // ----- Late Check-In -----
      const graceMs = (AttendanceSettings?.graceMinutes || 0) * 60 * 1000;

      if (shiftStart && checkIn && !isNaN(shiftStart) && !isNaN(checkIn)) {
        if (checkIn - shiftStart > graceMs) lateDays++;
      }

      // ----- Early Check-Out -----
      if (shiftEnd && checkOut && !isNaN(shiftEnd) && !isNaN(checkOut)) {
        if (checkOut < shiftEnd) earlyOutDays++;
      }

      if (day.status?.toLowerCase().includes("on time")) {
        onTimeArrivals++;
      }
    } else {
      // ---------- ABSENT ----------
      if (!shift?.is_week_off) {
        absentDays++;
      }
    }
  });

  // ---------- SAFE AVERAGES ----------
  const averageWorkingHours =
    workingDays > 0
      ? Number(totalWorkingHours / workingDays).toFixed(2)
      : "0.00";

  const totalHours = Number(totalWorkingHours).toFixed(2);

  const onTimePercent =
    workingDays > 0
      ? ((onTimeArrivals / workingDays) * 100).toFixed(2)
      : "0.00";

  return {
    averageWorkingHours,
    totalWorkingHours: totalHours,
    onTimePercentage: `${onTimePercent}%`,
      lateDays:Object.keys(AttendanceSettings || {}).length ? lateDays : 0,
    earlyOutDays,
    presentDays: workingDays,
    absentDays,
    workingDays: finalWorkingDays,
  };
};


// Helper.calculateAttendanceSummary = (finalResult, shiftArray, AttendanceSettings,finalworkingDays) => {
//   let totalWorkingHours = 0;
//   let workingDays = 0;
//   let onTimeArrivals = 0;
//   let lateDays = 0;
//   let earlyOutDays = 0;
//   let absentDays = 0;

//   const attendanceData = finalResult[0]?.data || [];

//   attendanceData.forEach((day) => {
//     const shift = shiftArray.find((s) => s.day_of_week == day.day);

//     if (shift?.is_week_off) return;

//     const hasCheckIn = !!day.checkIn && day.checkIn !== "00:00";
//     const hasCheckOut = !!day.checkOut && day.checkOut !== "00:00";

//     if (hasCheckIn && hasCheckOut) {
//       const shiftStart = new Date(`1970-01-01T${shift?.startTime}`);
//       const shiftEnd = new Date(`1970-01-01T${shift?.endTime}`);
//       const checkIn = new Date(`1970-01-01T${day?.checkIn}`);
//       const checkOut = new Date(`1970-01-01T${day?.checkOut}`);

//       const workedHours = (checkOut - checkIn) / (1000 * 60 * 60);
//       totalWorkingHours += workedHours;
//       workingDays++;

//       // Late check-in logic (beyond grace minutes)
//       const graceMs = AttendanceSettings?.graceMinutes
//         ? AttendanceSettings.graceMinutes * 60 * 1000
//         : 0;
//       if (checkIn - shiftStart > graceMs) {
//         lateDays++;
//       }

//       // Early check-out logic
//       if (checkOut < shiftEnd) {
//         earlyOutDays++;
//       }

//       if (day.status?.toLowerCase().includes("on time")) {
//         onTimeArrivals++;
//       }
//     } else if (hasCheckIn && !hasCheckOut) {

//       earlyOutDays++;
//       workingDays++;
//     } else {

//       absentDays++;
//     }
//   });

//   const averageWorkingHours = workingDays > 0 ? (totalWorkingHours / workingDays).toFixed(2) : 0;
//   const totalHours = totalWorkingHours.toFixed(2);
//   const onTimePercent = workingDays > 0 ? ((onTimeArrivals / workingDays) * 100).toFixed(2) : "0.00";

//   return {
//     averageWorkingHours,
//     totalWorkingHours: totalHours,
//     onTimePercentage: `${onTimePercent}%`,
//     lateDays,
//     earlyOutDays,
//     presentDays: workingDays,
//     absentDays,
//     workingDays:finalworkingDays
//   };
// };

Helper.getWorkingholidays = (
  year,
  month,
  weekOffDays = [],
  holidayData = [],
) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let working = 0;

  // Convert holidays to YYYY-MM-DD format for reliable comparison
  const holidaySet = new Set(
    holidayData.map((h) => new Date(h.date).toISOString().split("T")[0]),
  );

  for (let d = 1; d <= daysInMonth; d++) {
    const currentDate = new Date(year, month, d);
    const formattedDate = currentDate.toISOString().split("T")[0];
    const dayOfWeek = currentDate.getDay();

    const isWeekOff = weekOffDays.includes(dayOfWeek);
    const isHoliday = holidaySet.has(formattedDate);

    if (!isWeekOff && !isHoliday) working++;
  }

  return working;
};

Helper.convertNumberToWords = (amount) => {
  if (amount === 0) return "zero";
  const a = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const b = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const numToWords = (n) => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " hundred" +
        (n % 100 ? " and " + numToWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        numToWords(Math.floor(n / 1000)) +
        " thousand" +
        (n % 1000 ? " " + numToWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        numToWords(Math.floor(n / 100000)) +
        " lakh" +
        (n % 100000 ? " " + numToWords(n % 100000) : "")
      );
    return (
      numToWords(Math.floor(n / 10000000)) +
      " crore" +
      (n % 10000000 ? " " + numToWords(n % 10000000) : "")
    );
  };
  return numToWords(Math.floor(amount));
};

Helper.getAllSubordinates = async (directorId, branchId, tenantId) => {

  let result = [];

  // dynamic where condition
  let whereCondition = {
    reportingPersonId: directorId,
    tenantId,
    status: "active",
  };

  // Apply branch filter ONLY if not "All"
  if (branchId && branchId != "All") {
    whereCondition.branchId = branchId;
  }

  const directReports = await empPersonal.findAll({
    where: whereCondition,
    attributes: ["id"],
    raw: true,
  });

  for (const emp of directReports) {

    result.push(emp.id);

    // recursive call
    const subReports = await Helper.getAllSubordinates(
      emp.id,
      branchId,
      tenantId
    );

    result = result.concat(subReports);
  }

  return result;
};
// Helper.getAllSubordinates = async (directorId, branchId, tenantId) => {
//   let result = [];

//   // Find direct employees under this person
//   const directReports = await empPersonal.findAll({
//     where: {
//       reportingPersonId: directorId,
//       branchId,
//       tenantId,
//       status: "active",
//     },
//     attributes: ["id"],
//     raw: true,
//   });

//   for (const emp of directReports) {
//     result.push(emp.id);

//     // Recursive: get employees under this employee (Team Leader case)
//     const subReports = await Helper.getAllSubordinates(
//       emp.id,
//       branchId,
//       tenantId,
//     );
//     result = result.concat(subReports);
//   }

//   return result;
// };

Helper.getWorkingDays = (year, month) => {
  const totalDays = new Date(year, month, 0).getDate(); // month: 1-12
  let workingDays = 0;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day); // JS months: 0-11
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  return workingDays;
};

Helper.sendNotification = async (deviceToken, title, message) => {
  const payload = {
    token: deviceToken,
    notification: {
      title: title,
      body: message,
    },
  };
  try {
    await admin.messaging().send(payload);
    console.log("Push notification sent successfully");
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

// Helper.sendNotification = async (deviceToken,title,message) => {
//   const payload = {
//     token: deviceToken,
//     notification: {
//       title: title,
//       body: message,
//     },
//   };
//   try {
//     const response = await admin.messaging().send(payload);
//     console.log("Push notification sent successfully",response);
//   } catch (error) {
//     console.error("Error sending push notification:", error);
//   }
// }

const sequelize = require("../connection/connection"); 

Helper.updateEmployeeBranchEverywhere = async (employeeId, tenantId,newBranchId, updatedBy) => {
  const t = await sequelize.transaction();
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Attendance → ONLY current month & year
    await attendance.update(
      { branchId: newBranchId, updatedBy },
      {
        where: {
          employeeId,
          tenantId,
          month: currentMonth,
          year: currentYear,
        },
        transaction: t,
      }
    );

    // Other tables → ALL records
    const whereAll = { employeeId, tenantId };

    await Basic.update({ branchId: newBranchId, updatedBy }, { where: whereAll, transaction: t });
    await Allowance.update({ branchId: newBranchId, updatedBy }, { where: whereAll, transaction: t });
    await deduction.update({ branchId: newBranchId, updatedBy }, { where: whereAll, transaction: t });
    await leave_balance.update({ branchId: newBranchId, updatedBy }, { where: whereAll, transaction: t });
    await leave_application.update({ branchId: newBranchId, updatedBy }, { where: whereAll, transaction: t });

    await t.commit();
    return true;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};


Helper.getAddressFromGlobalVTS = async (lat, lng) => {

  try {

    const GOOGLE_API_KEY = process.env.GOOGLE_MAP_KEY;

    if (!lat || !lng) return null;

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results.length) {
      return null;
    }

    const result = data.results[0];
    const components = result.address_components;

    const getComponent = (type) =>
      components.find(c => c.types.includes(type))?.long_name || "";

    const addressData = {

      full_address: result.formatted_address,

      street: `${getComponent("street_number")} ${getComponent("route")}`.trim(),

      area:
        getComponent("sublocality") ||
        getComponent("neighborhood") ||
        getComponent("sublocality_level_1"),

      city:
        getComponent("locality") ||
        getComponent("administrative_area_level_2"),

      state: getComponent("administrative_area_level_1"),

      pincode: getComponent("postal_code"),

      country: getComponent("country"),

      coordinates: {
        latitude: lat,
        longitude: lng
      }

    };

    return addressData;

  } catch (error) {

    console.error("Reverse Geocode Error:", error.message);

    return null;

  }

};


Helper.getDistanceMeters = (lat1, lon1, lat2, lon2) => {

  const R = 6371000;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

Helper.formatDuration = (seconds) =>{

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hrs}h ${mins}m ${secs}s`;
}

/**
 * Employee-app preview: align with payroll logic in salary.js (grace → late allowance → half-day).
 * @param {Array<{day_of_week?: string|number; day_num?: number; is_week_off?: boolean; startTime?: string; endTime?: string}>} shiftMap
 * @param {Array<{date: string; day?: string; checkIn?: string|null; checkOut?: string|null; status?: string}>} dataRowsAsc Oldest → newest
 * @param {{ graceMinutes?: number; lateAllowanceMin?: number; halfDayThreshold?: number; halfdayToAbsentMin?: number }|null} settings attendanceSetting row
 */
Helper.computeLatePayrollPreview = (shiftMap, dataRowsAsc, settings) => {
  if (!settings || typeof settings !== "object") {
    return null;
  }

  const graceMinutes = Number(settings.graceMinutes) || 0;
  const lateAllowanceMin = Number(settings.lateAllowanceMin) || 0;
  const halfDayThresholdMinutes = Number(settings.halfDayThreshold) || 0;
  const minWorkedHours = Number(settings.halfdayToAbsentMin) || 0;

  const findShift = (dateStr, dayName) => {
    const rowDayNum = moment(dateStr, "YYYY-MM-DD").day();
    return (shiftMap || []).find((s) => {
      if (typeof s.day_of_week === "string") {
        return (
          String(s.day_of_week).toLowerCase() ===
          String(dayName || "").toLowerCase()
        );
      }
      if (typeof s.day_num === "number") {
        return s.day_num === rowDayNum;
      }
      return s.day_of_week === rowDayNum;
    });
  };

  let graceLateCount = 0;
  let moderateLateBeyondAllowanceHalf = 0;
  let extremeLateHalf = 0;
  let shortWorkDays = 0;
  let moderateLateInAllowance = 0;

  for (const row of dataRowsAsc || []) {
    const dateStr = row.date;
    const dayName = row.day;
    const checkInStr = row.checkIn;
    const checkOutStr = row.checkOut;
    const st = String(row.status || "").toLowerCase();

    if (!dateStr || st === "holiday") continue;
    if (!checkInStr || !checkOutStr) continue;
    if (st.includes("week off")) continue;
    if (st.includes("on leave") && !st.includes("late")) continue;
    if (st.includes("first half") || st.includes("second half")) continue;

    const shift = findShift(dateStr, dayName);
    if (!shift || shift.is_week_off) continue;

    let shiftStart = moment(
      `${dateStr} ${shift.startTime}`,
      "YYYY-MM-DD HH:mm:ss",
    ).seconds(0).milliseconds(0);
    let shiftEnd = moment(
      `${dateStr} ${shift.endTime}`,
      "YYYY-MM-DD HH:mm:ss",
    ).seconds(0).milliseconds(0);
    if (shiftEnd.isBefore(shiftStart)) shiftEnd.add(1, "day");

    const graceTime = shiftStart
      .clone()
      .add(graceMinutes, "minutes")
      .seconds(0)
      .milliseconds(0);
    const halfDayTime = shiftStart
      .clone()
      .add(halfDayThresholdMinutes, "minutes")
      .seconds(0)
      .milliseconds(0);

    const checkIn = moment(
      `${dateStr} ${checkInStr}`,
      "YYYY-MM-DD HH:mm",
    ).seconds(0).milliseconds(0);
    let checkOut = moment(
      `${dateStr} ${checkOutStr}`,
      "YYYY-MM-DD HH:mm",
    ).seconds(0).milliseconds(0);
    if (checkOut.isBefore(checkIn)) checkOut.add(1, "day");

    const workedHours = Math.max(0, checkOut.diff(checkIn, "hours", true));

    if (minWorkedHours > 0 && workedHours < minWorkedHours) {
      shortWorkDays++;
      continue;
    }

    if (checkIn.isAfter(halfDayTime)) {
      extremeLateHalf++;
      continue;
    }

    if (checkIn.isAfter(graceTime)) {
      if (graceLateCount < lateAllowanceMin) {
        graceLateCount++;
        moderateLateInAllowance++;
      } else {
        moderateLateBeyondAllowanceHalf++;
      }
    }
  }

  const allowanceRemaining = Math.max(0, lateAllowanceMin - graceLateCount);
  const hasSalaryImpact =
    moderateLateBeyondAllowanceHalf > 0 ||
    extremeLateHalf > 0 ||
    shortWorkDays > 0;

  let alertLevel = "none";
  if (hasSalaryImpact) alertLevel = "danger";
  else if (lateAllowanceMin > 0 && graceLateCount >= lateAllowanceMin) {
    alertLevel = "warning";
  } else if (graceLateCount > 0 || extremeLateHalf > 0) {
    alertLevel = "info";
  }

  const estimatedPayrollHalfDays =
    moderateLateBeyondAllowanceHalf + extremeLateHalf;

  const detailLines = [];
  detailLines.push(
    `Grace period: ${graceMinutes} min after shift start before a “late” is counted.`,
  );
  detailLines.push(
    `Monthly late allowance: ${lateAllowanceMin} moderate late arrival(s) are treated as full days; beyond that, payroll may mark half-days (same rules as salary run).`,
  );
  detailLines.push(
    `Heavy late: check-in after shift start + ${halfDayThresholdMinutes} min → half-day treatment in payroll.`,
  );
  if (minWorkedHours > 0) {
    detailLines.push(
      `Worked hours below ${minWorkedHours} h (in–out span) → absent / deduction path in payroll.`,
    );
  }

  let headline = "";
  if (hasSalaryImpact) {
    headline =
      "Your attendance this month may reduce payable days: salary rules treat some late or short-duration days as half-day or absent.";
  } else if (lateAllowanceMin > 0 && allowanceRemaining === 0) {
    headline =
      "You have used all monthly late allowances; further late arrivals (before the heavy-late cutoff) may count as half-days in payroll.";
  } else if (graceLateCount > 0) {
    headline = `You have used ${graceLateCount} of ${lateAllowanceMin} late allowance(s) this month.`;
  } else {
    headline =
      "No late arrivals beyond grace have been recorded for this month so far.";
  }

  return {
    hasSettings: true,
    settings: {
      graceMinutes,
      lateAllowanceMin,
      halfDayThresholdMinutes,
      minWorkedHours,
    },
    counts: {
      moderateLateInAllowance,
      moderateLateBeyondAllowanceHalf,
      extremeLateHalf,
      shortWorkDays,
      estimatedPayrollHalfDays,
    },
    allowanceUsed: graceLateCount,
    allowanceLimit: lateAllowanceMin,
    allowanceRemaining,
    hasSalaryImpact,
    alertLevel,
    headline,
    detailLines,
  };
};

module.exports = Helper;
