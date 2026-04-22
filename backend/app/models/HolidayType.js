const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const HolidayType = sequelize.define('HolidayType', {
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
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
})

// HolidayType.sync().then(() => {
//     console.log('HolidayType model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing HolidayType model:', error);
// });

module.exports = HolidayType;