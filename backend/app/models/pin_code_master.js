  const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const { duration } = require("moment/moment");
  

const pin_code_master = sequelize.define('pin_code_master', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      autoIncrement: true,
    },
    office_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pin_code: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    division_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    circle_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    taluka: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    district_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'pin_code_master',
    underscored: true,
  });

//   pin_code_master.sync({alter:true})
//   .then(() => {
//     console.log("pin_code_master model synced successfully");
//   })
//   .catch((error) => {
//     console.error("Error syncing pin_code_master model:", error);
//   });

module.exports = pin_code_master;