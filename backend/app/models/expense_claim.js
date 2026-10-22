const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * Expense-workflow data for a reimbursements row (1:1 by reimbursementId).
 * The reimbursements row stays the claim header — amount, dates, status —
 * so payroll reports and the mobile app keep working unchanged.
 * kind "legacy" rows only exist to hold payment details of old-style claims.
 */
const ExpenseClaim = sequelize.define(
  "expense_claims",
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
      unique: true,
    },
    kind: {
      type: DataTypes.ENUM("expense", "legacy"),
      defaultValue: "expense",
    },
    claimNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Exact total; reimbursements.amount is an integer
    claimedAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: true,
    },
    // Ordered levels resolved at submission, e.g. ["manager", "finance"]
    approvalLevels: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    currentLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Snapshots at submission
    managerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    flagCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Payment tracking
    paymentMode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paymentReference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    paidAt: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    paidBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    paidByName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payrollMonth: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payrollYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = ExpenseClaim;
