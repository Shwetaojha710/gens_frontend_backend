const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const leaveApplication = require("../../models/leave_application.js");
const leaveMaster = require("../../models/leaveMaster.js");
const notification_reads = require("../../models/notification_reads");
const { Op } = require("sequelize");
const moment = require("moment");

const LEAVE_LINK = "/layout/employee/apply-leave";
const DASHBOARD_LINK = "/layout/dashboard";

const formatRelativeTime = (value) => {
  if (!value) return "";
  const m = moment(value);
  return m.isValid() ? m.fromNow() : "";
};

const fullName = (emp) =>
  `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Employee";

const isSameMonthDay = (dateValue, ref) => {
  const d = moment(dateValue);
  if (!d.isValid()) return false;
  return d.month() === ref.month() && d.date() === ref.date();
};

const daysUntilNextOccurrence = (dateValue, today) => {
  const d = moment(dateValue);
  if (!d.isValid()) return null;
  let next = moment({
    year: today.year(),
    month: d.month(),
    date: d.date(),
  }).startOf("day");
  if (next.isBefore(today, "day")) next = next.add(1, "year");
  return next.diff(today, "days");
};

const yearsCompleted = (joiningDate, today) => {
  const join = moment(joiningDate);
  if (!join.isValid()) return 0;
  let years = today.year() - join.year();
  const anniversaryThisYear = moment({
    year: today.year(),
    month: join.month(),
    date: join.date(),
  });
  if (anniversaryThisYear.isAfter(today, "day")) years -= 1;
  return Math.max(years, 0);
};

const normalizeSnap = (v) =>
  String(v || "")
    .split(",")[0]
    .trim();

const readKey = (refType, refId, status, snap) =>
  `${refType}|${refId}|${String(status || "").toLowerCase()}|${normalizeSnap(snap)}`;

const buildNotificationFeed = async ({ tenantId, branchId, userId }) => {
  const today = moment().startOf("day");
  const upcomingDays = 7;
  const items = [];

  // ── Pending leave applications ─────────────────────────────────────────
  const pendingLeaves = await leaveApplication.findAll({
    where: {
      tenantId,
      branchId,
      status: { [Op.in]: ["pending", "recommended"] },
    },
    order: [["createdAt", "DESC"]],
    limit: 50,
    raw: true,
  });

  if (pendingLeaves.length) {
    const empIds = [...new Set(pendingLeaves.map((l) => l.employeeId).filter(Boolean))];
    const typeIds = [...new Set(pendingLeaves.map((l) => l.leaveTypeId).filter(Boolean))];

    const [employees, leaveTypes] = await Promise.all([
      empPersonal.findAll({
        where: { id: { [Op.in]: empIds }, tenantId },
        attributes: ["id", "firstName", "lastName", "empCode"],
        raw: true,
      }),
      leaveMaster.findAll({
        where: { id: { [Op.in]: typeIds } },
        attributes: ["id", "leaveName", "leaveCode"],
        raw: true,
      }),
    ]);

    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));
    const typeMap = Object.fromEntries(leaveTypes.map((t) => [t.id, t]));

    for (const leave of pendingLeaves) {
      const emp = empMap[leave.employeeId];
      const type = typeMap[leave.leaveTypeId];
      const leaveLabel = type?.leaveName || type?.leaveCode || "Leave";
      const from = leave.fromDate ? moment(leave.fromDate).format("DD MMM") : "";
      const to = leave.toDate ? moment(leave.toDate).format("DD MMM") : "";
      const range = from && to && from !== to ? `${from} – ${to}` : from || to || "";
      const daysPart =
        leave.days != null
          ? ` (${leave.days} day${Number(leave.days) === 1 ? "" : "s"})`
          : "";
      const status = String(leave.status || "pending").toLowerCase();
      const snap = normalizeSnap(leave.updatedAt || leave.createdAt || "");

      items.push({
        id: `leave-${leave.id}`,
        type: "leave",
        refType: "leave",
        refId: leave.id,
        status,
        updatedAtSnapshot: snap,
        title: status === "recommended" ? "Leave recommended" : "Leave request",
        message: `${fullName(emp)} applied for ${leaveLabel}${daysPart}${range ? ` · ${range}` : ""}`,
        time: formatRelativeTime(leave.createdAt || leave.appliedOn),
        icon: "ri-calendar-event-line",
        link: LEAVE_LINK,
        createdAt: leave.createdAt || leave.appliedOn,
        sortPriority: 0,
      });
    }
  }

  // ── Birthdays & work anniversaries (today + next 7 days) ───────────────
  const [birthdayEmployees, joiningEmployees] = await Promise.all([
    empPersonal.findAll({
      where: {
        tenantId,
        branchId,
        status: "active",
        dateOfBirth: { [Op.ne]: null },
      },
      attributes: ["id", "firstName", "lastName", "empCode", "dateOfBirth", "profileImage"],
      raw: true,
    }),
    empPersonal.findAll({
      where: {
        tenantId,
        branchId,
        status: "active",
        joiningDate: { [Op.ne]: null },
      },
      attributes: ["id", "firstName", "lastName", "empCode", "joiningDate", "profileImage"],
      raw: true,
    }),
  ]);

  for (const emp of birthdayEmployees) {
    const daysUntil = daysUntilNextOccurrence(emp.dateOfBirth, today);
    if (daysUntil == null || daysUntil > upcomingDays) continue;

    const isToday = daysUntil === 0 || isSameMonthDay(emp.dateOfBirth, today);
    const yearKey = today.format("YYYY");
    const snap = today.clone().add(daysUntil, "days").format("YYYY-MM-DD");

    items.push({
      id: `birthday-${emp.id}-${yearKey}`,
      type: "birthday",
      refType: "birthday",
      refId: emp.id,
      status: yearKey,
      updatedAtSnapshot: snap,
      title: isToday ? "Birthday today" : "Upcoming birthday",
      message: isToday
        ? `${fullName(emp)}'s birthday today`
        : `${fullName(emp)}'s birthday in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      time: isToday ? "Today" : `In ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      icon: "ri-cake-2-line",
      link: DASHBOARD_LINK,
      createdAt: today.clone().add(daysUntil, "days").toISOString(),
      sortPriority: isToday ? 1 : 2,
    });
  }

  for (const emp of joiningEmployees) {
    const daysUntil = daysUntilNextOccurrence(emp.joiningDate, today);
    if (daysUntil == null || daysUntil > upcomingDays) continue;

    const years = yearsCompleted(emp.joiningDate, today.clone().add(daysUntil, "days"));
    if (years < 1) continue;

    const isToday = daysUntil === 0 || isSameMonthDay(emp.joiningDate, today);
    const yearKey = today.format("YYYY");
    const snap = today.clone().add(daysUntil, "days").format("YYYY-MM-DD");

    items.push({
      id: `anniversary-${emp.id}-${yearKey}`,
      type: "anniversary",
      refType: "anniversary",
      refId: emp.id,
      status: yearKey,
      updatedAtSnapshot: snap,
      title: isToday ? "Work anniversary" : "Upcoming work anniversary",
      message: isToday
        ? `${fullName(emp)} — ${years} year${years === 1 ? "" : "s"} today`
        : `${fullName(emp)} — ${years} year${years === 1 ? "" : "s"} in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      time: isToday ? "Today" : `In ${daysUntil} day${daysUntil === 1 ? "" : "s"}`,
      icon: "ri-medal-line",
      link: DASHBOARD_LINK,
      createdAt: today.clone().add(daysUntil, "days").toISOString(),
      sortPriority: isToday ? 1 : 2,
    });
  }

  // Mark read/unread for current user
  const reads = await notification_reads.findAll({
    where: { userId, tenantId },
    attributes: ["refType", "refId", "status", "updatedAtSnapshot"],
    raw: true,
  });
  const readSet = new Set(
    reads.map((r) => readKey(r.refType, r.refId, r.status, r.updatedAtSnapshot)),
  );

  for (const item of items) {
    item.read = readSet.has(
      readKey(item.refType, item.refId, item.status, item.updatedAtSnapshot),
    );
  }

  items.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    const pa = a.sortPriority ?? 1;
    const pb = b.sortPriority ?? 1;
    if (pa !== pb) return pa - pb;
    return moment(b.createdAt || 0).valueOf() - moment(a.createdAt || 0).valueOf();
  });

  const cleaned = items.map(({ sortPriority, createdAt, ...rest }) => rest);
  const unreadCount = cleaned.filter((n) => !n.read).length;

  return { items: cleaned, count: unreadCount, total: cleaned.length };
};

/**
 * Header bell feed: pending leaves, birthdays & work anniversaries (+ read state).
 */
exports.getHeaderNotifications = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const userId = req.users?.id;

    if (!tenantId || !userId) {
      return Helper.response(false, "TenantId / User is required", {}, res, 400);
    }
    if (!branchId || branchId === "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const feed = await buildNotificationFeed({ tenantId, branchId, userId });
    const limit = Number(req.body?.limit) > 0 ? Number(req.body.limit) : null;
    const unreadOnly = req.body?.unreadOnly === true;
    let items = feed.items;
    if (unreadOnly) items = items.filter((n) => !n.read);
    if (limit) items = items.slice(0, limit);

    return Helper.response(
      true,
      "Notifications fetched successfully",
      {
        count: feed.count,
        total: feed.total,
        items,
      },
      res,
      200,
    );
  } catch (error) {
    console.error("header-notifications error:", error);
    return Helper.response(false, error?.message || "Internal server error", {}, res, 500);
  }
};

/**
 * Mark one or more header notifications as read.
 * Body: { items: [{ refType, refId, status, updatedAtSnapshot }], markAll?: boolean }
 */
exports.markHeaderNotificationsRead = async (req, res) => {
  try {
    const userId = req.users?.id;
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    if (!userId || !tenantId) {
      return Helper.response(false, "User Not Found", {}, res, 404);
    }
    if (!branchId || branchId === "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    let items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (req.body?.markAll === true) {
      const feed = await buildNotificationFeed({ tenantId, branchId, userId });
      items = feed.items
        .filter((n) => !n.read)
        .map((n) => ({
          refType: n.refType,
          refId: n.refId,
          status: n.status,
          updatedAtSnapshot: n.updatedAtSnapshot,
        }));
    }

    if (!items.length) {
      return Helper.response(true, "Nothing to mark", { marked: 0 }, res, 200);
    }

    let marked = 0;
    for (const it of items) {
      if (!it?.refType || !it?.refId) continue;
      const status = String(it.status || "").toLowerCase();
      const snap = normalizeSnap(it.updatedAtSnapshot || it.updatedAt || "");

      const existing = await notification_reads.findOne({
        where: {
          userId,
          tenantId,
          refType: it.refType,
          refId: it.refId,
          status,
          updatedAtSnapshot: snap,
        },
      });

      if (!existing) {
        await notification_reads.create({
          userId,
          tenantId,
          branchId,
          refType: it.refType,
          refId: it.refId,
          status,
          updatedAtSnapshot: snap,
          readAt: new Date(),
        });
        marked += 1;
      }
    }

    return Helper.response(true, "Marked as read", { marked }, res, 200);
  } catch (error) {
    console.error("mark-header-notifications-read error:", error);
    return Helper.response(false, error?.message || "Internal server error", {}, res, 500);
  }
};

/**
 * Send FCM push to reporting manager when someone applies for leave.
 */
exports.notifyManagerOnLeaveApply = async ({ employeeId, tenantId, branchId, leaveLabel, days }) => {
  try {
    if (!employeeId || !tenantId) return;

    const employee = await empPersonal.findOne({
      where: { id: employeeId, tenantId },
      attributes: ["id", "firstName", "lastName", "reportingPersonId", "empCode"],
      raw: true,
    });
    if (!employee?.reportingPersonId) return;

    const manager = await empPersonal.findOne({
      where: { id: employee.reportingPersonId, tenantId },
      attributes: ["id", "firstName", "deviceToken"],
      raw: true,
    });
    if (!manager?.deviceToken) return;

    const name = fullName(employee);
    const daysPart = days != null ? ` (${days} day${Number(days) === 1 ? "" : "s"})` : "";
    await Helper.sendNotification(
      manager.deviceToken,
      "New leave request",
      `${name} applied for ${leaveLabel || "leave"}${daysPart}`,
    );
  } catch (err) {
    console.error("notifyManagerOnLeaveApply error:", err?.message || err);
  }
};
