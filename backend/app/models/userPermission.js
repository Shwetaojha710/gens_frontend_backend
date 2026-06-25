const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const UserPermission = sequelize.define('user_permission', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    permissions: {
        type: DataTypes.TEXT('long'),
        allowNull: true
    }
}, {
    tableName: 'user_permissions',
    timestamps: true
});

// UserPermission.sync({ alter: true }).then(() => {
//     console.log('UserPermission model synced');
// }).catch(console.error);

module.exports = UserPermission;
