const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const round_type = sequelize.define('round_type', {
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


// round_type.sync({ alter: true }).then(() => {
//     console.log('round_type model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing round_type model:', error);
// });

module.exports = round_type;