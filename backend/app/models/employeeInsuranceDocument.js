const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const EmployeeInsuranceDocument = sequelize.define(
  "employeeInsuranceDocument",
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
    /** e_insurance_card | insurance_policy */
    insuranceDocType: {
      type: DataTypes.ENUM("e_insurance_card", "insurance_policy"),
      allowNull: false,
    },
    /** Original client filename for display */
    originalName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    /** MIME type */
    doc_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    /** Stored filename on disk (upload/) */
    doc_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
      allowNull: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["tenantId", "employeeId", "insuranceDocType"],
        name: "uniq_emp_insurance_doc_type",
      },
    ],
  }
);

EmployeeInsuranceDocument.sync({ alter: true })
  .then(() => {
    console.log("EmployeeInsuranceDocument model synced successfully");
  })
  .catch((error) => {
    console.error("Error syncing EmployeeInsuranceDocument model:", error);
  });

module.exports = EmployeeInsuranceDocument;
