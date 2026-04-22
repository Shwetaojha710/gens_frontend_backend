const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Basic = sequelize.define(
  "Basic",
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
      allowNull: false,
      references: {
        model: "empPersonals",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dependent: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    typeValue: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    finalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    finalCTC: {
      type: DataTypes.DECIMAL(10, 2),
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
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
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
      { name: "basic_employee_tenant_idx", fields: ["employeeId", "tenantId"] },
      { name: "basic_status_idx", fields: ["status"] },
      { name: "basic_component_idx", fields: ["componentId"] },
    ],
  }
);

// Basic
//   .sync({ alter: true })
//   .then(() => {
//     console.log("Basic salary model synced successfully");
//   })
//   .catch((error) => {
//     console.error("Error syncing Basic salary model:", error);
//   });

module.exports = Basic;
