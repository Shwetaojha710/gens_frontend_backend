require('dotenv').config();
const { Client } = require('pg');
const TARGET = '8474e354-8224-4056-beb9-3f249651faa9';
const client = new Client({
  host: process.env.DB_HOST, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
});
client.connect().then(async () => {
  const r = await client.query('DELETE FROM device_location_logs WHERE "tenantId"=$1', [TARGET]);
  console.log('Deleted', r.rowCount, 'tracking records from target tenant');
  await client.end();
}).catch(e => { console.error(e.message); process.exit(1); });
