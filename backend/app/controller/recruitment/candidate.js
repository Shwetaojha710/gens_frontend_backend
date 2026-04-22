const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const axios = require("axios");
const FormData = require("form-data");
const sequelize = require("../../connection/connection");
const Helper = require("../../helper/helper");
const Candidate = require("../../models/candidate");
const Application = require("../../models/application");
const JobRequirement = require("../../models/job_requirement");
const Department = require("../../models/department");
const EmploymentType = require("../../models/employmentType");
const interview_round = require("../../models/interview_round");
const CandidateAtsScore = require("../../models/candidate_ats_score");
const CandidateInterviewRound = require("../../models/candidate_interview_round");

const ATS_EVALUATE_URL = "https://gens.demoquaeretech.in/resume_tracker/api/v1/ats/evaluate-from-resume";

const normalizeEmail = (value = "") => String(value).trim().toLowerCase();

const normalizeBranchId = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === "all" || normalized.toLowerCase() === "null") {
    return null;
  }
  return normalized;
};

const normalizeSkills = (skills) => {
  if (Array.isArray(skills)) {
    return skills.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof skills === "string" && skills.trim()) {
    return skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getResumeUrl = (req, file) => {
  if (!file?.filename) {
    return null;
  }
  const imgBaseUrl = (process.env.IMG_BASE_URL || '').replace(/\/+$/, '');
  return imgBaseUrl ? `${imgBaseUrl}/${file.filename}` : file.filename;
};

const buildResumeUrl = (resumeUrl) => {
  if (!resumeUrl) return null;
  if (resumeUrl.startsWith('http://') || resumeUrl.startsWith('https://')) return resumeUrl;
  const imgBaseUrl = (process.env.IMG_BASE_URL || '').replace(/\/+$/, '');
  return imgBaseUrl ? `${imgBaseUrl}/${resumeUrl}` : resumeUrl;
};

const resolveJobPosting = async (payload = {}) => {
  const { job_posting_id, job_id, slug, token } = payload;
  const whereConditions = [];

  if (job_posting_id) whereConditions.push({ id: job_posting_id });
  if (job_id) whereConditions.push({ id: job_id }, { job_id });
  if (slug) whereConditions.push({ slug });

  if (!whereConditions.length) return null;

  const jobs = await JobRequirement.findAll({
    where: { [Op.or]: whereConditions },
    include: [
      {
        model: Department,
        as: "departmentData",
        attributes: ["id", "name"],
      },
      {
        model: EmploymentType,
        as: "emp_typeData",
        attributes: ["id", "name"],
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  if (!jobs.length) return null;
  if (!token) return jobs[0];

  return jobs.find((item) => String(item.url || "").includes(`token=${token}`)) || null;
};

const calculateAtsScore = (jobPosting, candidate, resumeFile) => {
  let score = 45;

  const requiredExperience = Number(jobPosting?.experience || 0);
  const candidateExperience = Number(candidate?.experience || 0);
  const budgetCtc = Number(jobPosting?.budget_ctc || 0);
  const currentCtc = Number(candidate?.current_ctc || 0);
  const allowedNotice = Number(jobPosting?.notice_period || 0);
  const candidateNotice = Number(candidate?.notice_period || 0);
  const extension = path.extname(resumeFile?.originalname || "").toLowerCase();
  const jobSkills = normalizeSkills(jobPosting?.skills).map((item) => item.toLowerCase());
  const candidateSkills = normalizeSkills(candidate?.skills).map((item) => item.toLowerCase());

  if (requiredExperience === 0) score += 10;
  else if (candidateExperience >= requiredExperience) score += 20;
  else if (candidateExperience >= Math.max(requiredExperience - 1, 0)) score += 12;
  else score += 4;

  if (!budgetCtc || currentCtc <= budgetCtc) score += 12;
  else score += 4;

  if (!allowedNotice || candidateNotice <= allowedNotice) score += 12;
  else score += 4;

  if ([".pdf", ".doc", ".docx"].includes(extension)) score += 8;

  if (jobSkills.length) {
    const matchedSkills = candidateSkills.filter((skill) => jobSkills.includes(skill));
    const skillRatio = matchedSkills.length / jobSkills.length;
    score += Math.round(skillRatio * 18);
  } else if (candidateSkills.length) {
    score += 8;
  }

  return Math.max(0, Math.min(score, 95));
};

const getJobRoundPlan = async (jobPosting, tenantId, branchId) => {
  const roundIds = Array.isArray(jobPosting?.interview_round) ? jobPosting.interview_round : [];

  if (!roundIds.length) return [];

  const where = { id: roundIds, tenantId };
  if (branchId) where.branchId = branchId;

  const rounds = await interview_round.findAll({
    where,
    include: [
      {
        model: require("../../models/round_type"),
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
    sequence: round.order_sequence || index + 1,
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

const serializeApplication = async (application) => {
  const item = application.toJSON ? application.toJSON() : application;
  const fallbackRounds = item.interviewRoundsData?.length
    ? item.interviewRoundsData
    : await getJobRoundPlan(item.jobPosting, item.jobPosting?.tenantId, item.jobPosting?.branchId);
  const orderedRounds = [...(fallbackRounds || [])].sort(
    (left, right) => Number(left?.sequence || 0) - Number(right?.sequence || 0)
  );

  const atsData = item.atsScoreData || {};
  const atsScore = Number(atsData.ats_score ?? item.ats_score ?? 0);
  const manualScore = Number(atsData.manual_score ?? item.manual_score ?? 0);
  const finalScore = Number(atsData.final_score ?? item.final_score ?? Math.round((atsScore + manualScore) / 2));

  return {
    id: item.id,
    candidate_id: item.candidate_id,
    job_id: item.jobPosting?.job_id || item.jobPosting?.id,
    job_posting_id: item.job_posting_id,
    job_title: item.jobPosting?.job_title || "-",
    department: item.jobPosting?.departmentData?.name || "-",
    stage: item.stage || (atsData.shortlisted ? "shortlisted" : "candidate_applied"),
    status: item.status || "submitted",
    name: item.candidate?.name || "-",
    email: item.candidate?.email || "-",
    phone: item.candidate?.phone || "-",
    current_company: item.candidate?.current_company || null,
    last_company: item.candidate?.last_company || null,
    experience: item.candidate?.experience || null,
    current_ctc: item.candidate?.current_ctc || null,
    expected_ctc: item.candidate?.expected_ctc || null,
    notice_period: item.candidate?.notice_period || null,
    current_location: item.candidate?.current_location || null,
    relocate: item.candidate?.relocate || null,
    home_town: item.candidate?.home_town || null,
    roles_and_responsibilities: item.candidate?.roles_and_responsibilities || null,
    project: item.candidate?.project || null,
    tools: item.candidate?.tools || null,
    offer_in_hand: item.candidate?.offer_in_hand || null,
    family_background: item.candidate?.family_background || null,
    highest_qualification: item.candidate?.highest_qualification || null,
    remark: item.candidate?.remark || null,
    skills: item.candidate?.skills || [],
    resume_url: buildResumeUrl(item.candidate?.resume_url),
    resume_name: item.candidate?.resume_url ? item.candidate.resume_url.split("/").pop() : null,
    img_base_url: (process.env.IMG_BASE_URL || '').replace(/\/+$/, ''),
    createdAt: item.createdAt,
    ats: {
      ats_score: atsScore,
      manual_score: manualScore,
      final_score: finalScore,
      scanned_at: atsData.scanned_at || null,
      scanned_by: atsData.scanned_by || null,
      notes: atsData.notes || "",
      shortlisted: !!atsData.shortlisted,
    },
    interview_rounds: orderedRounds.map((round) => ({
      round_id: round.round_id,
      round_name: round.round_name,
      round_type: round.round_type || round.roundMasterData?.roundTypeData?.name || null,
      sequence: round.sequence,
      interviewer_id: round.interviewer_id || null,
      interviewer_name: round.interviewer_name || null,
      interviewer_email: round.interviewer_email || null,
      scheduled_at: round.scheduled_at || null,
      duration_minutes: round.duration_minutes || null,
      mode: round.mode || null,
      meeting_link: round.meeting_link || null,
      status: round.status || "pending",
      feedback_submitted: !!round.feedback_submitted,
    })),
  };
};

const runAtsScan = async (application, jobPosting, candidate, resumeFile, reqUser = {}) => {
  const atsScore = calculateAtsScore(jobPosting, candidate, resumeFile);
  const manualScore = Number(application.manual_score || 0);
  const finalScore = Math.round((atsScore + manualScore) / 2);

  await application.update({
    ats_status: "completed",
    ats_score: atsScore,
    final_score: finalScore,
    stage: "ats_screening",
    status: "screening",
  });

  const tenantId = jobPosting?.tenantId || reqUser?.tenantId;
  const branchId = normalizeBranchId(jobPosting?.branchId || reqUser?.branchId);

  await CandidateAtsScore.upsert({
    application_id: application.id,
    tenantId,
    branchId,
    ats_score: atsScore,
    manual_score: manualScore,
    final_score: finalScore,
    shortlisted: false,
    scanned_at: new Date(),
    scanned_by: reqUser?.id || null,
    notes: "Auto ATS scan completed",
    createdBy: reqUser?.id || null,
    updatedBy: reqUser?.id || null,
  });

  return { ats_status: "completed", ats_score: atsScore, final_score: finalScore };
};

const sendCandidateConfirmation = async (candidate, jobPosting, application) => {
  console.log(`Candidate confirmation placeholder: ${candidate.email} applied for ${jobPosting.job_title} (${application.id})`);

  await application.update({ confirmation_email_sent: true });
  return true;
};

const runExternalAtsScan = async (application, jobPosting, candidate, resumeFile, reqUser = {}) => {
  try {
    const form = new FormData();

    const filePath = path.resolve(resumeFile.path);
    if (fs.existsSync(filePath)) {
      form.append("resume", fs.createReadStream(filePath), {
        filename: resumeFile.originalname,
        contentType: resumeFile.mimetype,
      });
    }

    form.append("application_id", String(application.id));
    form.append("job_title", String(jobPosting.job_title || ""));
    form.append("job_description", String(jobPosting.job_description || ""));
    form.append("required_skills", JSON.stringify(normalizeSkills(jobPosting.skills)));
    form.append("required_experience", String(jobPosting.experience || ""));
    form.append("candidate_name", String(candidate.name || ""));
    form.append("candidate_email", String(candidate.email || ""));

    const response = await axios.post(ATS_EVALUATE_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });

    const data = response.data?.data || response.data?.data|| {};
    const atsScore = Number(data.overall_score ?? data.overall_score ?? 0);
    const manualScore = Number(application.manual_score || 0);
    const finalScore = Number(data.overall_score ?? Math.round((atsScore + manualScore) / 2));

    const tenantId = jobPosting?.tenantId || reqUser?.tenantId;
    const branchId = normalizeBranchId(jobPosting?.branchId || reqUser?.branchId);

    await application.update({
      ats_status: "completed",
      ats_score: atsScore,
      final_score: finalScore,
      stage: "ats_screening",
      status: "screening",
    });

    await CandidateAtsScore.upsert({
      application_id: application.id,
      tenantId,
      branchId,
      ats_score: atsScore,
      manual_score: manualScore,
      final_score: finalScore,
      shortlisted: false,
      scanned_at: new Date(),
      scanned_by: reqUser?.id || null,
      notes: data.notes || "Auto ATS scan completed",
      createdBy: reqUser?.id || null,
      updatedBy: reqUser?.id || null,
    });

    return { ats_status: "completed", ats_score: atsScore, final_score: finalScore };
  } catch (err) {
    console.error("External ATS scan failed:", err.message);
    await application.update({ ats_status: "failed" }).catch(() => {});
    return { ats_status: "failed", ats_score: 0, final_score: 0 };
  }
};

exports.publicJobPosting = async (req, res) => {
  try {
    const jobPosting = await resolveJobPosting(req.body || {});
    if (!jobPosting) {
      return Helper.response(false, "Job posting not found", {}, res, 404);
    }
    return Helper.response(true, "Job posting fetched successfully", jobPosting, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.checkDuplicateCandidateApplication = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;

    // if (!email || !phone) {
    //   return Helper.response(false, "Email or phone is required", {}, res, 400);
    // }

    const jobPosting = await resolveJobPosting(req.body || {});
    if (!jobPosting) {
      return Helper.response(false, "Job posting not found", {}, res, 404);
    }

    // Check duplicate by email
    if (email) {
      const candidateByEmail = await Candidate.findOne({
        where: {
          email: {
            [Op.iLike]: email,
          },
        },
      });

      if (candidateByEmail) {
        const applicationByEmail = await Application.findOne({
          where: {
            candidate_id: candidateByEmail.id,
            job_posting_id: jobPosting.id,
          },
        });

        if (applicationByEmail) {
          return Helper.response(
            true,
            "Duplicate application found",
            {
              exists: true,
              duplicate_by: "email",
              candidate_id: candidateByEmail.id,
              application_id: applicationByEmail.id,
            },
            res,
            200
          );
        }
      }
    }

    // Check duplicate by phone
    if (phone) {
      const candidateByPhone = await Candidate.findOne({
        where: { phone },
      });

      if (candidateByPhone) {
        const applicationByPhone = await Application.findOne({
          where: {
            candidate_id: candidateByPhone.id,
            job_posting_id: jobPosting.id,
          },
        });

        if (applicationByPhone) {
          return Helper.response(
            true,
            "Duplicate application found",
            {
              exists: true,
              duplicate_by: "phone",
              candidate_id: candidateByPhone.id,
              application_id: applicationByPhone.id,
            },
            res,
            200
          );
        }
      }
    }

    return Helper.response(
      true,
      "No duplicate application found",
      { exists: false },
      res,
      200
    );
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.submitCandidateApplication = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      email,
      phone,
      current_company,
      skills,
      experience,
      current_ctc,
      expected_ctc,
      notice_period,
      cover_letter,
    } = req.body;

    if (!name || !email || !phone) {
      await transaction.rollback();
      return Helper.response(false, "Name, email, and phone are required", {}, res, 400);
    }

    if (!Helper.isValidEmail(email)) {
      await transaction.rollback();
      return Helper.response(false, "Please enter a valid email address", {}, res, 400);
    }

    if (!req.file) {
      await transaction.rollback();
      return Helper.response(false, "Resume file is required", {}, res, 400);
    }

    const jobPosting = await resolveJobPosting(req.body || {});
    if (!jobPosting) {
      Helper.deleteUploadedFiles({ resume: req.file });
      await transaction.rollback();
      return Helper.response(false, "Job posting not found", {}, res, 404);
    }

    if (String(jobPosting.status || "").toLowerCase() !== "open") {
      Helper.deleteUploadedFiles({ resume: req.file });
      await transaction.rollback();
      return Helper.response(false, "Applications are closed for this job posting", {}, res, 400);
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedCandidateSkills = normalizeSkills(skills);
    const resumeUrl = getResumeUrl(req, req.file);

    let candidate = await Candidate.findOne({
      where: {
        email: {
          [Op.iLike]: normalizedEmail,
        },
      },
      transaction,
    });

    if (!candidate) {
      candidate = await Candidate.create(
        {
          name,
          email: normalizedEmail,
          phone,
          current_company,
          skills: normalizedCandidateSkills,
          resume_url: resumeUrl,
          experience,
          current_ctc,
          expected_ctc,
          notice_period,
          cover_letter,
        },
        { transaction }
      );
    } else {
      await candidate.update(
        {
          name,
          phone,
          current_company,
          skills: normalizedCandidateSkills,
          resume_url: resumeUrl || candidate.resume_url,
          experience,
          current_ctc,
          expected_ctc,
          notice_period,
          cover_letter,
        },
        { transaction }
      );
    }

    // Check if a different candidate with the same phone has already applied to this job
    const candidateByPhone = await Candidate.findOne({
      where: {
        phone,
        id: { [Op.ne]: candidate.id },
      },
      transaction,
    });

    if (candidateByPhone) {
      const phoneBasedDuplicate = await Application.findOne({
        where: {
          candidate_id: candidateByPhone.id,
          job_posting_id: jobPosting.id,
        },
        transaction,
      });

      if (phoneBasedDuplicate) {
        Helper.deleteUploadedFiles({ resume: req.file });
        await transaction.rollback();
        return Helper.response(false, "This mobile number has already applied for this job posting", { exists: true }, res, 409);
      }
    }

    // Check if the same candidate (by email) has already applied to this job
    const duplicateApplication = await Application.findOne({
      where: {
        candidate_id: candidate.id,
        job_posting_id: jobPosting.id,
      },
      transaction,
    });

    if (duplicateApplication) {
      Helper.deleteUploadedFiles({ resume: req.file });
      await transaction.rollback();
      return Helper.response(false, "This email has already applied for this job posting", { exists: true }, res, 409);
    }

    const application = await Application.create(
      {
        candidate_id: candidate.id,
        job_posting_id: jobPosting.id,
        stage: "candidate_applied",
        status: "submitted",
        applied_at: new Date(),
        ats_status: "queued",
      },
      { transaction }
    );

    await transaction.commit();

    await sendCandidateConfirmation(candidate, jobPosting, application);
    const atsResult = await runExternalAtsScan(application, jobPosting, candidate, req.file, req.users || {});

    return Helper.response(
      true,
      "Application submitted successfully",
      {
        candidate,
        application,
        ats_status: atsResult.ats_status,
        ats_score: atsResult.ats_score,
        final_score: atsResult.final_score,
        confirmation_email_sent: true,
      },
      res,
      200
    );
  } catch (error) {
    console.error(error);
    Helper.deleteUploadedFiles({ resume: req.file });
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError.message);
    }
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.listCandidateApplications = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = normalizeBranchId(req.users?.branchId);

    const jobWhere = { tenantId };
    if (branchId) jobWhere.branchId = branchId;

    const applications = await Application.findAll({
      include: [
        { model: Candidate, as: "candidate" },
        {
          model: JobRequirement,
          as: "jobPosting",
          where: jobWhere,
          include: [{ model: Department, as: "departmentData", attributes: ["id", "name"] }],
        },
      ],
      order: [["applied_at", "DESC"]],
    });

    return Helper.response(true, "Applications fetched successfully", applications, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.adminPipeline = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = normalizeBranchId(req.users?.branchId);
    const { stage, status, search, job_id } = req.body || {};

    const appWhere =  {};
    if (stage) appWhere.stage = stage;
    if (status) appWhere.status = status;

    const jobWhere = { tenantId };
    if (branchId) jobWhere.branchId = branchId;
    if (job_id) {
      jobWhere[Op.or] = [{ id: job_id }, { job_id }];
    }

    const applications = await Application.findAll({
      where: appWhere,
      include: [
        {
          model: Candidate,
          as: "candidate",
          ...(search
            ? {
                where: {
                  [Op.or]: [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                    { phone: { [Op.iLike]: `%${search}%` } },
                  ],
                },
              }
            : {}),
        },
        {
          model: JobRequirement,
          as: "jobPosting",
          where: jobWhere,
          include: [{ model: Department, as: "departmentData", attributes: ["id", "name"] }],
        },
        { model: CandidateAtsScore, as: "atsScoreData", required: false },
        { model: CandidateInterviewRound, as: "interviewRoundsData", required: false },
      ],
      order: [["applied_at", "DESC"]],
    });

    const serialized = [];
    for (const application of applications) {
      serialized.push(await serializeApplication(application));
    }

    return Helper.response(true, "Candidate pipeline fetched successfully", serialized, res, 200);
  } catch (error) {
    console.error("adminPipeline error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.applicationDetail = async (req, res) => {
  try {
    const { application_id } = req.body || {};
    if (!application_id) {
      return Helper.response(false, "application_id is required", {}, res, 400);
    }

    const application = await Application.findOne({
      where: { id: application_id },
      include: [
        { model: Candidate, as: "candidate" },
        {
          model: JobRequirement,
          as: "jobPosting",
          include: [{ model: Department, as: "departmentData", attributes: ["id", "name"] }],
        },
        { model: CandidateAtsScore, as: "atsScoreData", required: false },
        {
          model: CandidateInterviewRound,
          as: "interviewRoundsData",
          required: false,
          separate: true,
          order: [["sequence", "ASC"]],
        },
      ],
    });

    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    const serialized = await serializeApplication(application);
    return Helper.response(true, "Application detail fetched successfully", serialized, res, 200);
  } catch (error) {
    console.error("applicationDetail error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveAtsScore = async (req, res) => {
  try {
    const { application_id, ats_score, manual_score, notes, shortlisted } = req.body || {};
    if (!application_id) {
      return Helper.response(false, "application_id is required", {}, res, 400);
    }

    const application = await Application.findOne({ where: { id: application_id } });
    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    const finalScore = Math.round((Number(ats_score || 0) + Number(manual_score || 0)) / 2);
    const nextStage = shortlisted ? "shortlisted" : "ats_screening";
    const nextStatus = shortlisted ? "shortlisted" : "screening";

    await CandidateAtsScore.upsert({
      application_id,
      tenantId: req.users?.tenantId || application.tenantId,
      branchId: normalizeBranchId(req.users?.branchId),
      ats_score: Number(ats_score || 0),
      manual_score: Number(manual_score || 0),
      final_score: finalScore,
      notes: notes || "",
      shortlisted: !!shortlisted,
      scanned_at: new Date(),
      scanned_by: req.users?.id || null,
      createdBy: req.users?.id || null,
      updatedBy: req.users?.id || null,
    });

    await application.update({
      ats_status: "completed",
      ats_score: Number(ats_score || 0),
      manual_score: Number(manual_score || 0),
      final_score: finalScore,
      stage: nextStage,
      status: nextStatus,
    });

    return Helper.response(true, "ATS score updated", { final_score: finalScore, stage: nextStage }, res, 200);
  } catch (error) {
    console.error("saveAtsScore error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.updateCandidateApplication = async (req, res) => {
  try {
    const {
      application_id, name, email, phone, current_company, last_company,
      experience, current_ctc, expected_ctc, notice_period, skills, remark,
      current_location, relocate, home_town, roles_and_responsibilities,
      project, tools, offer_in_hand, family_background, highest_qualification,
    } = req.body || {};

    if (!application_id) {
      return Helper.response(false, "application_id is required", {}, res, 400);
    }

    const application = await Application.findOne({
      where: { id: application_id },
      include: [{ model: Candidate, as: "candidate" }],
    });

    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    if (application.stage !== "candidate_applied") {
      return Helper.response(false, "Application can only be edited at 'candidate_applied' stage", {}, res, 403);
    }

    await application.candidate.update({
      name: name || application.candidate.name,
      email: email ? normalizeEmail(email) : application.candidate.email,
      phone: phone || application.candidate.phone,
      current_company: current_company ?? application.candidate.current_company,
      last_company: last_company ?? application.candidate.last_company,
      experience: experience ?? application.candidate.experience,
      current_ctc: current_ctc ?? application.candidate.current_ctc,
      expected_ctc: expected_ctc ?? application.candidate.expected_ctc,
      notice_period: notice_period ?? application.candidate.notice_period,
      remark: remark ?? application.candidate.remark,
      current_location: current_location ?? application.candidate.current_location,
      relocate: relocate ?? application.candidate.relocate,
      home_town: home_town ?? application.candidate.home_town,
      roles_and_responsibilities: roles_and_responsibilities ?? application.candidate.roles_and_responsibilities,
      project: project ?? application.candidate.project,
      tools: tools ?? application.candidate.tools,
      offer_in_hand: offer_in_hand ?? application.candidate.offer_in_hand,
      family_background: family_background ?? application.candidate.family_background,
      highest_qualification: highest_qualification ?? application.candidate.highest_qualification,
      skills: skills !== undefined ? normalizeSkills(skills) : application.candidate.skills,
      updatedBy: req.users?.id || null,
    });

    return Helper.response(true, "Application updated successfully", { application_id }, res, 200);
  } catch (error) {
    console.error("updateCandidateApplication error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.updateApplicationStage = async (req, res) => {
  try {
    const { application_id, stage, status } = req.body || {};
    if (!application_id || !stage) {
      return Helper.response(false, "application_id and stage are required", {}, res, 400);
    }

    const application = await Application.findOne({ where: { id: application_id } });
    if (!application) {
      return Helper.response(false, "Application not found", {}, res, 404);
    }

    await application.update({
      stage,
      status: status || application.status,
    });

    if (stage == "shortlisted") {
      await CandidateAtsScore.update(
        { shortlisted: true, updatedBy: req.users?.id || null },
        { where: { application_id } }
      );
    }

    return Helper.response(true, "Application stage updated", { application_id, stage, status: status || application.status }, res, 200);
  } catch (error) {
    console.error("updateApplicationStage error:", error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};
