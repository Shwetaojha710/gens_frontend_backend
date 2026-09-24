const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

const DocumentTemplate = sequelize.define(
  'document_templates',
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'custom',
    },
    bodyHtml: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    letterheadBlank: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    includeSalaryAnnexure: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = DocumentTemplate;
