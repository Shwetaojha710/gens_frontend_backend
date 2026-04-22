"use strict";

const DEFAULTS = {
  heroTitle: "Manage Your Workforce Smarter",
  heroSubtitle: "All-in-one HR platform for attendance, payroll, recruitment and more.",
  heroCtaLabel: "Get Started",
  heroCtaUrl: "/register",
  heroImage: null,
  features: [],
  testimonials: [],
  footerTagline: "Powered by GENS",
};

/**
 * Merges the stored landing payload (from DB) with sensible defaults.
 * Any key present in the stored payload overrides the default.
 *
 * @param {object} storedPayload - raw payload object from LandingSiteContent row
 * @returns {object} merged landing content
 */
function mergeLandingPayload(storedPayload) {
  const payload = storedPayload && typeof storedPayload === "object" ? storedPayload : {};
  return Object.assign({}, DEFAULTS, payload);
}

module.exports = { mergeLandingPayload };
