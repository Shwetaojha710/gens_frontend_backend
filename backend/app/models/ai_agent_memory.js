const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Durable per-customer memory used across conversations. */
const AiAgentMemory = sequelize.define(
  "ai_agent_memory",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    waId: { type: DataTypes.STRING(40), allowNull: false },
    conversationId: { type: DataTypes.UUID, allowNull: true },
    customerDetails: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    productsDiscussed: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    questionsAnswered: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    preferences: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    requirements: { type: DataTypes.TEXT, allowNull: true },
    leadStatus: { type: DataTypes.STRING(40), allowNull: true },
    leadPriority: { type: DataTypes.STRING(20), allowNull: true },
    lastInteractionAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  {
    tableName: "ai_agent_memory",
    timestamps: true,
    indexes: [{ unique: true, fields: ["tenantId", "waId"] }],
  }
);

module.exports = AiAgentMemory;
