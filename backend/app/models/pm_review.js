const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/**
 * One appraisal record per employee per cycle.
 * Status flow:
 *   goal_setting -> self_review -> manager_review -> in_approval -> approved
 * A rejection at any approval level sends it back to manager_review.
 */
const PmReview = sequelize.define(
  "pm_reviews",
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
    cycleId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    // Snapshots at launch so history survives org changes
    managerId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    designationId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "goal_setting",
        "self_review",
        "manager_review",
        "in_approval",
        "approved"
      ),
      defaultValue: "goal_setting",
    },
    selfRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    selfComments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    selfSubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    managerRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    managerComments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // 1 = low, 2 = moderate, 3 = high (nine-box Y axis)
    potentialRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    managerSubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Computed scores (0-5 scale except goalAchievement which is %)
    goalAchievement: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    goalRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    feedbackRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    finalRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
    },
    // 1 = low, 2 = moderate, 3 = high (nine-box X axis)
    performanceBand: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    // 0-based index into the approval chain stored on the cycle
    currentApprovalLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [{ unique: true, fields: ["cycleId", "employeeId"] }],
  }
);

module.exports = PmReview;
