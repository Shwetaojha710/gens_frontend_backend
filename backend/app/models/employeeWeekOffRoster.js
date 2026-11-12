const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * Date-wise week-off override per employee.
 *  type = 'WO'      -> employee is OFF on this date (even if shift/fixed says working)
 *  type = 'WORKING' -> employee WORKS on this date (even if shift/fixed says week off)
 * Priority: roster > empPersonal.week_off_days > Shift.is_week_off
 */
const employeeWeekOffRoster = sequelize.define(
  "employeeWeekOffRoster",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: { isIn: [["WO", "WORKING"]] },
    },
    remark: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    tableName: "employee_week_off_roster",
    indexes: [
      {
        unique: true,
        fields: ["tenantId", "employeeId", "date"],
        name: "uq_emp_week_off_roster_tenant_emp_date",
      },
    ],
  },
);

module.exports = employeeWeekOffRoster;
