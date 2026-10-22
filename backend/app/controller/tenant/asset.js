/**
 * Asset management — HR / admin endpoints (Admin auth).
 * Employee actions (acknowledge, request return) live in assetPortal.js.
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const AsCategory = require("../../models/as_category");
const AsAsset = require("../../models/as_asset");
const AsAllocation = require("../../models/as_allocation");
const AsMaintenance = require("../../models/as_maintenance");
const As = require("../../helper/assets");
const { writeAudit } = require("../../helper/auditLog");

const HR_ROLES = ["admin", "hr", "superadmin"];

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

function branchOf(req) {
  const b = req.body?.branchId || req.users?.branchId;
  return b && b !== "null" && b !== "All" && b !== "undefined" ? b : null;
}

const actorOf = (req) => ({ id: req.users.id, name: `${req.users.name} (HR)` });

const hr = (name, fn) => async (req, res) => {
  try {
    if (!HR_ROLES.includes(req.users?.role)) return fail(res, "Only HR or admin can perform this action");
    return await fn(req, res);
  } catch (error) {
    if (error instanceof As.AsValidationError) return fail(res, error.message);
    console.error(`asset.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

async function loadAsset(req, id) {
  if (!id) return null;
  return AsAsset.findOne({ where: { id, tenantId: req.users.tenantId } });
}

async function loadAllocation(req, id) {
  if (!id) return null;
  return AsAllocation.findOne({ where: { id, tenantId: req.users.tenantId } });
}

// ───────────────────────────── categories ─────────────────────────────

exports.listCategories = hr("listCategories", async (req, res) => {
  const cats = await AsCategory.findAll({ where: { tenantId: req.users.tenantId }, order: [["name", "ASC"]], raw: true });
  const counts = await AsAsset.findAll({
    where: { tenantId: req.users.tenantId },
    attributes: ["categoryId", [AsAsset.sequelize.fn("COUNT", AsAsset.sequelize.col("id")), "count"]],
    group: ["categoryId"],
    raw: true,
  });
  const data = cats.map((c) => ({ ...c, assetCount: Number(counts.find((x) => x.categoryId === c.id)?.count || 0) }));
  return Helper.response(true, "Categories fetched", data, res, 200);
});

exports.saveCategory = hr("saveCategory", async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || "").trim();
  const code = String(b.code || "").trim().toUpperCase();
  if (!name) return fail(res, "Category name is required");
  if (!/^[A-Z0-9]{2,8}$/.test(code)) return fail(res, "Code must be 2–8 letters or digits (used in asset IDs, e.g. LAP-0001)");
  const dupe = await AsCategory.findOne({
    where: {
      tenantId: req.users.tenantId,
      [Op.or]: [{ name: { [Op.iLike]: name } }, { code }],
      ...(b.id ? { id: { [Op.ne]: b.id } } : {}),
    },
  });
  if (dupe) return fail(res, dupe.code === code ? `Code ${code} is already used by ${dupe.name}` : "A category with this name already exists");

  const fields = {
    name,
    code,
    description: b.description || null,
    requiresAcknowledgement: b.requiresAcknowledgement !== false,
    status: b.status === "inactive" ? "inactive" : "active",
    updatedBy: req.users.id,
  };
  if (b.id) {
    const row = await AsCategory.findOne({ where: { id: b.id, tenantId: req.users.tenantId } });
    if (!row) return fail(res, "Category not found");
    // Existing asset IDs keep their prefix; only new assets use a changed code
    await row.update(fields);
    return Helper.response(true, "Category updated", row, res, 200);
  }
  const row = await AsCategory.create({ ...fields, tenantId: req.users.tenantId, createdBy: req.users.id });
  return Helper.response(true, "Category created", row, res, 200);
});

// ───────────────────────────── assets ─────────────────────────────

exports.listAssets = hr("listAssets", async (req, res) => {
  const b = req.body || {};
  const where = { tenantId: req.users.tenantId };
  const branchId = branchOf(req);
  if (branchId) where.branchId = branchId;
  if (b.status) where.status = b.status;
  if (b.categoryId) where.categoryId = b.categoryId;
  if (b.condition) where.condition = b.condition;
  if (b.search) {
    const q = `%${String(b.search).trim()}%`;
    where[Op.or] = ["assetTag", "name", "serialNumber", "brand", "model"].map((k) => ({ [k]: { [Op.iLike]: q } }));
  }
  let rows = await As.assetRows(where);
  if (b.holderId) rows = rows.filter((r) => r.holder?.employeeId === b.holderId);
  if (b.warranty === "expiring") rows = rows.filter((r) => r.warranty && r.warranty.daysLeft >= 0 && r.warranty.daysLeft <= 60);
  if (b.warranty === "expired") rows = rows.filter((r) => r.warranty?.state === "expired");
  return Helper.response(true, "Assets fetched", rows, res, 200);
});

exports.registerAssets = hr("registerAssets", async (req, res) => {
  const created = await As.registerAssets({ tenantId: req.users.tenantId, branchId: branchOf(req), payload: req.body || {}, actor: actorOf(req) });
  await writeAudit({ req, actionType: "ASSET_REGISTER", referenceId: created[0].id, newValue: { tags: created.map((a) => a.assetTag) } });
  return Helper.response(true, created.length === 1 ? `Registered ${created[0].assetTag}` : `Registered ${created.length} assets (${created[0].assetTag} – ${created[created.length - 1].assetTag})`, created.map((a) => ({ id: a.id, assetTag: a.assetTag })), res, 200);
});

exports.updateAsset = hr("updateAsset", async (req, res) => {
  const asset = await loadAsset(req, req.body?.id);
  if (!asset) return fail(res, "Asset not found");
  await As.updateAsset({ asset, payload: req.body, actor: actorOf(req) });
  return Helper.response(true, "Asset updated", {}, res, 200);
});

exports.assetDetail = hr("assetDetail", async (req, res) => {
  const asset = await loadAsset(req, req.body?.id);
  if (!asset) return fail(res, "Asset not found");
  return Helper.response(true, "Asset fetched", await As.buildAssetDetail(asset), res, 200);
});

exports.setStatus = hr("setStatus", async (req, res) => {
  const asset = await loadAsset(req, req.body?.id);
  if (!asset) return fail(res, "Asset not found");
  await As.setStatus({ asset, status: req.body.status, note: req.body.note, actor: actorOf(req) });
  return Helper.response(true, "Status updated", {}, res, 200);
});

/** Looks up an asset from a scanned QR token. */
exports.scan = hr("scan", async (req, res) => {
  const asset = await AsAsset.findOne({ where: { qrToken: String(req.body?.token || ""), tenantId: req.users.tenantId }, attributes: ["id"], raw: true });
  if (!asset) return fail(res, "No asset matches this QR code");
  return Helper.response(true, "Asset found", { id: asset.id }, res, 200);
});

/** QR labels (SVG) for printing. baseUrl is the app origin the QR should open. */
exports.labels = hr("labels", async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 300) : [];
  const baseUrl = String(req.body?.baseUrl || "").replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s]+$/.test(baseUrl)) return fail(res, "Invalid app URL");
  const assets = await AsAsset.findAll({ where: { id: { [Op.in]: ids }, tenantId: req.users.tenantId }, order: [["assetTag", "ASC"]] });
  const data = [];
  for (const a of assets) data.push({ id: a.id, assetTag: a.assetTag, name: a.name, serialNumber: a.serialNumber, svg: await As.qrSvg(a, baseUrl) });
  return Helper.response(true, "Labels generated", data, res, 200);
});

// ───────────────────────────── allocation ─────────────────────────────

exports.allocate = hr("allocate", async (req, res) => {
  const asset = await loadAsset(req, req.body?.assetId);
  if (!asset) return fail(res, "Asset not found");
  const allocation = await As.allocate({ asset, employeeId: req.body.employeeId, payload: req.body, actor: actorOf(req) });
  await writeAudit({ req, actionType: "ASSET_ALLOCATE", referenceId: asset.id, employeeId: allocation.employeeId, newValue: { assetTag: asset.assetTag } });
  return Helper.response(true, `${asset.assetTag} allocated`, allocation, res, 200);
});

exports.receiveReturn = hr("receiveReturn", async (req, res) => {
  const allocation = await loadAllocation(req, req.body?.allocationId);
  if (!allocation) return fail(res, "Allocation not found");
  await As.receiveReturn({ allocation, payload: req.body, actor: actorOf(req) });
  await writeAudit({
    req,
    actionType: req.body.outcome === "lost" ? "ASSET_LOST" : "ASSET_RETURN",
    referenceId: allocation.assetId,
    employeeId: allocation.employeeId,
    newValue: { condition: req.body.condition || null, recoveryAmount: req.body.recoveryAmount || null },
  });
  return Helper.response(true, req.body.outcome === "lost" ? "Recorded as lost" : "Return received", {}, res, 200);
});

// ───────────────────────────── maintenance ─────────────────────────────

exports.openMaintenance = hr("openMaintenance", async (req, res) => {
  const asset = await loadAsset(req, req.body?.assetId);
  if (!asset) return fail(res, "Asset not found");
  await As.openMaintenance({ asset, payload: req.body, actor: actorOf(req) });
  return Helper.response(true, "Maintenance opened", {}, res, 200);
});

exports.closeMaintenance = hr("closeMaintenance", async (req, res) => {
  const record = await AsMaintenance.findOne({ where: { id: req.body?.id, tenantId: req.users.tenantId } });
  if (!record) return fail(res, "Maintenance record not found");
  await As.closeMaintenance({ record, payload: req.body, actor: actorOf(req) });
  return Helper.response(true, "Maintenance closed", {}, res, 200);
});

// ───────────────────────────── clearance & dashboard ─────────────────────────────

/** Assets held / returned by one employee, with clearance status (employee profile, exit). */
exports.employeeAssets = hr("employeeAssets", async (req, res) => {
  const employeeId = req.body?.employeeId;
  if (!employeeId) return fail(res, "Select an employee");
  const [clearance, allocations] = await Promise.all([
    As.clearanceFor(req.users.tenantId, employeeId),
    AsAllocation.findAll({ where: { tenantId: req.users.tenantId, employeeId }, order: [["allocatedOn", "DESC"]], raw: true }),
  ]);
  const assets = allocations.length ? await AsAsset.findAll({ where: { id: { [Op.in]: allocations.map((a) => a.assetId) } }, raw: true }) : [];
  const history = allocations.map((a) => {
    const asset = assets.find((x) => x.id === a.assetId) || {};
    return { ...a, recoveryAmount: As.num(a.recoveryAmount), assetTag: asset.assetTag, assetName: asset.name };
  });
  return Helper.response(true, "Employee assets fetched", { clearance, history }, res, 200);
});

exports.clearanceReport = hr("clearanceReport", async (req, res) => {
  const rows = await As.clearanceReport({ tenantId: req.users.tenantId, branchId: branchOf(req), onlyPending: req.body?.onlyPending !== false });
  return Helper.response(true, "Clearance report fetched", rows, res, 200);
});

exports.dashboard = hr("dashboard", async (req, res) => {
  return Helper.response(true, "Dashboard fetched", await As.dashboard({ tenantId: req.users.tenantId, branchId: branchOf(req) }), res, 200);
});

/** Audit trail when HR issues a relieving letter in the browser while assets are still out. */
exports.logClearanceOverride = hr("logClearanceOverride", async (req, res) => {
  const employeeId = req.body?.employeeId;
  if (!employeeId) return fail(res, "Select an employee");
  const clearance = await As.clearanceFor(req.users.tenantId, employeeId);
  if (clearance.cleared) return Helper.response(true, "Employee is cleared", {}, res, 200);
  await writeAudit({
    req,
    actionType: "RELIEVING_LETTER_ASSET_OVERRIDE",
    referenceId: employeeId,
    employeeId,
    newValue: { pendingAssets: clearance.pending.map((p) => p.assetTag), via: String(req.body.document || "letter").slice(0, 30) },
    remarks: "Relieving letter issued with assets pending return",
  });
  return Helper.response(true, "Override recorded", {}, res, 200);
});
