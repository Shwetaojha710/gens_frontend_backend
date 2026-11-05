const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * One hand-over of an asset to an employee, from issue to return.
 * ackStatus: the employee confirms (or disputes) receipt in the portal.
 */
const AsAllocation = sequelize.define(
  "as_allocations",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    assetId: { type: DataTypes.UUID, allowNull: false },
    employeeId: { type: DataTypes.UUID, allowNull: false },
    allocatedOn: { type: DataTypes.DATEONLY, allowNull: false },
    expectedReturnDate: { type: DataTypes.DATEONLY, allowNull: true },
    conditionAtIssue: { type: DataTypes.STRING, allowNull: true },
    issueNotes: { type: DataTypes.TEXT, allowNull: true },
    allocatedBy: { type: DataTypes.UUID, allowNull: true },
    allocatedByName: { type: DataTypes.STRING, allowNull: true },
    ackStatus: { type: DataTypes.ENUM("not_required", "pending", "acknowledged", "disputed"), defaultValue: "pending" },
    ackAt: { type: DataTypes.DATE, allowNull: true },
    ackComment: { type: DataTypes.TEXT, allowNull: true },
    // Employee asked to hand the asset back
    returnRequestedAt: { type: DataTypes.DATE, allowNull: true },
    returnRequestNote: { type: DataTypes.TEXT, allowNull: true },
    returnedOn: { type: DataTypes.DATEONLY, allowNull: true },
    conditionAtReturn: { type: DataTypes.STRING, allowNull: true },
    returnNotes: { type: DataTypes.TEXT, allowNull: true },
    // Amount to recover for damage / loss (e.g. in full & final settlement)
    recoveryAmount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    receivedBy: { type: DataTypes.UUID, allowNull: true },
    receivedByName: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM("active", "returned", "lost"), defaultValue: "active" },
  },
  {
    timestamps: true,
    indexes: [{ fields: ["assetId"] }, { fields: ["tenantId", "employeeId", "status"] }],
  }
);

module.exports = AsAllocation;
