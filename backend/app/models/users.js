const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const User = sequelize.define('user', {
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
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'compositeIndex'
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'hr', 'employee', 'superadmin'),
        defaultValue: 'employee'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    token: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    webcamtoken: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        defaultValue: null
    }
});

User.associate = models => {
    User.belongsTo(models.Tenant, { foreignKey: 'tenantId' });
};

// User.sync({ alter: true }).then(() => {
//     console.log('User model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing User model:', error);
// });

module.exports = User;
