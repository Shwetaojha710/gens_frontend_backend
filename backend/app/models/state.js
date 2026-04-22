const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const State = sequelize.define("states", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true, 
        primaryKey: true
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    country_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: "states",
    timestamps: false
});

// sequelize.sync({ alter: true }).then(() => {
//     console.log("State model synced successfully");
// }).catch((error) => {
//     console.error("Error syncing States model:", error);
// });

module.exports = State;