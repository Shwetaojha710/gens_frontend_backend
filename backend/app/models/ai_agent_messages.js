const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const AiAgentMessage = sequelize.define(
  "ai_agent_messages",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    conversationId: { type: DataTypes.UUID, allowNull: false },
    direction: { type: DataTypes.ENUM("inbound", "outbound"), allowNull: false },
    senderType: {
      type: DataTypes.ENUM("customer", "ai", "human", "system"),
      allowNull: false,
    },
    senderId: { type: DataTypes.UUID, allowNull: true },
    waMessageId: { type: DataTypes.STRING(120), allowNull: true },
    messageType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "text" },
    body: { type: DataTypes.TEXT, allowNull: true },
    mediaUrl: { type: DataTypes.STRING(500), allowNull: true },
    intent: { type: DataTypes.STRING(80), allowNull: true },
    confidence: { type: DataTypes.DECIMAL(5, 4), allowNull: true },
    actions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agent_messages",
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ["conversationId", "createdAt"] },
      { fields: ["tenantId", "createdAt"] },
      { fields: ["waMessageId"] },
    ],
  }
);

module.exports = AiAgentMessage;
