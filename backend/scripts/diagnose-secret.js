require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const crypto = require("crypto");
const { Op } = require("sequelize");
const Tenant = require("../app/models/tenant");
const { getOrCreateAgent } = require("../app/helper/aiAgentEngine");

function tryDecrypt(payload, secret) {
  try {
    const key = crypto.createHash("sha256").update(String(secret)).digest();
    const buf = Buffer.from(String(payload), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (e) {
    return null;
  }
}

(async () => {
  const raw = process.env.SECRET_KEY;
  console.log("SECRET_META", {
    defined: raw != null,
    length: raw ? raw.length : 0,
    firstCharCode: raw ? raw.charCodeAt(0) : null,
    lastCharCode: raw ? raw.charCodeAt(raw.length - 1) : null,
    startsWithQuote: raw ? raw.startsWith('"') || raw.startsWith("'") : false,
  });

  const candidates = [];
  if (raw) {
    candidates.push(["raw", raw]);
    candidates.push(["trim", raw.trim()]);
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      candidates.push(["unquoted", raw.slice(1, -1)]);
    }
  }
  candidates.push(["default-dev", "gens-ai-face-dev-secret-change-me!!"]);

  const tenant = await Tenant.findOne({ where: { companyCode: { [Op.iLike]: "quaeretech" } } });
  const { settings } = await getOrCreateAgent(tenant.id);
  const blobs = {
    llm: settings.llmApiKeyEnc,
    wa: settings.whatsappAccessTokenEnc,
    app: settings.whatsappAppSecretEnc,
  };

  for (const [name, secret] of candidates) {
    const result = {};
    for (const [k, blob] of Object.entries(blobs)) {
      if (!blob) {
        result[k] = "empty";
        continue;
      }
      const plain = tryDecrypt(blob, secret);
      result[k] = plain ? `ok len=${plain.length} prefix=${plain.slice(0, 6)}...` : "fail";
    }
    console.log("TRY", name, result);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
