/**
 * AES-256-GCM helpers for RTSP URL credential storage.
 * Set AI_FACE_SECRET (32+ char) in backend .env
 */
const crypto = require("crypto");

const ALGO = "aes-256-gcm";
const IV_LEN = 12;

function getKey() {
  const secret = process.env.AI_FACE_SECRET || process.env.SECRET_KEY || "gens-ai-face-dev-secret-change-me!!";
  return crypto.createHash("sha256").update(String(secret)).digest();
}

function encrypt(plaintext) {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(payload) {
  const buf = Buffer.from(String(payload), "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + 16);
  const data = buf.subarray(IV_LEN + 16);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

module.exports = { encrypt, decrypt };
