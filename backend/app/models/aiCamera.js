const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * IP camera registry for AI face attendance.
 * RTSP credentials stored encrypted in rtspUrlEncrypted.
 */
const aiCamera = sequelize.define(
  "aiCamera",
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
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    cameraType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "bullet",
    },
    rtspUrlEncrypted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    direction: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    eventType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "entry",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastHealthAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastStatus: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "offline",
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
    tableName: "ai_cameras",
    indexes: [{ fields: ["tenantId", "branchId"] }],
  }
);

module.exports = aiCamera;
