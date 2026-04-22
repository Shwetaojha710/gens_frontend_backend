const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const reimbursement_file = sequelize.define(
  "reimbursement_file",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
      tenantId: { type: DataTypes.UUID, allowNull: false },
    reimbursementId: { type: DataTypes.UUID, allowNull: false },
    image: { type: DataTypes.STRING, allowNull: false },
    doc_type: { type: DataTypes.STRING, allowNull: true },

    status: {
      type: DataTypes.STRING,
      defaultValue: "pending",
    },
    createdBy: DataTypes.UUID,
    updatedBy: DataTypes.UUID,
  },
  { timestamps: true }
);

// reimbursement_file
//   .sync({ alter: true })
//   .then(() => {
//     console.log("reimbursement_file model synced successfully");
//   })
//   .catch((error) => {
//     console.error("Error syncing reimbursement_file model:", error);
//   });


module.exports = reimbursement_file;
