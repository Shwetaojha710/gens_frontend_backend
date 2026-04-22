"use strict";

/**
 * Strips leading/trailing whitespace and truncates to maxLen.
 * Returns null if the result is an empty string.
 *
 * @param {any} value
 * @param {number} maxLen
 * @returns {string|null}
 */
function sanitizePlainText(value, maxLen) {
  if (value == null) return null;
  const str = String(value).trim().slice(0, maxLen);
  return str.length ? str : null;
}

/**
 * Validates and normalises an email address.
 * Returns the lowercased email or null if invalid.
 *
 * @param {any} value
 * @returns {string|null}
 */
function sanitizeEmail(value) {
  if (value == null) return null;
  const str = String(value).trim().toLowerCase().slice(0, 320);
  // Basic RFC-compliant email check
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRe.test(str) ? str : null;
}

module.exports = { sanitizePlainText, sanitizeEmail };
