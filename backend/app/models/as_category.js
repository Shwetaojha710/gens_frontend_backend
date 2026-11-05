const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Asset category; `code` prefixes generated asset tags (e.g. LAP-0007). */
const AsCategory = sequelize.define(
  "as_categories",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING(10), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    // Employee must confirm receipt in the portal
    requiresAcknowledgement: { type: DataTypes.BOOLEAN, defaultValue: true },
    status: { type: DataTypes.ENUM("active", "inactive"), defaultValue: "active" },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  { timestamps: true }
);

module.exports = AsCategory;
