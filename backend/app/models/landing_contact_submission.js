const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const LandingContactSubmission = sequelize.define(
  "landing_contact_submission",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: "full_name",
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: "user_agent",
    },
  },
  {
    tableName: "landing_contact_submissions",
    timestamps: true,
    underscored: true,
  },
);

module.exports = LandingContactSubmission;
