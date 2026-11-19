/**
 * Meta WhatsApp Cloud API helpers.
 */
const crypto = require("crypto");
const axios = require("axios");

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader || !rawBody) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signatureHeader));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function parseInboundMessages(body) {
  const out = [];
  const entries = body?.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id || null;
      const contacts = value.contacts || [];
      const contactName = contacts[0]?.profile?.name || null;
      for (const msg of value.messages || []) {
        out.push({
          phoneNumberId,
          waId: msg.from,
          customerPhone: msg.from,
          customerName: contactName,
          waMessageId: msg.id,
          timestamp: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
          messageType: msg.type || "text",
          body:
            msg.text?.body ||
            msg.button?.text ||
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.title ||
            "",
          raw: msg,
        });
      }
    }
  }
  return out;
}

/**
 * Normalize to WhatsApp "to" format (digits only, with country code).
 * Indian 10-digit mobiles → prefix 91. US 10-digit → prefix 1 when defaultCountry is us.
 */
function normalizeWhatsAppTo(to, { defaultCountry = "in" } = {}) {
  let digits = String(to || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && defaultCountry === "in") digits = `91${digits}`;
  else if (digits.length === 10 && defaultCountry === "us") digits = `1${digits}`;
  // Strip leading 00
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

async function sendTextMessage({ accessToken, phoneNumberId, to, text }) {
  const url = `${GRAPH_BASE}/${phoneNumberId}/messages`;
  const recipient = normalizeWhatsAppTo(to);
  const res = await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: { preview_url: false, body: String(text).slice(0, 4096) },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );
  return res.data;
}

function formatWhatsAppSendError(err) {
  const e = err?.response?.data?.error || {};
  const code = e.code;
  const message = e.message || err?.message || "Failed to send WhatsApp message";
  if (code === 131030) {
    return {
      code,
      message:
        "WhatsApp #131030: this number is not in Meta's allowed recipient list. Add & verify it in Meta Developer Console → WhatsApp → API Setup → To. Message was saved in inbox only.",
    };
  }
  return { code: code || null, message };
}

function isWithinCustomerServiceWindow(lastCustomerMessageAt) {
  if (!lastCustomerMessageAt) return false;
  const ms = Date.now() - new Date(lastCustomerMessageAt).getTime();
  return ms >= 0 && ms <= 24 * 60 * 60 * 1000;
}

module.exports = {
  verifyWebhookSignature,
  parseInboundMessages,
  sendTextMessage,
  normalizeWhatsAppTo,
  formatWhatsAppSendError,
  isWithinCustomerServiceWindow,
  GRAPH_BASE,
};
