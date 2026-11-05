const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const aiRecognitionLog = sequelize.define(
  "aiRecognitionLog",
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
    employeeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cameraId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    recognizedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    eventType: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    similarity: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    evidencePath: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    processingStatus: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "matched",
    },
    attendanceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rawMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "ai_recognition_logs",
    indexes: [
      { fields: ["tenantId", "recognizedAt"] },
      { fields: ["tenantId", "employeeId", "recognizedAt"] },
      { fields: ["processingStatus"] },
    ],
  }
);

module.exports = aiRecognitionLog;
