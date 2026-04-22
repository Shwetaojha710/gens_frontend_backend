const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const { Admin } = require("../middleware/auth");
const {
  publicJobPosting,
  checkDuplicateCandidateApplication,
  submitCandidateApplication,
  listCandidateApplications,
  adminPipeline,
  applicationDetail,
  saveAtsScore,
  updateApplicationStage,
  updateCandidateApplication,
} = require("../controller/recruitment/candidate");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "upload/");
  },
  filename: (req, file, cb) => {
    const sanitizedName = path.basename(file.originalname).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${sanitizedName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowedExtensions = [".pdf", ".doc", ".docx"];
  const extension = path.extname(file.originalname || "").toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
    cb(null, true);
    return;
  }

  cb(new Error("Only PDF, DOC, and DOCX files are allowed"), false);
};

const uploadResume = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/public-job-posting", publicJobPosting);
router.post("/check-duplicate-application", checkDuplicateCandidateApplication);
router.post("/submit-application", uploadResume.single("resume"), submitCandidateApplication);
router.post("/list-applications", Admin, listCandidateApplications);
router.post("/admin-pipeline", Admin, adminPipeline);
router.post("/application-detail", Admin, applicationDetail);
router.post("/save-ats-score", Admin, saveAtsScore);
router.post("/update-stage", Admin, updateApplicationStage);
router.post("/update-application", Admin, updateCandidateApplication);

module.exports = router;
