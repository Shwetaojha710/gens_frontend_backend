const Helper = require("../../helper/helper");
const attendance = require("../../models/attendance");
const empPersonal = require("../../models/empPersonal");
const Department = require("../../models/department.js");
const holiday = require("../../models/holiday.js");
const holidayType = require("../../models/HolidayType.js");
const leaveApplication = require("../../models/leave_application.js");
const leaveMaster = require("../../models/leaveMaster.js");
const Designation = require("../../models/designation.js");
const DeviceLocationLog = require("../../models/device_location_logs.js");
const Shift = require("../../models/shift");
const AttendanceSetting = require("../../models/attendanceSetting");
const Branch = require("../../models/branch.js");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");

const BADGE_COLORS = ["primary", "warning", "info", "danger", "success"];
const DEPARTMENT_COLORS = [
  "#154D71",
  "#005890",
  "#3357FF",
  "#1c6ea4",
  "#33a1e0",
  "#3498DB",
  "#56cfe1",
  "#c77dff",
  "#ff4d4f",
  "#7f8c8d",
  "#52c41a",
];

const getRequestContext = (req) => {
  const tenantId = req.users?.tenantId;
  const branchId = req.users?.branchId;

  if (!tenantId) {
    return { error: "TenantId Is Required", statusCode: 400 };
  }

  if (!branchId || branchId === "null") {
    return { error: "branchId is required!", statusCode: 200 };
  }

  return { tenantId, branchId };
};

const parseCheckInMoment = (value, todayDate) => {
  if (!value) {
    return null;
  }

  const directMoment = moment(value);
  if (directMoment.isValid()) {
    return directMoment;
  }

  const timeOnlyValue = String(value).split(" ").pop();
  const fallbackMoment = moment(`${todayDate} ${timeOnlyValue}`, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"]);
  return fallbackMoment.isValid() ? fallbackMoment : null;
};

const getRangeBounds = (range) => {
  const normalizedRange = String(range || "This Week").toLowerCase();
  const now = moment();

  if (normalizedRange == "this month") {
    return {
      normalizedRange: "This Month",
      start: now.clone().startOf("month"),
      end: now.clone().endOf("month"),
    };
  }

  return {
    normalizedRange: "This Week",
    start: now.clone().startOf("isoWeek"),
    end: now.clone().endOf("isoWeek"),
  };
};

const getDashboardBaseData = async (tenantId, branchId, range = "This Week", section = "employee") => {
  const today = moment();
  const todayMonth = today.month() + 1;
  const todayYear = today.year();
  const todayDate = today.format("YYYY-MM-DD");
  const weekStart = today.clone().startOf("isoWeek").format("YYYY-MM-DD");
  const weekEnd = today.clone().endOf("isoWeek").format("YYYY-MM-DD");
  const currentDayName = today.format("dddd");
  const shouldApplyRangeFilter = String(section || "employee").toLowerCase() === "leave" && String(range || "").toLowerCase() !== "all";
  const rangeBounds = getRangeBounds(range);
  const rangeStartDate = rangeBounds.start.format("YYYY-MM-DD");
  const rangeEndDate = rangeBounds.end.format("YYYY-MM-DD");
  const employeeWhere = shouldApplyRangeFilter
    ? {
        tenantId,
        branchId,
        status: "active",
        joiningDate: {
          [Op.between]: [rangeStartDate, rangeEndDate],
        },
      }
    : {
        tenantId,
        branchId,
        status: "active",
      };
  const leaveWhere = shouldApplyRangeFilter
    ? {
        tenantId,
        branchId,
        [Op.or]: [
          {
            appliedOn: {
              [Op.between]: [rangeStartDate, rangeEndDate],
            },
          },
          {
            fromDate: {
              [Op.between]: [rangeStartDate, rangeEndDate],
            },
          },
        ],
      }
    : { tenantId, branchId };

  const [
    totalEmployees,
    activeEmployees,
    todayPresentCount,
    activeDepartments,
    allDesignations,
    employeesByDepartment,
    activeEmployeeRecords,
    recentEmployees,
    recentHolidays,
    recentLeaves,
    birthdayEmployees,
    joiningEmployees,
    leaveMasterList,
    weekAttendance,
    todayLeaves,
    locationEmployees,
    todayLocations,
    monthlyAttendance,
    todayAttendanceRows,
    shiftRows,
    attendanceSetting,
  ] = await Promise.all([
    empPersonal.count({ where: { tenantId, branchId } }),
    empPersonal.count({ where: { tenantId, branchId, status: "active" } }),
    attendance.count({
      where: {
        tenantId,
        branchId,
        date: todayDate,
        is_present: true,
      },
      distinct: true,
      col: "employeeId",
    }),
    Department.findAll({
      where: { tenantId, branchId, status: "active" },
      attributes: ["id", "name"],
      raw: true,
      order: [["createdAt", "ASC"]],
    }),
    Designation.findAll({
      where: { tenantId, branchId, status: "active" },
      attributes: ["id", "name"],
      raw: true,
    }),
    empPersonal.findAll({
      where: { tenantId, branchId, status: "active" },
      attributes: [
        "departmentId",
        [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
      ],
      group: ["departmentId"],
      raw: true,
    }),
    empPersonal.findAll({
      where: { tenantId, branchId, status: "active" },
      attributes: ["id", "departmentId", "shift_id", "firstName", "lastName", "empCode"],
      raw: true,
    }),
    empPersonal.findAll({
      where: employeeWhere,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "designationId",
        "empCode",
        "gender",
        "joiningDate",
        "profileImage",
      ],
      order: [["joiningDate", "DESC"]],
      raw: true,
      limit: 7,
    }),
    holiday.findAll({
      where: { tenantId, branchId, status: "active" },
      order: [["createdAt", "DESC"]],
      limit: 5,
      raw: true,
    }),
    leaveApplication.findAll({
      where: leaveWhere,
      order: [["createdAt", "DESC"]],
      limit: 7,
      raw: true,
    }),
    empPersonal.findAll({
      where: { tenantId, branchId, status: "active", dateOfBirth: { [Op.ne]: null } },
      attributes: ["id", "firstName", "lastName", "designationId", "dateOfBirth", "gender", "profileImage"],
      raw: true,
    }),
    empPersonal.findAll({
      where: { tenantId, branchId, status: "active", joiningDate: { [Op.ne]: null } },
      attributes: ["id", "firstName", "lastName", "gender", "designationId", "joiningDate", "profileImage"],
      raw: true,
    }),
    leaveMaster.findAll({
      where: { tenantId, branchId },
      raw: true,
      // limit: 10,
      attributes: ["id", "leaveName", "description", "leaveCode"],
    }),
    attendance.findAll({
      where: {
        tenantId,
        branchId,
        date: {
          [Op.between]: [weekStart, weekEnd],
        },
      },
      attributes: ["employeeId", "date", "is_present"],
      raw: true,
    }),
    leaveApplication.findAll({
      where: {
        tenantId,
        branchId,
        fromDate: { [Op.lte]: todayDate },
        toDate: { [Op.gte]: todayDate },
        status: { [Op.in]: ["pending", "approved"] },
      },
      raw: true,
    }),
    empPersonal.findAll({
      where: { tenantId, branchId, isLocation: true },
      attributes: ["id", "firstName", "lastName", "empCode"],
      raw: true,
    }),
    DeviceLocationLog.findAll({
      where: {
        tracked_at: {
          [Op.between]: [today.clone().startOf("day").toDate(), today.clone().endOf("day").toDate()],
        },
      },
      order: [["tracked_at", "DESC"]],
      raw: true,
    }),
    attendance.findAll({
      attributes: [
        "employeeId",
        [Sequelize.fn("SUM", Sequelize.literal("CASE WHEN is_present = true THEN 1 ELSE 0 END")), "present_days"],
      ],
      where: { month: todayMonth, year: todayYear, tenantId, branchId },
      group: ["employeeId"],
      raw: true,
    }),
    attendance.findAll({
      where: {
        tenantId,
        branchId,
        date: todayDate,
        check_in_time: { [Op.ne]: null },
      },
      attributes: ["employeeId", "check_in_time", "is_present"],
      raw: true,
    }),
    Shift.findAll({
      where: {
        tenantId,
        branchId,
        status: "active",
        day_of_week: currentDayName,
      },
      attributes: ["shift", "startTime", "is_week_off"],
      raw: true,
    }),
    AttendanceSetting.findOne({
      where: { tenantId, branchId },
      order: [["createdAt", "DESC"]],
      raw: true,
    }),
  ]);

  return {
    today,
    todayDate,
    totalEmployees,
    activeEmployees,
    todayPresentCount,
    activeDepartments,
    allDesignations,
    employeesByDepartment,
    activeEmployeeRecords,
    recentEmployees,
    recentHolidays,
    recentLeaves,
    birthdayEmployees,
    joiningEmployees,
    leaveMasterList,
    weekAttendance,
    todayLeaves,
    locationEmployees,
    todayLocations,
    monthlyAttendance,
    todayAttendanceRows,
    shiftRows,
    attendanceSetting,
    selectedRange: rangeBounds.normalizedRange,
  };
};

const getAttendanceMetrics = (baseData) => {
  const {
    today,
    todayDate,
    activeEmployees,
    weekAttendance,
    todayLeaves,
    activeEmployeeRecords,
    todayAttendanceRows,
    shiftRows,
    attendanceSetting,
  } = baseData;

  const weekDaysElapsed = Math.max(today.isoWeekday(), 1);
  const expectedWeekAttendance = activeEmployees * weekDaysElapsed;
  const presentEntries = weekAttendance.filter((item) => item.is_present).length;
  const onLeaveCount = todayLeaves.length;
  const emergencyCount = todayLeaves.filter((item) =>
    String(item.reason || "").toLowerCase().match(/urgent|emergency|serious|medical|health/),
  ).length;

  const presentPercent = expectedWeekAttendance
    ? Number(((presentEntries / expectedWeekAttendance) * 100).toFixed(0))
    : 0;
  const onLeavePercent = activeEmployees
    ? Number(((onLeaveCount / activeEmployees) * 100).toFixed(0))
    : 0;
  const emergencyPercent = activeEmployees
    ? Number(((emergencyCount / activeEmployees) * 100).toFixed(0))
    : 0;

  const presentTodayIds = new Set(todayAttendanceRows.map((e) => e.employeeId));
  const onLeaveIds = new Set(todayLeaves.map((e) => e.employeeId));
  const absentCount = activeEmployeeRecords.filter(
    (e) => !presentTodayIds.has(e.id) && !onLeaveIds.has(e.id),
  ).length;
  const absentPercent = activeEmployees
    ? Number(((absentCount / activeEmployees) * 100).toFixed(0))
    : 0;

  const employeeMap = Object.fromEntries(activeEmployeeRecords.map((item) => [item.id, item]));
  const shiftMap = Object.fromEntries(shiftRows.map((item) => [item.shift, item]));
  const graceMinutes = Number(attendanceSetting?.graceMinutes || 0);

  let lateCheckInCount = 0;
  for (const entry of todayAttendanceRows) {
    const employee = employeeMap[entry.employeeId];
    const shift = employee?.shift_id ? shiftMap[employee.shift_id] : null;

    if (!shift || shift.is_week_off || !shift.startTime) {
      continue;
    }

    const shiftStart = moment(`${todayDate} ${shift.startTime}`, ["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm"]);
    const checkInMoment = parseCheckInMoment(entry.check_in_time, todayDate);

    if (!shiftStart.isValid() || !checkInMoment?.isValid()) {
      continue;
    }

    const allowedCheckIn = shiftStart.clone().add(graceMinutes, "minutes");
    if (checkInMoment.isAfter(allowedCheckIn)) {
      lateCheckInCount += 1;
    }
  }

  const lateCheckInPercent = activeEmployees
    ? Number(((lateCheckInCount / activeEmployees) * 100).toFixed(0))
    : 0;

  return {
    presentPercent,
    onLeavePercent,
    emergencyPercent,
    onLeaveCount,
    emergencyCount,
    lateCheckInCount,
    lateCheckInPercent,
    absentCount,
    absentPercent,
  };
};

const buildAttendanceChart = (baseData) => {
  const metrics = getAttendanceMetrics(baseData);

  // Normalize so series always sums to exactly 100
  const rawSeries = [metrics.presentPercent, metrics.onLeavePercent, metrics.emergencyPercent, metrics.absentPercent];
  const rawTotal = rawSeries.reduce((sum, v) => sum + v, 0);
  let series;
  if (rawTotal === 0) {
    series = [100, 0, 0, 0];
  } else {
    series = rawSeries.map((v) => Math.floor((v / rawTotal) * 100));
    const remainder = 100 - series.reduce((sum, v) => sum + v, 0);
    series[0] += remainder; // assign rounding remainder to "Present"
  }

  return {
    title: "Attendance Chart",
    subtitle: "This Week",
    total: `${series[0]}%`,
    labels: ["Present", "On Leave", "On Emergency leave", "Absent"],
    series,
    colors: ["#1ac888", "#ffbf3b", "#ff5b5b", "#a0aec0"],
    todayLeaveCount: metrics.onLeaveCount,
    emergencyCount: metrics.emergencyCount,
    lateCheckInCount: metrics.lateCheckInCount,
    absentCount: metrics.absentCount,
    absentPercent: metrics.absentPercent,
    breakdown: [
      { label: "Present", value: `${series[0]}%`, color: "#1ac888" },
      { label: "On Leave", value: `${series[1]}%`, color: "#ffbf3b" },
      { label: "On Emergency leave", value: `${series[2]}%`, color: "#ff5b5b" },
      { label: "Absent", value: `${series[3]}%`, color: "#a0aec0" },
    ],
  };
};

const buildDepartmentAttendanceData = (baseData) => {
  const { activeDepartments, employeesByDepartment, activeEmployeeRecords, todayAttendanceRows } = baseData;
  const presentEmployeeIds = new Set(
    todayAttendanceRows.filter((item) => item.is_present).map((item) => item.employeeId),
  );

  return activeDepartments.map((department, index) => {
    const totalEmployees = Number(
      employeesByDepartment.find((item) => item.departmentId === department.id)?.count || 0,
    );

    const presentEmployees = activeEmployeeRecords.filter(
      (item) => item.departmentId === department.id && presentEmployeeIds.has(item.id),
    ).length;

    return {
      id: department.id,
      name: department.name,
      totalEmployees,
      presentEmployees,
      percentage: totalEmployees ? Number(((presentEmployees / totalEmployees) * 100).toFixed(0)) : 0,
      color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
    };
  });
};

const buildDashboardStats = (baseData, trackingList) => {
  const { totalEmployees, activeEmployees, todayPresentCount, monthlyAttendance } = baseData;
  const metrics = getAttendanceMetrics(baseData);
  const today = moment();
  const workingDaysInMonth = Helper.getWorkingDays(today.year(), today.month() + 1);

  let monthlyAttendanceOverview = 0;
  if (monthlyAttendance.length) {
    const percentages = monthlyAttendance.map((item) => {
      const present = Number(item.present_days || 0);
      return workingDaysInMonth ? (present / workingDaysInMonth) * 100 : 0;
    });

    monthlyAttendanceOverview = Number(
      (percentages.reduce((sum, item) => sum + item, 0) / percentages.length).toFixed(0),
    );
  }

  const onlineTrackingCount = trackingList.filter((item) => item.status === "live").length;
  const presentTodayPercent = totalEmployees ? Number(((todayPresentCount / totalEmployees) * 100).toFixed(0)) : 0;
  const activeEmployeePercent = totalEmployees ? Number(((activeEmployees / totalEmployees) * 100).toFixed(0)) : 0;

  return [
    {
      title: "Total Employees",
      value: String(totalEmployees),
      change: `+${activeEmployeePercent}%`,
      changeLabel: "active",
      changeDirection: "up",
      icon: "ri-group-line",
      icon_color: "primary",
      color: "#154D71",
      link: "/employees",
      linkurl: "/layout/employee/joining",
    },
    {
      title: "Late Check-ins",
      value: String(metrics.lateCheckInCount),
      change: `+${metrics.lateCheckInPercent}%`,
      changeLabel: "today",
      changeDirection: metrics.lateCheckInCount ? "warning" : "up",
      icon_color: "primary",
      icon: "ri-alert-line",
      color: "#005890",
      link: "/attendance",
      linkurl: "/layout/attendance/logs",
    },
    {
      title: "Total Tracking",
      value: String(trackingList.length),
      change: `+${onlineTrackingCount}`,
      changeLabel: "live",
      changeDirection: "up",
      icon_color: "primary",
      icon: "ri-route-line",
      color: "#1c6ea4",
      link: "/applicants",
      linkurl: "/layout/tracking",
    },
    {
      title: "Today's Attendance",
      value: String(todayPresentCount),
      change: `+${presentTodayPercent}%`,
      changeLabel: "present",
      changeDirection: "up",
      icon_color: "primary",
      icon: "ri-time-line",
      color: "#33a1e0",
      link: "/attendance/today",
      linkurl: "/layout/attendance/date-wise-attendance",
    },
    {
      title: "Monthly Attendance Overview",
      value: `${monthlyAttendanceOverview}%`,
      change: `+${monthlyAttendanceOverview}%`,
      changeLabel: "this month",
      changeDirection: "up",
      icon_color: "primary",
      icon: "ri-bar-chart-line",
      color: "#0f8f72",
      link: "/attendance",
      linkurl: "/layout/attendance/logs",
    },
  ];
};

const mapEmployees = (employees, designations) => {
  const designationMap = Object.fromEntries(designations.map((item) => [item.id, item.name]));

  return employees.map((employee, index) => ({
    name: `${employee.firstName} ${employee.lastName}`,
    gender: employee.gender || "N/A",
    empCode: employee.empCode || "N/A",
    role: designationMap[employee.designationId] || "N/A",
    badge: designationMap[employee.designationId] || "N/A",
    badgeColor: BADGE_COLORS[index % BADGE_COLORS.length],
    profileImage: employee.profileImage ? `${process.env.BASE_URL}${employee.profileImage}` : null,
    joiningDate: employee.joiningDate ? Helper.newDateFormat(employee.joiningDate) : "NA",
  }));
};

const mapHolidays = async (holidays, tenantId, branchId) => {
  const holidayTypeIds = holidays.map((item) => item.holiday_type).filter(Boolean);
  const holidayTypes = holidayTypeIds.length
    ? await holidayType.findAll({
        where: { id: holidayTypeIds, tenantId, branchId, status: "active" },
        attributes: ["id", "name"],
        raw: true,
      })
    : [];

  const holidayTypeMap = Object.fromEntries(holidayTypes.map((item) => [item.id, item.name]));

  return holidays.map((item) => ({
    name: item.holiday_name,
    type: holidayTypeMap[item.holiday_type] || "N/A",
    date: Helper.newDateFormat(item.date),
    image: item.image,
  }));
};

const mapLeaves = async (leaves, leaveMasterList, tenantId, branchId) => {
  const employeeIds = leaves.map((item) => item.employeeId).filter(Boolean);
  const employees = employeeIds.length
    ? await empPersonal.findAll({
        where: { id: employeeIds, tenantId, branchId },
        attributes: ["id", "firstName", "lastName", "empCode","email","mobile","designationId"],
        raw: true,
      })
    : [];

  const employeeMap = Object.fromEntries(employees.map((item) => [item.id, item]));
  const leaveMap = Object.fromEntries(leaveMasterList.map((item) => [item.id, item.leaveName]));
  const designation = await Designation.findAll({
    where: { tenantId, branchId },
    attributes: ["id", "name"],
    raw: true,
  });
  const designationMap = Object.fromEntries(designation.map((item) => [item.id, item.name]));
    
  return leaves.map((item) => ({
    ...item,
    name: `${employeeMap[item.employeeId]?.firstName || ""} ${employeeMap[item.employeeId]?.lastName || ""}`.trim(),
    empCode: employeeMap[item.employeeId]?.empCode || null,
    email: employeeMap[item.employeeId]?.email || null,
    mobile: employeeMap[item.employeeId]?.mobile || null,
    type: leaveMap[item.leaveTypeId] || "N/A",
    designation: designationMap[employeeMap[item.employeeId]?.designationId] || "N/A",
  }));
};

const mapCelebrations = (employees, designations, key, today) => {
  const designationMap = Object.fromEntries(designations.map((item) => [item.id, item.name]));

  return employees
    .filter((employee) => {
      const value = employee[key];
      if (!value) {
        return false;
      }
      const currentDate = new Date(value);
      if (key === "joiningDate") {
        return currentDate.getDate() === today.date() && currentDate.getMonth() + 1 === today.month() + 1;
      }
      return currentDate.getMonth() + 1 === today.month() + 1;
    })
    .map((employee, index) => ({
      ...employee,
      badgeColor: BADGE_COLORS[index % BADGE_COLORS.length],
      designationName: designationMap[employee.designationId] || "No Designation",
      profileImage: employee.profileImage ? `${process.env.BASE_URL}${employee.profileImage}` : null,
    }));
};

const buildTrackingList = (locationEmployees, todayLocations) => {
  const locationMap = {};
  todayLocations.forEach((item) => {
    if (!locationMap[item.employeeId]) {
      locationMap[item.employeeId] = item;
    }
  });

  return locationEmployees.map((employee) => {
    const location = locationMap[employee.id];
    return {
      employeeId: employee.id,
      employeeName: `${employee.empCode} ${employee.firstName} ${employee.lastName}`.trim(),
      status: location ? "live" : "offline",
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      lastUpdate: location?.tracked_at || null,
    };
  });
};

exports.getDashboardData = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const { tenantId, branchId } = context;
    const range = req.body?.range || "This Week";
    const section = req.body?.section || "employee";
    const baseData = await getDashboardBaseData(tenantId, branchId, range, section);
    const attendanceChart = buildAttendanceChart(baseData);
    const attendanceByDepartment = buildDepartmentAttendanceData(baseData);
    const trackingList = buildTrackingList(baseData.locationEmployees, baseData.todayLocations);

    const [employees, holidays, leaves] = await Promise.all([
      mapEmployees(baseData.recentEmployees, baseData.allDesignations),
      mapHolidays(baseData.recentHolidays, tenantId, branchId),
      mapLeaves(baseData.recentLeaves, baseData.leaveMasterList, tenantId, branchId),
    ]);

    const birthdays = mapCelebrations(baseData.birthdayEmployees, baseData.allDesignations, "dateOfBirth", baseData.today);
    const anniversaries = mapCelebrations(baseData.joiningEmployees, baseData.allDesignations, "joiningDate", baseData.today);
    const stats = buildDashboardStats(baseData, trackingList);

    const chartOptions = {
      series: [{ name: "Attendance %", data: attendanceByDepartment.map((item) => item.percentage) }],
      chart: { type: "bar", height: 320 },
      plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 6 } },
      dataLabels: { enabled: false },
      xaxis: { categories: attendanceByDepartment.map((item) => item.name), max: 100 },
      colors: attendanceByDepartment.map((item) => item.color),
    };

    return Helper.response(
      true,
      "Data Found Successfully",
      {
        stats,
        chartOptions,
        attendanceChart,
        attendanceByDepartment,
        employees,
        holidays,
        leaves,
        leaveMasterList: baseData.leaveMasterList,
        anniversaries,
        birthdays,
        trackingList,
      },
      res,
      200,
    );
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.getAttendanceChart = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const range = req.body?.range || "This Week";
    const baseData = await getDashboardBaseData(context.tenantId, context.branchId, range);
    return Helper.response(true, "Attendance chart data found successfully", buildAttendanceChart(baseData), res, 200);
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.getAttendanceByDepartment = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const range = req.body?.range || "This Week";
    const baseData = await getDashboardBaseData(context.tenantId, context.branchId, range);
    return Helper.response(true, "Attendance by department data found successfully", buildDepartmentAttendanceData(baseData), res, 200);
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.getTeamwiseAttendance = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const { tenantId, branchId } = context;
    const role = req.users?.role;
    const date = req.body?.date || moment().format("YYYY-MM-DD");
    const requestedBranchId = req.body?.branchId;

    const isMultiBranch =
      requestedBranchId === "All" ||
      (requestedBranchId == null && (role === "manager" || role === "director"));

    let branchIds;
    let branchMap = {};

    if (isMultiBranch) {
      const allBranches = await Branch.findAll({
        where: { tenantId, status: "active" },
        attributes: ["id", "name"],
        raw: true,
        order: [["name", "ASC"]],
      });
      branchIds = allBranches.map((b) => b.id);
      branchMap = Object.fromEntries(allBranches.map((b) => [b.id, b.name]));
    } else {
      branchIds = [requestedBranchId || branchId];
    }

    const [departments, employees, attendanceRows, todayLeaves] = await Promise.all([
      Department.findAll({
        where: { tenantId, branchId: { [Op.in]: branchIds }, status: "active" },
        attributes: ["id", "name", "branchId"],
        raw: true,
        order: [["name", "ASC"]],
      }),
      empPersonal.findAll({
        where: { tenantId, branchId: { [Op.in]: branchIds }, status: "active" },
        attributes: ["id", "firstName", "lastName", "empCode", "departmentId", "designationId", "profileImage", "gender", "branchId"],
        raw: true,
      }),
      attendance.findAll({
        where: { tenantId, branchId: { [Op.in]: branchIds }, date },
        attributes: ["employeeId", "check_in_time", "check_out_time", "is_present"],
        raw: true,
      }),
      leaveApplication.findAll({
        where: {
          tenantId,
          branchId: { [Op.in]: branchIds },
          fromDate: { [Op.lte]: date },
          toDate: { [Op.gte]: date },
          status: { [Op.in]: ["pending", "approved"] },
        },
        attributes: ["employeeId"],
        raw: true,
      }),
    ]);

    const designationIds = [...new Set(employees.map((e) => e.designationId).filter(Boolean))];
    const designations = designationIds.length
      ? await Designation.findAll({
          where: { id: designationIds },
          attributes: ["id", "name"],
          raw: true,
        })
      : [];

    const designationMap = Object.fromEntries(designations.map((d) => [d.id, d.name]));
    const attendanceMap = Object.fromEntries(attendanceRows.map((a) => [a.employeeId, a]));
    const onLeaveIds = new Set(todayLeaves.map((l) => l.employeeId));

    const teamData = departments.map((dept, index) => {
      const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
      const memberList = deptEmployees.map((emp) => {
        const att = attendanceMap[emp.id];
        let status = "Absent";
        if (onLeaveIds.has(emp.id)) {
          status = "On Leave";
        } else if (att?.is_present || att?.check_in_time) {
          status = "Present";
        }
        return {
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          empCode: emp.empCode || "N/A",
          designation: designationMap[emp.designationId] || "N/A",
          profileImage: emp.profileImage ? `${process.env.BASE_URL}${emp.profileImage}` : null,
          gender: emp.gender || "N/A",
          status,
          checkIn: att?.check_in_time ? String(att.check_in_time).split(" ").pop() : null,
          checkOut: att?.check_out_time ? String(att.check_out_time).split(" ").pop() : null,
        };
      });

      const presentCount = memberList.filter((m) => m.status === "Present").length;
      const onLeaveCount = memberList.filter((m) => m.status === "On Leave").length;
      const absentCount = memberList.filter((m) => m.status === "Absent").length;
      const total = memberList.length;

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        branchId: dept.branchId,
        branchName: isMultiBranch ? (branchMap[dept.branchId] || "Unknown Branch") : null,
        color: DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length],
        total,
        presentCount,
        onLeaveCount,
        absentCount,
        presentPercent: total ? Number(((presentCount / total) * 100).toFixed(0)) : 0,
        members: memberList,
      };
    });

    return Helper.response(true, "Team-wise attendance fetched successfully", { date, teamData, isMultiBranch }, res, 200);
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};

exports.todayAttendance = async (req, res) => {
  try {
    const context = getRequestContext(req);
    if (context.error) {
      return Helper.response(false, context.error, {}, res, context.statusCode);
    }

    const { tenantId, branchId } = context;
    const today = moment().format("YYYY-MM-DD");

    const todayAttendanceRows = await attendance.findAll({
      where: { tenantId, branchId, date: today },
      raw: true,
    });

    const totalEmployee = await empPersonal.count({
      where: { tenantId, branchId, status: "active" },
    });

    const totalPresentEmp = await attendance.count({
      where: {
        tenantId,
        branchId,
        date: today,
        check_in_time: { [Op.ne]: null },
      },
    });

    const cardData = {
      totalEmployee,
      totalPresentEmp,
      totalAbsentEmp: totalEmployee - totalPresentEmp,
      totalPerAbsentEmp: totalEmployee ? (((totalEmployee - totalPresentEmp) / totalEmployee) * 100).toFixed(0) : "0",
      totalPerPresentEmp: totalEmployee ? ((totalPresentEmp / totalEmployee) * 100).toFixed(0) : "0",
    };

    let tableData = [];
    if (todayAttendanceRows.length) {
      tableData = await Promise.all(
        todayAttendanceRows.map(async (item) => {
          const employee = await empPersonal.findOne({ where: { id: item.employeeId }, raw: true });
          const createdByEmployee = item.createdBy
            ? await empPersonal.findOne({ where: { id: item.createdBy }, raw: true })
            : null;

          return {
            tenantId: item.tenantId,
            employeeId: item.employeeId,
            employeeName: `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim(),
            empCode: employee?.empCode || null,
            check_in_time: item.check_in_time ? item.check_in_time.split(" ")[1] : null,
            check_out_time: item.check_out_time ? item.check_out_time.split(" ")[1] : null,
            month: item.month,
            year: item.year,
            createdAt: Helper.dateFormat(item.createdAt),
            createdBy: createdByEmployee ? `${createdByEmployee.firstName} ${createdByEmployee.lastName}` : null,
          };
        }),
      );
    }

    return Helper.response(true, "Data Found Successfully", { cardData, TableData: tableData }, res, 200);
  } catch (error) {
    return Helper.response(false, error?.message, {}, res, 500);
  }
};


