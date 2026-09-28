const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const ArrearDetail = sequelize.define(
  "arrear_detail",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    arrearId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "arrears",
        key: "id",
      },
      onDelete: "CASCADE",
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
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actualPaid: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    revisedSalary: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    difference: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    arrearAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    componentBreakup: {
      type: DataTypes.JSONB,
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
  },
  {
    tableName: "arrear_details",
    indexes: [
      {
        name: "idx_arrear_detail_master",
        fields: ["arrearId"],
      },
      {
        name: "idx_arrear_detail_month",
        fields: ["tenantId", "branchId", "employeeId", "year", "month"],
      },
      {
        unique: true,
        name: "uq_arrear_detail_month",
        fields: ["arrearId", "year", "month"],
      },
    ],
  }
);

ArrearDetail.sync({ alter: true })
  .then(() => {
    console.log("ArrearDetail model synced successfully");
  })
  .catch((error) => {
    console.error("Error syncing ArrearDetail model:", error);
  });

module.exports = ArrearDetail;
