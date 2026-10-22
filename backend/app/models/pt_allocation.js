const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Employee assigned to a project for a period; only allocated employees can log time. */
const PtAllocation = sequelize.define(
  "pt_allocations",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    projectId: { type: DataTypes.UUID, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: true },
    // Planned share of the employee's time on this project
    allocationPercent: { type: DataTypes.INTEGER, defaultValue: 100 },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    isBillable: { type: DataTypes.BOOLEAN, defaultValue: true },
    // Override the project's default rates for this member
    billRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    costRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: { type: DataTypes.ENUM("active", "removed"), defaultValue: "active" },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    timestamps: true,
    indexes: [{ fields: ["projectId", "employeeId"] }],
  }
);

module.exports = PtAllocation;
