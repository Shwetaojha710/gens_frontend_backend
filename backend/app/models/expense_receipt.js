const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * An uploaded receipt / invoice and what OCR read from it.
 * Uploaded before the claim exists; linked to an item on submission.
 */
const ExpenseReceipt = sequelize.define(
  "expense_receipts",
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
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // sha256 of the file bytes — catches the same receipt being claimed twice
    fileHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    ocrStatus: {
      type: DataTypes.ENUM("done", "failed", "skipped"),
      defaultValue: "skipped",
    },
    ocrText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // { amount, date, merchant, invoiceNo, gstin }
    ocrData: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    reimbursementId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [{ fields: ["tenantId", "fileHash"] }],
  }
);

module.exports = ExpenseReceipt;
