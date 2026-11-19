const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../upload"));
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "_" + Date.now() + path.extname(file.originalname));
  },
});

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (
    ALLOWED.has(file.mimetype) ||
    [".pdf", ".doc", ".docx", ".txt", ".md"].includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, Word, or text files are allowed"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
