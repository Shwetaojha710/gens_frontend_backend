const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const Department = require("./department");
const EmploymentType = require("./employmentType");
const interview_round = require("./interview_round");

const job_requirement = sequelize.define("job_requirement", {
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
  job_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  job_title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  emp_type: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  department: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  candidate_preference: {
    type: DataTypes.ENUM("male", "female", "both"),
    allowNull: true,
    defaultValue: "both",
  },
  interview_round: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  qualification: DataTypes.STRING,
  no_of_opening: DataTypes.STRING,
  skills: 
  {
    type: DataTypes.TEXT,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('skills');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('skills', JSON.stringify(value));
    } 
  },
  experience: DataTypes.STRING,
  budget_ctc: DataTypes.STRING,
  notice_period: DataTypes.STRING,
  job_description: DataTypes.TEXT,
  url: DataTypes.TEXT,
  token: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  expires_days: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "draft",
  },
  createdBy: DataTypes.UUID,
  updatedBy: DataTypes.UUID,
});


job_requirement.belongsTo(Department, {
  foreignKey: "department",
  as: "departmentData"
});
job_requirement.belongsTo(EmploymentType, {
  foreignKey: "emp_type",
  as: "emp_typeData"
});
// job_requirement.belongsTo(interview_round, {
//   foreignKey: "interview_round",
//   as: "interviewRoundData"
// });

// job_requirement.sync({ alter: true }).then(() => {
//     console.log('job_requirement model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing job_requirement model:', error);
// });


module.exports = job_requirement;
