/**
 * Performance management — scoring rules and shared data operations.
 * Used by both the HR controller (Admin auth) and the employee portal
 * controller (AppAdmin auth); permission checks stay in the controllers.
 */
const { Op } = require("sequelize");
const moment = require("moment-timezone");
const sequelize = require("../connection/connection");
const empPersonal = require("../models/empPersonal");
const Department = require("../models/department");
const Designation = require("../models/designation");
const PmCycle = require("../models/pm_cycle");
const PmGoal = require("../models/pm_goal");
const PmKeyResult = require("../models/pm_key_result");
const PmReview = require("../models/pm_review");
const PmReviewApproval = require("../models/pm_review_approval");
const PmFeedback = require("../models/pm_feedback");

const DEFAULT_COMPETENCIES = [
  "Job Knowledge",
  "Quality of Work",
  "Communication",
  "Teamwork",
  "Ownership",
  "Problem Solving",
];
const DEFAULT_APPROVAL_LEVELS = ["hr"];
const APPROVAL_LEVEL_TYPES = ["skip_manager", "hr"];
const MAX_ACHIEVEMENT = 120;

/** A rule violation whose message is safe to show the user (not logged as a failure). */
class PmValidationError extends Error {}

const STATUS_LABELS = {
  goal_setting: "Goal Setting",
  self_review: "Self Review",
  manager_review: "Manager Review",
  in_approval: "In Approval",
  approved: "Approved",
};

// [performanceBand][potentialRating] -> label; both on a 1..3 scale
const NINE_BOX_LABELS = {
  1: { 1: "Underperformer", 2: "Dilemma", 3: "Enigma" },
  2: { 1: "Effective Employee", 2: "Core Player", 3: "Growth Employee" },
  3: { 1: "Trusted Professional", 2: "High Performer", 3: "Star" },
};

// ───────────────────────────── scoring ─────────────────────────────

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** KPI achievement % (0..120). Lower-is-better KPIs invert the ratio. */
function kpiAchievement(goal) {
  const target = num(goal.targetValue);
  const actual = num(goal.actualValue);
  if (target === null || actual === null) return 0;
  let pct;
  if (goal.higherIsBetter === false) {
    if (actual <= 0) return MAX_ACHIEVEMENT;
    pct = (target / actual) * 100;
  } else {
    if (target === 0) return actual >= 0 ? 100 : 0;
    pct = (actual / target) * 100;
  }
  return round2(clamp(pct, 0, MAX_ACHIEVEMENT));
}

/** Key result progress % (0..120) measured from startValue to targetValue. */
function keyResultProgress(kr) {
  const start = num(kr.startValue) || 0;
  const target = num(kr.targetValue) || 0;
  const current = num(kr.currentValue) ?? start;
  const range = target - start;
  if (range === 0) return current >= target ? 100 : 0;
  return round2(clamp(((current - start) / range) * 100, 0, MAX_ACHIEVEMENT));
}

/** Weighted average; falls back to a plain average when all weights are 0. */
function weightedAverage(items) {
  if (!items.length) return null;
  const totalWeight = items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  if (totalWeight <= 0) {
    return items.reduce((s, i) => s + i.value, 0) / items.length;
  }
  return items.reduce((s, i) => s + i.value * (Number(i.weight) || 0), 0) / totalWeight;
}

function okrAchievement(keyResults) {
  const avg = weightedAverage(
    keyResults.map((kr) => ({ value: keyResultProgress(kr), weight: kr.weightage })),
  );
  return avg === null ? 0 : round2(avg);
}

function goalAchievementOf(goal, keyResults) {
  return goal.type === "okr" ? okrAchievement(keyResults || []) : kpiAchievement(goal);
}

/** 100% achievement maps to 5.0; floor of 1.0. */
function achievementToRating(pct) {
  if (pct === null) return null;
  return round2(clamp(pct / 20, 1, 5));
}

/**
 * Final rating = weighted mix of goal, manager and 360 ratings.
 * Missing components are dropped and the remaining weights re-normalised,
 * so a provisional score is available before every phase is complete.
 */
function computeFinalRating({ goalRating, managerRating, feedbackRating }, cycle) {
  const parts = [
    { value: goalRating, weight: cycle.weightGoals },
    { value: managerRating, weight: cycle.weightManager },
    { value: feedbackRating, weight: cycle.weightFeedback },
  ].filter((p) => p.value !== null && p.value !== undefined && Number(p.weight) > 0);
  const avg = weightedAverage(parts.map((p) => ({ value: Number(p.value), weight: p.weight })));
  return avg === null ? null : round2(avg);
}

function performanceBandOf(rating) {
  if (rating === null || rating === undefined) return null;
  if (rating >= 4) return 3;
  if (rating >= 3) return 2;
  return 1;
}

function nineBoxLabel(performanceBand, potentialRating) {
  if (!performanceBand || !potentialRating) return null;
  return NINE_BOX_LABELS[performanceBand]?.[potentialRating] || null;
}

function ratingLabel(rating) {
  if (rating === null || rating === undefined) return null;
  if (rating >= 4.5) return "Outstanding";
  if (rating >= 3.75) return "Exceeds Expectations";
  if (rating >= 3) return "Meets Expectations";
  if (rating >= 2) return "Needs Improvement";
  return "Unsatisfactory";
}

// ───────────────────────────── helpers ─────────────────────────────

const todayIST = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

function isPastDeadline(deadline) {
  return !!deadline && todayIST() > String(deadline).slice(0, 10);
}

function approvalLevelsOf(cycle) {
  const levels = Array.isArray(cycle?.approvalLevels) ? cycle.approvalLevels : [];
  const valid = levels.filter((l) => APPROVAL_LEVEL_TYPES.includes(l));
  return valid.length ? valid : DEFAULT_APPROVAL_LEVELS;
}

function competenciesOf(cycle) {
  const list = Array.isArray(cycle?.competencies) ? cycle.competencies.filter(Boolean) : [];
  return list.length ? list : DEFAULT_COMPETENCIES;
}

const fullName = (e) => [e?.firstName, e?.lastName].filter(Boolean).join(" ").trim();

async function employeeMap(tenantId, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const rows = await empPersonal.findAll({
    where: { tenantId, id: { [Op.in]: unique } },
    attributes: [
      "id", "firstName", "lastName", "empCode", "departmentId",
      "designationId", "reportingPersonId", "branchId", "profileImage",
    ],
    raw: true,
  });
  return Object.fromEntries(rows.map((r) => [r.id, { ...r, name: fullName(r) }]));
}

async function orgNameMaps(tenantId) {
  const [departments, designations] = await Promise.all([
    Department.findAll({ where: { tenantId }, attributes: ["id", "name"], raw: true }),
    Designation.findAll({ where: { tenantId }, attributes: ["id", "name"], raw: true }),
  ]);
  return {
    departments: Object.fromEntries(departments.map((d) => [d.id, d.name])),
    designations: Object.fromEntries(designations.map((d) => [d.id, d.name])),
  };
}

/** The employee who approves a "skip_manager" level, or null if none exists. */
async function skipManagerIdOf(review) {
  if (!review.managerId) return null;
  const manager = await empPersonal.findOne({
    where: { id: review.managerId, tenantId: review.tenantId },
    attributes: ["reportingPersonId"],
    raw: true,
  });
  return manager?.reportingPersonId || null;
}

/**
 * First level index >= startIdx that can actually be acted on.
 * A skip_manager level without a skip-level manager is skipped.
 * Returns levels.length when the chain is complete.
 */
async function nextApplicableLevel(levels, startIdx, review) {
  for (let i = startIdx; i < levels.length; i++) {
    if (levels[i] !== "skip_manager") return i;
    if (await skipManagerIdOf(review)) return i;
  }
  return levels.length;
}

/** Who must act on the review right now (null when not in approval). */
async function currentApprover(review, cycle) {
  if (review.status !== "in_approval") return null;
  const levels = approvalLevelsOf(cycle);
  const type = levels[review.currentApprovalLevel];
  if (!type) return null;
  if (type === "hr") return { level: review.currentApprovalLevel, type, approverId: null };
  return {
    level: review.currentApprovalLevel,
    type,
    approverId: await skipManagerIdOf(review),
  };
}

// ───────────────────────────── data ops ─────────────────────────────

/** Recompute and persist all derived scores of a review. */
async function recomputeReview(reviewId, transaction) {
  const review = await PmReview.findByPk(reviewId, { transaction });
  if (!review) return null;
  const cycle = await PmCycle.findByPk(review.cycleId, { transaction, raw: true });

  const goals = await PmGoal.findAll({ where: { reviewId }, raw: true, transaction });
  const krs = goals.length
    ? await PmKeyResult.findAll({
        where: { goalId: { [Op.in]: goals.map((g) => g.id) } },
        raw: true,
        transaction,
      })
    : [];
  const goalAchievement = goals.length
    ? round2(
        weightedAverage(
          goals.map((g) => ({
            value: goalAchievementOf(g, krs.filter((k) => k.goalId === g.id)),
            weight: g.weightage,
          })),
        ),
      )
    : null;
  const goalRating = achievementToRating(goalAchievement);

  const feedback = await PmFeedback.findAll({
    where: { reviewId, status: "submitted" },
    attributes: ["overallRating"],
    raw: true,
    transaction,
  });
  const feedbackRating = feedback.length
    ? round2(feedback.reduce((s, f) => s + Number(f.overallRating || 0), 0) / feedback.length)
    : null;

  const finalRating = computeFinalRating(
    { goalRating, managerRating: num(review.managerRating), feedbackRating },
    cycle,
  );

  await review.update(
    {
      goalAchievement,
      goalRating,
      feedbackRating,
      finalRating,
      performanceBand: performanceBandOf(finalRating),
    },
    { transaction },
  );
  return review;
}

/**
 * Create or update a goal with its key results.
 * `payload.keyResults` replaces the existing set when the goal is an OKR.
 */
async function saveGoal({ review, payload, actorId, actorRole }) {
  const type = payload.type === "okr" ? "okr" : "kpi";
  const title = String(payload.title || "").trim();
  if (!title) throw new PmValidationError("Goal title is required");

  const keyResults = Array.isArray(payload.keyResults) ? payload.keyResults : [];
  if (type === "okr" && !keyResults.length) {
    throw new PmValidationError("An OKR needs at least one key result");
  }
  if (type === "kpi" && num(payload.targetValue) === null) {
    throw new PmValidationError("KPI target value is required");
  }
  for (const kr of keyResults) {
    if (!String(kr.title || "").trim() || num(kr.targetValue) === null) {
      throw new PmValidationError("Every key result needs a title and a target value");
    }
  }

  return sequelize.transaction(async (t) => {
    const fields = {
      type,
      title,
      description: payload.description || null,
      weightage: num(payload.weightage) ?? 0,
      unit: type === "kpi" ? payload.unit || null : null,
      targetValue: type === "kpi" ? num(payload.targetValue) : null,
      actualValue: type === "kpi" ? num(payload.actualValue) : null,
      higherIsBetter: type === "kpi" ? payload.higherIsBetter !== false : true,
      updatedBy: actorId,
    };

    let goal;
    if (payload.id) {
      goal = await PmGoal.findOne({ where: { id: payload.id, reviewId: review.id }, transaction: t });
      if (!goal) throw new PmValidationError("Goal not found");
      await goal.update(fields, { transaction: t });
    } else {
      goal = await PmGoal.create(
        {
          ...fields,
          tenantId: review.tenantId,
          branchId: review.branchId,
          cycleId: review.cycleId,
          reviewId: review.id,
          employeeId: review.employeeId,
          assignedByRole: actorRole,
          createdBy: actorId,
        },
        { transaction: t },
      );
    }

    await PmKeyResult.destroy({ where: { goalId: goal.id }, transaction: t });
    if (type === "okr") {
      await PmKeyResult.bulkCreate(
        keyResults.map((kr) => ({
          tenantId: review.tenantId,
          goalId: goal.id,
          title: String(kr.title).trim(),
          unit: kr.unit || null,
          startValue: num(kr.startValue) ?? 0,
          targetValue: num(kr.targetValue),
          currentValue: num(kr.currentValue) ?? num(kr.startValue) ?? 0,
          weightage: num(kr.weightage) ?? 1,
        })),
        { transaction: t },
      );
    }

    await recomputeReview(review.id, t);
    return goal;
  });
}

async function deleteGoal(review, goalId) {
  return sequelize.transaction(async (t) => {
    const deleted = await PmGoal.destroy({ where: { id: goalId, reviewId: review.id }, transaction: t });
    if (!deleted) throw new PmValidationError("Goal not found");
    await PmKeyResult.destroy({ where: { goalId }, transaction: t });
    await recomputeReview(review.id, t);
  });
}

/**
 * Update achievement values only (allowed after goals are locked).
 * `updates` = { actualValue?, keyResults?: [{ id, currentValue }], comment? }
 */
async function updateGoalProgress({ review, goalId, updates, commentField, actorId }) {
  return sequelize.transaction(async (t) => {
    const goal = await PmGoal.findOne({ where: { id: goalId, reviewId: review.id }, transaction: t });
    if (!goal) throw new PmValidationError("Goal not found");

    const patch = { updatedBy: actorId };
    if (goal.type === "kpi" && updates.actualValue !== undefined) {
      patch.actualValue = num(updates.actualValue);
    }
    if (commentField && updates.comment !== undefined) {
      patch[commentField] = updates.comment || null;
    }
    await goal.update(patch, { transaction: t });

    if (goal.type === "okr" && Array.isArray(updates.keyResults)) {
      for (const kr of updates.keyResults) {
        await PmKeyResult.update(
          { currentValue: num(kr.currentValue) ?? 0 },
          { where: { id: kr.id, goalId: goal.id }, transaction: t },
        );
      }
    }
    await recomputeReview(review.id, t);
  });
}

/** Move goal_setting reviews to self_review once weightages add up to 100. */
async function lockGoals(reviews) {
  const locked = [];
  const skipped = [];
  for (const review of reviews) {
    if (review.status !== "goal_setting") {
      skipped.push({ reviewId: review.id, reason: "Goals already locked" });
      continue;
    }
    const goals = await PmGoal.findAll({ where: { reviewId: review.id }, attributes: ["weightage"], raw: true });
    const total = round2(goals.reduce((s, g) => s + Number(g.weightage || 0), 0));
    if (!goals.length) {
      skipped.push({ reviewId: review.id, reason: "No goals assigned" });
      continue;
    }
    if (total !== 100) {
      skipped.push({ reviewId: review.id, reason: `Goal weightage totals ${total}%, must be 100%` });
      continue;
    }
    await review.update({ status: "self_review" });
    locked.push(review.id);
  }
  return { locked, skipped };
}

/** Create pending 360 requests; existing reviewer rows are left untouched. */
async function requestFeedback({ review, reviewers, requestedBy }) {
  const valid = (Array.isArray(reviewers) ? reviewers : []).filter(
    (r) => r?.reviewerId && ["manager", "peer", "direct_report"].includes(r.relationship),
  );
  if (!valid.length) throw new PmValidationError("Select at least one reviewer");
  if (valid.some((r) => r.reviewerId === review.employeeId)) {
    throw new PmValidationError("An employee cannot give 360 feedback to themselves; use self review instead");
  }

  const reviewerIds = valid.map((r) => r.reviewerId);
  const found = await empPersonal.count({
    where: { tenantId: review.tenantId, id: { [Op.in]: reviewerIds }, status: "active" },
  });
  if (found !== new Set(reviewerIds).size) throw new PmValidationError("One or more reviewers are invalid");

  const existing = await PmFeedback.findAll({
    where: { reviewId: review.id, reviewerId: { [Op.in]: reviewerIds } },
    attributes: ["reviewerId"],
    raw: true,
  });
  const existingIds = new Set(existing.map((e) => e.reviewerId));
  const rows = valid
    .filter((r) => !existingIds.has(r.reviewerId))
    .map((r) => ({
      tenantId: review.tenantId,
      cycleId: review.cycleId,
      reviewId: review.id,
      revieweeId: review.employeeId,
      reviewerId: r.reviewerId,
      relationship: r.relationship,
      requestedBy,
    }));
  if (rows.length) await PmFeedback.bulkCreate(rows);
  return rows.length;
}

async function submitFeedback({ feedback, cycle, payload }) {
  const competencies = competenciesOf(cycle);
  const ratings = {};
  for (const c of competencies) {
    const v = num(payload?.competencyRatings?.[c]);
    if (v === null || v < 1 || v > 5) throw new PmValidationError(`Rate "${c}" between 1 and 5`);
    ratings[c] = v;
  }
  const overall = round2(Object.values(ratings).reduce((s, v) => s + v, 0) / competencies.length);
  await sequelize.transaction(async (t) => {
    await feedback.update(
      {
        competencyRatings: ratings,
        overallRating: overall,
        strengths: payload.strengths || null,
        improvements: payload.improvements || null,
        status: "submitted",
        submittedAt: new Date(),
      },
      { transaction: t },
    );
    await recomputeReview(feedback.reviewId, t);
  });
}

/** Manager assessment: rating + potential, then route into the approval chain. */
async function submitManagerReview({ review, cycle, payload }) {
  const rating = num(payload.managerRating);
  const potential = num(payload.potentialRating);
  if (rating === null || rating < 1 || rating > 5) throw new PmValidationError("Manager rating must be between 1 and 5");
  if (![1, 2, 3].includes(potential)) throw new PmValidationError("Select potential (low, moderate or high)");

  const levels = approvalLevelsOf(cycle);
  const firstLevel = await nextApplicableLevel(levels, 0, review);
  const done = firstLevel >= levels.length;

  await sequelize.transaction(async (t) => {
    await review.update(
      {
        managerRating: rating,
        potentialRating: potential,
        managerComments: payload.managerComments || null,
        managerSubmittedAt: new Date(),
        status: done ? "approved" : "in_approval",
        currentApprovalLevel: done ? levels.length : firstLevel,
        approvedAt: done ? new Date() : null,
      },
      { transaction: t },
    );
    await recomputeReview(review.id, t);
  });
}

/** Approve / reject the current level. Rejection returns the review to the manager. */
async function actOnApproval({ review, cycle, action, comments, approverId, approverName }) {
  if (review.status !== "in_approval") throw new PmValidationError("Review is not awaiting approval");
  if (!["approved", "rejected"].includes(action)) throw new PmValidationError("Invalid action");
  if (action === "rejected" && !String(comments || "").trim()) {
    throw new PmValidationError("Add a comment explaining the rejection");
  }

  const levels = approvalLevelsOf(cycle);
  const level = review.currentApprovalLevel;

  await sequelize.transaction(async (t) => {
    await PmReviewApproval.create(
      {
        tenantId: review.tenantId,
        reviewId: review.id,
        level,
        approverType: levels[level],
        approverId,
        approverName,
        action,
        comments: comments || null,
      },
      { transaction: t },
    );

    if (action === "rejected") {
      await review.update(
        { status: "manager_review", currentApprovalLevel: 0, managerSubmittedAt: null },
        { transaction: t },
      );
      return;
    }

    const next = await nextApplicableLevel(levels, level + 1, review);
    if (next >= levels.length) {
      await review.update(
        { status: "approved", currentApprovalLevel: levels.length, approvedAt: new Date() },
        { transaction: t },
      );
    } else {
      await review.update({ currentApprovalLevel: next }, { transaction: t });
    }
  });
}

/**
 * Full review payload for the detail screen.
 * `revealFeedbackNames` = false hides reviewer identities (employee viewing own review).
 */
async function buildReviewDetail(review, { revealFeedbackNames }) {
  const r = typeof review.get === "function" ? review.get({ plain: true }) : review;
  const cycle = await PmCycle.findByPk(r.cycleId, { raw: true });

  const goals = await PmGoal.findAll({ where: { reviewId: r.id }, order: [["createdAt", "ASC"]], raw: true });
  const krs = goals.length
    ? await PmKeyResult.findAll({
        where: { goalId: { [Op.in]: goals.map((g) => g.id) } },
        order: [["createdAt", "ASC"]],
        raw: true,
      })
    : [];
  const feedback = await PmFeedback.findAll({ where: { reviewId: r.id }, order: [["createdAt", "ASC"]], raw: true });
  const approvals = await PmReviewApproval.findAll({
    where: { reviewId: r.id },
    order: [["createdAt", "ASC"]],
    raw: true,
  });

  const people = await employeeMap(r.tenantId, [
    r.employeeId,
    r.managerId,
    ...feedback.map((f) => f.reviewerId),
  ]);
  const org = await orgNameMaps(r.tenantId);
  const emp = people[r.employeeId] || {};
  const competencies = competenciesOf(cycle);
  const submitted = feedback.filter((f) => f.status === "submitted");

  const competencySummary = competencies.map((c) => {
    const vals = submitted.map((f) => num(f.competencyRatings?.[c])).filter((v) => v !== null);
    return { competency: c, average: vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null };
  });

  const approver = await currentApprover(r, cycle);
  const approverPerson = approver?.approverId ? (await employeeMap(r.tenantId, [approver.approverId]))[approver.approverId] : null;
  const finalRating = num(r.finalRating);

  return {
    review: {
      ...r,
      statusLabel: STATUS_LABELS[r.status] || r.status,
      ratingLabel: ratingLabel(finalRating),
      nineBox: nineBoxLabel(r.performanceBand, r.potentialRating),
    },
    cycle: {
      ...cycle,
      competencies,
      approvalLevels: approvalLevelsOf(cycle),
    },
    employee: {
      id: r.employeeId,
      name: emp.name || "",
      empCode: emp.empCode || "",
      department: org.departments[r.departmentId] || "",
      designation: org.designations[r.designationId] || "",
      managerName: people[r.managerId]?.name || "",
    },
    goals: goals.map((g) => {
      const goalKrs = krs
        .filter((k) => k.goalId === g.id)
        .map((k) => ({ ...k, progress: keyResultProgress(k) }));
      return { ...g, keyResults: goalKrs, achievement: goalAchievementOf(g, goalKrs) };
    }),
    goalWeightTotal: round2(goals.reduce((s, g) => s + Number(g.weightage || 0), 0)),
    feedback: revealFeedbackNames
      ? feedback.map((f) => ({ ...f, reviewerName: people[f.reviewerId]?.name || "" }))
      : submitted.map((f) => ({
          id: f.id,
          relationship: f.relationship,
          overallRating: f.overallRating,
          strengths: f.strengths,
          improvements: f.improvements,
        })),
    feedbackStats: { requested: feedback.length, submitted: submitted.length },
    competencySummary,
    approvals,
    currentApprover: approver
      ? { ...approver, approverName: approverPerson?.name || (approver.type === "hr" ? "HR" : "") }
      : null,
  };
}

/** Flat rows for dashboards, analytics and exports. */
async function reviewRows(where) {
  const reviews = await PmReview.findAll({ where, raw: true, order: [["createdAt", "ASC"]] });
  if (!reviews.length) return [];
  const tenantId = reviews[0].tenantId;
  const people = await employeeMap(tenantId, [
    ...reviews.map((r) => r.employeeId),
    ...reviews.map((r) => r.managerId),
  ]);
  const org = await orgNameMaps(tenantId);
  return reviews.map((r) => {
    const finalRating = num(r.finalRating);
    return {
      reviewId: r.id,
      cycleId: r.cycleId,
      employeeId: r.employeeId,
      employeeName: people[r.employeeId]?.name || "",
      empCode: people[r.employeeId]?.empCode || "",
      departmentId: r.departmentId,
      department: org.departments[r.departmentId] || "Unassigned",
      designation: org.designations[r.designationId] || "",
      managerId: r.managerId,
      managerName: people[r.managerId]?.name || "",
      status: r.status,
      statusLabel: STATUS_LABELS[r.status] || r.status,
      goalAchievement: num(r.goalAchievement),
      goalRating: num(r.goalRating),
      selfRating: num(r.selfRating),
      managerRating: num(r.managerRating),
      feedbackRating: num(r.feedbackRating),
      finalRating,
      ratingLabel: ratingLabel(finalRating),
      potentialRating: r.potentialRating,
      performanceBand: r.performanceBand,
      nineBox: nineBoxLabel(r.performanceBand, r.potentialRating),
      approvedAt: r.approvedAt,
    };
  });
}

/** One employee's reviews across cycles, newest cycle first. */
async function historyRows(tenantId, employeeId) {
  const rows = await reviewRows({ tenantId, employeeId });
  const cycles = rows.length
    ? await PmCycle.findAll({ where: { id: { [Op.in]: rows.map((r) => r.cycleId) } }, raw: true })
    : [];
  const cycleById = Object.fromEntries(cycles.map((c) => [c.id, c]));
  return rows
    .map((r) => ({
      ...r,
      cycleName: cycleById[r.cycleId]?.name || "",
      cycleType: cycleById[r.cycleId]?.cycleType || "",
      cycleStatus: cycleById[r.cycleId]?.status || "",
      cycleStart: cycleById[r.cycleId]?.startDate || null,
      cycleEnd: cycleById[r.cycleId]?.endDate || null,
    }))
    .sort((a, b) => String(b.cycleStart).localeCompare(String(a.cycleStart)));
}

/** Aggregate dashboard numbers from reviewRows output. */
function summarizeRows(rows) {
  const statusCounts = Object.fromEntries(Object.keys(STATUS_LABELS).map((s) => [s, 0]));
  rows.forEach((r) => (statusCounts[r.status] = (statusCounts[r.status] || 0) + 1));

  const rated = rows.filter((r) => r.finalRating !== null);
  const avg = (list, key) => {
    const vals = list.map((x) => x[key]).filter((v) => v !== null && v !== undefined);
    return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };

  const distribution = ["Outstanding", "Exceeds Expectations", "Meets Expectations", "Needs Improvement", "Unsatisfactory"]
    .map((label) => ({ label, count: rated.filter((r) => r.ratingLabel === label).length }));

  const deptMap = {};
  for (const r of rows) {
    const key = r.departmentId || "none";
    deptMap[key] = deptMap[key] || { departmentId: r.departmentId, department: r.department, rows: [] };
    deptMap[key].rows.push(r);
  }
  const departments = Object.values(deptMap)
    .map((d) => ({
      departmentId: d.departmentId,
      department: d.department,
      employees: d.rows.length,
      completed: d.rows.filter((r) => r.status === "approved").length,
      avgFinalRating: avg(d.rows, "finalRating"),
      avgGoalAchievement: avg(d.rows, "goalAchievement"),
      avgManagerRating: avg(d.rows, "managerRating"),
      avgFeedbackRating: avg(d.rows, "feedbackRating"),
      highPerformers: d.rows.filter((r) => r.performanceBand === 3).length,
      lowPerformers: d.rows.filter((r) => r.performanceBand === 1).length,
    }))
    .sort((a, b) => (b.avgFinalRating ?? -1) - (a.avgFinalRating ?? -1));

  const nineBox = [];
  for (let potential = 3; potential >= 1; potential--) {
    for (let band = 1; band <= 3; band++) {
      const members = rows.filter((r) => r.performanceBand === band && r.potentialRating === potential);
      nineBox.push({
        performanceBand: band,
        potentialRating: potential,
        label: nineBoxLabel(band, potential),
        count: members.length,
        employees: members.map((m) => ({ reviewId: m.reviewId, name: m.employeeName, empCode: m.empCode, finalRating: m.finalRating })),
      });
    }
  }

  return {
    totalEmployees: rows.length,
    statusCounts,
    completionRate: rows.length ? round2((statusCounts.approved / rows.length) * 100) : 0,
    avgFinalRating: avg(rated, "finalRating"),
    avgGoalAchievement: avg(rows, "goalAchievement"),
    distribution,
    departments,
    nineBox,
    topPerformers: [...rated].sort((a, b) => b.finalRating - a.finalRating).slice(0, 5),
  };
}

module.exports = {
  PmValidationError,
  STATUS_LABELS,
  DEFAULT_COMPETENCIES,
  APPROVAL_LEVEL_TYPES,
  // scoring (exported for tests)
  kpiAchievement,
  keyResultProgress,
  okrAchievement,
  achievementToRating,
  computeFinalRating,
  performanceBandOf,
  nineBoxLabel,
  ratingLabel,
  // helpers
  num,
  isPastDeadline,
  approvalLevelsOf,
  competenciesOf,
  employeeMap,
  currentApprover,
  // data ops
  recomputeReview,
  saveGoal,
  deleteGoal,
  updateGoalProgress,
  lockGoals,
  requestFeedback,
  submitFeedback,
  submitManagerReview,
  actOnApproval,
  buildReviewDetail,
  reviewRows,
  historyRows,
  summarizeRows,
};
