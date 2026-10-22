const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * One employee's week (weekStart = Monday). Entries are edited while
 * draft / rejected; submission sends it to the reporting manager.
 */
const PtTimesheet = sequelize.define(
  "pt_timesheets",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    weekStart: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM("draft", "submitted", "approved", "rejected"),
      defaultValue: "draft",
    },
    totalHours: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
    billableHours: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
    // Reporting manager snapshot at submission
    approverId: { type: DataTypes.UUID, allowNull: true },
    submittedAt: { type: DataTypes.DATE, allowNull: true },
    decidedBy: { type: DataTypes.UUID, allowNull: true },
    decidedByName: { type: DataTypes.STRING, allowNull: true },
    decidedAt: { type: DataTypes.DATE, allowNull: true },
    comments: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    timestamps: true,
    indexes: [{ unique: true, fields: ["employeeId", "weekStart"] }],
  }
);

module.exports = PtTimesheet;
