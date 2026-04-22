const { DataTypes } = require("sequelize");
const sequelize = require("../connection/connection");

const otp = sequelize.define('otp', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    deviceId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    otp: {
        type: DataTypes.BIGINT,
        allowNull: false,

    },
    expiry_time: {
        type: DataTypes.STRING,
        allowNull: false,

    },
    phone: {
        type: DataTypes.STRING(15),
        allowNull: false,

    },
    ip: {
        type: DataTypes.STRING(50),
        allowNull: false,

    },
    created_by: {
        type: DataTypes.UUID, 
        allowNull: true,
    },
    status:{
        type:DataTypes.BOOLEAN,
        defaultValue:true
    }
})
// otp.sync({alter:true}).then(() => {
//     console.log('otp model synced successfully');
// }).catch((error) => {
//     console.error('Error syncing otp model:', error);
// });

module.exports = otp;