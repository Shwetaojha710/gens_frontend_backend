const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const salarydoc = sequelize.define('salarydoc', {
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
     year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    month: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    chequeNo: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    bill_date:{
        type:DataTypes.DATEONLY,
        allowNull:true
    },
  
    net_amount:{
        type:DataTypes.FLOAT,
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

// salarydoc.sync({alter:true}).then(() => {
//     console.log('salarydoc model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing salarydoc model:', error);
// });

module.exports = salarydoc;