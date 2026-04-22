// models/deviceLocationLog.js
const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const DeviceLocationLog = sequelize.define(
  "device_location_logs",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    device_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    device_os: {
      type: DataTypes.ENUM("A", "I", "W"),
      allowNull: false, // A=Android, I=iOS
    },

    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    altitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    accuracy: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    altitude_accuracy: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    heading: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    speed: {
      type: DataTypes.DOUBLE,
      allowNull: true,
    },

    mode: {
      type: DataTypes.ENUM("foreground", "background"),
      allowNull: false,
    },
    network_mode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    tracked_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    visit_place: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    remark: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location_type: {
      // type: DataTypes.ENUM("Pinned", "Normal"),
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "normal",
    },
  },
  {
    tableName: "device_location_logs",
    timestamps: true,
  },
);

// DeviceLocationLog.sync({ alter: true }).then(() => {
//     console.log('DeviceLocationLog model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing DeviceLocationLog model:', error);
// });

module.exports = DeviceLocationLog;
//
