const sequelize = require("../connection/connection");
const { DataTypes } = require("sequelize");

const empPersonal = sequelize.define(
  "empPersonal",
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
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    alternateMobile: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    permanentAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currentAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: true,
    },
    martialStatus: {
      type: DataTypes.ENUM("Single", "Married", "Divorced", "Separated","Widowed"),
      allowNull: true,
    },
    adhaarNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    panNo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fatherName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    motherName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    guarantorName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bloodGroup: {
      type: DataTypes.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
      allowNull: true,
    },
    nationality: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pinCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emp_status:{
      type: DataTypes.STRING,
      defaultValue: "pending",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    joiningDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    exitDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    reportingPersonId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    empType: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "employmentTypes",
        key: "id",
      },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    empCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shift_id: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    designationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    deviceToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isLocation: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    isofflineAtt: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    isofflineAllTimeAtt: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
  },

  {
    timestamps: true,
    indexes: [
      { name: "empPersonal_tenant_idx", fields: ["tenantId"] },
      { name: "empPersonal_email_idx", unique: true, fields: ["email"] },
      { name: "empPersonal_mobile_idx", fields: ["mobile"] },
      { name: "empPersonal_code_idx", fields: ["empCode"] },
      { name: "empPersonal_pan_idx", fields: ["panNo"] },
      { name: "empPersonal_adhaar_idx", fields: ["adhaarNo"] },
      { name: "empPersonal_status_idx", fields: ["status"] },
    ],
  },
);

// empPersonal.sync({ alter: true })
//   .then(() => {
//     console.log("empPersonal model synced successfully");
//   })
//   .catch((error) => {
//     console.error("Error syncing empPersonal model:", error);
//   });

module.exports = empPersonal;
