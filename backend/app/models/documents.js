const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const Document = sequelize.define("document", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false
    },
      branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "empPersonals",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    type:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    doc_type:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    doc_name:{
        type: DataTypes.STRING,
        allowNull: false,
    }
    ,
    createdBy:{
        type: DataTypes.UUID,
        allowNull: true
    },
    updatedBy:{
        type: DataTypes.UUID,
        allowNull: true
    },
    status:{
        type: DataTypes.ENUM("active", "inactive"),
        defaultValue: "active",
        allowNull: false
    }
},{ 
    timestamps: true,
})

// Document.sync({ alter: true }).then(() => {
//     console.log('Document model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing Document model:', error);
// });

module.exports = Document;