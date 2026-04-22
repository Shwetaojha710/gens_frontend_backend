const Helper = require("../helper/helper");
const InterviewPanelUser = require("../models/interview_panel_user");

const PanelUser = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return Helper.response("expired", "Token not provided", {}, res, 200);
    }

    const decoded = await Helper.verifyToken(token);
    if (!decoded) {
      return Helper.response("expired", "Invalid token", {}, res, 200);
    }

    const user = await InterviewPanelUser.findOne({ where: { id: decoded.id } });
    if (!user) {
      return Helper.response("expired", "Panel user not found", {}, res, 200);
    }

    if (user.token !== token) {
      return Helper.response("expired", "Session expired, please login again", {}, res, 200);
    }

    req.panelUser = {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      tenantId: user.tenantId,
      branchId: user.branchId || null,
    };

    next();
  } catch (err) {
    return Helper.response(false, err?.message || "Something went wrong", {}, res, 500);
  }
};

module.exports = { PanelUser };
