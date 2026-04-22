const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");


const MasterComponents = sequelize.define("master_components", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
    },
    tenantId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    component_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    value:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    value_type:{
        type: DataTypes.ENUM('fixed', 'percentage','basic_dependent','is_special'),
        allowNull: false,
    },
    amount:{
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    dependent_component:{
        type: DataTypes.JSONB,
        allowNull: true,
    },
    component_description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    component_type: {
        type: DataTypes.ENUM('payable', 'deductible', 'reimbursable'),
        allowNull: false,
    },
    status:{
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
        allowNull: false,
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
});
// MasterComponents.sync({alter:true}).then(() => {
//     console.log('MasterComponents model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing MasterComponents model:', error);
// });

module.exports = MasterComponents;