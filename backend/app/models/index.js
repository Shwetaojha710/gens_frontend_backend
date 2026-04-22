const Sequelize = require("sequelize");
const sequelize = require("../connection/connection");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.JobRequirement = require("./job_requirement");
db.Department = require("./department");
db.Candidate = require("./candidate");
db.CandidateAtsScore = require("./candidate_ats_score");
db.CandidateInterviewRound = require("./candidate_interview_round");
db.CandidateInterviewFeedback = require("./candidate_interview_feedback");
db.Application = require("./application");

// Call associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
