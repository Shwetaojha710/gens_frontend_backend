const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const AttendanceRegularization = sequelize.define("attendance_regularization", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  attendanceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },



  inTimeRequested: {
     type: DataTypes.STRING(50),
        allowNull: true,
  },

  outTimeRequested: {
     type: DataTypes.STRING(50),
        allowNull: true,
  },

  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM("pending", "approved", "rejected"),
    defaultValue: "pending",
  },

  originalCheckIn: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  originalCheckOut: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  wasNewAttendance: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },

  approverId: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
});

AttendanceRegularization.sync({alter:true})
    .then(() => {
        console.log("AttendanceRegularization table created or updated successfully.");
    })
    .catch((error) => {
        console.error("Error creating or updating AttendanceRegularization table:", error);
    });
module.exports = AttendanceRegularization;
