const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * An employee goal inside a cycle.
 *  - type "okr": objective; progress comes from its pm_key_results rows.
 *  - type "kpi": measurable target; progress = actualValue vs targetValue.
 */
const PmGoal = sequelize.define(
  "pm_goals",
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
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    cycleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("okr", "kpi"),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Relative weight of this goal inside the goal score
    weightage: {
      type: DataTypes.DECIMAL(6, 2),
      defaultValue: 0,
    },
    // KPI fields
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    targetValue: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    actualValue: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    higherIsBetter: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    selfComment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    managerComment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // "hr" | "manager" | "employee"
    assignedByRole: {
      type: DataTypes.STRING,
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

module.exports = PmGoal;
