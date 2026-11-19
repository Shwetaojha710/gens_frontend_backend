const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const AiAgentAction = sequelize.define(
  "ai_agent_actions",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    conversationId: { type: DataTypes.UUID, allowNull: true },
    messageId: { type: DataTypes.UUID, allowNull: true },
    actionType: { type: DataTypes.STRING(80), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    status: {
      type: DataTypes.ENUM("pending", "executed", "failed", "skipped"),
      allowNull: false,
      defaultValue: "pending",
    },
    error: { type: DataTypes.TEXT, allowNull: true },
    executedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "ai_agent_actions",
    timestamps: true,
    indexes: [
      { fields: ["tenantId", "actionType"] },
      { fields: ["conversationId"] },
    ],
  }
);

module.exports = AiAgentAction;
