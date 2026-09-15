/**
 * One-time script to create / alter arrear tables.
 * Usage (from backend folder):
 *   node scripts/create-arrear-tables.js
 *
 * Also creates a partial unique index to prevent duplicate active arrears
 * for the same employee + effective/implementation period.
 */
require("dotenv").config();
const sequelize = require("../app/connection/connection");
const Arrear = require("../app/models/arrear");
const ArrearDetail = require("../app/models/arrear_detail");

async function run() {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await Arrear.sync({ alter: true });
    await ArrearDetail.sync({ alter: true });

    // Partial unique: only one non-rejected arrear per employee + period
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_arrear_active_period
      ON arrears (
        "tenantId",
        "branchId",
        "employeeId",
        "effectiveYear",
        "effectiveMonth",
        "implementationYear",
        "implementationMonth"
      )
      WHERE status IN ('draft', 'pending', 'approved', 'paid');
    `);

    console.log("Arrear tables ready");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create arrear tables:", err);
    process.exit(1);
  }
}

run();
