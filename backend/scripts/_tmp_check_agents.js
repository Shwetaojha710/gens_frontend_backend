require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { Sequelize } = require("sequelize");

const s = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ""),
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  schema: process.env.DB_SCHEMA,
  logging: false,
});

(async () => {
  await s.authenticate();
  const [agents] = await s.query(`
    SELECT a.id, a."tenantId", a.name, a."isEnabled", a."aiProvider", a."aiModel", a.status,
           t."companyCode", t."companyName",
           (s."llmApiKeyEnc" IS NOT NULL) AS has_llm,
           (s."whatsappAccessTokenEnc" IS NOT NULL) AS has_wa,
           s."whatsappPhoneNumberId",
           a."updatedAt"
    FROM ai_agents a
    LEFT JOIN tenants t ON t.id = a."tenantId"
    LEFT JOIN ai_agent_settings s ON s."tenantId" = a."tenantId"
    ORDER BY a."updatedAt" DESC NULLS LAST
    LIMIT 20
  `);
  console.log(JSON.stringify(agents, null, 2));
  const [kb] = await s.query(
    `SELECT "tenantId", count(*)::int AS n FROM ai_agent_knowledge GROUP BY "tenantId"`
  );
  console.log("knowledge", JSON.stringify(kb));
  await s.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
