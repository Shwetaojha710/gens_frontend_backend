const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

const GeneratedDocument = sequelize.define(
  'generated_documents',
  {
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
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    filledHtml: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    dataSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = GeneratedDocument;
