const express = require("express");
const { Admin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl = require("../controller/tenant/aiFace");

const router = express.Router();

// Health
router.post("/ai-face/health", Admin, ctrl.serviceHealth);
router.get("/ai-face/health", Admin, ctrl.serviceHealth);

// Enrollment
router.post("/ai-face/enroll/:employeeId", Admin, upload.array("files", 10), ctrl.enrollEmployee);
router.post("/ai-face/employee/:employeeId", Admin, ctrl.getEmployeeFaces);
router.get("/ai-face/employee/:employeeId", Admin, ctrl.getEmployeeFaces);
router.delete("/ai-face/employee/:employeeId", Admin, ctrl.deactivateEmployeeFaces);
router.post("/ai-face/employee/:employeeId/deactivate", Admin, ctrl.deactivateEmployeeFaces);
router.post("/ai-face/enrolled-list", Admin, ctrl.listEnrolledEmployees);

// Cameras
router.get("/ai-face/cameras", Admin, ctrl.listCameras);
router.post("/ai-face/cameras", Admin, ctrl.createCamera);
router.post("/ai-face/cameras/list", Admin, ctrl.listCameras);
router.put("/ai-face/cameras/:id", Admin, ctrl.updateCamera);
router.post("/ai-face/cameras/:id/update", Admin, ctrl.updateCamera);
router.post("/ai-face/cameras/:id/delete", Admin, ctrl.deleteCamera);
router.delete("/ai-face/cameras/:id", Admin, ctrl.deleteCamera);
router.post("/ai-face/cameras/:id/test", Admin, ctrl.testCamera);
router.post("/ai-face/cameras/:id/preview/start", Admin, ctrl.previewStart);
router.post("/ai-face/cameras/:id/preview", Admin, ctrl.previewCamera);
router.post("/ai-face/cameras/:id/preview/stop", Admin, ctrl.previewStop);
router.post("/ai-face/cameras/:id/start", Admin, ctrl.startCamera);
router.post("/ai-face/cameras/:id/stop", Admin, ctrl.stopCamera);

// Logs / dashboard / config
router.post("/ai-face/recognition-logs", Admin, ctrl.recognitionLogs);
router.get("/ai-face/recognition-logs", Admin, ctrl.recognitionLogs);
router.post("/ai-face/unknown-faces", Admin, (req, res) => {
  req.body.unknownOnly = true;
  return ctrl.recognitionLogs(req, res);
});
router.post("/ai-face/dashboard", Admin, ctrl.dashboard);
router.get("/ai-face/dashboard", Admin, ctrl.dashboard);
router.post("/ai-face/config", Admin, ctrl.getConfig);
router.post("/ai-face/config/update", Admin, ctrl.updateConfig);

// Internal (Python service → GENS punch) — service key, not Admin JWT
router.post("/ai-face/internal/punch", ctrl.internalPunch);
router.post("/ai-face/internal/unknown", ctrl.internalUnknown);

module.exports = router;
