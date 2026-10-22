/**
 * Asset management — employee portal endpoints (AppAdmin auth):
 * my assets, acknowledging receipt and asking to return an asset.
 */
const { Op } = require("sequelize");
const Helper = require("../../helper/helper");
const AsAsset = require("../../models/as_asset");
const AsAllocation = require("../../models/as_allocation");
const As = require("../../helper/assets");

function fail(res, message) {
  return Helper.response(false, message, {}, res, 200);
}

const handler = (name, fn) => async (req, res) => {
  try {
    return await fn(req, res);
  } catch (error) {
    if (error instanceof As.AsValidationError) return fail(res, error.message);
    console.error(`assetPortal.${name}:`, error);
    return Helper.response(false, "Something went wrong", {}, res, 200);
  }
};

async function myAllocation(req) {
  const id = req.body?.allocationId;
  if (!id) return null;
  return AsAllocation.findOne({ where: { id, tenantId: req.users.tenantId, employeeId: req.users.id } });
}

const actorOf = (req) => ({ id: req.users.id, name: req.users.name });

exports.myAssets = handler("myAssets", async (req, res) => {
  const allocations = await AsAllocation.findAll({
    where: { tenantId: req.users.tenantId, employeeId: req.users.id },
    order: [["allocatedOn", "DESC"]],
    raw: true,
  });
  const assets = allocations.length
    ? await AsAsset.findAll({ where: { id: { [Op.in]: allocations.map((a) => a.assetId) } }, raw: true })
    : [];
  const maps = await As.lookups(req.users.tenantId, []);
  const data = allocations.map((a) => {
    const asset = assets.find((x) => x.id === a.assetId) || {};
    return {
      allocationId: a.id,
      status: a.status,
      allocatedOn: a.allocatedOn,
      expectedReturnDate: a.expectedReturnDate,
      conditionAtIssue: a.conditionAtIssue,
      issueNotes: a.issueNotes,
      ackStatus: a.ackStatus,
      ackComment: a.ackComment,
      returnRequestedAt: a.returnRequestedAt,
      returnedOn: a.returnedOn,
      conditionAtReturn: a.conditionAtReturn,
      recoveryAmount: As.num(a.recoveryAmount),
      asset: {
        assetTag: asset.assetTag,
        name: asset.name,
        category: maps.categories[asset.categoryId]?.name || "",
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber,
        warrantyExpiry: asset.warrantyExpiry,
      },
    };
  });
  const clearance = await As.clearanceFor(req.users.tenantId, req.users.id);
  return Helper.response(true, "Assets fetched", { items: data, clearance }, res, 200);
});

exports.acknowledge = handler("acknowledge", async (req, res) => {
  const allocation = await myAllocation(req);
  if (!allocation) return fail(res, "Asset not found");
  await As.acknowledge({ allocation, action: req.body.action, comment: req.body.comment, actor: actorOf(req) });
  return Helper.response(true, req.body.action === "disputed" ? "Reported to HR" : "Receipt acknowledged", {}, res, 200);
});

exports.requestReturn = handler("requestReturn", async (req, res) => {
  const allocation = await myAllocation(req);
  if (!allocation) return fail(res, "Asset not found");
  await As.requestReturn({ allocation, note: req.body.note, actor: actorOf(req) });
  return Helper.response(true, "Return requested — hand the asset to HR / IT", {}, res, 200);
});
