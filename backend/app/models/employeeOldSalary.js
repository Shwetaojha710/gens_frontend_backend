const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const EmployeeOldSalary = sequelize.define(
  "EmployeeOldSalary",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: "empPersonals",
        key: "id",
      },
    },
    empCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    oldSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    tableName: "employee_old_salary",
    timestamps: true,
  }
);

module.exports = EmployeeOldSalary;
