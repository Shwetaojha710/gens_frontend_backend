const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const CandidateAtsScore = sequelize.define(
  "candidate_ats_score",
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
    application_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    ats_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    manual_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    final_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    shortlisted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    scanned_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    scanned_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    createdBy: DataTypes.UUID,
    updatedBy: DataTypes.UUID,
  },
  {
    tableName: "candidate_ats_scores",
    timestamps: true,
  }
);

// CandidateAtsScore.sync().then(() => {
//     console.log("CandidateAtsScore model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing CandidateAtsScore model:", error);
// });

module.exports = CandidateAtsScore;
