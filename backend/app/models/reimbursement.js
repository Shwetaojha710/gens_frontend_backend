const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const reimbursement = sequelize.define("reimbursement", {
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
  fromDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  toDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  amount: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "pending",
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
  },
});

// reimbursement
//   .sync({ alter: true })
//   .then(() => {
//     console.log("reimbursement model synced successfully");
//   })
//   .catch((error) => {
//     console.error("Error syncing reimbursement model:", error);
//   });


module.exports = reimbursement;
