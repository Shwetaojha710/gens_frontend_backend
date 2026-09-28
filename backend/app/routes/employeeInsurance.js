const express = require("express");
const router = express.Router();
const { Admin, AppAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  upsertInsuranceDoc,
  getInsuranceDocs,
  deleteInsuranceDoc,
  getAppInsuranceDocs,
} = require("../controller/tenant/employeeInsuranceDocument");

/** Admin / HR */
router.post("/upsertInsuranceDoc", Admin, upload.any(), upsertInsuranceDoc);
router.post("/getInsuranceDocs", Admin, getInsuranceDocs);
router.post("/deleteInsuranceDoc", Admin, deleteInsuranceDoc);

/** Employee portal / mobile (own docs only) */
router.post("/getAppInsuranceDocs", AppAdmin, getAppInsuranceDocs);
router.get("/getAppInsuranceDocs", AppAdmin, getAppInsuranceDocs);

module.exports = router;
