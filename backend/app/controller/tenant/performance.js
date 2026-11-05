/**
 * Performance management — HR / admin endpoints (Admin auth).
 * Employee and manager actions live in performancePortal.js.
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const sequelize = require("../../connection/connection");
const empPersonal = require("../../models/empPersonal");
const PmCycle = require("../../models/pm_cycle");
const PmReview = require("../../models/pm_review");
const PmFeedback = require("../../models/pm_feedback");
const Pm = require("../../helper/performance");
const { writeAudit } = require("../../helper/auditLog");

const HR_ROLES = ["admin", "hr", "superadmin"];

const isHr = (req) => HR_ROLES.includes(req.users?.role);

/** Branch from header/body; null when "All" or not set. */
function branchOf(req) {
  const b = req.body?.branchId || req.users?.branchId;
  return b && b !== "null" && b !== "All" && b !== "undefined" ? b : null;
}

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

async function loadCycle(req, cycleId) {
  if (!cycleId) return null;
  return PmCycle.findOne({ where: { id: cycleId, tenantId: req.users.tenantId } });
}

async function loadReview(req, reviewId) {
  if (!reviewId) return {};
  const review = await PmReview.findOne({ where: { id: reviewId, tenantId: req.users.tenantId } });
  if (!review) return {};
  const cycle = await PmCycle.findByPk(review.cycleId, { raw: true });
  return { review, cycle };
}

/** Wraps a handler with the HR role check and uniform error handling. */
const hr = (name, fn) => async (req, res) => {
  try {
    if (!isHr(req)) return fail(res, "Only HR or admin can perform this action");
    return await fn(req, res);
  } catch (error) {
    if (error instanceof Pm.PmValidationError) return fail(res, error.message);
    console.error(`performance.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

// ───────────────────────────── cycles ─────────────────────────────

exports.listCycles = hr("listCycles", async (req, res) => {
  const branchId = branchOf(req);
  const where = { tenantId: req.users.tenantId };
  if (branchId) where[Op.or] = [{ branchId: null }, { branchId }];

  const cycles = await PmCycle.findAll({ where, order: [["startDate", "DESC"]], raw: true });
  const counts = cycles.length
    ? await PmReview.findAll({
        where: { cycleId: { [Op.in]: cycles.map((c) => c.id) } },
        attributes: [
          "cycleId",
          [sequelize.fn("COUNT", sequelize.col("id")), "total"],
          [sequelize.literal(`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`), "approved"],
        ],
        group: ["cycleId"],
        raw: true,
      })
    : [];
  const byCycle = Object.fromEntries(counts.map((c) => [c.cycleId, c]));

  const data = cycles.map((c) => ({
    ...c,
    competencies: Pm.competenciesOf(c),
    approvalLevels: Pm.approvalLevelsOf(c),
    totalReviews: Number(byCycle[c.id]?.total || 0),
    approvedReviews: Number(byCycle[c.id]?.approved || 0),
  }));
  return Helper.response(true, "Cycles fetched", data, res, 200);
});

exports.saveCycle = hr("saveCycle", async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  if (!name) return fail(res, "Cycle name is required");
  if (!b.startDate || !b.endDate) return fail(res, "Start and end dates are required");
  if (b.startDate > b.endDate) return fail(res, "End date must be after start date");

  const deadlines = ["goalSettingDeadline", "selfReviewDeadline", "feedbackDeadline", "managerReviewDeadline"];
  for (const key of deadlines) {
    if (b[key] && b[key] < b.startDate) return fail(res, "Deadlines cannot be before the cycle start date");
  }

  const weights = ["weightGoals", "weightManager", "weightFeedback"].map((k) => Number(b[k] ?? 0));
  if (weights.some((w) => w < 0 || !Number.isFinite(w))) return fail(res, "Weights must be positive numbers");
  if (weights.reduce((s, w) => s + w, 0) !== 100) return fail(res, "Score weights must add up to 100%");

  const approvalLevels = (Array.isArray(b.approvalLevels) ? b.approvalLevels : []).filter((l) =>
    Pm.APPROVAL_LEVEL_TYPES.includes(l),
  );
  if (!approvalLevels.length) return fail(res, "Add at least one approval level");

  const competencies = (Array.isArray(b.competencies) ? b.competencies : [])
    .map((c) => String(c || "").trim())
    .filter(Boolean);

  const fields = {
    name,
    cycleType: ["quarterly", "half_yearly", "annual", "custom"].includes(b.cycleType) ? b.cycleType : "custom",
    startDate: b.startDate,
    endDate: b.endDate,
    goalSettingDeadline: b.goalSettingDeadline || null,
    selfReviewDeadline: b.selfReviewDeadline || null,
    feedbackDeadline: b.feedbackDeadline || null,
    managerReviewDeadline: b.managerReviewDeadline || null,
    weightGoals: weights[0],
    weightManager: weights[1],
    weightFeedback: weights[2],
    competencies: competencies.length ? competencies : Pm.DEFAULT_COMPETENCIES,
    approvalLevels,
    departmentIds: Array.isArray(b.departmentIds) && b.departmentIds.length ? b.departmentIds : null,
    branchId: b.allBranches ? null : branchOf(req),
    updatedBy: req.users.id,
  };

  if (b.id) {
    const cycle = await loadCycle(req, b.id);
    if (!cycle) return fail(res, "Cycle not found");
    if (cycle.status === "closed") return fail(res, "A closed cycle cannot be edited");
    // Once launched only the name and deadlines may change; scores depend on the rest.
    const editable =
      cycle.status === "active"
        ? {
            name: fields.name,
            endDate: fields.endDate,
            goalSettingDeadline: fields.goalSettingDeadline,
            selfReviewDeadline: fields.selfReviewDeadline,
            feedbackDeadline: fields.feedbackDeadline,
            managerReviewDeadline: fields.managerReviewDeadline,
            updatedBy: req.users.id,
          }
        : fields;
    await cycle.update(editable);
    return Helper.response(true, "Cycle updated", cycle, res, 200);
  }

  const cycle = await PmCycle.create({
    ...fields,
    tenantId: req.users.tenantId,
    status: "draft",
    createdBy: req.users.id,
  });
  return Helper.response(true, "Cycle created", cycle, res, 200);
});

exports.deleteCycle = hr("deleteCycle", async (req, res) => {
  const cycle = await loadCycle(req, req.body?.cycleId);
  if (!cycle) return fail(res, "Cycle not found");
  if (cycle.status !== "draft") return fail(res, "Only draft cycles can be deleted");
  await cycle.destroy();
  return Helper.response(true, "Cycle deleted", {}, res, 200);
});

/**
 * Create a review for every active employee in scope that doesn't have one yet.
 * Safe to run again on an active cycle to add new joiners.
 */
exports.launchCycle = hr("launchCycle", async (req, res) => {
  const cycle = await loadCycle(req, req.body?.cycleId);
  if (!cycle) return fail(res, "Cycle not found");
  if (cycle.status === "closed") return fail(res, "Cycle is closed");

  const where = { tenantId: cycle.tenantId, status: "active" };
  if (cycle.branchId) where.branchId = cycle.branchId;
  if (Array.isArray(cycle.departmentIds) && cycle.departmentIds.length) {
    where.departmentId = { [Op.in]: cycle.departmentIds };
  }
  const employees = await empPersonal.findAll({
    where,
    attributes: ["id", "branchId", "departmentId", "designationId", "reportingPersonId"],
    raw: true,
  });
  if (!employees.length) return fail(res, "No active employees match this cycle's scope");

  const existing = await PmReview.findAll({ where: { cycleId: cycle.id }, attributes: ["employeeId"], raw: true });
  const have = new Set(existing.map((e) => e.employeeId));
  const rows = employees
    .filter((e) => !have.has(e.id))
    .map((e) => ({
      tenantId: cycle.tenantId,
      branchId: e.branchId,
      cycleId: cycle.id,
      employeeId: e.id,
      managerId: e.reportingPersonId,
      departmentId: e.departmentId,
      designationId: e.designationId,
      status: "goal_setting",
    }));

  await sequelize.transaction(async (t) => {
    if (rows.length) await PmReview.bulkCreate(rows, { transaction: t });
    if (cycle.status === "draft") {
      await cycle.update({ status: "active", launchedAt: new Date(), updatedBy: req.users.id }, { transaction: t });
    }
  });
  await writeAudit({
    req,
    actionType: "PERFORMANCE_CYCLE_LAUNCH",
    referenceId: cycle.id,
    newValue: { added: rows.length },
    remarks: `Launched performance cycle "${cycle.name}"`,
  });
  return Helper.response(true, `${rows.length} employee review(s) created`, { added: rows.length }, res, 200);
});

exports.closeCycle = hr("closeCycle", async (req, res) => {
  const cycle = await loadCycle(req, req.body?.cycleId);
  if (!cycle) return fail(res, "Cycle not found");
  if (cycle.status !== "active") return fail(res, "Only an active cycle can be closed");
  await cycle.update({ status: "closed", updatedBy: req.users.id });
  await writeAudit({
    req,
    actionType: "PERFORMANCE_CYCLE_CLOSE",
    referenceId: cycle.id,
    remarks: `Closed performance cycle "${cycle.name}"`,
  });
  return Helper.response(true, "Cycle closed", {}, res, 200);
});

// ───────────────────────────── reviews ─────────────────────────────

exports.listReviews = hr("listReviews", async (req, res) => {
  const { cycleId, departmentId, status } = req.body || {};
  const cycle = await loadCycle(req, cycleId);
  if (!cycle) return fail(res, "Cycle not found");
  const where = { cycleId };
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;

  const rows = await Pm.reviewRows(where);
  const levels = Pm.approvalLevelsOf(cycle);
  const reviews = await PmReview.findAll({
    where: { id: { [Op.in]: rows.map((r) => r.reviewId) } },
    attributes: ["id", "currentApprovalLevel"],
    raw: true,
  });
  const levelById = Object.fromEntries(reviews.map((r) => [r.id, r.currentApprovalLevel]));
  const data = rows.map((r) => ({
    ...r,
    pendingWith: r.status === "in_approval" ? levels[levelById[r.reviewId]] || null : null,
  }));
  return Helper.response(true, "Reviews fetched", data, res, 200);
});

exports.reviewDetail = hr("reviewDetail", async (req, res) => {
  const { review, cycle } = await loadReview(req, req.body?.reviewId);
  if (!review) return fail(res, "Review not found");
  const detail = await Pm.buildReviewDetail(review, { revealFeedbackNames: true });
  const open = cycle.status === "active";
  detail.permissions = {
    viewer: "hr",
    canEditGoals: open && review.status === "goal_setting",
    canLockGoals: open && review.status === "goal_setting",
    canUpdateProgress: open && ["goal_setting", "self_review", "manager_review"].includes(review.status),
    canSelfAssess: false,
    canManagerAssess: false,
    canRequestFeedback: open && review.status !== "approved",
    canApprove: open && review.status === "in_approval",
    canSkipSelfReview: open && review.status === "self_review",
  };
  return Helper.response(true, "Review fetched", detail, res, 200);
});

/** Shared guard for HR mutations on a single review. */
async function editableReview(req, res, statuses) {
  const { review, cycle } = await loadReview(req, req.body?.reviewId);
  if (!review) return { error: fail(res, "Review not found") };
  if (cycle.status !== "active") return { error: fail(res, "Cycle is not active") };
  if (statuses && !statuses.includes(review.status)) {
    return { error: fail(res, `Not allowed while review is in "${Pm.STATUS_LABELS[review.status]}"`) };
  }
  return { review, cycle };
}

exports.saveGoal = hr("saveGoal", async (req, res) => {
  const { review, error } = await editableReview(req, res, ["goal_setting"]);
  if (error) return error;
  const goal = await Pm.saveGoal({ review, payload: req.body.goal || {}, actorId: req.users.id, actorRole: "hr" });
  return Helper.response(true, "Goal saved", goal, res, 200);
});

exports.deleteGoal = hr("deleteGoal", async (req, res) => {
  const { review, error } = await editableReview(req, res, ["goal_setting"]);
  if (error) return error;
  await Pm.deleteGoal(review, req.body.goalId);
  return Helper.response(true, "Goal deleted", {}, res, 200);
});

exports.updateProgress = hr("updateProgress", async (req, res) => {
  const { review, error } = await editableReview(req, res, ["goal_setting", "self_review", "manager_review"]);
  if (error) return error;
  await Pm.updateGoalProgress({
    review,
    goalId: req.body.goalId,
    updates: req.body,
    commentField: null,
    actorId: req.users.id,
  });
  return Helper.response(true, "Progress updated", {}, res, 200);
});

/** Add the same goal to every goal-setting review matching the filters. */
exports.bulkAssignGoal = hr("bulkAssignGoal", async (req, res) => {
  const { cycleId, departmentId, designationId, goal } = req.body || {};
  const cycle = await loadCycle(req, cycleId);
  if (!cycle) return fail(res, "Cycle not found");
  if (cycle.status !== "active") return fail(res, "Launch the cycle before assigning goals");

  const where = { cycleId, status: "goal_setting" };
  if (departmentId) where.departmentId = departmentId;
  if (designationId) where.designationId = designationId;
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;
  const reviews = await PmReview.findAll({ where });
  if (!reviews.length) return fail(res, "No reviews in goal setting match these filters");

  for (const review of reviews) {
    await Pm.saveGoal({ review, payload: { ...goal, id: undefined }, actorId: req.users.id, actorRole: "hr" });
  }
  return Helper.response(true, `Goal assigned to ${reviews.length} employee(s)`, { count: reviews.length }, res, 200);
});

exports.lockGoals = hr("lockGoals", async (req, res) => {
  const ids = Array.isArray(req.body?.reviewIds) ? req.body.reviewIds : [];
  if (!ids.length) return fail(res, "Select at least one review");
  const reviews = await PmReview.findAll({ where: { id: { [Op.in]: ids }, tenantId: req.users.tenantId } });
  const cycleIds = [...new Set(reviews.map((r) => r.cycleId))];
  const activeCycles = await PmCycle.count({ where: { id: { [Op.in]: cycleIds }, status: "active" } });
  if (activeCycles !== cycleIds.length) return fail(res, "Cycle is not active");

  const result = await Pm.lockGoals(reviews);
  const msg = result.skipped.length
    ? `${result.locked.length} locked, ${result.skipped.length} skipped`
    : `${result.locked.length} review(s) moved to self review`;
  return Helper.response(true, msg, result, res, 200);
});

/** Lets HR move a review past a missed self-review deadline so the manager can proceed. */
exports.skipSelfReview = hr("skipSelfReview", async (req, res) => {
  const { review, error } = await editableReview(req, res, ["self_review"]);
  if (error) return error;
  await review.update({ status: "manager_review" });
  await writeAudit({
    req,
    actionType: "PERFORMANCE_SKIP_SELF_REVIEW",
    referenceId: review.id,
    employeeId: review.employeeId,
    remarks: "Self review skipped by HR",
  });
  return Helper.response(true, "Moved to manager review", {}, res, 200);
});

exports.requestFeedback = hr("requestFeedback", async (req, res) => {
  const { review, error } = await editableReview(req, res);
  if (error) return error;
  if (review.status === "approved") return fail(res, "Review is already approved");
  const added = await Pm.requestFeedback({ review, reviewers: req.body.reviewers, requestedBy: req.users.id });
  return Helper.response(true, `${added} feedback request(s) sent`, { added }, res, 200);
});

exports.removeFeedback = hr("removeFeedback", async (req, res) => {
  const { review, error } = await editableReview(req, res);
  if (error) return error;
  const removed = await PmFeedback.destroy({
    where: { id: req.body.feedbackId, reviewId: review.id, status: "pending" },
  });
  if (!removed) return fail(res, "Only pending feedback requests can be removed");
  return Helper.response(true, "Feedback request removed", {}, res, 200);
});

/** HR can act on whichever approval level is current (acts as an override for skip-manager levels). */
exports.approveReview = hr("approveReview", async (req, res) => {
  const { review, cycle, error } = await editableReview(req, res, ["in_approval"]);
  if (error) return error;
  await Pm.actOnApproval({
    review,
    cycle,
    action: req.body.action,
    comments: req.body.comments,
    approverId: req.users.id,
    approverName: `${req.users.name} (HR)`,
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

// ───────────────────────────── analytics ─────────────────────────────

exports.dashboard = hr("dashboard", async (req, res) => {
  const cycle = await loadCycle(req, req.body?.cycleId);
  if (!cycle) return fail(res, "Cycle not found");
  const where = { cycleId: cycle.id };
  if (req.body?.departmentId) where.departmentId = req.body.departmentId;
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;

  const rows = await Pm.reviewRows(where);
  const summary = Pm.summarizeRows(rows);
  return Helper.response(true, "Dashboard fetched", { cycle, ...summary }, res, 200);
});

/** Flat rows for Excel / PDF export. */
exports.report = hr("report", async (req, res) => {
  const cycle = await loadCycle(req, req.body?.cycleId);
  if (!cycle) return fail(res, "Cycle not found");
  const where = { cycleId: cycle.id };
  if (req.body?.departmentId) where.departmentId = req.body.departmentId;
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;
  const rows = await Pm.reviewRows(where);
  return Helper.response(true, "Report fetched", { cycle, rows, summary: Pm.summarizeRows(rows) }, res, 200);
});

exports.employeeHistory = hr("employeeHistory", async (req, res) => {
  const employeeId = req.body?.employeeId;
  if (!employeeId) return fail(res, "Select an employee");
  const data = await Pm.historyRows(req.users.tenantId, employeeId);
  return Helper.response(true, "History fetched", data, res, 200);
});
