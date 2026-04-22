const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const skills = sequelize.define(
  "skills",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updateddBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    tableName: "skills",
    timestamps: true,
  },
);

// skills
//   .sync({ alter: true })
//   .then(() => {
//     console.log("skills model synced successfully");
//   })
//   .catch((error) => {
//     console.error("Error syncing skills model:", error);
//   });

module.exports = skills;
