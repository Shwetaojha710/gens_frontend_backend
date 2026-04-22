const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const CandidateInterviewFeedback = sequelize.define(
  "candidate_interview_feedback",
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
    },
    round_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    interviewer_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    interviewer_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    recommendation: {
      type: DataTypes.ENUM("selected", "hold", "rejected"),
      allowNull: false,
      defaultValue: "hold",
    },
    strengths: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    concerns: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    createdBy: DataTypes.UUID,
    updatedBy: DataTypes.UUID,
  },
  {
    tableName: "candidate_interview_feedback",
    timestamps: true,
  }
);

// CandidateInterviewFeedback.sync().then(() => {
//     console.log("CandidateInterviewFeedback model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing CandidateInterviewFeedback model:", error);
// });

module.exports = CandidateInterviewFeedback;
