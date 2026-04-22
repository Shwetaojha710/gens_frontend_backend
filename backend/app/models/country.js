const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Country = sequelize.define("countries", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true, 
        primaryKey: true
    },
     branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    shortname: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phonecode: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "countries",
    timestamps: false, 
});

// Country.sync({ alter: true }).then(() => {
//     console.log("Country model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing Country model:", error);
// });

module.exports = Country;