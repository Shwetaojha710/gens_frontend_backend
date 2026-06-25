require('dotenv').config();
const { Client } = require('pg');
const SOURCE = '7360976d-94ab-49b5-83b7-65fcfcf63830';
const TARGET = '8474e354-8224-4056-beb9-3f249651faa9';
const client = new Client({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
});
async function run() {
  await client.connect();

  // Check location_type values in target
  const lt = await client.query(
    `SELECT location_type, count(*) FROM device_location_logs WHERE "tenantId"=$1 GROUP BY location_type ORDER BY count DESC`,
    [TARGET]
  );
  console.log('\nTARGET location_type distribution:');
  lt.rows.forEach(r => console.log(' ', JSON.stringify(r.location_type), '→', r.count));

  // Check isLocation flag on employees in target
  const il = await client.query(
    `SELECT "isLocation", count(*) FROM "empPersonals" WHERE "tenantId"=$1 GROUP BY "isLocation"`,
    [TARGET]
  );
  console.log('\nTARGET employee isLocation flag:');
  il.rows.forEach(r => console.log(' ', r.isLocation, '→', r.count));

  // Check "pinned" vs "Pinned" in source
  const srcLt = await client.query(
    `SELECT location_type, count(*) FROM device_location_logs WHERE "tenantId"=$1 GROUP BY location_type ORDER BY count DESC LIMIT 10`,
    [SOURCE]
  );
  console.log('\nSOURCE location_type distribution:');
  srcLt.rows.forEach(r => console.log(' ', JSON.stringify(r.location_type), '→', r.count));

  await client.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
