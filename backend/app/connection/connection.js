const express = require("express");
const app = express();
require("dotenv").config();
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
    dialect:'postgres',
    pool: {
    max: 100,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  dialectOptions: {
    connectTimeout: 60000
  },
    host:process.env.DB_HOST,
    username:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_DATABASE,
    port:process.env.DB_PORT,
    schema:process.env.DB_SCHEMA,
    timezone: '+05:30',    
    logging: false, 
})  
sequelize.authenticate().then(() => {
  console.log('connected');
}).catch((error) => {
  console.error('Error syncing database:', error);
});

module.exports = sequelize;
