const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Repair / service / inspection record of an asset. */
const AsMaintenance = sequelize.define(
  "as_maintenance",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    assetId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.ENUM("repair", "service", "upgrade", "inspection"), defaultValue: "repair" },
    description: { type: DataTypes.TEXT, allowNull: false },
    vendor: { type: DataTypes.STRING, allowNull: true },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    cost: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    underWarranty: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: { type: DataTypes.ENUM("open", "closed"), defaultValue: "open" },
    // Asset status before it went in for repair, restored on close
    previousStatus: { type: DataTypes.STRING, allowNull: true },
    conditionAfter: { type: DataTypes.STRING, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
  },
  { timestamps: true, freezeTableName: true, indexes: [{ fields: ["assetId"] }] }
);

module.exports = AsMaintenance;
