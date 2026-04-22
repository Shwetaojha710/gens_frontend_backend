const { DataTypes } = require('sequelize');
const sequelize = require('../connection/connection');

const LetterData = sequelize.define('letter_data', {
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
        allowNull: true
    },
    employeeId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('nda', 'appointment', 'relieving', 'offer'),
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: true
    },
    updatedBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    timestamps: true
});

LetterData.sync({ alter: true }).then(() => {
    console.log('LetterData model synced');
}).catch((err) => {
    console.error('LetterData sync error:', err);
});

module.exports = LetterData;
