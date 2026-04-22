const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Allowance = sequelize.define(
  "allowance",
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
      type: DataTypes.UUID,
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    typeValue: {
      type: DataTypes.DECIMAL(5, 2), 
      allowNull: true,
    },
    finalAmount: {
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
    endPeriodType: {
        type: DataTypes.STRING,
        allowNull: true,
    }, 
    componentId:{
      type: DataTypes.UUID,
      allowNull: true,
    }
  },
  {
    timestamps: true,
      indexes: [
    { name: "allowance_employee_tenant_idx", fields: ["employeeId", "tenantId"] },
    { name: "allowance_status_idx", fields: ["status"] },
    { name: "allowance_component_idx", fields: ["componentId"] },
  ],
  }
);

//  Allowance
//   .sync({ alter: true })
//   .then(() => {
//     console.log("allowance salary model synced successfully");
//   })
//   .catch((error) => {
//     console.error("Error syncing Basic salary model:", error);
//   });

module.exports = Allowance;
