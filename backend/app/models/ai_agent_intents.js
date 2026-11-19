const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const AiAgentIntent = sequelize.define(
  "ai_agent_intents",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: true },
    code: { type: DataTypes.STRING(80), allowNull: false },
    label: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    examples: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  },
  {
    tableName: "ai_agent_intents",
    timestamps: true,
    indexes: [{ unique: true, fields: ["tenantId", "code"] }],
  }
);

module.exports = AiAgentIntent;
