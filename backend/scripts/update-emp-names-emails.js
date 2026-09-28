/**
 * update-emp-names-emails.js
 *
 * Updates all employees in TARGET_TENANT to generic names and clean emails.
 *   firstName → "Employee"
 *   lastName  → sequential number (1, 2, 3 …)
 *   email     → empCode@demo.gens.in   (unique because empCode is unique per tenant)
 *
 * Usage (from backend/ directory):
 *   node scripts/update-emp-names-emails.js
 */

require('dotenv').config();
const { Client } = require('pg');

const TARGET_TENANT = '8474e354-8224-4056-beb9-3f249651faa9';

const dbConfig = {
  host:     process.env.DB_HOST     || '15.207.155.107',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'Quaere0007@2024',
  database: process.env.DB_DATABASE || 'gens_6_april',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
};

async function run() {
  const client = new Client(dbConfig);
  await client.connect();
  console.log('✅  Connected to', dbConfig.database);
  console.log('    TARGET :', TARGET_TENANT, '\n');

  try {
    const { rows } = await client.query(
      `SELECT id, "empCode", "firstName", "lastName", email
         FROM "empPersonals"
        WHERE "tenantId" = $1
        ORDER BY "createdAt" ASC`,
      [TARGET_TENANT]
    );

    console.log(`Found ${rows.length} employees. Updating...`);

    let updated = 0;
    for (let i = 0; i < rows.length; i++) {
      const emp = rows[i];
      const num       = i + 1;
      const newFirst  = 'Employee';
      const newLast   = String(num);
      const codeSlug  = emp.empCode ? emp.empCode.toLowerCase() : `emp${num}`;
      const newEmail  = `${codeSlug}@demo.gens.in`;

      await client.query(
        `UPDATE "empPersonals"
            SET "firstName" = $1,
                "lastName"  = $2,
                email       = $3,
                "updatedAt" = NOW()
          WHERE id = $4`,
        [newFirst, newLast, newEmail, emp.id]
      );

      console.log(`  [${num}] ${emp.firstName} ${emp.lastName} (${emp.email})  →  ${newFirst} ${newLast} (${newEmail})`);
      updated++;
    }

    console.log(`\n🎉  Done — ${updated} employees updated.`);
  } catch (err) {
    console.error('\n❌  Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
    console.log('🔌  DB connection closed.');
  }
}

run();
