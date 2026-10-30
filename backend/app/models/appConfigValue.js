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
    indexes: [
      {
        unique: true,
        fields: ['tenantId', 'branchId', 'fieldKey'],
        name: 'app_config_values_tenant_branch_field_uk',
      },
    ],
  }
);

AppConfigValue.ALL_BRANCHES = ALL_BRANCHES;

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
  }
  if (!desc.isEnabled) {
    await qi.addColumn(table, 'isEnabled', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  }
  // Drop old unique (tenantId, fieldKey) if present — ignore errors
  try {
    await qi.removeIndex(table, 'app_config_values_tenant_field_uk');
  } catch (_) {
    /* ok */
  }
}

AppConfigValue.sync()
  .then(() => ensureColumns())
  .then(() => console.log('AppConfigValue model synced'))
  .catch((err) => console.error('AppConfigValue sync error:', err?.message || err));

module.exports = AppConfigValue;
