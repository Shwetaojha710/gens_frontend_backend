const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Audit trail of each approval level acted on for an expense claim. */
const ExpenseApproval = sequelize.define(
  "expense_approvals",
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
    reimbursementId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // "manager" | "skip_manager" | "hr" | "finance"
    approverType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    approverId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approverName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    action: {
      type: DataTypes.ENUM("approved", "rejected"),
      allowNull: false,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = ExpenseApproval;
