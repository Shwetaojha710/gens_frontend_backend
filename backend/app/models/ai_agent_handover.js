const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const AiAgentHandover = sequelize.define(
  "ai_agent_handover",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    conversationId: { type: DataTypes.UUID, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: false },
    triggerType: {
      type: DataTypes.ENUM(
        "customer_request",
        "complaint",
        "low_confidence",
        "complex_issue",
        "negotiation",
        "manual",
        "other"
      ),
      allowNull: false,
      defaultValue: "other",
    },
    assignedTo: { type: DataTypes.UUID, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "resolved", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    conversationSnapshot: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    notifiedAt: { type: DataTypes.DATE, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agent_handover",
    timestamps: true,
    indexes: [
      { fields: ["tenantId", "status"] },
      { fields: ["conversationId"] },
    ],
  }
);

module.exports = AiAgentHandover;
