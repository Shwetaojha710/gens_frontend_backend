const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * A company asset. status:
 *  available → allocated → available (returned) …; in_repair while under
 *  maintenance; retired / lost are final unless HR reverses them.
 */
const AsAsset = sequelize.define(
  "as_assets",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: { type: DataTypes.UUID, allowNull: true },
    categoryId: { type: DataTypes.UUID, allowNull: false },
    // Human-readable unique ID printed on the label
    assetTag: { type: DataTypes.STRING, allowNull: false },
    // Unguessable token encoded in the QR code
    qrToken: { type: DataTypes.STRING(64), allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    brand: { type: DataTypes.STRING, allowNull: true },
    model: { type: DataTypes.STRING, allowNull: true },
    serialNumber: { type: DataTypes.STRING, allowNull: true },
    purchaseDate: { type: DataTypes.DATEONLY, allowNull: true },
    purchaseCost: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    vendor: { type: DataTypes.STRING, allowNull: true },
    invoiceNo: { type: DataTypes.STRING, allowNull: true },
    warrantyExpiry: { type: DataTypes.DATEONLY, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    condition: { type: DataTypes.ENUM("new", "good", "fair", "poor", "damaged"), defaultValue: "new" },
    status: {
      type: DataTypes.ENUM("available", "allocated", "in_repair", "retired", "lost"),
      defaultValue: "available",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    timestamps: true,
    indexes: [
      { unique: true, fields: ["tenantId", "assetTag"] },
      { unique: true, fields: ["qrToken"] },
    ],
  }
);

module.exports = AsAsset;
