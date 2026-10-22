const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * Hours on a project (and optionally a task) on one day.
 * A running timer is an entry with timerStartedAt set; stopping it adds the
 * elapsed time to `hours`.
 */
const PtTimeEntry = sequelize.define(
  "pt_time_entries",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    timesheetId: { type: DataTypes.UUID, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    projectId: { type: DataTypes.UUID, allowNull: false },
    taskId: { type: DataTypes.UUID, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    hours: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    isBillable: { type: DataTypes.BOOLEAN, defaultValue: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    source: { type: DataTypes.ENUM("manual", "timer"), defaultValue: "manual" },
    timerStartedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["timesheetId"] },
      { fields: ["tenantId", "projectId", "date"] },
      { fields: ["employeeId", "date"] },
    ],
  }
);

module.exports = PtTimeEntry;
