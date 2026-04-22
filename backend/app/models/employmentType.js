const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const EmploymentType = sequelize.define('employmentType', {
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
    duration_type: {
        type: DataTypes.ENUM('full_paid', 'half_paid'),
        allowNull: false,
        defaultValue: 'full_paid'
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

// EmploymentType.sync({ alter: true }).then(() => {
//     console.log('EmploymentType model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing EmploymentType model:', error);
// });

module.exports = EmploymentType;