const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Tenant-wide timesheet settings (one row per tenant). */
const PtSetting = sequelize.define(
  "pt_settings",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, unique: true },
    // ISO weekdays that count as working days (1 = Monday … 7 = Sunday)
    workingDays: { type: DataTypes.JSON, allowNull: true },
    hoursPerDay: { type: DataTypes.DECIMAL(4, 2), defaultValue: 8 },
    // Logged hours may exceed attendance hours by this much before it is flagged
    reconcileToleranceHours: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0.5 },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  { timestamps: true }
);

module.exports = PtSetting;
