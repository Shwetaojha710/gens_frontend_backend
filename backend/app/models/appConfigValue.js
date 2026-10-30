const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

/**
 * Per-tenant values for App Config fields (key–value).
 * fieldKey matches app_config_fields.key
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
    fieldKey: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
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
        fields: ['tenantId', 'fieldKey'],
        name: 'app_config_values_tenant_field_uk',
      },
    ],
  }
);

AppConfigValue.sync()
  .then(() => console.log('AppConfigValue model synced'))
  .catch((err) => console.error('AppConfigValue sync error:', err?.message || err));

module.exports = AppConfigValue;
