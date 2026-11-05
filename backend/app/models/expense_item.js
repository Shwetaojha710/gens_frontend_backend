const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** One expense line of a claim (claim header = reimbursements row). */
const ExpenseItem = sequelize.define(
  "expense_items",
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
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expenseDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    merchant: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoiceNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    receiptId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // [{ type, message }] — policy breaches and possible duplicates shown to approvers
    flags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["reimbursementId"] },
      { fields: ["tenantId", "employeeId", "categoryId", "expenseDate"] },
    ],
  }
);

module.exports = ExpenseItem;
