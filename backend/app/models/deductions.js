const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const deduction = sequelize.define(
  "deduction",
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
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    typeValue: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    dependent: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endPeriodType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    finalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    componentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        name: "deduction_employee_tenant_idx",
        fields: ["employeeId", "tenantId"],
      },
      { name: "deduction_status_idx", fields: ["status"] },
      { name: "deduction_component_idx", fields: ["componentId"] },
    ],
  }
);

// deduction.sync({alter:true}).then(() => {
//     console.log("deduction model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing deduction model:", error);
// });

module.exports = deduction;
