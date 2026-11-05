const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * Performance review cycle (quarterly / half-yearly / annual / custom).
 * Holds the review window, phase deadlines, scoring weights, competencies
 * used in 360 feedback and the multi-level approval chain.
 */
const PmCycle = sequelize.define(
  "pm_cycles",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // null = all branches of the tenant
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cycleType: {
      type: DataTypes.ENUM("quarterly", "half_yearly", "annual", "custom"),
      defaultValue: "annual",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    goalSettingDeadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    selfReviewDeadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    feedbackDeadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    managerReviewDeadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // Score weights in % — goals (OKR + KPI), manager rating, 360 feedback
    weightGoals: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
    weightManager: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
    },
    weightFeedback: {
      type: DataTypes.INTEGER,
      defaultValue: 20,
    },
    // ["Communication", "Teamwork", ...]
    competencies: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Ordered approval levels after manager review: ["skip_manager", "hr"]
    approvalLevels: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Optional department filter used when launching; null = everyone
    departmentIds: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("draft", "active", "closed"),
      defaultValue: "draft",
    },
    launchedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = PmCycle;
