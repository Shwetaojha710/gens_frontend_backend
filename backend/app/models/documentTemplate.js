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
    /**
     * Branches this template is assigned to.
     * null / [] = available for all branches.
     */
    branchIds: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
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
    /** User-controlled top margin (mm). null = auto from letterhead / import mode. */
    topPaddingMm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    /**
     * How many print pages show the company letterhead:
     * '1' = first page only, '2' = first two pages, 'all' = every page.
     */
    letterheadPages: {
      type: DataTypes.STRING(8),
      allowNull: false,
      defaultValue: 'all',
    },
    /** Logo band height (mm) — user can shrink/grow header viewport */
    letterheadHeaderMm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 28,
    },
    /** Address / GSTN band height (mm) — user can shrink/grow footer viewport */
    letterheadFooterMm: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 40,
    },
    /** Paper size for editor + print: A4 | Letter | Legal | A5 */
    pageSize: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'A4',
    },
    /** Default body font family (restored on edit / applied when no inline style). */
    defaultFontFamily: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: 'Times New Roman',
    },
    /** Default body font size e.g. 12pt */
    defaultFontSize: {
      type: DataTypes.STRING(16),
      allowNull: true,
      defaultValue: '12pt',
    },
    /**
     * Custom running header / footer text printed on each page:
     * { header: {enabled,text,align,fontSize,bold,offsetMm},
     *   footer: {enabled,text,align,fontSize,bold,offsetMm,pageNumber},
     *   pages: 'all' | 'first' | 'notFirst' }. null = none.
     */
    headerFooter: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
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
