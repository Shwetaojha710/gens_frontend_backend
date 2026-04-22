const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const Currency = sequelize.define('currency', {
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


// Currency.sync({ alter: true }).then(() => {
//     console.log('Currency model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing Currency model:', error);
// });

module.exports = Currency;