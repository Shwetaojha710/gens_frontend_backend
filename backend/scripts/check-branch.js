require('dotenv').config();
const { Client } = require('pg');

const TARGET = '8474e354-8224-4056-beb9-3f249651faa9';
const SOURCE = '7360976d-94ab-49b5-83b7-65fcfcf63830';

const client = new Client({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
});

async function run() {
  await client.connect();

  // Branches in each tenant
  const srcBranches = await client.query(`SELECT id, name FROM branches WHERE "tenantId"=$1`, [SOURCE]);
  const tgtBranches = await client.query(`SELECT id, name FROM branches WHERE "tenantId"=$1`, [TARGET]);

  console.log('\nSOURCE branches:', srcBranches.rows);
  console.log('TARGET branches:', tgtBranches.rows);

  // Check what branchId the copied departments have
  const deptBranches = await client.query(
    `SELECT DISTINCT "branchId", count(*) FROM departments WHERE "tenantId"=$1 GROUP BY "branchId"`,
    [TARGET]
  );
  console.log('\nBranchIds in TARGET departments:', deptBranches.rows);

  const empBranches = await client.query(
    `SELECT DISTINCT "branchId", count(*) FROM master_components WHERE "tenantId"=$1 GROUP BY "branchId"`,
    [TARGET]
  );
  console.log('BranchIds in TARGET master_components:', empBranches.rows);

  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
