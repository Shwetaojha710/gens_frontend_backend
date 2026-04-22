const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection.js");

const comp_off = sequelize.define("comp_off", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  attendanceId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  earnedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  totalDays: {
    type: DataTypes.DECIMAL(3,1),
    defaultValue: 1.0,
  },
  usedDays: {
    type: DataTypes.DECIMAL(3,1),
    defaultValue: 0.0,
  },
  remainingDays: {
    type: DataTypes.DECIMAL(3,1),
    defaultValue: 1.0,
  },
  status: {
    type: DataTypes.ENUM("active", "expired", "used"),
    defaultValue: "active",
  },
  approval_status: {
    type: DataTypes.STRING,
    defaultValue: "approved",
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
    tableName: "comp_off",
    timestamps: true, 
});

// comp_off.sync().then(() => {
//     console.log("comp_off model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing comp_off model:", error);
// });

module.exports = comp_off;