const express = require("express");
const path = require("path");
const multer = require("multer");
const { Admin } = require("../middleware/auth");
const {
  listRoster,
  saveRoster,
  deleteRoster,
  uploadRoster,
} = require("../controller/tenant/weekOffRoster");

const router = express.Router();
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, "upload/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
  }),
});

router.post("/weekoff/roster/list", Admin, listRoster);
router.post("/weekoff/roster/save", Admin, saveRoster);
router.post("/weekoff/roster/delete", Admin, deleteRoster);
router.post("/weekoff/roster/upload", Admin, upload.single("file"), uploadRoster);

module.exports = router;
