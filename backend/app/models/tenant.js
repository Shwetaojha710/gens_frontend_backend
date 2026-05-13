const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const Tenant = sequelize.define('tenant', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
      companyAddress: {
        type: DataTypes.TEXT,
        allowNull: true
    },
      image: {
        type: DataTypes.STRING,
        allowNull: true
    },
    companyCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    },
    plan: {
        type: DataTypes.STRING,
        defaultValue: 'basic'
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
    },
    brandColors: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null
    }
});

Tenant.associate = models => {
    Tenant.hasMany(models.User, { foreignKey: 'tenantId' });
    if (models.Subscription) {
        Tenant.hasMany(models.Subscription, { foreignKey: 'tenantId' });
    }
};

Tenant.sync({ alter: true }).then(() => {
    console.log('Tenant model synced successfully');
}).catch((error) => {
    console.error('Error syncing Tenant model:', error);
});


module.exports = Tenant;