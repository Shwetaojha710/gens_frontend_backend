const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const branch = sequelize.define('branch', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
     latitude: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: true,
      defaultValue: null
    },
     longitude: {
      type: DataTypes.DECIMAL(18, 8),
      allowNull: true,
      defaultValue: null
    },
    /** Allowed radius around latitude/longitude, in metres (e.g. 100). */
    range: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    image:{
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
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


// branch.sync({ alter: true }).then(() => {
//     console.log('branch model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing branch model:', error);
// });

// sync is off for this model: add the range column only when it is missing
(async () => {
  try {
    const qi = sequelize.getQueryInterface();
    const table = branch.getTableName();
    const desc = await qi.describeTable(table);
    if (!desc.range) {
      await qi.addColumn(table, "range", { type: DataTypes.INTEGER, allowNull: true, defaultValue: null });
      console.log("branch.range column added");
    }
  } catch (error) {
    console.error("Error ensuring branch.range:", error?.parent?.message || error?.message || error);
  }
})();

module.exports = branch;