const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** One WhatsApp conversation thread per customer phone + tenant. */
const AiAgentConversation = sequelize.define(
  "ai_agent_conversations",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    agentId: { type: DataTypes.UUID, allowNull: true },
    waId: { type: DataTypes.STRING(40), allowNull: false },
    customerPhone: { type: DataTypes.STRING(40), allowNull: false },
    customerName: { type: DataTypes.STRING(160), allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "waiting", "handed_over", "closed"),
      allowNull: false,
      defaultValue: "active",
    },
    aiEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    currentIntent: { type: DataTypes.STRING(80), allowNull: true },
    leadId: { type: DataTypes.UUID, allowNull: true },
    assignedTo: { type: DataTypes.UUID, allowNull: true },
    lastMessageAt: { type: DataTypes.DATE, allowNull: true },
    lastCustomerMessageAt: { type: DataTypes.DATE, allowNull: true },
    windowExpiresAt: { type: DataTypes.DATE, allowNull: true },
    context: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agent_conversations",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["tenantId", "waId"] },
      { fields: ["tenantId", "status"] },
      { fields: ["tenantId", "lastMessageAt"] },
    ],
  }
);

module.exports = AiAgentConversation;
