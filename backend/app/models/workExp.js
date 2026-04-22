const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const workExp = sequelize.define('workExperience', {
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
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "empPersonals",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    designation: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description:{
        type: DataTypes.TEXT,
        allowNull: true
    },
    from: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    to: {
        type: DataTypes.DATEONLY,
        allowNull: true
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

// workExp.sync({ alter: true }).then(() => {
//     console.log('Work Experience model synced successfully');
// }).catch((error) => {   
//     console.error('Error syncing Work Experience model:', error);
// });

module.exports = workExp;