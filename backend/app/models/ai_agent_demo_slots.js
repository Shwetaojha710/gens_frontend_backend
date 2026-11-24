const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Booked demo calendar slots for WhatsApp AI Agent (tenant-scoped). */
const AiAgentDemoSlot = sequelize.define(
  "ai_agent_demo_slots",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    leadId: { type: DataTypes.UUID, allowNull: true },
    conversationId: { type: DataTypes.UUID, allowNull: true },
    waId: { type: DataTypes.STRING(40), allowNull: true },
    scheduledAt: { type: DataTypes.DATE, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
    status: {
      type: DataTypes.ENUM("booked", "cancelled", "completed"),
      allowNull: false,
      defaultValue: "booked",
    },
    customerName: { type: DataTypes.STRING(160), allowNull: true },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    email: { type: DataTypes.STRING(200), allowNull: true },
    companyName: { type: DataTypes.STRING(200), allowNull: true },
    timezone: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: "Asia/Kolkata",
    },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agent_demo_slots",
    timestamps: true,
    indexes: [
      { fields: ["tenantId", "scheduledAt"] },
      { fields: ["tenantId", "status"] },
      { fields: ["leadId"] },
      { fields: ["conversationId"] },
    ],
  }
);

module.exports = AiAgentDemoSlot;
