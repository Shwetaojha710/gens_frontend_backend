const express = require("express");
const router = express.Router();
const { Admin, AppAdmin } = require("../middleware/auth");
const hr = require("../controller/tenant/project");
const portal = require("../controller/tenant/projectPortal");

// ── HR / admin panel ──
router.post("/project/settings", Admin, hr.getSettings);
router.post("/project/settings/save", Admin, hr.saveSettings);
router.post("/project/client/list", Admin, hr.listClients);
router.post("/project/client/save", Admin, hr.saveClient);
router.post("/project/list", Admin, hr.listProjects);
router.post("/project/save", Admin, hr.saveProject);
router.post("/project/detail", Admin, hr.projectDetail);
router.post("/project/allocation/save", Admin, hr.saveAllocation);
router.post("/project/allocation/remove", Admin, hr.removeAllocation);
router.post("/project/task/save", Admin, hr.saveTask);
router.post("/project/task/delete", Admin, hr.deleteTask);
router.post("/project/timesheet/list", Admin, hr.listTimesheets);
router.post("/project/timesheet/detail", Admin, hr.timesheetDetail);
router.post("/project/timesheet/act", Admin, hr.actOnTimesheet);
router.post("/project/report/utilization", Admin, hr.utilizationReport);
router.post("/project/report/projects", Admin, hr.projectReport);
router.post("/project/report/clients", Admin, hr.clientReport);
router.post("/project/report/reconciliation", Admin, hr.reconciliationReport);

// ── Employee portal ──
router.post("/project/my/projects", AppAdmin, portal.myProjects);
router.post("/project/my/project-detail", AppAdmin, portal.projectDetail);
router.post("/project/my/task/save", AppAdmin, portal.saveTask);
router.post("/project/my/task/delete", AppAdmin, portal.deleteTask);
router.post("/project/my/allocation/save", AppAdmin, portal.saveAllocation);
router.post("/project/my/allocation/remove", AppAdmin, portal.removeAllocation);
router.post("/project/my/colleagues", AppAdmin, portal.colleagues);
router.post("/project/my/week", AppAdmin, portal.week);
router.post("/project/my/entry/save", AppAdmin, portal.saveEntry);
router.post("/project/my/entry/delete", AppAdmin, portal.deleteEntry);
router.post("/project/my/timer/start", AppAdmin, portal.startTimer);
router.post("/project/my/timer/stop", AppAdmin, portal.stopTimer);
router.post("/project/my/submit", AppAdmin, portal.submitWeek);
router.post("/project/my/approvals", AppAdmin, portal.approvals);
router.post("/project/my/timesheet-detail", AppAdmin, portal.timesheetDetail);
router.post("/project/my/act", AppAdmin, portal.act);

module.exports = router;
