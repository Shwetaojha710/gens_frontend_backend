const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Measurable key result of an OKR objective (pm_goals.type = "okr"). */
const PmKeyResult = sequelize.define(
  "pm_key_results",
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
    goalId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startValue: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0,
    },
    targetValue: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    currentValue: {
      type: DataTypes.DECIMAL(14, 2),
      defaultValue: 0,
    },
    weightage: {
      type: DataTypes.DECIMAL(6, 2),
      defaultValue: 1,
    },
  },
  { timestamps: true }
);

module.exports = PmKeyResult;
