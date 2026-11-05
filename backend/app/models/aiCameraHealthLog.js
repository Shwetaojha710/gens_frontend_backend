const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const aiCameraHealthLog = sequelize.define(
  "aiCameraHealthLog",
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
    cameraId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    checkedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "ai_camera_health_logs",
    updatedAt: false,
  }
);

module.exports = aiCameraHealthLog;
