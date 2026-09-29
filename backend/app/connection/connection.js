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
    // Keep pool small: remote Postgres often has max_connections ~100 shared across all apps.
    // A high max + nodemon restarts leaves idle backends and triggers 53300.
    pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 5000,
    evict: 1000
  },
  dialectOptions: {
    connectTimeout: 30000
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

const closePool = async () => {
  try {
    await sequelize.close();
  } catch (_) {
    /* ignore */
  }
};
process.once("SIGINT", closePool);
process.once("SIGTERM", closePool);
process.once("SIGUSR2", async () => {
  // nodemon restart signal on Windows/Unix
  await closePool();
  process.kill(process.pid, "SIGUSR2");
});

module.exports = sequelize;
