const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

/** Sentinel for tenant-wide / all-branches scope (unique index friendly). */
const ALL_BRANCHES = '00000000-0000-0000-0000-000000000000';

/**
 * Per-tenant (+ optional branch) values for App Config fields.
 * branchId = ALL_BRANCHES UUID → applies to all branches (default fallback).
 */
const AppConfigValue = sequelize.define(
  'app_config_values',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    /** Real branch UUID, or ALL_BRANCHES for tenant-wide default. */
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: ALL_BRANCHES,
    },
    fieldKey: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    /** When false, this branch does not use custom config (falls back / disabled). */
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: 'app_config_values',
    // Indexes applied in init after columns exist (avoids sync failing on old schema)
    indexes: [],
  }
);

AppConfigValue.ALL_BRANCHES = ALL_BRANCHES;

async function tableExists() {
  try {
    await sequelize.getQueryInterface().describeTable('app_config_values');
    return true;
  } catch {
    return false;
  }
}

async function ensureColumns() {
  const qi = sequelize.getQueryInterface();
  const table = 'app_config_values';
  let desc = {};
  try {
    desc = await qi.describeTable(table);
  } catch {
    return;
  }

  if (!desc.branchId) {
    await qi.addColumn(table, 'branchId', {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: ALL_BRANCHES,
    });
    // Backfill any nulls (some PG versions leave null despite default on add)
    try {
      await sequelize.query(
        `UPDATE "app_config_values" SET "branchId" = :bid WHERE "branchId" IS NULL`,
        { replacements: { bid: ALL_BRANCHES } },
      );
    } catch (_) {
      /* ok */
    }
  }

  if (!desc.isEnabled) {
    await qi.addColumn(table, 'isEnabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  }

  // Drop old unique (tenantId, fieldKey) if present
  for (const name of [
    'app_config_values_tenant_field_uk',
    'app_config_values_tenantId_fieldKey_uk',
  ]) {
    try {
      await qi.removeIndex(table, name);
    } catch (_) {
      /* ok */
    }
  }
}

async function ensureUniqueIndex() {
  const qi = sequelize.getQueryInterface();
  try {
    await qi.addIndex('app_config_values', ['tenantId', 'branchId', 'fieldKey'], {
      unique: true,
      name: 'app_config_values_tenant_branch_field_uk',
    });
  } catch (err) {
    const msg = String(err?.message || err);
    // already exists
    if (!/already exists|duplicate/i.test(msg)) {
      console.warn('AppConfigValue index warn:', msg);
    }
  }
}

async function initAppConfigValue() {
  const exists = await tableExists();
  if (!exists) {
    // Fresh table — create with all model columns
    await AppConfigValue.sync();
  } else {
    // Existing table may predate branchId — add columns BEFORE any index on branchId
    await ensureColumns();
  }
  await ensureUniqueIndex();
  console.log('AppConfigValue model synced');
}

initAppConfigValue().catch((err) =>
  console.error('AppConfigValue sync error:', err?.message || err),
);

module.exports = AppConfigValue;
