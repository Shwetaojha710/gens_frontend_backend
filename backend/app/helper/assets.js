/**
 * Asset management — registration, allocation lifecycle, maintenance,
 * QR labels and exit clearance. Shared by the HR controller (Admin auth),
 * the employee portal controller (AppAdmin auth) and the relieving-letter
 * flow in letter_data.js (clearance check).
 *
 * "Separating" employees are those with a relieving letter on file
 * (letter_data type "relieving"), an exitDate, or status "inactive".
 */
const crypto = require("crypto");
const { Op } = require("sequelize");
const moment = require("moment-timezone");
const QRCode = require("qrcode");
const sequelize = require("../connection/connection");
const empPersonal = require("../models/empPersonal");
const Department = require("../models/department");
const LetterData = require("../models/letter_data");
const AsCategory = require("../models/as_category");
const AsAsset = require("../models/as_asset");
const AsAllocation = require("../models/as_allocation");
const AsMaintenance = require("../models/as_maintenance");
const AsEvent = require("../models/as_event");

/** A rule violation whose message is safe to show the user. */
class AsValidationError extends Error {}

const CONDITIONS = ["new", "good", "fair", "poor", "damaged"];
const STATUSES = ["available", "allocated", "in_repair", "retired", "lost"];

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const round2 = (n) => Math.round(Number(n) * 100) / 100;
const todayIST = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
const isDate = (d) => !!d && moment(d, "YYYY-MM-DD", true).isValid();
const fullName = (e) => [e?.firstName, e?.lastName].filter(Boolean).join(" ").trim();
const clean = (v) => (v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim());

async function logEvent(asset, type, { employeeId, condition, details, note, actor } = {}, transaction) {
  await AsEvent.create(
    {
      tenantId: asset.tenantId,
      assetId: asset.id,
      type,
      employeeId: employeeId || null,
      condition: condition || null,
      details: details || null,
      note: note || null,
      actorId: actor?.id || null,
      actorName: actor?.name || null,
    },
    { transaction },
  );
}

// ───────────────────────────── registration ─────────────────────────────

/** Next free tag for the category, e.g. LAP-0001. */
async function nextAssetTag(tenantId, code, transaction) {
  const prefix = `${code}-`;
  const rows = await AsAsset.findAll({
    where: { tenantId, assetTag: { [Op.like]: `${prefix}%` } },
    attributes: ["assetTag"],
    raw: true,
    transaction,
  });
  const max = rows.reduce((m, r) => {
    const n = Number(String(r.assetTag).slice(prefix.length));
    return Number.isInteger(n) && n > m ? n : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function assetFields(payload) {
  if (!clean(payload.name)) throw new AsValidationError("Asset name is required");
  for (const k of ["purchaseDate", "warrantyExpiry"]) {
    if (payload[k] && !isDate(payload[k])) throw new AsValidationError(`Invalid ${k === "purchaseDate" ? "purchase date" : "warranty date"}`);
  }
  if (payload.purchaseDate && payload.purchaseDate > todayIST()) throw new AsValidationError("Purchase date cannot be in the future");
  if (payload.purchaseDate && payload.warrantyExpiry && payload.warrantyExpiry < payload.purchaseDate) {
    throw new AsValidationError("Warranty cannot end before the purchase date");
  }
  if (num(payload.purchaseCost) !== null && num(payload.purchaseCost) < 0) throw new AsValidationError("Cost cannot be negative");
  if (payload.condition && !CONDITIONS.includes(payload.condition)) throw new AsValidationError("Invalid condition");
  return {
    name: clean(payload.name),
    brand: clean(payload.brand),
    model: clean(payload.model),
    serialNumber: clean(payload.serialNumber),
    purchaseDate: payload.purchaseDate || null,
    purchaseCost: num(payload.purchaseCost),
    vendor: clean(payload.vendor),
    invoiceNo: clean(payload.invoiceNo),
    warrantyExpiry: payload.warrantyExpiry || null,
    location: clean(payload.location),
    notes: clean(payload.notes),
  };
}

async function assertSerialFree(tenantId, serialNumber, excludeId) {
  if (!serialNumber) return;
  const dupe = await AsAsset.findOne({
    where: { tenantId, serialNumber: { [Op.iLike]: serialNumber }, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) },
    attributes: ["assetTag"],
    raw: true,
  });
  if (dupe) throw new AsValidationError(`Serial number already registered on ${dupe.assetTag}`);
}

/** Registers `quantity` identical assets (serial numbers must then be added per asset). */
async function registerAssets({ tenantId, branchId, payload, actor }) {
  const category = await AsCategory.findOne({ where: { id: payload.categoryId, tenantId, status: "active" }, raw: true });
  if (!category) throw new AsValidationError("Select an active category");
  const fields = assetFields(payload);
  const quantity = num(payload.quantity) ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) throw new AsValidationError("Quantity must be 1–200");
  if (quantity > 1 && fields.serialNumber) throw new AsValidationError("Register serialised assets one at a time");
  await assertSerialFree(tenantId, fields.serialNumber);

  return sequelize.transaction(async (t) => {
    const created = [];
    for (let i = 0; i < quantity; i++) {
      const asset = await AsAsset.create(
        {
          ...fields,
          tenantId,
          branchId: branchId || null,
          categoryId: category.id,
          assetTag: await nextAssetTag(tenantId, category.code, t),
          qrToken: crypto.randomBytes(16).toString("hex"),
          condition: payload.condition || "new",
          status: "available",
          createdBy: actor.id,
        },
        { transaction: t },
      );
      await logEvent(asset, "registered", { condition: asset.condition, actor }, t);
      created.push(asset);
    }
    return created;
  });
}

async function updateAsset({ asset, payload, actor }) {
  const fields = assetFields(payload);
  await assertSerialFree(asset.tenantId, fields.serialNumber, asset.id);
  if (payload.categoryId && payload.categoryId !== asset.categoryId) {
    const cat = await AsCategory.findOne({ where: { id: payload.categoryId, tenantId: asset.tenantId } });
    if (!cat) throw new AsValidationError("Category not found");
    fields.categoryId = cat.id; // tag keeps its original prefix
  }
  await sequelize.transaction(async (t) => {
    const before = asset.condition;
    await asset.update({ ...fields, updatedBy: actor.id }, { transaction: t });
    await logEvent(asset, "updated", { actor }, t);
    if (payload.condition && payload.condition !== before) {
      await asset.update({ condition: payload.condition }, { transaction: t });
      await logEvent(asset, "condition", { condition: payload.condition, note: payload.conditionNote, details: { from: before }, actor }, t);
    }
  });
}

/** Retire / mark lost / restore. Allocated or in-repair assets go through return or maintenance first. */
async function setStatus({ asset, status, note, actor }) {
  if (!["available", "retired", "lost"].includes(status)) throw new AsValidationError("Invalid status");
  if (asset.status === "allocated") throw new AsValidationError("Receive the asset back before changing its status");
  if (asset.status === "in_repair") throw new AsValidationError("Close the open maintenance first");
  if (status === asset.status) return;
  if (["retired", "lost"].includes(status) && !clean(note)) throw new AsValidationError("Add a reason");
  await sequelize.transaction(async (t) => {
    const from = asset.status;
    await asset.update({ status, updatedBy: actor.id }, { transaction: t });
    await logEvent(asset, "status", { details: { from, to: status }, note, actor }, t);
  });
}

// ───────────────────────────── allocation lifecycle ─────────────────────────────

async function allocate({ asset, employeeId, payload, actor }) {
  if (asset.status !== "available") throw new AsValidationError(`${asset.assetTag} is ${asset.status.replace("_", " ")}, not available`);
  const emp = await empPersonal.findOne({ where: { id: employeeId, tenantId: asset.tenantId, status: "active" }, raw: true });
  if (!emp) throw new AsValidationError("Select an active employee");
  const allocatedOn = payload.allocatedOn || todayIST();
  if (!isDate(allocatedOn) || allocatedOn > todayIST()) throw new AsValidationError("Allocation date cannot be in the future");
  if (payload.expectedReturnDate && (!isDate(payload.expectedReturnDate) || payload.expectedReturnDate < allocatedOn)) {
    throw new AsValidationError("Expected return must be on or after the allocation date");
  }
  const category = await AsCategory.findByPk(asset.categoryId, { raw: true });

  return sequelize.transaction(async (t) => {
    const allocation = await AsAllocation.create(
      {
        tenantId: asset.tenantId,
        assetId: asset.id,
        employeeId: emp.id,
        allocatedOn,
        expectedReturnDate: payload.expectedReturnDate || null,
        conditionAtIssue: asset.condition,
        issueNotes: clean(payload.notes),
        allocatedBy: actor.id,
        allocatedByName: actor.name,
        ackStatus: category?.requiresAcknowledgement === false ? "not_required" : "pending",
        status: "active",
      },
      { transaction: t },
    );
    await asset.update({ status: "allocated", updatedBy: actor.id }, { transaction: t });
    await logEvent(asset, "allocated", { employeeId: emp.id, condition: asset.condition, note: clean(payload.notes), details: { employeeName: fullName(emp) }, actor }, t);
    return allocation;
  });
}

/** Employee confirms receipt, or disputes it (wrong item, damaged, never received…). */
async function acknowledge({ allocation, action, comment, actor }) {
  if (allocation.status !== "active") throw new AsValidationError("This allocation is closed");
  if (!["acknowledged", "disputed"].includes(action)) throw new AsValidationError("Invalid action");
  if (allocation.ackStatus === "acknowledged") throw new AsValidationError("Already acknowledged");
  if (action === "disputed" && !clean(comment)) throw new AsValidationError("Tell HR what is wrong");
  const asset = await AsAsset.findByPk(allocation.assetId);
  await sequelize.transaction(async (t) => {
    await allocation.update({ ackStatus: action, ackAt: new Date(), ackComment: clean(comment) }, { transaction: t });
    await logEvent(asset, action, { employeeId: allocation.employeeId, note: clean(comment), actor }, t);
  });
}

async function requestReturn({ allocation, note, actor }) {
  if (allocation.status !== "active") throw new AsValidationError("This allocation is closed");
  if (allocation.returnRequestedAt) throw new AsValidationError("Return already requested");
  const asset = await AsAsset.findByPk(allocation.assetId);
  await sequelize.transaction(async (t) => {
    await allocation.update({ returnRequestedAt: new Date(), returnRequestNote: clean(note) }, { transaction: t });
    await logEvent(asset, "return_requested", { employeeId: allocation.employeeId, note: clean(note), actor }, t);
  });
}

/**
 * HR receives the asset back (or records it as lost). Sets the asset's
 * condition from the inspection and frees it for re-allocation.
 */
async function receiveReturn({ allocation, payload, actor }) {
  if (allocation.status !== "active") throw new AsValidationError("This allocation is already closed");
  const lost = payload.outcome === "lost";
  const returnedOn = payload.returnedOn || todayIST();
  if (!isDate(returnedOn) || returnedOn > todayIST()) throw new AsValidationError("Return date cannot be in the future");
  if (returnedOn < allocation.allocatedOn) throw new AsValidationError("Return date is before the allocation date");
  if (!lost && !CONDITIONS.includes(payload.condition)) throw new AsValidationError("Record the condition it came back in");
  const recovery = num(payload.recoveryAmount);
  if (recovery !== null && recovery < 0) throw new AsValidationError("Recovery amount cannot be negative");
  if (lost && !clean(payload.notes)) throw new AsValidationError("Describe how the asset was lost");

  const asset = await AsAsset.findByPk(allocation.assetId);
  await sequelize.transaction(async (t) => {
    await allocation.update(
      {
        status: lost ? "lost" : "returned",
        returnedOn,
        conditionAtReturn: lost ? null : payload.condition,
        returnNotes: clean(payload.notes),
        recoveryAmount: recovery,
        receivedBy: actor.id,
        receivedByName: actor.name,
      },
      { transaction: t },
    );
    if (lost) {
      await asset.update({ status: "lost", updatedBy: actor.id }, { transaction: t });
      await logEvent(asset, "lost", { employeeId: allocation.employeeId, note: clean(payload.notes), details: { recoveryAmount: recovery }, actor }, t);
    } else {
      const from = asset.condition;
      await asset.update({ status: "available", condition: payload.condition, updatedBy: actor.id }, { transaction: t });
      await logEvent(asset, "returned", {
        employeeId: allocation.employeeId,
        condition: payload.condition,
        note: clean(payload.notes),
        details: { conditionAtIssue: allocation.conditionAtIssue, from, recoveryAmount: recovery },
        actor,
      }, t);
    }
  });
}

// ───────────────────────────── maintenance ─────────────────────────────

async function openMaintenance({ asset, payload, actor }) {
  if (["retired", "lost"].includes(asset.status)) throw new AsValidationError(`${asset.assetTag} is ${asset.status}`);
  if (await AsMaintenance.count({ where: { assetId: asset.id, status: "open" } })) {
    throw new AsValidationError("This asset already has open maintenance");
  }
  if (!clean(payload.description)) throw new AsValidationError("Describe the work");
  if (!["repair", "service", "upgrade", "inspection"].includes(payload.type)) throw new AsValidationError("Select a type");
  const startDate = payload.startDate || todayIST();
  if (!isDate(startDate) || startDate > todayIST()) throw new AsValidationError("Start date cannot be in the future");
  const underWarranty = payload.underWarranty !== undefined
    ? !!payload.underWarranty
    : !!asset.warrantyExpiry && asset.warrantyExpiry >= startDate;

  return sequelize.transaction(async (t) => {
    const rec = await AsMaintenance.create(
      {
        tenantId: asset.tenantId,
        assetId: asset.id,
        type: payload.type,
        description: clean(payload.description),
        vendor: clean(payload.vendor),
        startDate,
        underWarranty,
        status: "open",
        previousStatus: asset.status,
        createdBy: actor.id,
      },
      { transaction: t },
    );
    // An allocated asset stays with the employee (e.g. on-site service); otherwise it goes to repair
    if (asset.status === "available") await asset.update({ status: "in_repair" }, { transaction: t });
    await logEvent(asset, "maintenance_opened", { details: { type: payload.type, vendor: clean(payload.vendor), underWarranty }, note: clean(payload.description), actor }, t);
    return rec;
  });
}

async function closeMaintenance({ record, payload, actor }) {
  if (record.status !== "open") throw new AsValidationError("Maintenance is already closed");
  const endDate = payload.endDate || todayIST();
  if (!isDate(endDate) || endDate < record.startDate || endDate > todayIST()) throw new AsValidationError("Invalid completion date");
  const cost = num(payload.cost);
  if (cost !== null && cost < 0) throw new AsValidationError("Cost cannot be negative");
  if (payload.conditionAfter && !CONDITIONS.includes(payload.conditionAfter)) throw new AsValidationError("Invalid condition");
  const asset = await AsAsset.findByPk(record.assetId);

  await sequelize.transaction(async (t) => {
    await record.update({ status: "closed", endDate, cost, conditionAfter: payload.conditionAfter || null }, { transaction: t });
    const patch = {};
    if (asset.status === "in_repair") patch.status = record.previousStatus === "allocated" ? "allocated" : "available";
    if (payload.conditionAfter) patch.condition = payload.conditionAfter;
    if (Object.keys(patch).length) await asset.update(patch, { transaction: t });
    await logEvent(asset, "maintenance_closed", {
      condition: payload.conditionAfter || null,
      details: { cost, underWarranty: record.underWarranty },
      note: clean(payload.notes),
      actor,
    }, t);
  });
}

// ───────────────────────────── read models ─────────────────────────────

async function lookups(tenantId, employeeIds) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  const [emps, departments, categories] = await Promise.all([
    ids.length
      ? empPersonal.findAll({
          where: { tenantId, id: { [Op.in]: ids } },
          attributes: ["id", "firstName", "lastName", "empCode", "departmentId", "status", "exitDate"],
          raw: true,
        })
      : [],
    Department.findAll({ where: { tenantId }, attributes: ["id", "name"], raw: true }),
    AsCategory.findAll({ where: { tenantId }, raw: true }),
  ]);
  return {
    people: Object.fromEntries(emps.map((e) => [e.id, { ...e, name: fullName(e) }])),
    departments: Object.fromEntries(departments.map((d) => [d.id, d.name])),
    categories: Object.fromEntries(categories.map((c) => [c.id, c])),
  };
}

function warrantyState(expiry) {
  if (!expiry) return null;
  const days = moment(expiry).diff(moment(todayIST()), "days");
  return { expiry, daysLeft: days, state: days < 0 ? "expired" : days <= 30 ? "expiring" : "active" };
}

/** Asset rows with their current holder. */
async function assetRows(where) {
  const assets = await AsAsset.findAll({ where, order: [["assetTag", "ASC"]], raw: true });
  if (!assets.length) return [];
  const active = await AsAllocation.findAll({ where: { assetId: { [Op.in]: assets.map((a) => a.id) }, status: "active" }, raw: true });
  const maps = await lookups(assets[0].tenantId, active.map((a) => a.employeeId));
  return assets.map((a) => {
    const alloc = active.find((x) => x.assetId === a.id);
    return {
      ...a,
      purchaseCost: num(a.purchaseCost),
      category: maps.categories[a.categoryId]?.name || "",
      warranty: warrantyState(a.warrantyExpiry),
      holder: alloc
        ? {
            allocationId: alloc.id,
            employeeId: alloc.employeeId,
            name: maps.people[alloc.employeeId]?.name || "",
            empCode: maps.people[alloc.employeeId]?.empCode || "",
            allocatedOn: alloc.allocatedOn,
            ackStatus: alloc.ackStatus,
            returnRequested: !!alloc.returnRequestedAt,
            overdue: !!alloc.expectedReturnDate && alloc.expectedReturnDate < todayIST(),
          }
        : null,
    };
  });
}

async function qrSvg(asset, baseUrl) {
  return QRCode.toString(`${baseUrl}/layout/assets/scan/${asset.qrToken}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
}

/** Full asset view: details, holder, allocation history, maintenance and timeline. */
async function buildAssetDetail(asset) {
  const a = asset.get ? asset.get({ plain: true }) : asset;
  const [allocations, maintenance, events] = await Promise.all([
    AsAllocation.findAll({ where: { assetId: a.id }, order: [["allocatedOn", "DESC"], ["createdAt", "DESC"]], raw: true }),
    AsMaintenance.findAll({ where: { assetId: a.id }, order: [["startDate", "DESC"]], raw: true }),
    AsEvent.findAll({ where: { assetId: a.id }, order: [["createdAt", "DESC"]], raw: true }),
  ]);
  const maps = await lookups(a.tenantId, [...allocations.map((x) => x.employeeId), ...events.map((e) => e.employeeId)]);
  return {
    asset: {
      ...a,
      purchaseCost: num(a.purchaseCost),
      category: maps.categories[a.categoryId]?.name || "",
      warranty: warrantyState(a.warrantyExpiry),
    },
    allocations: allocations.map((x) => ({
      ...x,
      recoveryAmount: num(x.recoveryAmount),
      employeeName: maps.people[x.employeeId]?.name || "",
      empCode: maps.people[x.employeeId]?.empCode || "",
    })),
    maintenance: maintenance.map((m) => ({ ...m, cost: num(m.cost) })),
    maintenanceCost: round2(maintenance.reduce((s, m) => s + Number(m.cost || 0), 0)),
    events: events.map((e) => ({ ...e, employeeName: maps.people[e.employeeId]?.name || "" })),
  };
}

// ───────────────────────────── exit clearance ─────────────────────────────

/** Relieving dates from saved relieving letters, keyed by employee. */
async function relievingDates(tenantId, employeeIds) {
  const where = { tenantId, type: "relieving" };
  if (employeeIds) where.employeeId = { [Op.in]: employeeIds };
  const rows = await LetterData.findAll({ where, attributes: ["employeeId", "data"], raw: true });
  const out = {};
  for (const r of rows) {
    const data = typeof r.data === "string" ? safeJson(r.data) : r.data;
    out[r.employeeId] = data?.relievingDate || "unspecified";
  }
  return out;
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** What an employee still holds; used by the relieving-letter guard and the clearance screens. */
async function clearanceFor(tenantId, employeeId) {
  const allocations = await AsAllocation.findAll({ where: { tenantId, employeeId }, raw: true });
  const assets = allocations.length
    ? await AsAsset.findAll({ where: { id: { [Op.in]: allocations.map((a) => a.assetId) } }, raw: true })
    : [];
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  const pending = allocations
    .filter((a) => a.status === "active")
    .map((a) => ({
      allocationId: a.id,
      assetId: a.assetId,
      assetTag: byId[a.assetId]?.assetTag,
      name: byId[a.assetId]?.name,
      allocatedOn: a.allocatedOn,
      purchaseCost: num(byId[a.assetId]?.purchaseCost),
      returnRequested: !!a.returnRequestedAt,
    }));
  const recoveries = allocations
    .filter((a) => num(a.recoveryAmount) > 0)
    .map((a) => ({ allocationId: a.id, assetTag: byId[a.assetId]?.assetTag, name: byId[a.assetId]?.name, outcome: a.status, amount: num(a.recoveryAmount) }));
  return {
    cleared: pending.length === 0,
    pending,
    recoveries,
    recoveryTotal: round2(recoveries.reduce((s, r) => s + r.amount, 0)),
    returnedCount: allocations.filter((a) => a.status === "returned").length,
  };
}

/** One-line reason used when the relieving letter is blocked. */
function clearanceMessage(clearance) {
  const list = clearance.pending.map((p) => `${p.assetTag} ${p.name}`).join(", ");
  return `${clearance.pending.length} asset(s) not returned: ${list}`;
}

/**
 * Separating employees (relieving letter / exit date / inactive) and what
 * they still hold. `onlyPending` drops fully cleared employees.
 */
async function clearanceReport({ tenantId, branchId, onlyPending }) {
  const relieving = await relievingDates(tenantId);
  const where = {
    tenantId,
    [Op.or]: [{ status: "inactive" }, { exitDate: { [Op.ne]: null } }, { id: { [Op.in]: Object.keys(relieving) } }],
  };
  if (branchId) where.branchId = branchId;
  const emps = await empPersonal.findAll({
    where,
    attributes: ["id", "firstName", "lastName", "empCode", "departmentId", "status", "exitDate"],
    raw: true,
  });
  if (!emps.length) return [];
  const ids = emps.map((e) => e.id);
  const allocations = await AsAllocation.findAll({ where: { tenantId, employeeId: { [Op.in]: ids } }, raw: true });
  const assets = allocations.length
    ? await AsAsset.findAll({ where: { id: { [Op.in]: [...new Set(allocations.map((a) => a.assetId))] } }, raw: true })
    : [];
  const assetBy = Object.fromEntries(assets.map((a) => [a.id, a]));
  const maps = await lookups(tenantId, []);
  const today = todayIST();

  const rows = emps.map((e) => {
    const mine = allocations.filter((a) => a.employeeId === e.id);
    const pending = mine.filter((a) => a.status === "active");
    const relievingDate = relieving[e.id] && relieving[e.id] !== "unspecified" ? relieving[e.id] : null;
    const lastDay = relievingDate || e.exitDate || null;
    return {
      employeeId: e.id,
      employeeName: fullName(e),
      empCode: e.empCode || "",
      department: maps.departments[e.departmentId] || "",
      employeeStatus: e.status,
      lastWorkingDay: lastDay,
      exitSource: relieving[e.id] ? "relieving_letter" : e.exitDate ? "exit_date" : "inactive",
      daysSinceExit: lastDay && lastDay <= today ? moment(today).diff(moment(lastDay), "days") : null,
      pendingCount: pending.length,
      pendingValue: round2(pending.reduce((s, a) => s + Number(assetBy[a.assetId]?.purchaseCost || 0), 0)),
      pendingAssets: pending.map((a) => ({
        allocationId: a.id,
        assetId: a.assetId,
        assetTag: assetBy[a.assetId]?.assetTag,
        name: assetBy[a.assetId]?.name,
        returnRequested: !!a.returnRequestedAt,
      })),
      returnedCount: mine.filter((a) => a.status === "returned").length,
      recoveryTotal: round2(mine.reduce((s, a) => s + Number(a.recoveryAmount || 0), 0)),
      cleared: pending.length === 0,
    };
  });
  return rows
    .filter((r) => !onlyPending || !r.cleared)
    .sort((a, b) => b.pendingCount - a.pendingCount || String(a.lastWorkingDay || "9").localeCompare(String(b.lastWorkingDay || "9")));
}

// ───────────────────────────── dashboard ─────────────────────────────

async function dashboard({ tenantId, branchId }) {
  const where = { tenantId };
  if (branchId) where.branchId = branchId;
  const assets = await assetRows(where);
  const ids = assets.map((a) => a.id);
  const [maintenance, clearance] = await Promise.all([
    ids.length ? AsMaintenance.findAll({ where: { assetId: { [Op.in]: ids } }, raw: true }) : [],
    clearanceReport({ tenantId, branchId, onlyPending: true }),
  ]);
  const inService = assets.filter((a) => !["retired", "lost"].includes(a.status));
  const count = (list, key) =>
    list.reduce((acc, a) => {
      acc[a[key]] = (acc[a[key]] || 0) + 1;
      return acc;
    }, {});

  const byCategory = {};
  for (const a of inService) {
    const c = (byCategory[a.category] = byCategory[a.category] || { category: a.category, total: 0, allocated: 0, available: 0, inRepair: 0, value: 0 });
    c.total++;
    if (a.status === "allocated") c.allocated++;
    if (a.status === "available") c.available++;
    if (a.status === "in_repair") c.inRepair++;
    c.value = round2(c.value + (a.purchaseCost || 0));
  }

  const yearStart = moment().tz("Asia/Kolkata").startOf("year").format("YYYY-MM-DD");
  const holders = {};
  for (const a of assets.filter((x) => x.holder)) {
    const h = (holders[a.holder.employeeId] = holders[a.holder.employeeId] || { employeeId: a.holder.employeeId, name: a.holder.name, count: 0, value: 0 });
    h.count++;
    h.value = round2(h.value + (a.purchaseCost || 0));
  }

  return {
    totalAssets: inService.length,
    totalValue: round2(inService.reduce((s, a) => s + (a.purchaseCost || 0), 0)),
    byStatus: count(assets, "status"),
    byCondition: count(inService, "condition"),
    byCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
    utilizationPct: inService.length ? round2((inService.filter((a) => a.status === "allocated").length / inService.length) * 100) : 0,
    pendingAcknowledgements: assets.filter((a) => a.holder?.ackStatus === "pending").length,
    disputed: assets.filter((a) => a.holder?.ackStatus === "disputed").map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name, holder: a.holder.name })),
    returnRequests: assets.filter((a) => a.holder?.returnRequested).map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name, holder: a.holder.name })),
    overdueReturns: assets.filter((a) => a.holder?.overdue).map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name, holder: a.holder.name })),
    warrantyExpiring: inService
      .filter((a) => a.warranty && a.warranty.daysLeft >= 0 && a.warranty.daysLeft <= 60)
      .sort((a, b) => a.warranty.daysLeft - b.warranty.daysLeft)
      .map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name, expiry: a.warrantyExpiry, daysLeft: a.warranty.daysLeft })),
    openMaintenance: maintenance.filter((m) => m.status === "open").length,
    maintenanceCostYtd: round2(maintenance.filter((m) => m.startDate >= yearStart).reduce((s, m) => s + Number(m.cost || 0), 0)),
    pendingClearance: { employees: clearance.length, assets: clearance.reduce((s, r) => s + r.pendingCount, 0) },
    topHolders: Object.values(holders).sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

module.exports = {
  AsValidationError,
  CONDITIONS,
  STATUSES,
  num,
  isDate,
  todayIST,
  registerAssets,
  updateAsset,
  setStatus,
  allocate,
  acknowledge,
  requestReturn,
  receiveReturn,
  openMaintenance,
  closeMaintenance,
  lookups,
  assetRows,
  qrSvg,
  buildAssetDetail,
  clearanceFor,
  clearanceMessage,
  clearanceReport,
  dashboard,
};
