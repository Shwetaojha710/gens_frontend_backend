const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const salary_order = sequelize.define('salary_order', {
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
    component: {
        type: DataTypes.STRING,
        allowNull: true
    },
    order:{
        type:DataTypes.INTEGER,
        allowNull:true
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

// salary_order.sync({ alter: true }).then(() => {
//     console.log('salary_order model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing salary_order model:', error);
// });

module.exports = salary_order;