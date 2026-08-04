/**
 * reset-password.js
 * Usage:  node scripts/reset-password.js <email> <new_password>
 * Example: node scripts/reset-password.js admin@company.com MyNewPass@123
 */

require('dotenv').config();
const { Client } = require('pg');
const CryptoJS = require('crypto-js');

const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-password.js <email> <new_password>');
  process.exit(1);
}

const dbConfig = {
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port:     parseInt(process.env.DB_PORT || '5432', 10),
};

async function run() {
  const client = new Client(dbConfig);
  await client.connect();

  const hashedPassword = CryptoJS.SHA256(newPassword).toString();

  // Try empPersonals table first (HR/admin users)
  const emp = await client.query(
    `UPDATE "empPersonals" SET password = $1, token = NULL, "webToken" = NULL, "updatedAt" = NOW()
     WHERE email = $2 RETURNING email, "firstName", "lastName"`,
    [hashedPassword, email]
  );

  if (emp.rowCount > 0) {
    console.log(`✅  Password reset for: ${emp.rows[0].firstName} ${emp.rows[0].lastName} (${email})`);
    console.log(`    New hash: ${hashedPassword}`);
  } else {
    console.log(`⚠️  No user found with email: ${email}`);
  }

  await client.end();
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
