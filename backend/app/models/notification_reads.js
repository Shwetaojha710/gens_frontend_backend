const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const notification_reads = sequelize.define(
  "notification_reads",
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
    /** Employee who read the notification */
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    /** e.g. 'leave' | 'attendance' */
    refType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "leave",
    },
    /** leave_application.id (or other ref) */
    refId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    /** Leave status when marked read — status change = unread again */
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "",
    },
    /** Snapshot of leave updatedAt used in read signature */
    updatedAtSnapshot: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "",
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "notification_reads",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "refType", "refId", "status", "updatedAtSnapshot"],
        name: "uniq_notif_read_user_ref",
      },
      {
        fields: ["tenantId", "userId"],
        name: "idx_notif_read_tenant_user",
      },
    ],
  }
);

// Creates/updates table on boot — comment after first successful sync if preferred
notification_reads.sync({ alter: true }).then(() => {
  console.log("notification_reads model synced successfully");
}).catch((error) => {
  console.error("Error syncing notification_reads model:", error);
});

module.exports = notification_reads;