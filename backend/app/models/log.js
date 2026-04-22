const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const log = sequelize.define("log", {
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
  employeeId: {
    type: DataTypes.UUID,
    allowNull: true, // sometimes logs may not be linked to a specific employee
  },
  actionType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  referenceId: {
    type: DataTypes.UUID,
    allowNull: true, 
  },
  oldValue: {
    type: DataTypes.JSON,
    allowNull: true, 
  },
  newValue: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  remarks: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true, 
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  paranoid: true, 
  tableName: "log",
});

log.sync({alter: true})
    .then(() => {
        console.log("log model synced successfully");
    })
    .catch((error) => {
        console.error("Error syncing log model:", error);
    });

module.exports = log;
