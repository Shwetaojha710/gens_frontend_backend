const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * Project. billingType:
 *  - time_material: client billed per billable hour (budgetAmount = client cap)
 *  - fixed: fixed fee (budgetAmount = internal cost budget)
 *  - non_billable: internal project, every hour is non-billable
 */
const PtProject = sequelize.define(
  "pt_projects",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    // null = internal project
    clientId: { type: DataTypes.UUID, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    // Project manager (employee)
    managerId: { type: DataTypes.UUID, allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: {
      type: DataTypes.ENUM("planned", "active", "on_hold", "completed", "cancelled"),
      defaultValue: "active",
    },
    billingType: {
      type: DataTypes.ENUM("time_material", "fixed", "non_billable"),
      defaultValue: "time_material",
    },
    budgetHours: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    budgetAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    // Per-hour rates used when a member has no rate of their own
    defaultBillRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    defaultCostRate: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  { timestamps: true }
);

module.exports = PtProject;
