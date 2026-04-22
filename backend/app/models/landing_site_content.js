const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const LandingSiteContent = sequelize.define(
  "landing_site_content",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      defaultValue: "default",
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    tableName: "landing_site_contents",
    timestamps: true,
  },
);
// LandingSiteContent.sync({ alter: true }).then(() => {
//     console.log('LandingSiteContent model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing LandingSiteContent model:', error);
// });


module.exports = LandingSiteContent;
