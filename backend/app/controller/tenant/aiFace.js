const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const { encrypt, decrypt } = require("../../helper/aiFaceCrypto");
const { recordAttendancePunch } = require("../../helper/attendancePunch");
const empPersonal = require("../../models/empPersonal");
const aiFaceEmbedding = require("../../models/aiFaceEmbedding");
const aiCamera = require("../../models/aiCamera");
const aiRecognitionLog = require("../../models/aiRecognitionLog");
const aiCameraHealthLog = require("../../models/aiCameraHealthLog");
const aiProcessingConfig = require("../../models/aiProcessingConfig");
const moment = require("moment-timezone");

const AI_FACE_URL = process.env.AI_FACE_SERVICE_URL || "http://127.0.0.1:8090";
const AI_FACE_KEY = process.env.AI_FACE_SERVICE_KEY || "dev-ai-face-key";
const EVIDENCE_DIR = path.join(__dirname, "../../../upload/ai-face");

/**
 * Punch callback must reach THIS Node process from the face service.
 * BASE_URL may point at another LAN IP that is unreachable → attendance never writes.
 */
function resolvePunchBaseUrl() {
  const explicit = process.env.AI_FACE_PUNCH_BASE_URL;
  if (explicit) return explicit.replace(/\/?$/, "/");
  const port = process.env.SERVER_PORT || "5012";
  return `http://127.0.0.1:${port}/api/`;
}

function ensureEvidenceDir() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
}

function requireBranch(req, res) {
  const branchId = req.users?.branchId;
  if (!branchId || branchId === "null") {
    Helper.response(false, "branchId is required!", {}, res, 200);
    return null;
  }
  return branchId;
}

async function callFaceService(method, urlPath, data) {
  const headers = {
    "X-AI-Service-Key": AI_FACE_KEY,
    "Content-Type": "application/json",
  };
  const config = {
    method,
    url: `${AI_FACE_URL}${urlPath}`,
    headers,
    // Preview frame polls should be snappy; enroll/rebuild can still be long.
    timeout: urlPath.includes("/preview/") ? 15000 : 120000,
    validateStatus: () => true,
  };
  if (data !== undefined && method.toLowerCase() !== "get") {
    config.data = data;
  }
  return axios(config);
}

function embeddingToBuffer(arr) {
  const f32 = Float32Array.from(arr);
  return Buffer.from(f32.buffer);
}

function bufferToEmbedding(buf) {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return Array.from(new Float32Array(ab));
}

async function rebuildFaissForTenant(tenantId) {
  const rows = await aiFaceEmbedding.findAll({
    where: { tenantId, isActive: true },
    attributes: ["id", "employeeId", "embedding"],
  });
  const payload = {
    tenant_id: tenantId,
    items: rows.map((r) => ({
      embedding_id: r.id,
      employee_id: r.employeeId,
      embedding: bufferToEmbedding(r.embedding),
    })),
  };
  return callFaceService("post", "/v1/faiss/rebuild", payload);
}

async function getOrCreateConfig(tenantId, branchId) {
  let cfg = await aiProcessingConfig.findOne({ where: { tenantId, branchId } });
  if (!cfg) {
    cfg = await aiProcessingConfig.create({ tenantId, branchId });
    return cfg;
  }
  // Migrate older strict door-unfriendly defaults → crowd/entry friendly
  const patch = {};
  if (cfg.matchThreshold == null || cfg.matchThreshold >= 0.55) patch.matchThreshold = 0.48;
  if (cfg.minFaceSize == null || cfg.minFaceSize >= 60) patch.minFaceSize = 35;
  if (cfg.targetFps == null || cfg.targetFps <= 1.5) patch.targetFps = 2.5;
  if (cfg.dedupeSeconds == null || cfg.dedupeSeconds >= 120) patch.dedupeSeconds = 30;
  if (Object.keys(patch).length) {
    await cfg.update(patch);
  }
  return cfg;
}

// ── Enrollment ─────────────────────────────────────────────────────────────

exports.enrollEmployee = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;

  const employeeId = req.params.employeeId || req.body.employeeId;
  if (!employeeId) {
    return Helper.response(false, "employeeId is required", {}, res, 200);
  }

  try {
    const emp = await empPersonal.findOne({
      where: { id: employeeId, tenantId, status: "active" },
    });
    if (!emp) {
      return Helper.response(false, "Employee not found or inactive", {}, res, 200);
    }

    const files = req.files || [];
    if (!files.length) {
      return Helper.response(false, "At least one face image is required", {}, res, 200);
    }

    ensureEvidenceDir();
    const images = files.map((f) => ({
      filename: f.originalname || f.filename,
      content_base64: fs.readFileSync(f.path).toString("base64"),
    }));

    const ml = await callFaceService("post", "/v1/enroll", {
      employee_id: employeeId,
      tenant_id: tenantId,
      images,
    });

    const accepted = ml.data?.accepted || [];
    const rejected = ml.data?.rejected || [];
    const rejectReasons = rejected
      .map((r) => r.reason || r.filename || JSON.stringify(r))
      .filter(Boolean)
      .join("; ");

    if (ml.status >= 400 || !ml.data?.ok || !accepted.length) {
      const msg =
        rejectReasons ||
        ml.data?.detail ||
        ml.data?.message ||
        "Face enrollment failed";
      return Helper.response(
        false,
        msg,
        { accepted, rejected, faceService: ml.data || {} },
        res,
        200
      );
    }

    // Duplicate face check against other employees
    const cfg = await getOrCreateConfig(tenantId, branchId);
    for (const item of accepted) {
      const matchResp = await callFaceService("post", "/v1/match", {
        tenant_id: tenantId,
        embedding: item.embedding,
        threshold: cfg.matchThreshold,
      });
      const match = matchResp.data?.match;
      if (match && match.employee_id && match.employee_id !== employeeId) {
        return Helper.response(
          false,
          `Duplicate face detected: already enrolled for another employee (${match.employee_id})`,
          { match, rejected },
          res,
          200
        );
      }
    }

    const replace = String(req.body.replace || "true") !== "false";
    if (replace) {
      await aiFaceEmbedding.update(
        { isActive: false, updatedBy: req.users.id },
        { where: { tenantId, employeeId, isActive: true } }
      );
    }

    const created = [];
    for (let i = 0; i < accepted.length; i++) {
      const item = accepted[i];
      const srcFile = files[i];
      const destName = `enroll_${employeeId.slice(0, 8)}_${Date.now()}_${i}.jpg`;
      const destPath = path.join(EVIDENCE_DIR, destName);
      if (srcFile?.path && fs.existsSync(srcFile.path)) {
        fs.copyFileSync(srcFile.path, destPath);
      }
      const row = await aiFaceEmbedding.create({
        tenantId,
        branchId: emp.branchId || branchId,
        employeeId,
        embedding: embeddingToBuffer(item.embedding),
        sourceType: req.body.sourceType || "upload",
        sourcePath: destName,
        qualityScore: item.quality_score ?? null,
        isActive: true,
        createdBy: req.users.id,
      });
      created.push({ id: row.id, qualityScore: row.qualityScore, sourcePath: row.sourcePath });
    }

    await rebuildFaissForTenant(tenantId);

    return Helper.response(
      true,
      `Enrolled ${created.length} face image(s)`,
      { embeddings: created, rejected, employeeId, empCode: emp.empCode },
      res,
      200
    );
  } catch (err) {
    console.error("enrollEmployee:", err);
    return Helper.response(false, err.message || "Enrollment error", {}, res, 500);
  }
};

exports.getEmployeeFaces = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const employeeId = req.params.employeeId || req.body.employeeId;

  try {
    const rows = await aiFaceEmbedding.findAll({
      where: { tenantId, employeeId, isActive: true },
      attributes: ["id", "employeeId", "sourceType", "sourcePath", "qualityScore", "createdAt"],
      order: [["createdAt", "DESC"]],
    });
    return Helper.response(true, "OK", rows, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.deactivateEmployeeFaces = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const employeeId = req.params.employeeId || req.body.employeeId;

  try {
    const [n] = await aiFaceEmbedding.update(
      { isActive: false, updatedBy: req.users.id },
      { where: { tenantId, employeeId, isActive: true } }
    );
    await rebuildFaissForTenant(tenantId);
    return Helper.response(true, `Deactivated ${n} embedding(s)`, { count: n }, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.listEnrolledEmployees = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;

  try {
    const rows = await aiFaceEmbedding.findAll({
      where: { tenantId, isActive: true },
      attributes: ["employeeId"],
      raw: true,
    });
    const ids = [...new Set(rows.map((r) => r.employeeId))];
    const emps = ids.length
      ? await empPersonal.findAll({
          where: { id: { [Op.in]: ids }, tenantId },
          attributes: ["id", "empCode", "firstName", "lastName", "departmentId", "status", "profileImage"],
        })
      : [];
    return Helper.response(true, "OK", { count: emps.length, employees: emps }, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

// ── Cameras ────────────────────────────────────────────────────────────────

function sanitizeCamera(row, includeSecret = false) {
  const j = row.toJSON ? row.toJSON() : { ...row };
  delete j.rtspUrlEncrypted;
  if (includeSecret) {
    try {
      j.rtspUrl = decrypt(row.rtspUrlEncrypted);
    } catch {
      j.rtspUrl = null;
    }
  } else {
    j.rtspUrlMasked = "***";
  }
  return j;
}

exports.listCameras = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  try {
    const rows = await aiCamera.findAll({
      where: { tenantId, branchId },
      order: [["createdAt", "DESC"]],
    });

    // Live recognition worker status from face service (View ≠ recognizing)
    let workersById = {};
    try {
      const health = await callFaceService("get", "/health");
      const workers = health.data?.workers || [];
      for (const w of workers) {
        if (w.camera_id) workersById[w.camera_id] = w;
      }
    } catch {
      workersById = {};
    }

    const data = rows.map((r) => {
      const j = sanitizeCamera(r);
      const w = workersById[r.id];
      j.recognizing = !!w && w.status === "online";
      j.workerStatus = w?.status || "stopped";
      j.lastRecognition = w?.last_recognition || null;
      // Prefer live worker status over stale DB lastStatus
      if (w?.status) j.lastStatus = w.status;
      else if (j.lastStatus === "online") j.lastStatus = "idle"; // was online before, worker not running
      return j;
    });

    return Helper.response(true, "OK", data, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.createCamera = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const { name, cameraType, rtspUrl, location, direction, eventType, isActive } = req.body;
  if (!name || !rtspUrl) {
    return Helper.response(false, "name and rtspUrl are required", {}, res, 200);
  }
  try {
    const row = await aiCamera.create({
      tenantId,
      branchId,
      name,
      cameraType: cameraType || "bullet",
      rtspUrlEncrypted: encrypt(rtspUrl),
      location: location || null,
      direction: direction || null,
      eventType: eventType === "exit" ? "exit" : "entry",
      isActive: isActive !== false && isActive !== "false",
      lastStatus: "offline",
      createdBy: req.users.id,
    });
    return Helper.response(true, "Camera created", sanitizeCamera(row), res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.updateCamera = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const row = await aiCamera.findOne({ where: { id, tenantId, branchId } });
    if (!row) return Helper.response(false, "Camera not found", {}, res, 200);

    const { name, cameraType, rtspUrl, location, direction, eventType, isActive } = req.body;
    const patch = { updatedBy: req.users.id };
    if (name !== undefined) patch.name = name;
    if (cameraType !== undefined) patch.cameraType = cameraType;
    if (rtspUrl) patch.rtspUrlEncrypted = encrypt(rtspUrl);
    if (location !== undefined) patch.location = location;
    if (direction !== undefined) patch.direction = direction;
    if (eventType !== undefined) patch.eventType = eventType === "exit" ? "exit" : "entry";
    if (isActive !== undefined) patch.isActive = isActive === true || isActive === "true";

    await row.update(patch);
    return Helper.response(true, "Camera updated", sanitizeCamera(row), res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.deleteCamera = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const n = await aiCamera.destroy({ where: { id, tenantId, branchId } });
    if (!n) return Helper.response(false, "Camera not found", {}, res, 200);
    // Best-effort stop worker
    await callFaceService("post", `/v1/cameras/${id}/stop`, {}).catch(() => null);
    return Helper.response(true, "Camera deleted", {}, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.testCamera = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const row = await aiCamera.findOne({ where: { id, tenantId, branchId } });
    if (!row) return Helper.response(false, "Camera not found", {}, res, 200);
    const rtspUrl = decrypt(row.rtspUrlEncrypted);
    const ml = await callFaceService("post", "/v1/cameras/test", { rtsp_url: rtspUrl });
    const ok = ml.data?.ok === true;
    await row.update({
      lastHealthAt: new Date(),
      lastStatus: ok ? "online" : "error",
    });
    await aiCameraHealthLog.create({
      tenantId,
      cameraId: id,
      status: ok ? "online" : "error",
      message: ml.data?.message || ml.data?.detail || "",
    });
    return Helper.response(ok, ok ? "RTSP OK" : "RTSP failed", ml.data || {}, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

/** cameraId -> face-service preview session_id (keeps RTSP open for smooth UI) */
const previewSessions = new Map();

/**
 * Open persistent RTSP preview session (smooth stream — do not reopen RTSP per frame).
 */
exports.previewStart = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const row = await aiCamera.findOne({ where: { id, tenantId, branchId } });
    if (!row) return Helper.response(false, "Camera not found", {}, res, 200);

    const rtspUrl = decrypt(row.rtspUrlEncrypted);
    const sessionKey = `${tenantId}__${id}`;
    const ml = await callFaceService("post", "/v1/cameras/preview/open", {
      rtsp_url: rtspUrl,
      session_id: sessionKey,
      max_width: parseInt(req.body.max_width || "720", 10),
      jpeg_quality: parseInt(req.body.jpeg_quality || "60", 10),
      target_fps: parseFloat(req.body.target_fps || "8"),
    });

    if (ml.status >= 400 || !ml.data?.ok) {
      let msg = ml.data?.detail || ml.data?.message || "Preview start failed";
      if (ml.status === 404) {
        msg = "Preview API missing — restart face service (python run.py).";
      } else if (typeof msg === "object") {
        msg = msg.msg || JSON.stringify(msg);
      }
      return Helper.response(false, msg, ml.data || {}, res, 200);
    }

    previewSessions.set(id, ml.data.session_id || sessionKey);
    return Helper.response(
      true,
      "Preview started",
      {
        cameraId: id,
        name: row.name,
        sessionId: ml.data.session_id || sessionKey,
        status: ml.data.status,
      },
      res,
      200
    );
  } catch (err) {
    return Helper.response(false, err.message || "Preview start error", {}, res, 500);
  }
};

/**
 * Fetch latest frame from open preview session (fast — no RTSP reconnect).
 */
exports.previewCamera = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const row = await aiCamera.findOne({ where: { id, tenantId, branchId } });
    if (!row) return Helper.response(false, "Camera not found", {}, res, 200);

    const sessionKey = `${tenantId}__${id}`;
    let sessionId = previewSessions.get(id) || sessionKey;
    let ml = await callFaceService("get", `/v1/cameras/preview/${encodeURIComponent(sessionId)}/frame`);

    // Auto-open if session missing
    if (ml.status === 404 || (ml.status >= 400 && String(ml.data?.detail || "").toLowerCase().includes("not found"))) {
      const opened = await callFaceService("post", "/v1/cameras/preview/open", {
        rtsp_url: decrypt(row.rtspUrlEncrypted),
        session_id: sessionKey,
        max_width: parseInt(req.body.max_width || "720", 10),
        jpeg_quality: parseInt(req.body.jpeg_quality || "60", 10),
        target_fps: parseFloat(req.body.target_fps || "8"),
      });
      if (opened.status < 400 && opened.data?.ok) {
        sessionId = opened.data.session_id || sessionKey;
        previewSessions.set(id, sessionId);
        ml = await callFaceService("get", `/v1/cameras/preview/${encodeURIComponent(sessionId)}/frame`);
      }
    }

    if (ml.status >= 400 || !ml.data?.ok || !ml.data?.image_base64) {
      let msg = ml.data?.detail || ml.data?.message || "Preview failed — is face service running?";
      if (ml.status === 404) {
        msg = "Preview API not found on face service. Restart face service (python run.py).";
      } else if (typeof msg === "object") {
        msg = msg.msg || JSON.stringify(msg);
      }
      return Helper.response(false, msg, ml.data || {}, res, 200);
    }

    previewSessions.set(id, sessionId);
    return Helper.response(
      true,
      "OK",
      {
        cameraId: id,
        name: row.name,
        sessionId,
        width: ml.data.width,
        height: ml.data.height,
        contentType: ml.data.content_type || "image/jpeg",
        imageBase64: ml.data.image_base64,
        ageMs: ml.data.age_ms,
        capturedAt: new Date().toISOString(),
      },
      res,
      200
    );
  } catch (err) {
    return Helper.response(false, err.message || "Preview error", {}, res, 500);
  }
};

exports.previewStop = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const sessionId = previewSessions.get(id) || `${tenantId}__${id}`;
    await callFaceService("post", `/v1/cameras/preview/${encodeURIComponent(sessionId)}/close`, {});
    previewSessions.delete(id);
    return Helper.response(true, "Preview stopped", {}, res, 200);
  } catch (err) {
    previewSessions.delete(id);
    return Helper.response(false, err.message || "Preview stop error", {}, res, 500);
  }
};

exports.startCamera = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const row = await aiCamera.findOne({ where: { id, tenantId, branchId } });
    if (!row) return Helper.response(false, "Camera not found", {}, res, 200);
    if (!row.isActive) return Helper.response(false, "Camera is inactive", {}, res, 200);

    const cfg = await getOrCreateConfig(tenantId, branchId);
    await rebuildFaissForTenant(tenantId);

    const ml = await callFaceService("post", `/v1/cameras/${id}/start`, {
      camera_id: id,
      tenant_id: tenantId,
      branch_id: branchId,
      rtsp_url: decrypt(row.rtspUrlEncrypted),
      event_type: row.eventType,
      match_threshold: cfg.matchThreshold,
      target_fps: cfg.targetFps,
      min_face_size: cfg.minFaceSize,
      det_size: [cfg.detWidth, cfg.detHeight],
      model_name: cfg.modelName,
      gens_punch_url: `${resolvePunchBaseUrl()}ai-face/internal/punch`,
      service_key: AI_FACE_KEY,
      dedupe_seconds: cfg.dedupeSeconds,
    });

    if (ml.status >= 400 || ml.data?.ok === false) {
      return Helper.response(false, ml.data?.detail || ml.data?.message || "Start failed", ml.data || {}, res, 200);
    }
    await row.update({ lastStatus: "online", lastHealthAt: new Date() });
    return Helper.response(
      true,
      "Recognition started",
      { ...(ml.data || {}), punchUrl: `${resolvePunchBaseUrl()}ai-face/internal/punch` },
      res,
      200
    );
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.stopCamera = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  const id = req.params.id || req.body.id;
  try {
    const row = await aiCamera.findOne({ where: { id, tenantId, branchId } });
    if (!row) return Helper.response(false, "Camera not found", {}, res, 200);
    await callFaceService("post", `/v1/cameras/${id}/stop`, {});
    await row.update({ lastStatus: "offline", lastHealthAt: new Date() });
    return Helper.response(true, "Recognition stopped", {}, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

// ── Logs / dashboard ───────────────────────────────────────────────────────

exports.recognitionLogs = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  try {
    const where = { tenantId, branchId };
    if (req.body.processingStatus) where.processingStatus = req.body.processingStatus;
    if (req.body.employeeId) where.employeeId = req.body.employeeId;
    if (req.body.unknownOnly) {
      where.employeeId = null;
      where.processingStatus = "unknown";
    }
    const rows = await aiRecognitionLog.findAll({
      where,
      order: [["recognizedAt", "DESC"]],
      limit: Math.min(parseInt(req.body.limit || "100", 10), 500),
    });
    return Helper.response(true, "OK", rows, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.dashboard = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  try {
    const start = moment.tz("Asia/Kolkata").startOf("day").toDate();
    const [registeredFaces, cameras, onlineCams, todayLogs] = await Promise.all([
      aiFaceEmbedding.count({
        where: { tenantId, isActive: true },
        distinct: true,
        col: "employeeId",
      }),
      aiCamera.count({ where: { tenantId, branchId } }),
      aiCamera.count({ where: { tenantId, branchId, lastStatus: "online" } }),
      aiRecognitionLog.findAll({
        where: { tenantId, branchId, recognizedAt: { [Op.gte]: start } },
        attributes: ["employeeId", "processingStatus", "cameraId", "recognizedAt"],
      }),
    ]);

    const successful = todayLogs.filter((l) =>
      ["matched", "attendance_written"].includes(l.processingStatus)
    );
    const unknown = todayLogs.filter((l) => l.processingStatus === "unknown");
    const uniqueEmps = new Set(successful.map((l) => l.employeeId).filter(Boolean));

    const byCamera = {};
    for (const l of todayLogs) {
      const k = l.cameraId || "unknown";
      byCamera[k] = (byCamera[k] || 0) + 1;
    }

    return Helper.response(
      true,
      "OK",
      {
        registeredFaces,
        totalCameras: cameras,
        onlineCameras: onlineCams,
        offlineCameras: Math.max(cameras - onlineCams, 0),
        todayRecognizedEmployees: uniqueEmps.size,
        todaySuccessful: successful.length,
        todayUnknown: unknown.length,
        cameraActivity: byCamera,
      },
      res,
      200
    );
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.getConfig = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  try {
    const cfg = await getOrCreateConfig(tenantId, branchId);
    return Helper.response(true, "OK", cfg, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.updateConfig = async (req, res) => {
  const tenantId = req.users?.tenantId;
  const branchId = requireBranch(req, res);
  if (!branchId) return;
  try {
    const cfg = await getOrCreateConfig(tenantId, branchId);
    const allowed = [
      "matchThreshold",
      "minFaceSize",
      "targetFps",
      "dedupeSeconds",
      "detWidth",
      "detHeight",
      "modelName",
      "retentionDays",
    ];
    const patch = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    }
    await cfg.update(patch);
    return Helper.response(true, "Config updated", cfg, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

/**
 * Internal punch endpoint called by Python face service after a match.
 * Auth: X-AI-Service-Key (not JWT).
 */
exports.internalPunch = async (req, res) => {
  const key = req.headers["x-ai-service-key"];
  if (!key || key !== AI_FACE_KEY) {
    return Helper.response(false, "Unauthorized", {}, res, 401);
  }

  const {
    tenantId,
    branchId,
    employeeId,
    cameraId,
    eventType,
    similarity,
    evidencePath,
    datetime,
    ip_address,
  } = req.body;

  if (!tenantId || !branchId || !employeeId) {
    return Helper.response(false, "tenantId, branchId, employeeId required", {}, res, 200);
  }

  try {
    const cfg = await getOrCreateConfig(tenantId, branchId);
    const since = moment.tz("Asia/Kolkata").subtract(cfg.dedupeSeconds, "seconds").toDate();
    const recent = await aiRecognitionLog.findOne({
      where: {
        tenantId,
        employeeId,
        eventType: eventType || "entry",
        recognizedAt: { [Op.gte]: since },
        processingStatus: { [Op.in]: ["matched", "attendance_written", "duplicate_skipped"] },
      },
      order: [["recognizedAt", "DESC"]],
    });

    // Always punch so check_out stays latest; only rate-limit recognition log spam.
    let punchResult = null;
    let status = "matched";
    let attendanceId = null;
    let rawMessage = null;

    try {
      punchResult = await recordAttendancePunch({
        tenantId,
        branchId,
        employeeId,
        datetime: datetime || Helper.formatToIST(new Date()),
        ip_address: ip_address || "ai-face-service",
        imageFilename: evidencePath ? path.basename(evidencePath).slice(0, 250) : null,
        eventType: eventType === "exit" ? "exit" : eventType === "entry" ? "entry" : "auto",
        actorId: null,
      });
      status = "attendance_written";
      attendanceId = punchResult.record?.id || null;
      if (punchResult.action === "check_out") {
        rawMessage = "check_out updated";
      }
    } catch (e) {
      status = "attendance_failed";
      rawMessage = e.message;
    }

    if (recent && status === "attendance_written") {
      // Still wrote/updated attendance; log as duplicate for noise control
      const log = await aiRecognitionLog.create({
        tenantId,
        branchId,
        employeeId,
        cameraId: cameraId || null,
        eventType: eventType || "entry",
        similarity: similarity ?? null,
        evidencePath: evidencePath || null,
        processingStatus: "duplicate_skipped",
        attendanceId,
        rawMessage: `Out refreshed within dedupe ${cfg.dedupeSeconds}s`,
      });
      return Helper.response(true, "Attendance out updated", { log, punch: punchResult, skippedLog: true }, res, 200);
    }

    const log = await aiRecognitionLog.create({
      tenantId,
      branchId,
      employeeId,
      cameraId: cameraId || null,
      eventType: eventType || "entry",
      similarity: similarity ?? null,
      evidencePath: evidencePath || null,
      processingStatus: status,
      attendanceId,
      rawMessage,
    });

    return Helper.response(
      status !== "attendance_failed",
      status,
      { log, punch: punchResult },
      res,
      200
    );
  } catch (err) {
    console.error("internalPunch:", err);
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.internalUnknown = async (req, res) => {
  const key = req.headers["x-ai-service-key"];
  if (!key || key !== AI_FACE_KEY) {
    return Helper.response(false, "Unauthorized", {}, res, 401);
  }
  try {
    const log = await aiRecognitionLog.create({
      tenantId: req.body.tenantId,
      branchId: req.body.branchId || null,
      employeeId: null,
      cameraId: req.body.cameraId || null,
      eventType: "unknown",
      similarity: req.body.similarity ?? null,
      evidencePath: req.body.evidencePath || null,
      processingStatus: "unknown",
      rawMessage: req.body.message || null,
    });
    return Helper.response(true, "Logged", log, res, 200);
  } catch (err) {
    return Helper.response(false, err.message, {}, res, 500);
  }
};

exports.serviceHealth = async (req, res) => {
  try {
    const ml = await callFaceService("get", "/health");
    return Helper.response(true, "OK", { faceService: ml.data, gens: "ok" }, res, 200);
  } catch (err) {
    return Helper.response(false, "Face service unreachable", { error: err.message }, res, 200);
  }
};
