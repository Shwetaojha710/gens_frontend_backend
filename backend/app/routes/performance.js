const express = require("express");
const router = express.Router();
const { Admin, AppAdmin } = require("../middleware/auth");
const hr = require("../controller/tenant/performance");
const portal = require("../controller/tenant/performancePortal");

// ── HR / admin panel ──
router.post("/performance/cycle/list", Admin, hr.listCycles);
router.post("/performance/cycle/save", Admin, hr.saveCycle);
router.post("/performance/cycle/delete", Admin, hr.deleteCycle);
router.post("/performance/cycle/launch", Admin, hr.launchCycle);
router.post("/performance/cycle/close", Admin, hr.closeCycle);
router.post("/performance/review/list", Admin, hr.listReviews);
router.post("/performance/review/detail", Admin, hr.reviewDetail);
router.post("/performance/review/lock-goals", Admin, hr.lockGoals);
router.post("/performance/review/skip-self", Admin, hr.skipSelfReview);
router.post("/performance/review/approve", Admin, hr.approveReview);
router.post("/performance/goal/save", Admin, hr.saveGoal);
router.post("/performance/goal/delete", Admin, hr.deleteGoal);
router.post("/performance/goal/progress", Admin, hr.updateProgress);
router.post("/performance/goal/bulk-assign", Admin, hr.bulkAssignGoal);
router.post("/performance/feedback/request", Admin, hr.requestFeedback);
router.post("/performance/feedback/remove", Admin, hr.removeFeedback);
router.post("/performance/dashboard", Admin, hr.dashboard);
router.post("/performance/report", Admin, hr.report);
router.post("/performance/history", Admin, hr.employeeHistory);

// ── Employee portal (employee / manager / skip-level approver) ──
router.post("/performance/my/reviews", AppAdmin, portal.myReviews);
router.post("/performance/my/review-detail", AppAdmin, portal.reviewDetail);
router.post("/performance/my/goal/save", AppAdmin, portal.saveGoal);
router.post("/performance/my/goal/delete", AppAdmin, portal.deleteGoal);
router.post("/performance/my/goal/progress", AppAdmin, portal.updateProgress);
router.post("/performance/my/self-review", AppAdmin, portal.submitSelfReview);
router.post("/performance/my/lock-goals", AppAdmin, portal.lockGoals);
router.post("/performance/my/manager-review", AppAdmin, portal.submitManagerReview);
router.post("/performance/my/feedback/request", AppAdmin, portal.requestFeedback);
router.post("/performance/my/feedback/tasks", AppAdmin, portal.myFeedbackTasks);
router.post("/performance/my/feedback/submit", AppAdmin, portal.submitFeedback);
router.post("/performance/my/team", AppAdmin, portal.teamReviews);
router.post("/performance/my/approvals", AppAdmin, portal.pendingApprovals);
router.post("/performance/my/approve", AppAdmin, portal.approveReview);
router.post("/performance/my/colleagues", AppAdmin, portal.colleagues);

module.exports = router;
