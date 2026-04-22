const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const bill_info = sequelize.define('bill_info', {
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
    bill_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    month: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "empPersonals",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    bill_date:{
        type:DataTypes.DATEONLY,
        allowNull:true
    },
    pay_component_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    pay_code: {
        type: DataTypes.STRING,
        allowNull: false
    },
    amount: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // net_amount:{
    //     type:DataTypes.INTEGER,
    //     allowNull:true
    // },
    // full_days: {
    //     type: DataTypes.STRING,
    //     allowNull: false
    // },
    // absent_days: {
    //     type: DataTypes.STRING,
    //     allowNull: true
    // },
    // hours_worked: {
    //     type: DataTypes.STRING,
    //     allowNull: true
    // },
    // bill_desc:{
    //     type:DataTypes.TEXT,
    //     allowNull:true
    // },
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

// bill_info.sync().then(() => {
//     console.log('bill_info model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing bill_info model:', error);
// });

module.exports = bill_info;