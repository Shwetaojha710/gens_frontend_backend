const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * Expense category with its spending policy.
 * limitAction "block" rejects violating items at submission; "flag" lets them
 * through marked for the approvers.
 */
const ExpenseCategory = sequelize.define(
  "expense_categories",
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Max amount for a single expense item; null = no limit
    perClaimLimit: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    // Max total per employee per calendar month; null = no limit
    monthlyLimit: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    // A receipt is mandatory above this amount; 0 = always required
    receiptRequiredAbove: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0,
    },
    // Expense must be claimed within this many days; null = no limit
    maxAgeDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    limitAction: {
      type: DataTypes.ENUM("block", "flag"),
      defaultValue: "flag",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
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

module.exports = ExpenseCategory;
