const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const AiAgentLead = sequelize.define(
  "ai_agent_leads",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    conversationId: { type: DataTypes.UUID, allowNull: true },
    waId: { type: DataTypes.STRING(40), allowNull: true },
    fullName: { type: DataTypes.STRING(160), allowNull: true },
    companyName: { type: DataTypes.STRING(200), allowNull: true },
    email: { type: DataTypes.STRING(200), allowNull: true },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    productInterest: { type: DataTypes.STRING(255), allowNull: true },
    businessRequirements: { type: DataTypes.TEXT, allowNull: true },
    employeeCount: { type: DataTypes.STRING(40), allowNull: true },
    budget: { type: DataTypes.STRING(80), allowNull: true },
    purchaseTimeline: { type: DataTypes.STRING(80), allowNull: true },
    leadSource: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "whatsapp" },
    leadStatus: {
      type: DataTypes.ENUM(
        "new",
        "qualifying",
        "qualified",
        "demo_scheduled",
        "nurturing",
        "won",
        "lost",
        "handed_over"
      ),
      allowNull: false,
      defaultValue: "new",
    },
    leadPriority: {
      type: DataTypes.ENUM("HOT", "WARM", "COLD"),
      allowNull: false,
      defaultValue: "COLD",
    },
    assignedTo: { type: DataTypes.UUID, allowNull: true },
    qualificationScore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    collectedFields: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    meta: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agent_leads",
    timestamps: true,
    indexes: [
      { fields: ["tenantId", "leadPriority"] },
      { fields: ["tenantId", "leadStatus"] },
      { fields: ["tenantId", "phone"] },
      { fields: ["conversationId"] },
    ],
  }
);

module.exports = AiAgentLead;
