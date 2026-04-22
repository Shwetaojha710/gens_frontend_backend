const Helper = require("../../helper/helper");
const CandidateInterviewRound = require("../../models/candidate_interview_round");
const CandidateInterviewFeedback = require("../../models/candidate_interview_feedback");
const Application = require("../../models/application");
const JobRequirement = require("../../models/job_requirement");
const { Op } = require("sequelize");
const Candidate = require("../../models/candidate");

/**
 * POST /api/get-my-interviews
 * Returns all interview rounds assigned to the logged-in panel user.
 * A round is "unlocked" only if all previous rounds (lower sequence) are completed.
 */
exports.getMyInterviews = async (req, res) => {
  try {
    const interviewerEmail = req.panelUser?.email;
    const tenantId = req.panelUser?.tenantId;
    const interviewerId = req.panelUser?.id;
    const branchId = req.panelUser?.branchId || null;
    if (!interviewerEmail) {
      return Helper.response(false, "Unauthorized", {}, res, 200);
    }

    // Fetch all rounds assigned to this interviewer for this tenant
    const myRounds = await CandidateInterviewRound.findAll({
      where: {
        interviewer_id: interviewerId,
        tenantId,
      },
      order: [["sequence", "ASC"]],
    });

    if (!myRounds.length) {
      return Helper.response(true, "No interviews assigned", [], res, 200);
    }

    // Group by application_id
    const appIds = [...new Set(myRounds.map((r) => r.application_id))];

    // Fetch full application details
 const applications = await Application.findAll({
  where: { id: { [Op.in]: appIds } },
  include: [
    {
      model: JobRequirement,
      as: "jobPosting",
      attributes: ["id", "job_id", "job_title", "department"],
    },
    {
      model: Candidate,
      as: "candidate",
      attributes: ["id", "name", "email", "phone"],
    }
  ],
  raw: true,
  nest: true,
});

    const appMap = {};
    applications.forEach((a) => {
      appMap[a.id] = a;
    });

    // For each application, fetch all rounds (to determine unlock status)
    const allRoundsForApps = await CandidateInterviewRound.findAll({
      where: { application_id: { [Op.in]: appIds } },
      raw:true,
      order: [["sequence", "ASC"]],
    });

    // Group all rounds by application_id
    const allRoundsByApp = {};
    allRoundsForApps.forEach((r) => {
      if (!allRoundsByApp[r.application_id]) allRoundsByApp[r.application_id] = [];
      allRoundsByApp[r.application_id].push(r);
    });

    // Build response
    const result = myRounds.map((round) => {
      const app = appMap[round.application_id];
      const allRoundsForThisApp = allRoundsByApp[round.application_id] || [];
      const totalRounds = allRoundsForThisApp.length;

      // Determine if this round is unlocked
      // All rounds with sequence < current round must be completed/feedback_submitted
      const prevRounds = allRoundsForThisApp.filter((r) => r.sequence < round.sequence);
      const isUnlocked = prevRounds.every(
        (r) => r.status == "completed" || r.feedback_submitted === true
      );

      return {
        round_id: round.id,
        round_master_id: round.round_id,
        application_id: round.application_id,
        round_name: round.round_name,
        round_type: round.round_type,
        sequence: round.sequence,
        total_rounds: totalRounds,
        scheduled_at: round.scheduled_at,
        duration_minutes: round.duration_minutes,
        mode: round.mode,
        meeting_link: round.meeting_link,
        status: round.status,
        feedback_submitted: round.feedback_submitted,
        is_unlocked: isUnlocked,
        candidate: {
          name: app?.candidate?.name || "",
          email: app?.candidate?.email || "",
          phone: app?.candidate?.phone || "",
          experience: app?.candidate?.experience || "",
        },
        job: {
          job_title: app?.jobPosting?.job_title || app?.job_title || "",
          department: app?.jobPosting?.department || "",
        },
      };
    });

    // Stats
    const stats = {
      total: result.length,
      scheduled: result.filter((r) => r.is_unlocked && r.status === "scheduled").length,
      pending_feedback: result.filter(
        (r) => r.is_unlocked && !r.feedback_submitted && r.status !== "completed"
      ).length,
      completed: result.filter((r) => r.status === "completed" || r.feedback_submitted).length,
    };

    return Helper.response(true, "My interviews fetched", { interviews: result, stats }, res, 200);
  } catch (err) {
    console.error("getMyInterviews error:", err);
    return Helper.response(false, err?.message || "Something went wrong", {}, res, 500);
  }
};

/**
 * POST /api/panel-save-feedback
 * Same as saveInterviewFeedback but authenticated via PanelUser middleware.
 * After saving feedback with recommendation='selected', the next round gets unlocked
 * automatically (frontend re-fetches, backend unlock logic is in getMyInterviews).
 */
exports.panelSaveFeedback = async (req, res) => {
  try {
    const { application_id, round_id, rating, recommendation, strengths, concerns, notes } =
      req.body || {};

    if (!application_id || !round_id) {
      return Helper.response(
        false,
        "application_id and round_id are required",
        {},
        res,
        200
      );
    }

    const interviewerEmail = req.panelUser?.email;
    const interviewerName = req.panelUser?.name;
    const tenantId = req.panelUser?.tenantId;
    const branchId = req.panelUser?.branchId || null;

    // Verify this round belongs to this interviewer
    const round = await CandidateInterviewRound.findOne({
      where: { application_id, id: round_id, interviewer_email: interviewerEmail },
    });

    if (!round) {
      return Helper.response(false, "Round not found or not assigned to you", {}, res, 200);
    }

    if (round.feedback_submitted) {
      return Helper.response(false, "Feedback already submitted for this round", {}, res, 200);
    }

    // Check this round is unlocked
    const allRounds = await CandidateInterviewRound.findAll({
      where: { application_id },
      order: [["sequence", "ASC"]],
    });

    const prevRounds = allRounds.filter((r) => r.sequence < round.sequence);
    const isUnlocked = prevRounds.every(
      (r) => r.status == "completed" || r.feedback_submitted === true
    );

    if (!isUnlocked) {
      return Helper.response(
        false,
        "Previous round(s) are not completed yet. You cannot submit feedback for this round.",
        {},
        res,
        200
      );
    }

    // Save feedback record
    const feedback = await CandidateInterviewFeedback.create({
      tenantId,
      branchId,
      application_id,
      round_id: round.round_id || round_id,
      interviewer_name: interviewerName,
      interviewer_email: interviewerEmail,
      rating: Number(rating || 0),
      recommendation: recommendation || "hold",
      strengths: strengths || "",
      concerns: concerns || "",
      notes: notes || "",
      submitted_at: new Date(),
    });

    // Mark this round as completed
    await round.update({
      feedback_submitted: true,
      status: "completed",
    });

    // Update application stage
    const application = await Application.findOne({ where: { id: application_id } });
    if (application) {
      const isLastRound = allRounds[allRounds.length - 1]?.id === round.id;
      let newStage = "interview_in_progress";
      let newStatus = "interview_in_progress";

      if (recommendation === "rejected") {
        newStage = "rejected";
        newStatus = "rejected";
      } else if (recommendation === "selected" && isLastRound) {
        newStage = "offered";
        newStatus = "offered";
      }

      await application.update({ stage: newStage, status: newStatus });
    }

    return Helper.response(true, "Feedback submitted successfully", feedback, res, 200);
  } catch (err) {
    console.error("panelSaveFeedback error:", err);
    return Helper.response(false, err?.message || "Something went wrong", {}, res, 500);
  }
};

/**
 * POST /api/panel-feedback-detail
 * Returns saved feedback detail for the logged-in panel user for one assigned round.
 * Feedback is read from candidate_interview_feedback.
 */
exports.panelFeedbackDetail = async (req, res) => {
  try {
    const { application_id, round_id } = req.body || {};

    if (!application_id || !round_id) {
      return Helper.response(false, "application_id and round_id are required", {}, res, 200);
    }

    const interviewerEmail = req.panelUser?.email;
    const tenantId = req.panelUser?.tenantId;

    if (!interviewerEmail || !tenantId) {
      return Helper.response(false, "Unauthorized", {}, res, 200);
    }

    const assignedRound = await CandidateInterviewRound.findOne({
      where: {
        id: round_id,
        application_id,
        interviewer_email: interviewerEmail,
        tenantId,
      },
      raw: true,
    });

    if (!assignedRound) {
      return Helper.response(false, "Round not found or not assigned to you", {}, res, 200);
    }

    const feedbackRoundId = assignedRound.round_id || assignedRound.id;

    const feedback = await CandidateInterviewFeedback.findOne({
      where: {
        application_id,
        round_id: feedbackRoundId,
        interviewer_email: interviewerEmail,
        tenantId,
      },
      order: [
        ["submitted_at", "DESC"],
        ["createdAt", "DESC"],
      ],
      raw: true,
    });

    if (!feedback) {
      return Helper.response(false, "Feedback not found", {}, res, 200);
    }

    return Helper.response(
      true,
      "Feedback detail fetched",
      {
        application_id: feedback.application_id,
        round_id: feedback.round_id,
        interviewer_name: feedback.interviewer_name || null,
        interviewer_email: feedback.interviewer_email || null,
        rating: feedback.rating ?? null,
        recommendation: feedback.recommendation || null,
        strengths: feedback.strengths || "",
        concerns: feedback.concerns || "",
        notes: feedback.notes || "",
        created_at: feedback.createdAt || null,
        updated_at: feedback.updatedAt || null,
        submitted_at: feedback.submitted_at || null,
      },
      res,
      200
    );
  } catch (err) {
    console.error("panelFeedbackDetail error:", err);
    return Helper.response(false, err?.message || "Something went wrong", {}, res, 500);
  }
};
