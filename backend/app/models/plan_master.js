const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const PlanMaster = sequelize.define("plan_master", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  billingCycle: {
    type: DataTypes.ENUM("monthly", "yearly", "one_time"),
    allowNull: false,
    defaultValue: "monthly",
  },
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  maxUsers: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM("active", "inactive"),
    defaultValue: "active",
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


  // PlanMaster.sync({alter:true})
  // .then(() => {
  //   console.log("PlanMaster model synced successfully");
  // })
  // .catch((error) => {
  //   console.error("Error syncing PlanMaster model:", error);
  // });

module.exports = PlanMaster;

