const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

const ContractualDayApproval = sequelize.define('contractual_day_approval', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  checkIn: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  checkOut: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  totalHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  requiredHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
  },
  approverId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  remark: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

ContractualDayApproval.sync({ alter: true })
  .then(() => console.log('contractual_day_approval synced'))
  .catch((e) => console.error('contractual_day_approval sync error:', e));

module.exports = ContractualDayApproval;
