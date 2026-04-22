const Helper = require("../../helper/helper");
const nodemailer = require("nodemailer");
const CryptoJS = require("crypto-js");
const hashPassword = (pwd) => CryptoJS.SHA256(pwd).toString();
const interview_round = require("../../models/interview_round");
const round_type = require("../../models/round_type");
const Application = require("../../models/application");
const JobRequirement = require("../../models/job_requirement");
const CandidateInterviewRound = require("../../models/candidate_interview_round");
const CandidateInterviewFeedback = require("../../models/candidate_interview_feedback");
const InterviewPanelUser = require("../../models/interview_panel_user");
const Department = require("../../models/department");
const Designation = require("../../models/designation");

const normalizeNullableValue = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === "null" || normalized === "undefined" || normalized === "all") {
      return null;
    }
  }

  return value;
};

const buildRoundPlanFromJob = async (jobPosting) => {
  const roundIds = Array.isArray(jobPosting?.interview_round) ? jobPosting.interview_round : [];
  if (!roundIds.length) return [];

  const where = {
    id: roundIds,
    tenantId: jobPosting.tenantId,
  };

  const branchId = normalizeNullableValue(jobPosting.branchId);
  if (branchId) where.branchId = branchId;

  const rounds = await interview_round.findAll({
    where,
    include: [
      {
        model: round_type,
        as: "roundTypeData",
        attributes: ["id", "name"],
      },
    ],
    order: [["order_sequence", "ASC"]],
  });

  return rounds.map((round, index) => ({
    round_id: round.id,
    round_name: round.round_name,
    round_type: round.roundTypeData?.name || null,
    sequence: index + 1,
    interviewer_id: null,
    interviewer_name: null,
    interviewer_email: null,
    scheduled_at: null,
    duration_minutes: round.duration_minutes || null,
    mode: null,
    meeting_link: null,
    status: "pending",
    feedback_submitted: false,
  }));
};

exports.createInterviewRound = async (req, res) => {
  try {
    const { round_name, round_type, order_sequence, duration_minutes, is_mandatory } = req.body;

    const tenantId = req.users?.tenantId;
    const branchId = normalizeNullableValue(req.users?.branchId);
    const userId = req.users?.id;

    if (!round_name || !order_sequence || !duration_minutes) {
      return Helper.response(false, "Required fields missing", {}, res, 400);
    }

    const existingName = await interview_round.findOne({ where: { round_name, tenantId, branchId } });
    if (existingName) {
      return Helper.response(false, "Interview round with this name already exists", {}, res, 400);
    }

    const existingOrder = await interview_round.findOne({ where: { order_sequence, tenantId, branchId } });
    if (existingOrder) {
      return Helper.response(false, "Interview round with this order sequence already exists", {}, res, 400);
    }

    const round = await interview_round.create({
      tenantId,
      branchId,
      round_name,
      round_type,
      order_sequence,
      duration_minutes,
      is_mandatory: is_mandatory ?? true,
      createdBy: userId,
      status: "active",
    });

    return Helper.response(true, "Interview round created", round, res, 200);
  } catch (error) {
    console.error("createInterviewRound error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.updateInterviewRound = async (req, res) => {
  try {
    const { id, round_name, order_sequence } = req.body;
    const userId = req.users?.id;
    const tenantId = req.users?.tenantId;
    const branchId = normalizeNullableValue(req.users?.branchId);
    const { Op } = require("sequelize");

    if (!id) {
      return Helper.response(false, "id is required", {}, res, 400);
    }

    const round = await interview_round.findOne({ where: { id } });
    if (!round) {
      return Helper.response(false, "Round not found", {}, res, 404);
    }

    // if (round_name && round_name !== round.round_name) {
      const existingName = await interview_round.findOne({ where: { round_name, tenantId, branchId, id: { [Op.ne]: id } } });
      if (existingName) {
        return Helper.response(false, "Interview round with this name already exists", {}, res, 400);
      }
    // }

    if (order_sequence && order_sequence !== round.order_sequence) {
      const existingOrder = await interview_round.findOne({ where: { order_sequence, tenantId, branchId, id: { [Op.ne]: id } } });
      if (existingOrder) {
        return Helper.response(false, "Interview round with this order sequence already exists", {}, res, 400);
      }
    }

    await round.update({ ...req.body, updatedBy: userId });
    return Helper.response(true, "Interview round updated", round, res, 200);
  } catch (error) {
    console.error("updateInterviewRound error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.listInterviewRounds = async (req, res) => {
  try {
    const { status } = req.body;
    const tenantId = req.users?.tenantId;
    const branchId = normalizeNullableValue(req.users?.branchId);

    const where = { tenantId };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const rounds = await interview_round.findAll({
      where,
      order: [["order_sequence", "ASC"]],
      include: [
        {
          model: round_type,
          as: "roundTypeData",
          attributes: ["id", "name"],
        },
      ],
      raw: true,
    });

    return Helper.response(true, "Interview rounds list", rounds, res, 200);
  } catch (error) {
    console.error("listInterviewRounds error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.deleteInterviewRound = async (req, res) => {
  try {
    const { id } = req.body;
    const round = await interview_round.findOne({ where: { id } });

    if (!round) {
      return Helper.response(false, "Round not found", {}, res, 404);
    }

    await round.destroy();
    return Helper.response(true, "Interview round deleted", {}, res, 200);
  } catch (error) {
    console.error("deleteInterviewRound error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.reorderInterviewRounds = async (req, res) => {
  try {
    const { rounds } = req.body;
    if (!Array.isArray(rounds)) {
      return Helper.response(false, "Invalid data", {}, res, 400);
    }

    await Promise.all(
      rounds.map((item) =>
        interview_round.update({ order_sequence: item.order_sequence }, { where: { id: item.id } })
      )
    );

    return Helper.response(true, "Order updated successfully", {}, res, 200);
  } catch (error) {
    console.error("reorderInterviewRounds error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.interviewScheduleDetail = async (req, res) => {
  try {
    const { application_id } = req.body || {};
    if (!application_id) {
      return Helper.response(false, "application_id is required", {}, res, 400);
    }

    const application = await Application.findOne({
      where: { id: application_id },
      include: [{ model: JobRequirement, as: "jobPosting" }],
    });

    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    let rounds = await CandidateInterviewRound.findAll({
      where: { application_id },
      order: [["sequence", "ASC"]],
    });

    if (!rounds.length) {
      rounds = await buildRoundPlanFromJob(application.jobPosting);
      return Helper.response(true, "Interview schedule detail fetched", rounds, res, 200);
    }

    return Helper.response(true, "Interview schedule detail fetched", rounds, res, 200);
  } catch (error) {
    console.error("interviewScheduleDetail error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveInterviewSchedule = async (req, res) => {
  try {
    const { application_id, rounds } = req.body || {};
    if (!application_id || !Array.isArray(rounds)) {
      return Helper.response(false, "application_id and rounds are required", {}, res, 400);
    }

    const application = await Application.findOne({
      where: { id: application_id },
      include: [{ model: JobRequirement, as: "jobPosting" }],
    });

    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    const tenantId = application.jobPosting?.tenantId || req.users?.tenantId;
    const branchId = normalizeNullableValue(application.jobPosting?.branchId || req.users?.branchId);
    const userId = req.users?.id || null;

    await CandidateInterviewRound.destroy({ where: { application_id } });

    const payload = rounds.map((round, index) => ({
      tenantId,
      branchId,
      application_id,
      round_id: round.round_id || null,
      round_name: round.round_name,
      round_type: round.round_type || null,
      sequence: round.sequence || index + 1,
      interviewer_id: round.interviewer_id || null,
      interviewer_name: round.interviewer_name || null,
      interviewer_email: round.interviewer_email || null,
      scheduled_at: round.scheduled_at || null,
      duration_minutes: round.duration_minutes || null,
      mode: round.mode || null,
      meeting_link: round.meeting_link || null,
      status: round.status || (round.scheduled_at ? "scheduled" : "pending"),
      feedback_submitted: !!round.feedback_submitted,
      createdBy: userId,
      updatedBy: userId,
    }));

    const createdRounds = await CandidateInterviewRound.bulkCreate(payload);

    await application.update({
      stage: "interview_scheduled",
      status: "interview_scheduled",
    });

    return Helper.response(true, "Interview schedule saved", createdRounds, res, 200);
  } catch (error) {
    console.error("saveInterviewSchedule error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveInterviewFeedback = async (req, res) => {
  try {
    const {
      application_id,
      round_id,
      interviewer_name,
      interviewer_email,
      rating,
      recommendation,
      strengths,
      concerns,
      notes,
    } = req.body || {};

    if (!application_id || !round_id || !interviewer_name) {
      return Helper.response(false, "application_id, round_id and interviewer_name are required", {}, res, 400);
    }

    const application = await Application.findOne({
      where: { id: application_id },
      include: [{ model: JobRequirement, as: "jobPosting" }],
    });

    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    const tenantId = application.jobPosting?.tenantId || req.users?.tenantId;
    const branchId = normalizeNullableValue(application.jobPosting?.branchId || req.users?.branchId);
    const userId = req.users?.id || null;

    const feedback = await CandidateInterviewFeedback.create({
      tenantId,
      branchId,
      application_id,
      round_id,
      interviewer_name,
      interviewer_email: interviewer_email || null,
      rating: Number(rating || 0),
      recommendation: recommendation || "hold",
      strengths: strengths || "",
      concerns: concerns || "",
      notes: notes || "",
      submitted_at: new Date(),
      createdBy: userId,
      updatedBy: userId,
    });

    const existingRound = await CandidateInterviewRound.findOne({
      where: { application_id, round_id },
    });

    if (existingRound) {
      await existingRound.update({
        interviewer_name,
        interviewer_email: interviewer_email || existingRound.interviewer_email,
        feedback_submitted: true,
        status: "completed",
        updatedBy: userId,
      });
    }

    // If candidate is rejected in this round → mark rejected and stop
    if (recommendation == "rejected") {
      await application.update({ stage: "rejected", status: "rejected" });
      return Helper.response(true, "Feedback saved", feedback, res, 200);
    }

    // Check if ALL assigned rounds now have feedback submitted
    const allRounds = await CandidateInterviewRound.findAll({ where: { application_id } });
    const assignedRounds = allRounds.filter(r => r.interviewer_id); // only rounds with an interviewer
    const allDone = assignedRounds.length > 0 && assignedRounds.every(r => r.feedback_submitted);

    const newStage = allDone ? "offered" : "interview_in_progress";
    await application.update({ stage: newStage, status: newStage });

    return Helper.response(true, "Feedback saved", feedback, res, 200);
  } catch (error) {
    console.error("saveInterviewFeedback error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

// ─── Interview Panel Users ────────────────────────────────────────────────────

exports.createInterviewPanelUser = async (req, res) => {
  try {
    const { first_name, last_name, email, mobile_no, department, designation, gender, password } = req.body;

    const tenantId = req.users?.tenantId;
    const branchId = normalizeNullableValue(req.users?.branchId);
    const userId = req.users?.id;

    if (!first_name || !last_name || !email || !mobile_no || !department || !designation) {
      return Helper.response(false, "first_name, last_name, email, mobile_no, department and designation are required", {}, res, 400);
    }

    const existingEmail = await InterviewPanelUser.findOne({ where: { email, tenantId } });
    if (existingEmail) {
      return Helper.response(false, "Email already exists", {}, res, 400);
    }

    const existingMobile = await InterviewPanelUser.findOne({ where: { mobile_no, tenantId } });
    if (existingMobile) {
      return Helper.response(false, "Mobile number already exists", {}, res, 400);
    }

    const user = await InterviewPanelUser.create({
      tenantId,
      branchId,
      first_name,
      last_name,
      email,
      mobile_no,
      department,
      designation,
      gender: gender || null,
      password: password ? hashPassword(password) : null,
      status: "active",
      createdBy: userId,
    });

    return Helper.response(true, "Panel user created successfully", user, res, 200);
  } catch (error) {
    console.error("createInterviewPanelUser error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.updateInterviewPanelUser = async (req, res) => {
  try {
    const { id, email, mobile_no } = req.body;
    const userId = req.users?.id;
    const tenantId = req.users?.tenantId;
    const { Op } = require("sequelize");

    if (!id) {
      return Helper.response(false, "id is required", {}, res, 400);
    }

    const user = await InterviewPanelUser.findOne({ where: { id } });
    if (!user) {
      return Helper.response(false, "Panel user not found", {}, res, 404);
    }

    if (email) {
      const existingEmail = await InterviewPanelUser.findOne({ where: { email, tenantId, id: { [Op.ne]: id } } });
      if (existingEmail) {
        return Helper.response(false, "Email already exists", {}, res, 400);
      }
    }

    if (mobile_no) {
      const existingMobile = await InterviewPanelUser.findOne({ where: { mobile_no, tenantId, id: { [Op.ne]: id } } });
      if (existingMobile) {
        return Helper.response(false, "Mobile number already exists", {}, res, 400);
      }
    }

    await user.update({ ...req.body, updatedBy: userId });
    return Helper.response(true, "Panel user updated successfully", user, res, 200);
  } catch (error) {
    console.error("updateInterviewPanelUser error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.listInterviewPanelUsers = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = normalizeNullableValue(req.users?.branchId);

    const where = { tenantId };
    if (branchId) where.branchId = branchId;

    const users = await InterviewPanelUser.findAll({
      where,
      include: [
        {
          model: Department,
          as: "departmentData",
          attributes: ["id", "name"],
        },
        {
          model: Designation,
          as: "designationData",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const data = users.map((u, index) => ({
      ...u.toJSON(),
      si_no: index + 1,
      department_name: u.departmentData?.name || null,
      designation_name: u.designationData?.name || null,
    }));

    return Helper.response(true, "Panel users list", data, res, 200);
  } catch (error) {
    console.error("listInterviewPanelUsers error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.deleteInterviewPanelUser = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return Helper.response(false, "id is required", {}, res, 400);
    }

    const user = await InterviewPanelUser.findOne({ where: { id } });
    if (!user) {
      return Helper.response(false, "Panel user not found", {}, res, 404);
    }

    await user.destroy();
    return Helper.response(true, "Panel user deleted successfully", {}, res, 200);
  } catch (error) {
    console.error("deleteInterviewPanelUser error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

// ─── Assign Interviewer ───────────────────────────────────────────────────────

exports.assignInterviewer = async (req, res) => {
  try {
    const { application_id, panel_user_id, round_id, scheduled_at, duration_minutes, mode, meeting_link } = req.body || {};
    const tenantId = req.users?.tenantId;
    const branchId = normalizeNullableValue(req.users?.branchId);
    const userId = req.users?.id;

    if (!application_id || !panel_user_id) {
      return Helper.response(false, "application_id and panel_user_id are required", {}, res, 400);
    }

    const application = await Application.findOne({
      where: { id: application_id },
      include: [{ model: JobRequirement, as: "jobPosting" }],
    });
    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    if (!["shortlisted", "interview_scheduled"].includes(application.stage)) {
      return Helper.response(false, "Interviewer can only be assigned when application is shortlisted or interview scheduled", {}, res, 403);
    }

    const panelUser = await InterviewPanelUser.findOne({ where: { id: panel_user_id } });
    if (!panelUser) {
      return Helper.response(false, "Interview panel user not found", {}, res, 404);
    }

    let roundName = "Interview Round 1";
    let roundType = null;
    let sequence = 1;

    if (round_id) {
      const round = await interview_round.findOne({ where: { id: round_id } });
      if (round) {
        roundName = round.round_name;
        roundType = round.round_type || null;

        // Compute relative position within this job's configured rounds
        const jobRoundIds = Array.isArray(application.jobPosting?.interview_round)
          ? application.jobPosting.interview_round
          : [];
        if (jobRoundIds.length) {
          const jobRounds = await interview_round.findAll({
            where: { id: jobRoundIds },
            order: [["order_sequence", "ASC"]],
            attributes: ["id"],
          });
          const relativeIndex = jobRounds.findIndex((r) => r.id === round_id);
          sequence = relativeIndex >= 0 ? relativeIndex + 1 : 1;
        } else {
          sequence = 1;
        }
      }
    }

    const roundFields = {
      round_id: round_id || null,
      round_name: roundName,
      round_type: roundType,
      sequence,
      interviewer_id: panelUser.id,
      interviewer_name: `${panelUser.first_name} ${panelUser.last_name}`,
      interviewer_email: panelUser.email,
      scheduled_at: scheduled_at || null,
      duration_minutes: duration_minutes || null,
      mode: mode || null,
      meeting_link: meeting_link || null,
      status: scheduled_at ? "scheduled" : "pending",
      updatedBy: userId,
    };

    const existingRound = await CandidateInterviewRound.findOne({
      where: round_id ? { application_id, round_id } : { application_id, sequence },
    });

    if (existingRound) {
      await existingRound.update(roundFields);
    } else {
      await CandidateInterviewRound.create({
        tenantId,
        branchId,
        application_id,
        ...roundFields,
        createdBy: userId,
      });
    }

    await application.update({ stage: "interview_scheduled", status: "interview_scheduled" });

    return Helper.response(true, "Interviewer assigned successfully", {}, res, 200);
  } catch (error) {
    console.error("assignInterviewer error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

// ─── Send Interview Mail ──────────────────────────────────────────────────────

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: parseInt(process.env.MAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

const formatDateTime = (isoStr) => {
  if (!isoStr) return "To be confirmed";
  const d = new Date(isoStr);
  return d.toLocaleString("en-IN", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
};

exports.sendInterviewMail = async (req, res) => {
  try {
    const {
      application_id,
      candidate_name,
      candidate_email,
      interviewer_name,
      interviewer_email,
      round_name,
      job_title,
      scheduled_at,
      duration_minutes,
      mode,
      meeting_link,
    } = req.body || {};

    if (!candidate_email || !interviewer_email) {
      return Helper.response(false, "candidate_email and interviewer_email are required", {}, res, 400);
    }

    const transporter = createTransporter();
    const scheduledStr = formatDateTime(scheduled_at);
    const durationStr = duration_minutes ? `${duration_minutes} minutes` : "Not specified";
    const modeStr = mode ? mode.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Not specified";
    const meetingStr = meeting_link
      ? `<a href="${meeting_link}" style="color:#2563eb;">${meeting_link}</a>`
      : "Will be shared separately";

    // ── Candidate mail ────────────────────────────────────────────────────────
    const candidateMail = {
      from: process.env.MAIL_FROM || `"GENS HR" <${process.env.MAIL_USER}>`,
      to: candidate_email,
      subject: `Interview Scheduled – ${job_title} | ${round_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <div style="background:#2563eb;padding:24px 32px;">
            <h2 style="color:#fff;margin:0;">Interview Invitation</h2>
          </div>
          <div style="padding:28px 32px;color:#1f2937;">
            <p style="margin-top:0;">Dear <strong>${candidate_name}</strong>,</p>
            <p>We are pleased to inform you that your interview has been scheduled for the position of <strong>${job_title}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
              <tr style="background:#f3f4f6;">
                <td style="padding:10px 14px;font-weight:600;width:40%;">Round</td>
                <td style="padding:10px 14px;">${round_name}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;">Date &amp; Time</td>
                <td style="padding:10px 14px;">${scheduledStr}</td>
              </tr>
              <tr style="background:#f3f4f6;">
                <td style="padding:10px 14px;font-weight:600;">Duration</td>
                <td style="padding:10px 14px;">${durationStr}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;">Mode</td>
                <td style="padding:10px 14px;">${modeStr}</td>
              </tr>
              <tr style="background:#f3f4f6;">
                <td style="padding:10px 14px;font-weight:600;">Interviewer</td>
                <td style="padding:10px 14px;">${interviewer_name}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;">Meeting Link</td>
                <td style="padding:10px 14px;">${meetingStr}</td>
              </tr>
            </table>
            <p>Please ensure you are available 5 minutes before the scheduled time. Feel free to reach out if you have any questions.</p>
            <p style="margin-bottom:0;">Best regards,<br/><strong>HR Team – GENS</strong></p>
          </div>
          <div style="background:#f9fafb;padding:14px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            This is an automated message. Please do not reply to this email.
          </div>
        </div>`,
    };

    // ── Interviewer mail ──────────────────────────────────────────────────────
    const interviewerMail = {
      from: process.env.MAIL_FROM || `"GENS HR" <${process.env.MAIL_USER}>`,
      to: interviewer_email,
      subject: `Interview Assigned – ${candidate_name} | ${round_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <div style="background:#059669;padding:24px 32px;">
            <h2 style="color:#fff;margin:0;">Interview Assignment</h2>
          </div>
          <div style="padding:28px 32px;color:#1f2937;">
            <p style="margin-top:0;">Dear <strong>${interviewer_name}</strong>,</p>
            <p>You have been assigned to conduct an interview. Below are the details:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
              <tr style="background:#f3f4f6;">
                <td style="padding:10px 14px;font-weight:600;width:40%;">Candidate</td>
                <td style="padding:10px 14px;">${candidate_name}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;">Position</td>
                <td style="padding:10px 14px;">${job_title}</td>
              </tr>
              <tr style="background:#f3f4f6;">
                <td style="padding:10px 14px;font-weight:600;">Round</td>
                <td style="padding:10px 14px;">${round_name}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;">Date &amp; Time</td>
                <td style="padding:10px 14px;">${scheduledStr}</td>
              </tr>
              <tr style="background:#f3f4f6;">
                <td style="padding:10px 14px;font-weight:600;">Duration</td>
                <td style="padding:10px 14px;">${durationStr}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:600;">Mode</td>
                <td style="padding:10px 14px;">${modeStr}</td>
              </tr>
              <tr style="background:#f3f4f6;">
                <td style="padding:10px 14px;font-weight:600;">Meeting Link</td>
                <td style="padding:10px 14px;">${meetingStr}</td>
              </tr>
            </table>
            <p>Please log in to the portal to review the candidate profile and submit feedback after the interview.</p>
            <p style="margin-bottom:0;">Best regards,<br/><strong>HR Team – GENS</strong></p>
          </div>
          <div style="background:#f9fafb;padding:14px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
            This is an automated message. Please do not reply to this email.
          </div>
        </div>`,
    };

    await Promise.all([
      transporter.sendMail(candidateMail),
      transporter.sendMail(interviewerMail),
    ]);

    return Helper.response(true, "Interview mails sent successfully", {}, res, 200);
  } catch (error) {
    console.error("sendInterviewMail error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

