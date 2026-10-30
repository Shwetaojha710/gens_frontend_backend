const { Op } = require('sequelize');
const AppConfigField = require('../../models/appConfigField');
const AppConfigValue = require('../../models/appConfigValue');
const Branch = require('../../models/branch');
const Helper = require('../../helper/helper');

const ALL_BRANCHES = AppConfigValue.ALL_BRANCHES;

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeBranchId(raw) {
  if (raw == null || raw === '' || raw === 'all' || raw === 'ALL') return ALL_BRANCHES;
  return String(raw);
}

function shapeField(row) {
  return {
    key: row.key,
    label: row.label,
    hint: row.hint || '',
    fieldType: row.fieldType || 'text',
    minValue: numOrNull(row.minValue),
    maxValue: numOrNull(row.maxValue),
    step: numOrNull(row.step) ?? 1,
    defaultValue: row.defaultValue != null ? String(row.defaultValue) : '',
    unit: row.unit || '',
    options: Array.isArray(row.options) ? row.options : [],
    tips: Array.isArray(row.tips) ? row.tips : [],
    sortOrder: row.sortOrder ?? 0,
  };
}

function coerceValue(field, raw) {
  const type = field.fieldType || 'text';
  if (raw == null || raw === '') {
    return field.defaultValue != null ? String(field.defaultValue) : '';
  }

  if (type === 'boolean') {
    const s = String(raw).toLowerCase();
    return s === 'true' || s === '1' || s === 'yes' ? 'true' : 'false';
  }

  if (type === 'range' || type === 'number') {
    let n = Number(raw);
    if (!Number.isFinite(n)) {
      n = Number(field.defaultValue);
      if (!Number.isFinite(n)) return field.defaultValue != null ? String(field.defaultValue) : '';
    }
    n = Math.round(n * 1000) / 1000;
    const min = numOrNull(field.minValue);
    const max = numOrNull(field.maxValue);
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    return String(n);
  }

  return String(raw);
}

async function loadActiveFields() {
  return AppConfigField.findAll({
    where: { status: 'active' },
    order: [
      ['sortOrder', 'ASC'],
      ['label', 'ASC'],
    ],
  });
}

async function listTenantBranches(tenantId) {
  const rows = await Branch.findAll({
    where: { tenantId },
    attributes: ['id', 'name'],
    order: [['name', 'ASC']],
    raw: true,
  });
  return (rows || []).map((b) => ({ id: b.id, name: b.name }));
}

/**
 * Migrate legacy app_config.imageQuality → all-branches value once.
 */
async function migrateLegacyImageQuality(tenantId, userId) {
  try {
    const existing = await AppConfigValue.findOne({
      where: { tenantId, fieldKey: 'imageQuality', branchId: ALL_BRANCHES },
    });
    if (existing) return;

    let AppConfig;
    try {
      AppConfig = require('../../models/appConfig');
    } catch {
      return;
    }
    const legacy = await AppConfig.findOne({ where: { tenantId }, raw: true });
    if (!legacy || legacy.imageQuality == null) return;

    await AppConfigValue.create({
      tenantId,
      branchId: ALL_BRANCHES,
      fieldKey: 'imageQuality',
      value: String(legacy.imageQuality),
      isEnabled: true,
      createdBy: userId || null,
      updatedBy: userId || null,
    });
  } catch (_) {
    /* ignore */
  }
}

/**
 * Resolve values for a branch:
 * 1) branch-specific rows (if isEnabled)
 * 2) else all-branches rows (if isEnabled)
 * 3) else field defaults
 */
async function buildConfigPayload(tenantId, userId, branchIdRaw) {
  await migrateLegacyImageQuality(tenantId, userId);

  const branchId = normalizeBranchId(branchIdRaw);
  const fieldRows = await loadActiveFields();
  const fields = fieldRows.map(shapeField);

  const scopeIds =
    branchId === ALL_BRANCHES ? [ALL_BRANCHES] : [branchId, ALL_BRANCHES];

  const valueRows = await AppConfigValue.findAll({
    where: { tenantId, branchId: { [Op.in]: scopeIds } },
    raw: true,
  });

  const byBranch = { [ALL_BRANCHES]: {}, [branchId]: {} };
  const enabledByBranch = { [ALL_BRANCHES]: true, [branchId]: true };

  for (const r of valueRows) {
    const bid = r.branchId || ALL_BRANCHES;
    if (!byBranch[bid]) byBranch[bid] = {};
    byBranch[bid][r.fieldKey] = r.value;
    // isEnabled is stored per row; use imageQuality/meta row or any row — prefer explicit
    if (r.fieldKey === '__enabled' || Object.keys(byBranch[bid]).length === 1) {
      enabledByBranch[bid] = r.isEnabled !== false;
    }
    if (r.isEnabled === false) enabledByBranch[bid] = false;
    if (r.isEnabled === true && enabledByBranch[bid] !== false) {
      /* keep */
    }
  }

  // Dedicated enable flag row (optional) or infer from any field's isEnabled on that branch
  const enableRows = valueRows.filter((r) => r.fieldKey === '__branch_enabled');
  for (const r of enableRows) {
    enabledByBranch[r.branchId || ALL_BRANCHES] = String(r.value) !== 'false' && r.isEnabled !== false;
  }

  // If branch-specific rows exist, check their isEnabled from first non-meta field
  if (branchId !== ALL_BRANCHES) {
    const branchFieldRows = valueRows.filter(
      (r) => r.branchId === branchId && r.fieldKey !== '__branch_enabled'
    );
    if (branchFieldRows.length) {
      enabledByBranch[branchId] = branchFieldRows.every((r) => r.isEnabled !== false);
    } else {
      // no branch rows yet → treat as not specifically enabled (use all fallback)
      enabledByBranch[branchId] = false;
    }
  }

  const useBranch =
    branchId !== ALL_BRANCHES && enabledByBranch[branchId] && Object.keys(byBranch[branchId] || {}).length > 0;
  const useAll = enabledByBranch[ALL_BRANCHES] !== false;

  const sourceMap = useBranch
    ? byBranch[branchId]
    : useAll
      ? byBranch[ALL_BRANCHES] || {}
      : {};

  const values = {};
  const config = {};
  for (const f of fields) {
    const str = coerceValue(f, sourceMap[f.key] != null ? sourceMap[f.key] : f.defaultValue);
    values[f.key] = str;
    if (f.fieldType === 'range' || f.fieldType === 'number') {
      const n = Number(str);
      config[f.key] = Number.isFinite(n) ? n : null;
    } else if (f.fieldType === 'boolean') {
      config[f.key] = str === 'true';
    } else {
      config[f.key] = str;
    }
  }

  const branches = await listTenantBranches(tenantId);

  // Which branches currently have enabled custom config
  const enabledBranchIds = [];
  const allBranchRows = await AppConfigValue.findAll({
    where: {
      tenantId,
      branchId: { [Op.ne]: ALL_BRANCHES },
      fieldKey: { [Op.ne]: '__branch_enabled' },
      isEnabled: true,
    },
    attributes: ['branchId'],
    group: ['branchId'],
    raw: true,
  }).catch(async () => {
    const rows = await AppConfigValue.findAll({
      where: {
        tenantId,
        branchId: { [Op.ne]: ALL_BRANCHES },
        isEnabled: true,
      },
      attributes: ['branchId'],
      raw: true,
    });
    const seen = new Set();
    return rows.filter((r) => {
      if (seen.has(r.branchId)) return false;
      seen.add(r.branchId);
      return true;
    });
  });

  for (const r of allBranchRows) {
    if (r.branchId && !enabledBranchIds.includes(r.branchId)) {
      enabledBranchIds.push(r.branchId);
    }
  }

  const isEnabled =
    branchId === ALL_BRANCHES
      ? useAll
      : useBranch || false;

  return {
    fields,
    values,
    config,
    branchId: branchId === ALL_BRANCHES ? null : branchId,
    isEnabled,
    branches,
    enabledBranchIds,
    allBranchesId: ALL_BRANCHES,
  };
}

/** POST /get-app-config — body: { branchId?: string | null } */
exports.getAppConfig = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const branchId = req.body?.branchId ?? req.query?.branchId ?? null;
    const payload = await buildConfigPayload(tenantId, userId, branchId);
    return Helper.response(true, 'App config fetched', payload, res, 200);
  } catch (error) {
    console.error('getAppConfig error:', error);
    return Helper.response(false, error.message || 'Server error', {}, res, 500);
  }
};

/** GET|POST /get-emp-app-config — uses employee branchId from token */
exports.getEmpAppConfig = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const branchId =
      req.body?.branchId || req.query?.branchId || req.users?.branchId || null;
    const payload = await buildConfigPayload(tenantId, userId, branchId);
    return Helper.response(true, 'App config fetched', payload, res, 200);
  } catch (error) {
    console.error('getEmpAppConfig error:', error);
    return Helper.response(false, error.message || 'Server error', {}, res, 500);
  }
};

/**
 * POST /save-app-config
 * body: {
 *   branchId?: string | null,   // null / 'all' = all branches
 *   isEnabled?: boolean,        // enable config for this branch
 *   values: { imageQuality: 80, ... }
 * }
 */
exports.saveAppConfig = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const body = req.body || {};
    const branchId = normalizeBranchId(body.branchId);
    const isEnabled = body.isEnabled !== false && body.isEnabled !== 'false';

    let incoming =
      body.values && typeof body.values === 'object' ? { ...body.values } : { ...body };
    delete incoming.values;
    delete incoming.id;
    delete incoming.tenantId;
    delete incoming.branchId;
    delete incoming.isEnabled;
    delete incoming.branches;
    delete incoming.enabledBranchIds;
    delete incoming.fields;
    delete incoming.config;
    delete incoming.allBranchesId;

    const fieldRows = await loadActiveFields();
    if (!fieldRows.length) {
      return Helper.response(false, 'No app config fields defined.', {}, res, 200);
    }

    const fieldByKey = Object.fromEntries(fieldRows.map((f) => [f.key, f]));
    const unknown = Object.keys(incoming).filter((k) => !fieldByKey[k]);
    if (unknown.length) {
      return Helper.response(false, `Unknown field(s): ${unknown.join(', ')}`, {}, res, 200);
    }

    const keysToSave = Object.keys(incoming);
    if (!keysToSave.length && body.isEnabled === undefined) {
      return Helper.response(false, 'No values to save.', {}, res, 200);
    }

    // If disabling a specific branch, mark existing rows disabled (keep values)
    if (!isEnabled && branchId !== ALL_BRANCHES) {
      await AppConfigValue.update(
        { isEnabled: false, updatedBy: userId || null },
        { where: { tenantId, branchId } }
      );
      const payload = await buildConfigPayload(tenantId, userId, branchId);
      return Helper.response(true, 'App config disabled for branch', payload, res, 200);
    }

    const keys = keysToSave.length ? keysToSave : fieldRows.map((f) => f.key);
    const savedValues = {};

    for (const key of keys) {
      const field = fieldByKey[key];
      if (!field) continue;
      const raw =
        incoming[key] != null
          ? incoming[key]
          : (
              await AppConfigValue.findOne({
                where: { tenantId, branchId, fieldKey: key },
                raw: true,
              })
            )?.value ?? field.defaultValue;
      const coerced = coerceValue(shapeField(field), raw);

      const [row] = await AppConfigValue.findOrCreate({
        where: { tenantId, branchId, fieldKey: key },
        defaults: {
          tenantId,
          branchId,
          fieldKey: key,
          value: coerced,
          isEnabled: true,
          createdBy: userId || null,
          updatedBy: userId || null,
        },
      });
      row.value = coerced;
      row.isEnabled = true;
      row.updatedBy = userId || null;
      await row.save();
      savedValues[key] = coerced;
    }

    const payload = await buildConfigPayload(tenantId, userId, branchId);
    return Helper.response(true, 'App config saved', payload, res, 200);
  } catch (error) {
    console.error('saveAppConfig error:', error);
    return Helper.response(false, error.message || 'Server error', {}, res, 500);
  }
};
