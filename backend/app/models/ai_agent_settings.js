const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** WhatsApp Cloud API + LLM credentials (secrets encrypted at rest). */
const AiAgentSettings = sequelize.define(
  "ai_agent_settings",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    agentId: { type: DataTypes.UUID, allowNull: false },
    whatsappPhoneNumberId: { type: DataTypes.STRING(80), allowNull: true },
    whatsappBusinessAccountId: { type: DataTypes.STRING(80), allowNull: true },
    whatsappAccessTokenEnc: { type: DataTypes.TEXT, allowNull: true },
    whatsappVerifyToken: { type: DataTypes.STRING(120), allowNull: true },
    whatsappAppSecretEnc: { type: DataTypes.TEXT, allowNull: true },
    llmApiKeyEnc: { type: DataTypes.TEXT, allowNull: true },
    defaultAssigneeId: { type: DataTypes.UUID, allowNull: true },
    notifyOnLead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    notifyOnHandover: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agent_settings",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["tenantId"] },
      { fields: ["whatsappPhoneNumberId"] },
    ],
  }
);

module.exports = AiAgentSettings;
