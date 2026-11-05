const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Timeline of everything that happened to an asset (condition history included). */
const AsEvent = sequelize.define(
  "as_events",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    assetId: { type: DataTypes.UUID, allowNull: false },
    // registered | updated | allocated | acknowledged | disputed | return_requested |
    // returned | lost | condition | maintenance_opened | maintenance_closed | status
    type: { type: DataTypes.STRING, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: true },
    condition: { type: DataTypes.STRING, allowNull: true },
    details: { type: DataTypes.JSON, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
    actorId: { type: DataTypes.UUID, allowNull: true },
    actorName: { type: DataTypes.STRING, allowNull: true },
  },
  { timestamps: true, indexes: [{ fields: ["assetId"] }] }
);

module.exports = AsEvent;
