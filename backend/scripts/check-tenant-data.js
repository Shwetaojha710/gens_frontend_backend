require('dotenv').config();
const { Client } = require('pg');

const SOURCE = '7360976d-94ab-49b5-83b7-65fcfcf63830';

const client = new Client({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
});

async function run() {
  await client.connect();
  const r = await client.query(
    `SELECT count(*) FROM device_location_logs WHERE "tenantId" = $1`, [SOURCE]
  );
  console.log('device_location_logs in source:', r.rows[0].count);
  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
