/**
 * Create AI Face Recognition tables (non-destructive).
 * Usage (from backend folder):
 *   node scripts/create-ai-face-tables.js
 */
require("dotenv").config();
const sequelize = require("../app/connection/connection");
const aiFaceEmbedding = require("../app/models/aiFaceEmbedding");
const aiCamera = require("../app/models/aiCamera");
const aiRecognitionLog = require("../app/models/aiRecognitionLog");
const aiCameraHealthLog = require("../app/models/aiCameraHealthLog");
const aiProcessingConfig = require("../app/models/aiProcessingConfig");

async function run() {
  try {
    await sequelize.authenticate();
    console.log("DB connected");

    await aiFaceEmbedding.sync({ alter: true });
    await aiCamera.sync({ alter: true });
    await aiRecognitionLog.sync({ alter: true });
    await aiCameraHealthLog.sync({ alter: true });
    await aiProcessingConfig.sync({ alter: true });

    // Evidence filenames on attendances are STRING(50); widen safely if needed.
    try {
      await sequelize.query(`
        ALTER TABLE attendances
          ALTER COLUMN check_in_img TYPE VARCHAR(255),
          ALTER COLUMN check_out_img TYPE VARCHAR(255);
      `);
      console.log("Widened attendances check_in_img / check_out_img to VARCHAR(255)");
    } catch (e) {
      console.warn("attendances image column widen skipped:", e.message);
    }

    console.log("AI face tables ready");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create AI face tables:", err);
    process.exit(1);
  }
}

run();
