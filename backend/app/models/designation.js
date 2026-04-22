const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Designation = sequelize.define("designation", {
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
  department: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "departments",
      key: "id",
    },
    onDelete: "CASCADE", 
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("active", "inactive"),
    defaultValue: "active",
  },
  createdBy: {
       type: DataTypes.UUID,
       allowNull: true
  },
  updatedBy: {
       type: DataTypes.UUID,
       allowNull: true
  }
});

// Designation.sync({ alter: true }).then(() => {
//     console.log('Designation model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing Designation model:', error);
// });

module.exports = Designation;
