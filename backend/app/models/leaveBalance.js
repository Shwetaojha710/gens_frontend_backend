const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const leave_balance = sequelize.define('leave_balance', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    leaveTypeId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    month: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    totalAssigned: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: false
    },
    usedLeaves: {
        type: DataTypes.DECIMAL(5, 1),
        defaultValue: 0.0
    },
    carryForwarded: {
        type: DataTypes.DECIMAL(5, 1),
        defaultValue: 0.0
    },
    remainingLeaves: {
        type: DataTypes.DECIMAL(5, 1),
        defaultValue: 0.0
    },
     prevremainingLeaves: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: true
    },
    prevusedLeaves: {
        type: DataTypes.DECIMAL(5, 1),
        defaultValue: 0.0,
        allowNull:true
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false
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
    timestamps: true
});

// leave_balance.sync({ alter: true }).then(() => {
//     console.log('leave_balance model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing leave_balance model:', error);
// });

module.exports = leave_balance;