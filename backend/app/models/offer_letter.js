const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const OfferLetter = sequelize.define("offer_letter", {
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
  fatherName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  gender: {
    type: DataTypes.ENUM("Male", "Female", "Other"),
    allowNull: false,
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  aadhaarNo: {
    type: DataTypes.STRING(14),
    allowNull: true,
  },
  mobileNo: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  permanentAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  joiningDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  offerDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  refNo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
});

// OfferLetter.sync({ alter: true })
//   .then(() => console.log("offer_letter model synced successfully"))
//   .catch((error) => console.error("Error syncing offer_letter model:", error));

module.exports = OfferLetter;
