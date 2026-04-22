const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");
const round_type = require("./round_type");

const interview_round = sequelize.define("interview_rounds", {
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
  round_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  round_type: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  order_sequence: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "draft",
  },
  createdBy: DataTypes.UUID,
  updatedBy: DataTypes.UUID,
});

interview_round.belongsTo(round_type, {
  foreignKey: "round_type",
  as: "roundTypeData"
});

// interview_round.sync({ alter: true }).then(() => {
//     console.log('interview_round model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing interview_round model:', error);
// });


module.exports = interview_round;
