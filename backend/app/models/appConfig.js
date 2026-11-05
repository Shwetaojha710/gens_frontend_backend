const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

/**
 * Per-tenant app settings (singleton row per tenant).
 * imageQuality: JPEG / upload compression quality (30–100).
 */
const AppConfig = sequelize.define(
  'app_config',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    imageQuality: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 80,
      validate: {
        min: 30,
        max: 100,
      },
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
    tableName: 'app_config',
    underscored: false,
  }
);

// Create table if missing (no alter — avoids lock storms)
AppConfig.sync()
  .then(() => console.log('AppConfig model synced'))
  .catch((err) => console.error('AppConfig sync error:', err?.message || err));

module.exports = AppConfig;
