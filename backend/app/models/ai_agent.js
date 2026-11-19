const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Per-tenant WhatsApp AI customer relationship agent. */
const AiAgent = sequelize.define(
  "ai_agents",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "Virtual Assistant" },
    personality: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue:
        "Friendly, professional, concise customer relationship executive. Natural conversational tone. Supports Hindi and English. Never robotic.",
    },
    systemInstructions: { type: DataTypes.TEXT, allowNull: true },
    companyIntro: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "I am a virtual assistant for our company. How can I help you today?",
    },
    languages: { type: DataTypes.JSONB, allowNull: false, defaultValue: ["en", "hi"] },
    aiProvider: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "gemini" },
    aiModel: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "gemini-2.0-flash" },
    responseLength: {
      type: DataTypes.ENUM("short", "medium", "long"),
      allowNull: false,
      defaultValue: "short",
    },
    isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.ENUM("active", "inactive"), allowNull: false, defaultValue: "active" },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agents",
    timestamps: true,
    indexes: [{ unique: true, fields: ["tenantId"] }],
  }
);

module.exports = AiAgent;
