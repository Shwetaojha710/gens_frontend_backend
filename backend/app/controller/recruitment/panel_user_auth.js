const jwt = require("jsonwebtoken");
const CryptoJS = require("crypto-js");
const Helper = require("../../helper/helper");
const InterviewPanelUser = require("../../models/interview_panel_user");
const Tenant = require("../../models/tenant");
const currency = require("../../models/currency");
const Branch = require("../../models/branch");
require("dotenv").config();

function hashPassword(password) {
  return CryptoJS.SHA256(password).toString();
}

/**
 * POST /api/panel-user-login
 * Body: { tenantId, email, password }
 */
exports.panelUserLogin = async (req, res) => {
  try {
    let { tenantId, email, password } = req.body;

    tenantId = tenantId?.trim();
    email = email?.trim()?.toLowerCase();
    password = password?.trim();

    if (!tenantId || !email || !password) {
      return Helper.response(false, "tenantId, email and password are required", {}, res, 200);
    }

    const tenant = await Tenant.findOne({
      where: { companyCode: tenantId, status: "active" },
    });
    if (!tenant) {
      return Helper.response(false, "Invalid company code", {}, res, 200);
    }

    const user = await InterviewPanelUser.findOne({
      where: { email, tenantId: tenant.id, status: "active" },
    });

    if (!user) {
      return Helper.response(false, "Invalid email or account not active", {}, res, 200);
    }

    const hashedInput = hashPassword(password);
    if (user.password && user.password !== hashedInput) {
      return Helper.response(false, "Invalid password", {}, res, 200);
    }

    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: "panel_user" },
      process.env.SECRET_KEY,
      { expiresIn: "8h" }
    );

    await user.update({ token });

    const branch = await Branch.findOne({ where: { tenantId: tenant.id } }).catch(() => null);
    const currencyList = await currency.findOne({ where: { tenantId: tenant.id } }).catch(() => null);

    return Helper.response(
      true,
      "Login successful",
      {
        token,
        baseUrl: tenant.baseUrl || process.env.BASE_URL || "",
        PORT: process.env.SERVER_PORT || "9000",
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: "panel_user",
        },
        tenant: {
          id: tenant.id,
          companyName: tenant.companyName,
          companyAddress: tenant.companyAddress,
          companyCode: tenant.companyCode,
        },
        branch: branch || {},
        currencyList: currencyList || {},
      },
      res,
      200
    );
  } catch (err) {
    console.error("panelUserLogin error:", err);
    return Helper.response(false, err?.message || "Login failed", {}, res, 500);
  }
};

/**
 * POST /api/panel-user-logout
 * Header: Authorization Bearer <token>
 */
exports.panelUserLogout = async (req, res) => {
  try {
    const panelUserId = req.panelUser?.id;

    if (!panelUserId) {
      return Helper.response(false, "Panel user not found", {}, res, 400);
    }

    const user = await InterviewPanelUser.findOne({
      where: { id: panelUserId },
    });

    if (!user) {
      return Helper.response(false, "Panel user not found", {}, res, 404);
    }

    await user.update({ token: null });

    return Helper.response(true, "You have logged out successfully!", {}, res, 200);
  } catch (err) {
    console.error("panelUserLogout error:", err);
    return Helper.response(false, err?.message || "Logout failed", {}, res, 500);
  }
};
