/**
 * Performance management — employee portal endpoints (AppAdmin auth).
 * Access is by relationship to the review:
 *   self      — review.employeeId is the logged-in employee
 *   manager   — review.managerId (reporting person snapshot at launch)
 *   approver  — the skip-level manager the review is currently waiting on
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const empPersonal = require("../../models/empPersonal");
const Designation = require("../../models/designation");
const PmCycle = require("../../models/pm_cycle");
const PmReview = require("../../models/pm_review");
const PmGoal = require("../../models/pm_goal");
const PmFeedback = require("../../models/pm_feedback");
const Pm = require("../../helper/performance");
const { writeAudit } = require("../../helper/auditLog");

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

const handler = (name, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error instanceof Pm.PmValidationError) return fail(res, error.message);
    console.error(`performancePortal.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

/** Loads a review and works out how the logged-in employee relates to it. */
async function loadForViewer(req, reviewId) {
  if (!reviewId) return {};
  const me = req.users.id;
  const review = await PmReview.findOne({ where: { id: reviewId, tenantId: req.users.tenantId } });
  if (!review) return {};
  const cycle = await PmCycle.findByPk(review.cycleId, { raw: true });

  let viewer = null;
  if (review.employeeId === me) viewer = "self";
  else if (review.managerId === me) viewer = "manager";
  else {
    const approver = await Pm.currentApprover(review, cycle);
    if (approver?.approverId === me) viewer = "approver";
  }
  return viewer ? { review, cycle, viewer } : {};
}

function permissionsFor(viewer, review, cycle) {
  const open = cycle.status === "active";
  const s = review.status;
  const self = viewer === "self";
  const manager = viewer === "manager";
  return {
    viewer,
    canEditGoals: open && s === "goal_setting" && (manager || (self && !Pm.isPastDeadline(cycle.goalSettingDeadline))),
    canLockGoals: open && s === "goal_setting" && manager,
    canUpdateProgress:
      open &&
      ((self && ["goal_setting", "self_review"].includes(s)) ||
        (manager && ["goal_setting", "self_review", "manager_review"].includes(s))),
    canSelfAssess: open && self && s === "self_review" && !Pm.isPastDeadline(cycle.selfReviewDeadline),
    canManagerAssess:
      open && manager && s === "manager_review" && !Pm.isPastDeadline(cycle.managerReviewDeadline),
    canRequestFeedback: open && manager && s !== "approved",
    canApprove: open && viewer === "approver" && s === "in_approval",
  };
}

/** Employees may only change goals they created themselves; managers anything not set by HR. */
function canTouchGoal(viewer, goal) {
  if (!goal) return true;
  if (viewer === "manager") return goal.assignedByRole !== "hr";
  return goal.assignedByRole === "employee";
}

// ───────────────────────────── own reviews ─────────────────────────────

/** Manager-side fields an employee must not see before their review is approved. */
const HIDDEN_UNTIL_APPROVED = [
  "managerRating",
  "potentialRating",
  "finalRating",
  "performanceBand",
  "nineBox",
  "ratingLabel",
];

exports.myReviews = handler("myReviews", async (req, res) => {
  const rows = await Pm.historyRows(req.users.tenantId, req.users.id);
  const data = rows.map((r) =>
    r.status === "approved" ? r : { ...r, ...Object.fromEntries(HIDDEN_UNTIL_APPROVED.map((k) => [k, null])) },
  );
  return Helper.response(true, "Reviews fetched", data, res, 200);
});

exports.reviewDetail = handler("reviewDetail", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  const detail = await Pm.buildReviewDetail(review, { revealFeedbackNames: viewer !== "self" });
  detail.permissions = permissionsFor(viewer, review, cycle);
  // Hide the manager's private assessment from the employee until the review is approved.
  if (viewer === "self" && review.status !== "approved") {
    Object.assign(detail.review, Object.fromEntries(HIDDEN_UNTIL_APPROVED.map((k) => [k, null])), {
      managerComments: null,
    });
  }
  return Helper.response(true, "Review fetched", detail, res, 200);
});

exports.saveGoal = handler("saveGoal", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canEditGoals) return fail(res, "Goals can no longer be edited");

  const payload = req.body.goal || {};
  if (payload.id) {
    const goal = await PmGoal.findOne({ where: { id: payload.id, reviewId: review.id }, raw: true });
    if (!canTouchGoal(viewer, goal)) return fail(res, "You cannot edit a goal assigned by HR or your manager");
  }
  const goal = await Pm.saveGoal({ review, payload, actorId: req.users.id, actorRole: viewer === "manager" ? "manager" : "employee" });
  return Helper.response(true, "Goal saved", goal, res, 200);
});

exports.deleteGoal = handler("deleteGoal", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canEditGoals) return fail(res, "Goals can no longer be edited");
  const goal = await PmGoal.findOne({ where: { id: req.body.goalId, reviewId: review.id }, raw: true });
  if (!goal) return fail(res, "Goal not found");
  if (!canTouchGoal(viewer, goal)) return fail(res, "You cannot delete a goal assigned by HR or your manager");
  await Pm.deleteGoal(review, goal.id);
  return Helper.response(true, "Goal deleted", {}, res, 200);
});

exports.updateProgress = handler("updateProgress", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canUpdateProgress) return fail(res, "Progress can no longer be updated");
  await Pm.updateGoalProgress({
    review,
    goalId: req.body.goalId,
    updates: req.body,
    commentField: viewer === "manager" ? "managerComment" : "selfComment",
    actorId: req.users.id,
  });
  return Helper.response(true, "Progress updated", {}, res, 200);
});

exports.submitSelfReview = handler("submitSelfReview", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canSelfAssess) {
    return fail(res, Pm.isPastDeadline(cycle.selfReviewDeadline) ? "Self review deadline has passed" : "Self review is not open");
  }
  const rating = Pm.num(req.body.selfRating);
  if (rating === null || rating < 1 || rating > 5) return fail(res, "Self rating must be between 1 and 5");
  if (!String(req.body.selfComments || "").trim()) return fail(res, "Add comments to your self review");

  await review.update({
    selfRating: rating,
    selfComments: req.body.selfComments,
    selfSubmittedAt: new Date(),
    status: "manager_review",
  });
  return Helper.response(true, "Self review submitted", {}, res, 200);
});

// ───────────────────────────── manager actions ─────────────────────────────

exports.lockGoals = handler("lockGoals", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canLockGoals) return fail(res, "Only the reporting manager can lock goals");
  const result = await Pm.lockGoals([review]);
  if (result.skipped.length) return fail(res, result.skipped[0].reason);
  return Helper.response(true, "Goals locked; self review is open", {}, res, 200);
});

exports.submitManagerReview = handler("submitManagerReview", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canManagerAssess) {
    return fail(res, Pm.isPastDeadline(cycle.managerReviewDeadline) ? "Manager review deadline has passed" : "Manager review is not open");
  }
  await Pm.submitManagerReview({ review, cycle, payload: req.body });
  await writeAudit({
    req,
    actionType: "PERFORMANCE_MANAGER_REVIEW",
    referenceId: review.id,
    employeeId: review.employeeId,
    newValue: { managerRating: req.body.managerRating, potentialRating: req.body.potentialRating },
  });
  return Helper.response(true, "Manager review submitted", {}, res, 200);
});

exports.requestFeedback = handler("requestFeedback", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canRequestFeedback) return fail(res, "Only the reporting manager can request feedback");
  const added = await Pm.requestFeedback({ review, reviewers: req.body.reviewers, requestedBy: req.users.id });
  return Helper.response(true, `${added} feedback request(s) sent`, { added }, res, 200);
});

/** Direct reports' reviews + team summary. Defaults to active cycles. */
exports.teamReviews = handler("teamReviews", async (req, res) => {
  const where = { tenantId: req.users.tenantId, managerId: req.users.id };
  if (req.body?.cycleId) {
    where.cycleId = req.body.cycleId;
  } else {
    const active = await PmCycle.findAll({ where: { tenantId: req.users.tenantId, status: "active" }, attributes: ["id"], raw: true });
    where.cycleId = { [Op.in]: active.map((c) => c.id) };
  }
  const rows = await Pm.reviewRows(where);
  return Helper.response(true, "Team reviews fetched", { rows, summary: Pm.summarizeRows(rows) }, res, 200);
});

/** Reviews waiting on the logged-in employee as skip-level approver. */
exports.pendingApprovals = handler("pendingApprovals", async (req, res) => {
  const reports = await empPersonal.findAll({
    where: { tenantId: req.users.tenantId, reportingPersonId: req.users.id },
    attributes: ["id"],
    raw: true,
  });
  if (!reports.length) return Helper.response(true, "No approvals", [], res, 200);

  const candidates = await PmReview.findAll({
    where: { tenantId: req.users.tenantId, status: "in_approval", managerId: { [Op.in]: reports.map((r) => r.id) } },
  });
  const mine = [];
  for (const review of candidates) {
    const cycle = await PmCycle.findByPk(review.cycleId, { raw: true });
    if (cycle.status !== "active") continue;
    const approver = await Pm.currentApprover(review, cycle);
    if (approver?.approverId === req.users.id) mine.push(review.id);
  }
  const rows = mine.length ? await Pm.reviewRows({ id: { [Op.in]: mine } }) : [];
  return Helper.response(true, "Approvals fetched", rows, res, 200);
});

exports.approveReview = handler("approveReview", async (req, res) => {
  const { review, cycle, viewer } = await loadForViewer(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  if (!permissionsFor(viewer, review, cycle).canApprove) return fail(res, "This review is not waiting on you");
  await Pm.actOnApproval({
    review,
    cycle,
    action: req.body.action,
    comments: req.body.comments,
    approverId: req.users.id,
    approverName: req.users.name,
  });
  await writeAudit({
    req,
    actionType: "PERFORMANCE_REVIEW_APPROVAL",
    referenceId: review.id,
    employeeId: review.employeeId,
    newValue: { action: req.body.action, level: review.currentApprovalLevel },
    remarks: req.body.comments || null,
  });
  return Helper.response(true, `Review ${req.body.action}`, {}, res, 200);
});

// ───────────────────────────── 360 feedback ─────────────────────────────

/** Feedback the logged-in employee has been asked to give. */
exports.myFeedbackTasks = handler("myFeedbackTasks", async (req, res) => {
  const tasks = await PmFeedback.findAll({
    where: { tenantId: req.users.tenantId, reviewerId: req.users.id },
    order: [["createdAt", "DESC"]],
    raw: true,
  });
  if (!tasks.length) return Helper.response(true, "No feedback requests", [], res, 200);

  const cycles = await PmCycle.findAll({ where: { id: { [Op.in]: [...new Set(tasks.map((t) => t.cycleId))] } }, raw: true });
  const cycleById = Object.fromEntries(cycles.map((c) => [c.id, c]));
  const people = await Pm.employeeMap(req.users.tenantId, tasks.map((t) => t.revieweeId));

  const data = tasks
    .filter((t) => t.status === "submitted" || cycleById[t.cycleId]?.status === "active")
    .map((t) => {
      const cycle = cycleById[t.cycleId];
      return {
        ...t,
        revieweeName: people[t.revieweeId]?.name || "",
        revieweeCode: people[t.revieweeId]?.empCode || "",
        cycleName: cycle?.name || "",
        deadline: cycle?.feedbackDeadline || null,
        overdue: t.status === "pending" && Pm.isPastDeadline(cycle?.feedbackDeadline),
        competencies: Pm.competenciesOf(cycle),
      };
    });
  return Helper.response(true, "Feedback requests fetched", data, res, 200);
});

exports.submitFeedback = handler("submitFeedback", async (req, res) => {
  const feedback = await PmFeedback.findOne({
    where: { id: req.body?.feedbackId, tenantId: req.users.tenantId, reviewerId: req.users.id },
  });
  if (!feedback) return fail(res, "Feedback request not found");
  if (feedback.status === "submitted") return fail(res, "Feedback already submitted");
  const cycle = await PmCycle.findByPk(feedback.cycleId, { raw: true });
  if (cycle.status !== "active") return fail(res, "Cycle is not active");
  if (Pm.isPastDeadline(cycle.feedbackDeadline)) return fail(res, "Feedback deadline has passed");
  const review = await PmReview.findByPk(feedback.reviewId, { attributes: ["status"], raw: true });
  if (review?.status === "approved") return fail(res, "Review is already approved");

  await Pm.submitFeedback({ feedback, cycle, payload: req.body });
  return Helper.response(true, "Feedback submitted", {}, res, 200);
});

/** Active colleagues for 360 reviewer nomination. */
exports.colleagues = handler("colleagues", async (req, res) => {
  const rows = await empPersonal.findAll({
    where: { tenantId: req.users.tenantId, status: "active", id: { [Op.ne]: req.users.id } },
    attributes: ["id", "firstName", "lastName", "empCode", "designationId"],
    order: [["firstName", "ASC"]],
    raw: true,
  });
  const designations = await Designation.findAll({ where: { tenantId: req.users.tenantId }, attributes: ["id", "name"], raw: true });
  const desigById = Object.fromEntries(designations.map((d) => [d.id, d.name]));
  const data = rows.map((r) => ({
    value: r.id,
    label: `${[r.firstName, r.lastName].filter(Boolean).join(" ")}${r.empCode ? ` (${r.empCode})` : ""}`,
    designation: desigById[r.designationId] || "",
  }));
  return Helper.response(true, "Colleagues fetched", data, res, 200);
});
