const express = require("express");
const path = require("path");
const app = express();
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const { Sequelize } = require('sequelize');

const dbPassword = process.env.DB_PASSWORD;
if (dbPassword == null || typeof dbPassword !== "string") {
  console.error(
    "DB_PASSWORD is missing or not a string. Check backend/.env and restart the server."
  );
}

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
    password: dbPassword != null ? String(dbPassword) : "",
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
