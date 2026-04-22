const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const leave_application = sequelize.define('leave_application', {
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
    compOffId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    toDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    duration_type: {
        type: DataTypes.ENUM('full', 'first_half', 'second_half','short_leave'),
        allowNull: false,
        defaultValue: 'full'
    },
    to_duration_type: {
        type: DataTypes.ENUM('full', 'first_half', 'second_half','short_leave'),
        allowNull: false,
        defaultValue: 'full'
    },
    days: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: false
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending','recommended', 'approved', 'rejected','escalate','self_declined'),
        defaultValue: 'pending'
    },
    approverId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    recommendedId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    canceledId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    appliedOn: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
})

// leave_application.sync({ alter: true }).then(() => {
//     console.log('leave_application model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing leave_application model:', error);
// });


module.exports = leave_application;