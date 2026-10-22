const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

/** Project task; parentId makes it a subtask (one level deep). */
const PtTask = sequelize.define(
  "pt_tasks",
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    projectId: { type: DataTypes.UUID, allowNull: false },
    parentId: { type: DataTypes.UUID, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    assigneeId: { type: DataTypes.UUID, allowNull: true },
    estimatedHours: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM("todo", "in_progress", "done"), defaultValue: "todo" },
    isBillable: { type: DataTypes.BOOLEAN, defaultValue: true },
    createdBy: { type: DataTypes.UUID, allowNull: true },
    updatedBy: { type: DataTypes.UUID, allowNull: true },
  },
  {
    timestamps: true,
    indexes: [{ fields: ["projectId"] }],
  }
);

module.exports = PtTask;
