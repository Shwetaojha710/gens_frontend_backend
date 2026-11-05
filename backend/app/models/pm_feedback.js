const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** 360-degree feedback request / response for a reviewee in a cycle. */
const PmFeedback = sequelize.define(
  "pm_feedback",
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
    cycleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    revieweeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reviewerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    relationship: {
      type: DataTypes.ENUM("manager", "peer", "direct_report"),
      allowNull: false,
    },
    // { "Communication": 4, "Teamwork": 5 }
    competencyRatings: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    overallRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    improvements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "submitted"),
      defaultValue: "pending",
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    freezeTableName: true,
    indexes: [{ unique: true, fields: ["reviewId", "reviewerId"] }],
  }
);

module.exports = PmFeedback;
