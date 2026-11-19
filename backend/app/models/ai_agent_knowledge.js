const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Company knowledge base entries for RAG-style retrieval. */
const AiAgentKnowledge = sequelize.define(
  "ai_agent_knowledge",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    agentId: { type: DataTypes.UUID, allowNull: true },
    category: {
      type: DataTypes.ENUM(
        "company",
        "product",
        "feature",
        "pricing",
        "faq",
        "service",
        "document",
        "brochure",
        "case_study",
        "other"
      ),
      allowNull: false,
      defaultValue: "other",
    },
    title: { type: DataTypes.STRING(255), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    tags: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    fileName: { type: DataTypes.STRING(255), allowNull: true },
    filePath: { type: DataTypes.STRING(500), allowNull: true },
    mimeType: { type: DataTypes.STRING(120), allowNull: true },
    isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    searchText: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "ai_agent_knowledge",
    timestamps: true,
    indexes: [
      { fields: ["tenantId", "isActive", "isApproved"] },
      { fields: ["tenantId", "category"] },
    ],
  }
);

module.exports = AiAgentKnowledge;
