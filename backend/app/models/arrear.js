const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Arrear = sequelize.define(
  "arrear",
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
    effectiveYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    effectiveMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    implementationYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    implementationMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payoutYear: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    payoutMonth: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    revisedMonthlySalary: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    percentage: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    effectiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    totalArrear: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("draft", "pending", "approved", "rejected", "paid"),
      defaultValue: "draft",
    },
    paidBillId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    allowanceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approverId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectRemark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "arrears",
    indexes: [
      {
        name: "idx_arrear_employee",
        fields: ["tenantId", "branchId", "employeeId"],
      },
      {
        name: "idx_arrear_status_payout",
        fields: ["tenantId", "branchId", "status", "payoutYear", "payoutMonth"],
      },
      {
        name: "idx_arrear_period_lookup",
        fields: [
          "tenantId",
          "branchId",
          "employeeId",
          "effectiveYear",
          "effectiveMonth",
          "implementationYear",
          "implementationMonth",
        ],
      },
    ],
  }
);

Arrear.sync({ alter: true })
  .then(() => {
    console.log("Arrear model synced successfully");
  })
  .catch((error) => {
    console.error("Error syncing Arrear model:", error);
  });

module.exports = Arrear;
