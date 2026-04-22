const JobRequirement = require("../../models/job_requirement");
const Helper = require("../../helper/helper.js");
const sequelize = require("../../connection/connection.js");
const Department = require("../../models/department.js");
const Skills = require("../../models/skills.js");
const EmploymentType = require("../../models/employmentType.js");
const OfferLetter = require("../../models/offer_letter.js");

const { v4: uuidv4 } = require("uuid");
const job_requirement = require("../../models/job_requirement");
const interview_round = require("../../models/interview_round.js");
const { application } = require("express");
const Application = require("../../models/application.js");

const normalizeCandidatePreference = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalizedValue = String(value).trim().toLowerCase();
  const allowedValues = ["male", "female", "both"];

  return allowedValues.includes(normalizedValue) ? normalizedValue : null;
};

const normalizeInterviewRounds = (interview_round_ids, interview_rounds) => {
  const roundsValue =
    interview_round_ids !== undefined ? interview_round_ids : interview_rounds;

  if (roundsValue === undefined || roundsValue === null) {
    return undefined;
  }

  if (!Array.isArray(roundsValue)) {
    return null;
  }

  return roundsValue;
};

exports.createJobRequirement = async (req, res) => {
  try {
    const {
      job_title,
      department,
      skills,
      experience,
      budget_ctc,
      notice_period,
      job_description,
      emp_type,
      emp_length,
      mode,
      location,
      designation,
      no_of_opening,
      qualification,
      interview_round_ids,
      interview_rounds,
      candidate_preference,
      expires_days,
    } = req.body;

    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const userId = req.users?.id;

    if (!job_title || !department || !job_description || !qualification || !experience || !emp_type) {
      return Helper.response(false, "Required fields missing", {}, res, 400);
    }

    const normalizedCandidatePreference =
      normalizeCandidatePreference(candidate_preference);

    if (normalizedCandidatePreference === null) {
      return Helper.response(
        false,
        "candidate_preference must be male, female, or both",
        {},
        res,
        400,
      );
    }

    const normalizedInterviewRounds = normalizeInterviewRounds(
      interview_round_ids,
      interview_rounds,
    );

    if (normalizedInterviewRounds === null) {
      return Helper.response(
        false,
        "interview_round_ids must be an array",
        {},
        res,
        400,
      );
    }

    const base_url = process.env.CAN_BASE_URL;

    const slug = job_title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const token = uuidv4();

    const job = await JobRequirement.create({
      tenantId,
      branchId,
      job_title,
      department,
      skills,
      experience,
      budget_ctc,
      notice_period,
      job_description,
      emp_type,
      emp_length,
      mode,
      slug,
      location,
      no_of_opening,
      designation,
      qualification,
      candidate_preference: normalizedCandidatePreference ?? "both",
      interview_round: normalizedInterviewRounds ?? null,
      createdBy: userId,
    });

    const jobCode = `JOB${String(job.id).padStart(4, "0")}`;

    const url = `${slug}?job_id=${job.id}&token=${token}`;

    const expiresDaysNum = expires_days !== undefined && expires_days !== null
      ? Number(expires_days)
      : 0;
    const expiresAt = expiresDaysNum > 0
      ? new Date(Date.now() + expiresDaysNum * 86400000)
      : null;

    await job.update({
      job_id: jobCode,
      url,
      token,
      expires_days: expiresDaysNum,
      expires_at: expiresAt,
    });

    return Helper.response(true, "Created Successfully", job, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.deleteJobRequirement = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return Helper.response(false, "Id is required", {}, res, 400);
    }

    const job = await JobRequirement.findOne({ where: { id } });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job Requirement not found",
      });
    }

    await job.destroy();

    return Helper.response(
      true,
      "Job Requirement deleted successfully",
      job,
      res,
      200,
    );
  } catch (error) {
    console.error(error);
    return Helper.response(true, error.message, {}, res, 500);
  }
};

exports.getJobRequirements = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const { department, skills, status } = req.body;
    let whereCondition = {
      tenantId,
      branchId,

    };
    if (department) {
      whereCondition.department = department;
    }
    if (skills) {
      whereCondition.skills = skills;
    }
    if (status) {
      whereCondition.status = status;
    }

    const jobs = await JobRequirement.findAll({
      where: whereCondition,
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
         {
          model: Application,
          as: "applications",
          attributes: ["id"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    if (jobs.length == 0) {
      return Helper.response(false, "No Data Found", {}, res, 200);
    }

    const allInterviewRoundIds = [
      ...new Set(
        jobs.flatMap((job) =>
          Array.isArray(job.interview_round) ? job.interview_round : [],
        ),
      ),
    ];

    let interviewRoundMap = new Map();

    if (allInterviewRoundIds.length > 0) {
      const interviewRounds = await interview_round.findAll({
        where: {
          id: allInterviewRoundIds,
          tenantId,
          branchId,
        },
        include: [
          {
            model: require("../../models/round_type"),
            as: "roundTypeData",
            attributes: ["id", "name"],
          },
        ],
      });

      interviewRoundMap = new Map(
        interviewRounds.map((round) => [round.id, round.toJSON()]),
      );
    }

    const jobsWithInterviewRounds = jobs.map((job) => {
      const jobData = job.toJSON();
      const interviewRoundIds = Array.isArray(jobData.interview_round)
        ? jobData.interview_round
        : [];

      jobData.interview_round_data = interviewRoundIds
        .map((roundId) => interviewRoundMap.get(roundId))
        .filter(Boolean);

      jobData.application_count = Array.isArray(jobData.applications)
        ? jobData.applications.length
        : 0;
      jobData.url=`${process.env.CAN_BASE_URL}/${jobData.url}`;
      return jobData;
    });

    return Helper.response(
      true,
      "Data Found Successfully",
      jobsWithInterviewRounds,
      res,
      200,
    );
  } catch (error) {
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getSkills = async (req, res) => {
  try {
    const data = await Skills.findAll({
      raw: true,
      order: [["createdAt", "desc"]],
    });

    if (data.length == 0) {
      return Helper.response(false, "No Data Found", {}, res, 400);
    }

    return Helper.response(true, "Data Found Successfully", data, res, 200);
  } catch (error) {
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.updateJobRequirement = async (req, res) => {
  try {
    const {
      id,
      job_title,
      department,
      skills,
      experience,
      budget_ctc,
      notice_period,
      job_description,
      emp_type,
      emp_length,
      mode,
      location,
      designation,
      no_of_opening,
      interview_round_ids,
      interview_rounds,
      candidate_preference,
      qualification,
      expires_days,
    } = req.body;

    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const userId = req.users?.id;

    if (!id) {
      return Helper.response(
        false,
        "JobRequirement ID is required",
        {},
        res,
        400,
      );
    }

    const normalizedCandidatePreference =
      normalizeCandidatePreference(candidate_preference);

    if (normalizedCandidatePreference === null) {
      return Helper.response(
        false,
        "candidate_preference must be male, female, or both",
        {},
        res,
        400,
      );
    }

    const normalizedInterviewRounds = normalizeInterviewRounds(
      interview_round_ids,
      interview_rounds,
    );

    if (normalizedInterviewRounds === null) {
      return Helper.response(
        false,
        "interview_round_ids must be an array",
        {},
        res,
        400,
      );
    }

    const job = await JobRequirement.findOne({
      where: { id, tenantId ,branchId},
    });

    if (!job) {
      return Helper.response(false, "Job not found", {}, res, 404);
    }

    const pick = (newVal, existing) =>
      newVal !== undefined && newVal !== null && newVal !== "" ? newVal : existing;

    await job.update({
      job_title: pick(job_title, job.job_title),
      department: pick(department, job.department),
      skills: pick(skills, job.skills),
      experience: pick(experience, job.experience),
      budget_ctc: pick(budget_ctc, job.budget_ctc),
      notice_period: pick(notice_period, job.notice_period),
      job_description: pick(job_description, job.job_description),
      emp_type: pick(emp_type, job.emp_type),
      emp_length: pick(emp_length, job.emp_length),
      mode: pick(mode, job.mode),
      location: pick(location, job.location),
      designation: pick(designation, job.designation),
      no_of_opening: no_of_opening ?? job.no_of_opening,
      qualification: pick(qualification, job.qualification),
      candidate_preference: normalizedCandidatePreference ?? job.candidate_preference,
      interview_round: normalizedInterviewRounds ?? job.interview_round,
      updatedBy: userId,
      ...(expires_days !== undefined && expires_days !== null ? (() => {
        const expiresDaysNum = Number(expires_days);
        const expiresAt = expiresDaysNum > 0
          ? new Date(Date.now() + expiresDaysNum * 86400000)
          : null;
        return { expires_days: expiresDaysNum, expires_at: expiresAt };
      })() : {}),
    });

    return Helper.response(true, "Updated Successfully", job, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.publishJob = async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id) {
      return Helper.response(false, "Id is required", {}, res, 400);
    }

    const updateJob = await job_requirement.update(
      {
        status,
      },
      {
        where: {
          id: id,
        },
      },
    );

    return Helper.response(true, "Data Updated Successfully", {}, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveJobLink = async (req, res) => {
  try {
    const { job_id, slug, base_url, token, expires_days } = req.body;

    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    if (!job_id) {
      return Helper.response(false, "job_id is required", {}, res, 400);
    }
    if (!token) {
      return Helper.response(false, "token is required", {}, res, 400);
    }

    const job = await JobRequirement.findOne({
      where: { id: job_id, tenantId, branchId },
    });

    if (!job) {
      return Helper.response(false, "Job not found", {}, res, 404);
    }

    const finalSlug = slug || job.slug;
    const finalBaseUrl = (base_url || process.env.CAN_BASE_URL || "").replace(/\/+$/, "");
    const fullUrl = `${finalBaseUrl}/${finalSlug}?job_id=${job_id}&token=${token}`;

    const expiresDaysNum = Number(expires_days) || 0;
    const expiresAt = expiresDaysNum > 0
      ? new Date(Date.now() + expiresDaysNum * 86400000)
      : null;

    await job.update({
      slug: finalSlug,
      token,
      url: fullUrl,
      expires_days: expiresDaysNum,
      expires_at: expiresAt,
    });

    return Helper.response(
      true,
      "Link saved successfully",
      {
        url: fullUrl,
        token,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        expires_days: expiresDaysNum,
      },
      res,
      200
    );
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getOfferLetters = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    const letters = await OfferLetter.findAll({
      where: { tenantId, branchId },
      order: [['createdAt', 'DESC']],
    });

    if (!letters.length) {
      return Helper.response(false, 'No Data Found', [], res, 200);
    }

    return Helper.response(true, 'Data Found Successfully', letters, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.checkDuplicateOfferLetter = async (req, res) => {
  try {
    const { mobileNo, email, aadhaarNo } = req.body;
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    const { Op } = require("sequelize");
    const orConditions = [];
    if (mobileNo) orConditions.push({ mobileNo, tenantId, branchId });
    if (email)    orConditions.push({ email,    tenantId, branchId });
    if (aadhaarNo) orConditions.push({ aadhaarNo, tenantId, branchId });

    if (!orConditions.length) {
      return Helper.response(false, "No fields to check", {}, res, 400);
    }

    const existing = await OfferLetter.findOne({ where: { [Op.or]: orConditions } });

    if (existing) {
      let field = existing.mobileNo === mobileNo ? "Mobile number"
        : existing.email === email ? "Email"
        : "Aadhaar number";
      return Helper.response(false, `${field} already exists. Duplicate offer letter not allowed.`, {}, res, 200);
    }

    return Helper.response(true, "No duplicate found", {}, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

const PdfPrinter = require("pdfmake");
const path = require("path");
const fs = require("fs");

const pdfFonts = {
  Roboto: { normal: "Helvetica", bold: "Helvetica-Bold", italics: "Helvetica-Oblique", bolditalics: "Helvetica-BoldOblique" }
};
const offerPrinter = new PdfPrinter(pdfFonts);

const formatLetterDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const v = day % 100;
  const suffixes = ['TH','ST','ND','RD'];
  const suffix = (v >= 11 && v <= 13) ? 'TH' : (suffixes[day % 10] || 'TH');
  return `${day}${suffix} ${month}, ${year}`;
};

exports.getOfferLetterByPhone = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    if (!mobileNo) return Helper.response(false, "Mobile number is required", {}, res, 400);

    const letter = await OfferLetter.findOne({ where: { mobileNo, tenantId, branchId } });
    if (!letter) return Helper.response(false, "No offer letter found for this mobile number", {}, res, 200);

    return Helper.response(true, "Offer letter found", letter, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.generateOfferLetterPdf = async (req, res) => {
  try {
    const { id } = req.body;
    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;

    if (!id) return Helper.response(false, "ID is required", {}, res, 400);

    const d = await OfferLetter.findOne({ where: { id, tenantId, branchId } });
    if (!d) return Helper.response(false, "Offer letter not found", {}, res, 404);

    const salutationPrefix = d.gender == 'Male' ? 'S/O' : d.gender == 'Female' ? 'D/O' : 'C/O';
    const refNo = d.refNo ? `Quaere/Emp/Offer/${d.refNo}` : 'Quaere/Emp/Offer/';
    const offerDateStr = formatLetterDate(d.offerDate);
    const joiningDateStr = formatLetterDate(d.joiningDate);

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [60, 80, 60, 60],
      content: [
        {
          columns: [
            { text: `Ref: ${refNo}`, bold: true, fontSize: 10 },
            { text: `Dated: ${offerDateStr}`, bold: true, fontSize: 10, alignment: 'right' }
          ],
          margin: [0, 20, 0, 20]
        },
        {
          stack: [
            { text: `${d.firstName} ${d.lastName}`, bold: true, fontSize: 10 },
            { text: `${salutationPrefix} ${d.fatherName}`, fontSize: 10 },
            { text: d.permanentAddress || '', fontSize: 10 }
          ],
          margin: [0, 0, 0, 20]
        },
        { text: `Dear ${d.firstName},`, bold: true, margin: [0, 0, 0, 12] },
        { text: `With reference to your application and subsequent interview with us, we are pleased to offer you employment in our Company as ${d.designation} in the ${d.department} at our Head Office, as per the mutually agreed terms and conditions discussed with you at the time of interview.`, fontSize: 10, margin: [0, 0, 0, 8] },
        { text: `You are requested to report for joining on or before ${joiningDateStr}.`, fontSize: 10, margin: [0, 0, 0, 8] },
        { text: 'You are advised to submit the following documents at the time of joining:', fontSize: 10, margin: [0, 0, 0, 5] },
        {
          ol: [
            'Three Latest passport size color photographs.',
            'Self-attested copy of address proof & ID proof.',
            'One set of all credentials (mark sheet of 10th & 12th and pass certificate with Degree/Diploma).',
            'Salary proof from previous Company.',
            'Relieving Letter/ No dues/ Clearance Certificate from all previous employers.',
            'Two references of immediate reporting person.'
          ],
          fontSize: 10, margin: [0, 0, 0, 8]
        },
        { text: 'This offer would automatically stand revoked in the event of not reporting at the date specified above and/or you not complying with any other terms & conditions of employment or in case of a negative reference check received. At the time of joining, the formal appointment letter, containing detailed terms & conditions, will be issued to you.', fontSize: 10, margin: [0, 0, 0, 8] },
        { text: 'We take this opportunity to welcome you to our Company and look forward to a long and mutually beneficial association with you.', fontSize: 10, margin: [0, 0, 0, 8] },
        { text: 'Please confirm your acceptance of this offer by signing and returning a copy of this letter to us.', fontSize: 10, margin: [0, 0, 0, 30] },
        {
          columns: [
            { width: '50%', stack: [{ text: 'Thanks & Regards', fontSize: 10 }, { text: '\n\n' }, { text: 'Human Resource Dept', bold: true, fontSize: 10 }] },
            { width: '50%', stack: [{ text: 'Agreed & Accepted', fontSize: 10, alignment: 'right' }, { text: '\n\n' }, { text: `${d.firstName} ${d.lastName}`, bold: true, fontSize: 10, alignment: 'right' }] }
          ]
        }
      ],
      defaultStyle: { font: 'Roboto' }
    };

    const fileName = `offer_letter_${d.firstName}_${d.lastName}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, "../../../uploads/pdfs", fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const pdfDoc = offerPrinter.createPdfKitDocument(docDefinition);
    const writeStream = fs.createWriteStream(filePath);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const downloadUrl = `${process.env.BASE_URL}/uploads/pdfs/${fileName}`;
    return Helper.response(true, "PDF generated successfully", { downloadUrl }, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveOfferLetter = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      fatherName,
      gender,
      dob,
      aadhaarNo,
      mobileNo,
      email,
      permanentAddress,
      designation,
      department,
      joiningDate,
      offerDate,
      refNo,
    } = req.body;

    const tenantId = req.users?.tenantId;
    const branchId = req.users?.branchId;
    const userId   = req.users?.id;

    if (!firstName || !lastName || !fatherName || !gender || !mobileNo || !email ||
        !permanentAddress || !designation || !department || !joiningDate || !offerDate) {
      return Helper.response(false, "Required fields missing", {}, res, 400);
    }

    // Duplicate check
    const { Op } = require("sequelize");
    const orConditions = [{ mobileNo, tenantId, branchId }, { email, tenantId, branchId }];
    if (aadhaarNo) orConditions.push({ aadhaarNo, tenantId, branchId });

    const existing = await OfferLetter.findOne({ where: { [Op.or]: orConditions } });
    if (existing) {
      let field = existing.mobileNo === mobileNo ? "Mobile number"
        : existing.email === email ? "Email"
        : "Aadhaar number";
      return Helper.response(false, `${field} already exists. Duplicate offer letter not allowed.`, {}, res, 409);
    }

    const letter = await OfferLetter.create({
      tenantId,
      branchId,
      firstName,
      lastName,
      fatherName,
      gender,
      dob: dob || null,
      aadhaarNo: aadhaarNo || null,
      mobileNo,
      email,
      permanentAddress,
      designation,
      department,
      joiningDate,
      offerDate,
      refNo: refNo || null,
      createdBy: userId,
    });

    return Helper.response(true, "Offer letter saved successfully", letter, res, 200);
  } catch (error) {
    console.error(error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};
