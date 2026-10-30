const AppConfigField = require('../../models/appConfigField');
const AppConfigValue = require('../../models/appConfigValue');
const Helper = require('../../helper/helper');

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

/**
 * Migrate legacy app_config.imageQuality → app_config_values once (if old table exists).
 */
async function migrateLegacyImageQuality(tenantId, userId) {
  try {
    const existing = await AppConfigValue.findOne({
      where: { tenantId, fieldKey: 'imageQuality' },
    });
    if (existing) return;

    // Lazy require — old model may still exist
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
      fieldKey: 'imageQuality',
      value: String(legacy.imageQuality),
      createdBy: userId || null,
      updatedBy: userId || null,
    });
  } catch (_) {
    /* ignore migration errors */
  }
}

async function buildConfigPayload(tenantId, userId) {
  await migrateLegacyImageQuality(tenantId, userId);

  const fieldRows = await loadActiveFields();
  const valueRows = await AppConfigValue.findAll({
    where: { tenantId },
    raw: true,
  });
  const valueMap = Object.fromEntries(valueRows.map((r) => [r.fieldKey, r.value]));

  const fields = fieldRows.map(shapeField);
  const values = {};
  /** Typed map for mobile apps (numbers/booleans coerced). */
  const config = {};
  for (const f of fields) {
    const str = coerceValue(f, valueMap[f.key] != null ? valueMap[f.key] : f.defaultValue);
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
  return { fields, values, config };
}

/** POST /get-app-config — Admin (web settings) */
exports.getAppConfig = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const payload = await buildConfigPayload(tenantId, userId);
    return Helper.response(true, 'App config fetched', payload, res, 200);
  } catch (error) {
    console.error('getAppConfig error:', error);
    return Helper.response(false, error.message || 'Server error', {}, res, 500);
  }
};

/**
 * GET|POST /get-emp-app-config — Employee / mobile app (AppAdmin).
 * Returns fields + string values + typed `config` map (e.g. config.imageQuality = 80).
 */
exports.getEmpAppConfig = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const payload = await buildConfigPayload(tenantId, userId);
    return Helper.response(true, 'App config fetched', payload, res, 200);
  } catch (error) {
    console.error('getEmpAppConfig error:', error);
    return Helper.response(false, error.message || 'Server error', {}, res, 500);
  }
};

/**
 * POST /save-app-config
 * body: { values: { imageQuality: 80, ... } }
 * also accepts flat { imageQuality } for backward compatibility
 */
exports.saveAppConfig = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const body = req.body || {};
    let incoming = body.values && typeof body.values === 'object' ? { ...body.values } : { ...body };
    delete incoming.values;
    delete incoming.id;
    delete incoming.tenantId;

    const fieldRows = await loadActiveFields();
    if (!fieldRows.length) {
      return Helper.response(false, 'No app config fields defined.', {}, res, 200);
    }

    const fieldByKey = Object.fromEntries(fieldRows.map((f) => [f.key, f]));
    const unknown = Object.keys(incoming).filter((k) => !fieldByKey[k]);
    if (unknown.length) {
      return Helper.response(
        false,
        `Unknown field(s): ${unknown.join(', ')}`,
        {},
        res,
        200
      );
    }

    const keysToSave = Object.keys(incoming);
    if (!keysToSave.length) {
      return Helper.response(false, 'No values to save.', {}, res, 200);
    }

    const savedValues = {};
    for (const key of keysToSave) {
      const field = fieldByKey[key];
      const coerced = coerceValue(shapeField(field), incoming[key]);

      const [row] = await AppConfigValue.findOrCreate({
        where: { tenantId, fieldKey: key },
        defaults: {
          tenantId,
          fieldKey: key,
          value: coerced,
          createdBy: userId || null,
          updatedBy: userId || null,
        },
      });
      if (row.value !== coerced) {
        row.value = coerced;
        row.updatedBy = userId || null;
        await row.save();
      }
      savedValues[key] = coerced;
    }

    // Full snapshot after save
    const allValues = await AppConfigValue.findAll({ where: { tenantId }, raw: true });
    const valueMap = Object.fromEntries(allValues.map((r) => [r.fieldKey, r.value]));
    const fields = fieldRows.map(shapeField);
    const values = {};
    for (const f of fields) {
      values[f.key] =
        savedValues[f.key] != null
          ? savedValues[f.key]
          : coerceValue(f, valueMap[f.key] != null ? valueMap[f.key] : f.defaultValue);
    }

    return Helper.response(true, 'App config saved', { fields, values }, res, 200);
  } catch (error) {
    console.error('saveAppConfig error:', error);
    return Helper.response(false, error.message || 'Server error', {}, res, 500);
  }
};
