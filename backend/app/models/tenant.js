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
    /** Optional logo for dark backgrounds (e.g. a white logo for the dark sidebar) */
    imageDark: {
        type: DataTypes.STRING,
        allowNull: true
    },
    letterhead: {
        type: DataTypes.STRING,
        allowNull: true
    },
    handbook: {
        type: DataTypes.STRING,
        allowNull: true
    },
    /** Company-wide insurance policy PDF (shown to all employees) */
    insurancePolicy: {
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

/** Public URL of the company logo (stored in `image`), or null when none is set. */
Tenant.logoUrl = filename => (filename ? `${process.env.BASE_URL}/upload/${filename}` : null);

/** Logo file for light surfaces (letters, PDFs): normal logo, else the dark one. */
Tenant.lightLogoFile = tenant => tenant?.image || tenant?.imageDark || null;

/** Logo file for dark surfaces (sidebar): dark logo, else the normal one. */
Tenant.darkLogoFile = tenant => tenant?.imageDark || tenant?.image || null;

// Disabled: sync({ alter: true }) exhausts Postgres locks (53200 out of shared memory)
// Tenant.sync({ alter: true }).then(() => {
//     console.log('Tenant model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing Tenant model:', error);
// });

// Only add the logo columns (image, imageDark) when they are missing.
(async () => {
    try {
        const qi = sequelize.getQueryInterface();
        const desc = await qi.describeTable("tenants");
        for (const column of ["image", "imageDark"]) {
            if (!desc[column]) {
                await qi.addColumn("tenants", column, {
                    type: DataTypes.STRING,
                    allowNull: true,
                });
                console.log(`tenant.${column} column added`);
            }
        }
    } catch (error) {
        console.error(
            "Error ensuring tenant logo columns:",
            error?.parent?.message || error?.message || error,
        );
    }
})();

module.exports = Tenant;