const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const Candidate = require("./candidate");
const JobRequirement = require("./job_requirement");
const CandidateAtsScore = require("./candidate_ats_score");
const CandidateInterviewRound = require("./candidate_interview_round");
const CandidateInterviewFeedback = require("./candidate_interview_feedback");

const Application = sequelize.define(
  "application",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    candidate_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    job_posting_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stage: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "candidate_applied",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "submitted",
    },
    applied_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ats_status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "queued",
    },
    ats_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    manual_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    final_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    confirmation_email_sent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "applications",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["candidate_id", "job_posting_id"],
      },
    ],
  }
);

Candidate.hasMany(Application, {
  foreignKey: "candidate_id",
  as: "applications",
});

Application.belongsTo(Candidate, {
  foreignKey: "candidate_id",
  as: "candidate",
});

JobRequirement.hasMany(Application, {
  foreignKey: "job_posting_id",
  as: "applications",
});

Application.belongsTo(JobRequirement, {
  foreignKey: "job_posting_id",
  as: "jobPosting",
});

Application.hasOne(CandidateAtsScore, {
  foreignKey: "application_id",
  as: "atsScoreData",
});

CandidateAtsScore.belongsTo(Application, {
  foreignKey: "application_id",
  as: "applicationData",
});

Application.hasMany(CandidateInterviewRound, {
  foreignKey: "application_id",
  as: "interviewRoundsData",
});

CandidateInterviewRound.belongsTo(Application, {
  foreignKey: "application_id",
  as: "applicationData",
});

Application.hasMany(CandidateInterviewFeedback, {
  foreignKey: "application_id",
  as: "interviewFeedbackData",
});

CandidateInterviewFeedback.belongsTo(Application, {
  foreignKey: "application_id",
  as: "applicationData",
});

module.exports = Application;
