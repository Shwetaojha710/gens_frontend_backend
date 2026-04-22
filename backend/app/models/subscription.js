const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Subscription = sequelize.define("subscription", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  plan: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "expired", "cancelled"),
    defaultValue: "active",
  },
  startsAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    defaultValue: null,
  },
});

// Subscription.sync({alter:true}).then(() => {
//     console.log('Subscription model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing Subscription model:', error);
// });
module.exports = Subscription;

