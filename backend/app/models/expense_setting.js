const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Tenant-wide expense settings (one row per tenant). */
const ExpenseSetting = sequelize.define(
  "expense_settings",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    // Levels used when no approval rule matches
    defaultLevels: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Employees (portal users) who can act on the finance level and record payments
    financeEmployeeIds: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Add an HR level when any item is flagged (policy breach / possible duplicate)
    flaggedRequiresHr: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    claimPrefix: {
      type: DataTypes.STRING,
      defaultValue: "EXP",
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = ExpenseSetting;
