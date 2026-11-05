const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const aiProcessingConfig = sequelize.define(
  "aiProcessingConfig",
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
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    matchThreshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0.48,
    },
    minFaceSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 35,
    },
    targetFps: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.5,
    },
    dedupeSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
    },
    detWidth: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 640,
    },
    detHeight: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 640,
    },
    modelName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "buffalo_l",
    },
    retentionDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 90,
    },
  },
  {
    tableName: "ai_processing_config",
    indexes: [{ unique: true, fields: ["tenantId", "branchId"] }],
  }
);

module.exports = aiProcessingConfig;
