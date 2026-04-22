const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const interview_round = require("./interview_round");

const CandidateInterviewRound = sequelize.define(
  "candidate_interview_round",
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
    round_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    round_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    interviewer_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    interviewer_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    interviewer_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    mode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    meeting_link: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "scheduled", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    feedback_submitted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdBy: DataTypes.UUID,
    updatedBy: DataTypes.UUID,
  },
  {
    tableName: "candidate_interview_rounds",
    timestamps: true,
  }
);

CandidateInterviewRound.belongsTo(interview_round, {
  foreignKey: "round_id",
  as: "roundMasterData",
});

// CandidateInterviewRound.sync().then(() => {
//     console.log("CandidateInterviewRound model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing CandidateInterviewRound model:", error);
// });

module.exports = CandidateInterviewRound;
