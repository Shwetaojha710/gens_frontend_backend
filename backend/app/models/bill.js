const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const bill = sequelize.define('bill', {
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
        autoIncrement: true,
        unique:true
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
  
    net_amount:{
        type:DataTypes.FLOAT,
        allowNull:true
    },
    full_days: {
        type: DataTypes.STRING,
        allowNull: false
    },
    absent_days: {
        type: DataTypes.STRING,
        allowNull: true
    },
    leave_taken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    allowed_leave: {
        type: DataTypes.STRING,
        allowNull: true
    },
    half_day: {
        type: DataTypes.STRING,
        allowNull: true
    },
    late_attendance: {
        type: DataTypes.STRING,
        allowNull: true
    },
    hours_worked: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bill_desc:{
        type:DataTypes.TEXT,
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

// bill.sync({alter:true}).then(() => {
//     console.log('bill model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing bill model:', error);
// });

module.exports = bill;