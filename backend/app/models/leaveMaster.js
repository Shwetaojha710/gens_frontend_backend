const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const leaveMaster = sequelize.define('leave_master', {
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
    leaveName: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    leaveCode: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    allowedPerYear: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    carryForward: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    maxCarryForward: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    enCashable: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    genderRestriction: {
        type: DataTypes.ENUM('male', 'female', 'all'),
        defaultValue: 'all'
    },
    requiresApproval: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    applyBeforeDays: {
        type: DataTypes.INTEGER,
        defaultValue: 0, // 0 means same-day allowed
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
    }
})


// leaveMaster
//     .sync({alter: true})
//     .then(() => {
//         console.log("Basic salary model synced successfully");
//     })
//     .catch((error) => {
//         console.error("Error syncing Basic salary model:", error);
//     });


module.exports = leaveMaster
