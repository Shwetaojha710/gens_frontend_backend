const Reimbursement = require('./reimbursement');
const ReimbursementFile = require('./reimbursementfile');

// Define associations
Reimbursement.hasMany(ReimbursementFile, {
  foreignKey: 'reimbursementId',
  as: 'files',
});

ReimbursementFile.belongsTo(Reimbursement, {
  foreignKey: 'reimbursementId',
  as: 'reimbursement',
});

module.exports = {
  Reimbursement,
  ReimbursementFile,
};
