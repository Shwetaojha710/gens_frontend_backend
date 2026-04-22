const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Shift = sequelize.define("shift", {
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
      allowNull: true,
    },
    shift: {
        type: DataTypes.ENUM('Day', 'Night','Afternoon','General'),
        allowNull: false,
        set(value) {
            if (this.isNewRecord) {
                this.setDataValue('shift', value);
            } else {
                throw new Error("Shift type cannot be updated once created.");
            }
        }
    },
    day_of_week: {
        type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        allowNull: true,
    },
    startTime: {
        type: DataTypes.TIME,
        allowNull: true
    },
    endTime: {
        type: DataTypes.TIME,
        allowNull: false
    },
    workingHours:{
        type:DataTypes.DECIMAL(4, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    is_week_off:{
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
});


// Shift.beforeUpdate((shiftInstance, options) => {
//     if (shiftInstance.changed('shift')) {
//         throw new Error("Shift type cannot be updated once set.");
//     }
// });

// Shift.sync({ alter: true })
//     .then(() => {
//         console.log("Shift table created or updated successfully.");
//     })
//     .catch((error) => {
//         console.error("Error creating or updating Shift table:", error);
//     });

module.exports = Shift;
