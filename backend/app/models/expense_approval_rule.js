const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * Conditional approval rule: when a claim (or the category subtotal, for
 * category-specific rules) falls in [minAmount, maxAmount], these levels apply.
 * levels: ordered subset of ["manager", "skip_manager", "hr", "finance"].
 */
const ExpenseApprovalRule = sequelize.define(
  "expense_approval_rules",
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
    // null = applies to every category
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    minAmount: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0,
    },
    // null = no upper bound
    maxAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    levels: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    // Higher wins when several rules match
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
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

module.exports = ExpenseApprovalRule;
