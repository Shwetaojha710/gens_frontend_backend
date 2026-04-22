const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const attendanceSetting = sequelize.define("attendanceSetting", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    branchId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
    lateAllowanceMin: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    },
    graceMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 15
    },
    halfDayThreshold: {
        type: DataTypes.INTEGER,
        defaultValue: 45
    },
    halfdayToAbsentMin: {
        type: DataTypes.INTEGER,
        defaultValue: 4
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
}, {
    timestamps: true
})


// attendanceSetting.sync({alter: true})
//     .then(() => {
//         console.log("Shift table created or updated successfully.");
//     })
//     .catch((error) => {
//         console.error("Error creating or updating Shift table:", error);
//     });

module.exports = attendanceSetting;