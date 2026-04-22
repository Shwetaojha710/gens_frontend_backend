const Shift = require("../../models/shift");
const Helper = require("../../helper/helper");
const attendance = require("../../models/attendance");
const moment = require("moment");
const sequelize = require("../../connection/connection");

exports.createShift = async (req, res) => {
  const data = req.body;
  const tenantId = req.users && req.users.tenantId;
  
  const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  if (!Array.isArray(data) || data.length === 0) {
    return Helper.response(false, "No shifts provided", [], res, 400);
  }

  const arrayPush = [];

  for (const item of data) {
    const startTime = item.startTime;
    const endTime = item.endTime;

    const isWeekOff =
      !startTime || !endTime ||
      (startTime === "00:00:00" && endTime === "00:00:00");

    let workingHours = 0;

    if (!isWeekOff) {
      const start = moment(startTime, "HH:mm");
      let end = moment(endTime, "HH:mm");

      if (end.isBefore(start)) {
        end.add(1, "day"); // handle overnight shift
      }

      workingHours = moment.duration(end.diff(start)).asHours();
    }

    arrayPush.push({
      day_of_week: item.day_of_week,
      shift: item.shift,
      startTime: isWeekOff ? "00:00:00" : startTime,
      endTime: isWeekOff ? "00:00:00" : endTime,
      tenantId,
      branchId,
      createdBy: req.users && req.users.id,
      is_week_off: isWeekOff,
      workingHours: isWeekOff ? 0 : workingHours,
      status: isWeekOff ? "inactive" : "active",
    });
  }

  try {   
    const shiftName = arrayPush[0].shift;
    const existingShifts = await Shift.findOne({
      where: { tenantId, shift: shiftName, branchId },
    });

    if (existingShifts) {
      return Helper.response(false, "Shift with this name already exists", [], res, 400);
    }

    const newShift = await Shift.bulkCreate(arrayPush);
    return Helper.response(true, "Shift created successfully", newShift, res, 201);
  } catch (error) {
    console.error("Error creating shift:", error);
    return Helper.response(false, error?.message || "Internal Server Error", [], res, 500);
  }
};



exports.getShift = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;

   const branchId = req.users && req.users.branchId;

    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  try {
    const shifts = await Shift.findAll({
      where: { tenantId, branchId },
      raw: true,
      order: [['shift', 'ASC'], ['day_of_week', 'ASC']],
    });

    const grouped = shifts.reduce((acc, shift) => {
      const group = acc.find(g => g.shift === shift.shift);
      if (group) {
        group.shifts.push(shift);
      } else {
        acc.push({
          shift: shift.shift,
          shifts: [shift]
        });
      }
      return acc;
    }, []);

    return Helper.response(true, "Shifts grouped by shift name", grouped, res, 200);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

// exports.updateShift = async (req, res) => {
//   const { id, shift, startTime, endTime, status } = req.body;
//   const tenantId = req.users && req.users.tenantId;

//   if (!id || !tenantId) {
//     return Helper.response(false, "Shift ID and Tenant ID are required", [], res, 400);
//   }

//   try {
//     const shiftToUpdate = await Shift.findOne({ where: { id, tenantId } });

//     if (!shiftToUpdate) {
//       return Helper.response(false, "Shift not found", [], res, 404);
//     }

//     if (shift) {
//       return Helper.response(false, "Shift type cannot be updated once created.", [], res, 400);
//     }

//     if (startTime) shiftToUpdate.startTime = startTime;
//     if (endTime) shiftToUpdate.endTime = endTime;
//     if (status) shiftToUpdate.status = status;
//     shiftToUpdate.updatedBy = req.users && req.users.id;

//     await shiftToUpdate.save();

//     const formattedShift = Helper.formatShiftTime(shiftToUpdate);
//     return Helper.response(true, "Shift updated successfully", formattedShift, res, 200);
//   } catch (error) {
//     console.error("Error updating shift:", error);
//     return Helper.response(false, "Internal Server Error", [], res, 500);
//   }
// };




exports.updateShift = async (req, res) => {
  const data = req.body;
  const tenantId = req.users && req.users.tenantId;

  const branchId = req.users && req.users.branchId;
  
    if (!branchId || branchId=='null') {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  if (!Array.isArray(data) || data.length === 0) {
    return Helper.response(false, "No shifts provided", [], res, 400);
  }

  const transaction = await sequelize.transaction();

  try {
    const results = [];

    for (const item of data) {
      const startTime = item.startTime;
      const endTime = item.endTime;
      const isWeekOff =
        !startTime || !endTime ||
        (startTime === "00:00" && endTime === "00:00") ||
        (startTime === "00:00:00" && endTime === "00:00:00");

      let workingHours = 0;

      if (!isWeekOff) {
        const start = moment(startTime, "HH:mm");
        let end = moment(endTime, "HH:mm");

        if (end.isBefore(start)) {
          end.add(1, "day"); // overnight shift
        }

        workingHours = moment.duration(end.diff(start)).asHours();
      }

      const values = {
        startTime: isWeekOff ? "00:00:00" : startTime,
        endTime: isWeekOff ? "00:00:00" : endTime,
        is_week_off: isWeekOff,
        branchId: branchId,
        workingHours: isWeekOff ? 0 : workingHours,
        status: isWeekOff ? "inactive" : "active",
        updatedBy: req.users && req.users.id,
      };

      const existing = await Shift.findOne({
        where: { tenantId, shift: item.shift, day_of_week: item.day_of_week, branchId },
        transaction
      });

      if (existing) {
        await existing.update(values, { transaction });
        results.push({ ...existing.toJSON(), ...values });
      } else {
        const newShift = await Shift.create(
          {
            tenantId,
            branchId,
            shift: item.shift,
            day_of_week: item.day_of_week,
            ...values,
            createdBy: req.users && req.users.id,
          },
          { transaction }
        );
        results.push(newShift);
      }
    }

    await transaction.commit();
    return Helper.response(true, "Shifts updated successfully", results, res, 200);

  } catch (error) {
    console.error("Error updating shifts:", error);
    await transaction.rollback();
    return Helper.response(false, error?.message || "Internal Server Error", [], res, 500);
  }
};

exports.deleteShift = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;

  if (!id || !tenantId) {
    return Helper.response(false, "Shift ID and Tenant ID are required", [], res, 400);
  }

    const branchId = req.users && req.users.branchId;
   if( !branchId) {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

  try {
    const shiftToDelete = await Shift.findOne({ where: { id, tenantId, branchId } });

    if (!shiftToDelete) {
      return Helper.response(false, "Shift not found", [], res, 404);
    }

    await shiftToDelete.destroy();
    return Helper.response(true, "Shift deleted successfully", [], res, 200);
  } catch (error) {
    console.error("Error deleting shift:", error);
    return Helper.response(false, "Internal Server Error", [], res, 500);
  }
};

// exports.generateDummyAttendance = async () => {
//   const tenantId ='456595cc-d182-478b-88cd-ccaa511db319';   // sample tenant
//   const employeeId = "33af8276-4142-4b03-b9e5-422f96385f7b"; // sample employee
//   const createdBy = employeeId;
//   const updatedBy = employeeId;

//   const attendances = [];

//   for (let day = 1; day <= 31; day++) {
//     let endday=day+1
//     const date = moment(`2025-12-${day}`, "YYYY-MM-DD");
//     // const enddate = moment(`2025-12-${endday}`, "YYYY-MM-DD");
//     // Skip Sundays (or Saturdays+Sundays if required)
//     //if (date.day() === 0) continue; // Sunday only
//     if (date.day() === 0 || date.day() === 6) continue; // uncomment for Sat+Sun off

    
//     const checkIn = moment(`${date.format('YYYY-MM-DD')} 09:00 AM`, "YYYY-MM-DD hh:mm A").format("YYYY-MM-DD HH:mm:ss");
//     const checkOut = moment(`${date.format('YYYY-MM-DD')} 06:30 PM`, "YYYY-MM-DD hh:mm A").format("YYYY-MM-DD HH:mm:ss");

//     attendances.push({
//       tenantId,
//       employeeId,
//       ip_address: '192.168.1.10',
//       check_in_time: checkIn,
//       check_out_time: checkOut,
//       is_present: true,
//       date:date.format('YYYY-MM-DD'),
//       month:new Date(date).getMonth()+1,
//       year:new Date(date).getFullYear(),
//       createdBy,
//       updatedBy,
//     });
//   }

//   try {
//     await attendance.bulkCreate(attendances);
//     console.log(`Inserted ${attendances.length} attendance records for June.`);
//   } catch (error) {
//     console.error('Error inserting dummy data:', error);
//   } finally {
//     console.error('Error inserting dummy data:');
//   }
// };


exports.generateDummyAttendance = async () => {
  const tenantId = "456595cc-d182-478b-88cd-ccaa511db319"; // sample tenant

  const employeeIds = [
    // "659b95b3-cd2e-44fe-838f-6cf9e099fe13",
    // "33d04964-881d-435b-a505-a7ce3505108d",
    // "5e0277e2-5502-45e1-b730-189e92cec551",
     "e7b92aac-c040-4bcd-9ca8-1aac48f6dc9d"
  ];

  const attendances = [];

  for (let i = 0; i < employeeIds.length; i++) {
    for (let day = 1; day <= 31; day++) {
      const date = moment(`2025-10-${day}`, "YYYY-MM-DD");
 
   let endday=day+1
        const enddate = moment(`2025-10-${endday}`, "YYYY-MM-DD");
      // Skip weekends
      if (date.day() === 0 || date.day() === 6) continue;
     const checkIn = moment(`${date.format('YYYY-MM-DD')} 14:30 AM`, "YYYY-MM-DD hh:mm A").format("YYYY-MM-DD HH:mm:ss");

    const checkOut = moment(`${enddate.format('YYYY-MM-DD')} 00:30 PM`, "YYYY-MM-DD hh:mm A").format("YYYY-MM-DD HH:mm:ss");

    // attendances.push({
    //   tenantId,
    //   employeeId,
    //   ip_address: '192.168.1.10',
    //   check_in_time: checkIn,
    //   check_out_time: checkOut,
    //   is_present: true,
    //   date: date.format('YYYY-MM-DD'),
    //   month: new Date(date).getMonth() + 1,
    //   year: new Date(date).getFullYear(),
    //   createdBy:employeeId[i],
    //   updatedBy:employeeId[i],
    // });
      attendances.push({
        tenantId,
        employeeId: employeeIds[i], // ✅ correct employee
        ip_address: "192.168.1.10",
        check_in_time: checkIn,
        check_out_time: checkOut,
        is_present: true,
        date: date.format("YYYY-MM-DD"),
       month: new Date(date).getMonth() + 1,
      year: new Date(date).getFullYear(),
        createdBy: employeeIds[i],
        updatedBy: employeeIds[i],
      });
    }
  }

  try {
    await attendance.bulkCreate(attendances);
    console.log(
      `✅ Inserted ${attendances.length} attendance records for November.`
    );
  } catch (error) {
    console.error("❌ Error inserting dummy data:", error);
  }
};