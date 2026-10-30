const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

/**
 * App Config field definitions (global).
 * Add a row here → form pe naya field auto dikhega (no code change).
 */
const AppConfigField = sequelize.define(
  'app_config_fields',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    label: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    hint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    /** range | number | text | boolean | select */
    fieldType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'range',
    },
    minValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    maxValue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
    step: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 1,
    },
    defaultValue: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    unit: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    /** [{ value, label }] for select */
    options: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    /** tip lines shown in sidebar, e.g. ["30–50 — …"] */
    tips: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    tableName: 'app_config_fields',
  }
);

const SEED_FIELDS = [
  {
    key: 'imageQuality',
    label: 'Image quality',
    hint: 'Higher values keep more detail and larger files. Minimum 30, maximum 100. Default is 80.',
    fieldType: 'range',
    minValue: 30,
    maxValue: 100,
    step: 1,
    defaultValue: '80',
    unit: '%',
    tips: [
      '30–50 — smaller files, more compression',
      '60–80 — balanced (recommended)',
      '90–100 — highest quality, larger uploads',
    ],
    sortOrder: 10,
    status: 'active',
  },
];

async function seedFields() {
  for (const seed of SEED_FIELDS) {
    const existing = await AppConfigField.findOne({ where: { key: seed.key } });
    if (!existing) {
      await AppConfigField.create(seed);
    }
  }
}

AppConfigField.sync()
  .then(() => seedFields())
  .then(() => console.log('AppConfigField model synced'))
  .catch((err) => console.error('AppConfigField sync error:', err?.message || err));

module.exports = AppConfigField;
