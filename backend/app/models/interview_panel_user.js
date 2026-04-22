const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const InterviewPanelUser = sequelize.define('interview_panel_user', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mobile_no: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.UUID,
    allowNull: true
  },
  designation: {
    type: DataTypes.UUID,
    allowNull: true
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
    password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'interview_panel_users'
});

const Department = require("./department");
const Designation = require("./designation");

InterviewPanelUser.belongsTo(Department, { foreignKey: "department", as: "departmentData" });
InterviewPanelUser.belongsTo(Designation, { foreignKey: "designation", as: "designationData" });

// InterviewPanelUser.sync({ alter: true }).then(() => {
//   console.log('InterviewPanelUser model synced successfully');
// }).catch((error) => {
//   console.error('Error syncing InterviewPanelUser model:', error);
// });

module.exports = InterviewPanelUser;
