const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * ArcFace 512-D embeddings linked to existing empPersonals.id.
 * Source of truth for face templates — rebuild FAISS from this table.
 */
const aiFaceEmbedding = sequelize.define(
  "aiFaceEmbedding",
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
      allowNull: false,
    },
    embedding: {
      type: DataTypes.BLOB,
      allowNull: false,
    },
    sourceType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "upload",
    },
    sourcePath: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    qualityScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
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
    tableName: "ai_face_embeddings",
    indexes: [
      { fields: ["tenantId", "employeeId"] },
      { fields: ["tenantId", "isActive"] },
    ],
  }
);

module.exports = aiFaceEmbedding;
