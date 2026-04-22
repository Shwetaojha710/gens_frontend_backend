const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const bankAccnt = sequelize.define('bankAccnt', {
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
    accountHolderName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bankName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bankBranch: {
        type: DataTypes.STRING,
        allowNull: false
    },
    accountNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ifscCode: {
        type: DataTypes.STRING,
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

// bankAccnt.sync({ alter: true }).then(() => {
//     console.log('Bank Account model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing Bank Account model:', error);
// });

module.exports = bankAccnt;