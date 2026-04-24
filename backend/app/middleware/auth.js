const users = require("../models/users");
const Helper = require("../helper/helper");
const empPersonal = require("../models/empPersonal");

const Admin = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const branchId = req.headers["branchid"] || req.headers["branchId"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return Helper.response('expired', "Token not provided", {}, res, 200);
    }

    const decoded = await Helper.verifyToken(token);
    if (!decoded) {
      return Helper.response("expired", "Invalid token", {}, res, 200);
    }

    const user = await users.findOne({ where: { id: decoded.id } });

    if (!user) {

      
      return Helper.response(false, "User not found", {}, res, 200);
    }

    if (user.token !== token) {
      return Helper.response(
        "expired",
        "Token Expired due to another login, Login Again!",
        {},
        res,
        200
      );
    }

    const allowedRoles = ["admin", "hr", "superadmin", "employee"];
    if (!allowedRoles.includes(user.role)) {
      return Helper.response(false, "Unauthorized role", {}, res, 200);
    }

    req.users = {
      id: user.id,
      name: user.name,
      token: user.token,
      role: user.role,
      tenantId: user.tenantId,
      branchId: branchId 
    };

    next();

  } catch (err) {
    return Helper.response(false, err?.message || "Something went wrong", {}, res, 500);
  }
};
const WebcamAdmin = async (req, res, next) => {
  try {
    
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const branchId = req.headers["branchid"] || req.headers["branchId"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return Helper.response(false, "Token not provided", {}, res, 200);
    }

    const decoded = await Helper.verifyToken(token);
    if (!decoded) {
      return Helper.response("expired", "Invalid token", {}, res, 200);
    }

    const user = await users.findOne({ where: { id: decoded.id } });

    if (!user) {
      return Helper.response(false, "User not found", {}, res, 200);
    }

    if (user.webcamtoken !== token) {
      return Helper.response(
        "expired",
        "Token Expired due to another login, Login Again!",
        {},
        res,
        200
      );
    }

    const allowedRoles = ["admin", "hr", "superadmin", "employee"];
    if (!allowedRoles.includes(user.role)) {
      return Helper.response(false, "Unauthorized role", {}, res, 200);
    }

    req.users = {
      id: user.id,
      name: user.name,
      token: user.webcamtoken,
      role: user.role,
      tenantId: user.tenantId ,
      branchId: branchId ,
      
    };

    next();

  } catch (err) {
    return Helper.response(false, err.message || "Something went wrong", {}, res, 500);
  }
};
const SuperAdmin = async (req, res, next) => {
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

    const user = await users.findOne({ where: { id: decoded.id } });

    if (!user) {
      return Helper.response(false, "User not found", {}, res, 200);
    }

    if (user.token !== token) {
      return Helper.response(
        "expired",
        "Token Expired due to another login, Login Again!",
        {},
        res,
        200
      );
    }

    if (user.role !== "superadmin") {
      return Helper.response(false, "Unauthorized role", {}, res, 200);
    }

    req.users = {
      id: user.id,
      name: user.name,
      token: user.token,
      role: user.role,
      tenantId: user.tenantId,
      branchId: null,
    };

    next();
  } catch (err) {
    return Helper.response(false, err?.message || "Something went wrong", {}, res, 500);
  }
};
const AppAdmin = async (req, res, next) => {
  try {
    // console.log(req.body,"boidyyyymiididi");
    
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return Helper.response(false, "Token not provided", {}, res, 200);
    }

    const decoded = await Helper.verifyToken(token);
    if (!decoded) {
      return Helper.response("expired", "Invalid token", {}, res, 200);
    }

    const user = await empPersonal.findOne({ where: { id: decoded.id } });

    if (!user) {
      return Helper.response(false, "User not found", {}, res, 200);
    }

    const tokenMatchesMobile = user.token === token;
    const tokenMatchesWeb = user.webToken === token;

    if (!tokenMatchesMobile && !tokenMatchesWeb) {
      return Helper.response(
        "expired",
        "Token Expired due to another login, Login Again!",
        {},
        res,
        200
      );
    }

    req.users = {
      id: user.id,
      name: `${user?.firstName} ${user?.lastName}`,
      token: tokenMatchesWeb ? user?.webToken : user?.token,
      reportingPersonId: user?.reportingPersonId,
      shift_id: user?.shift_id,
      tenantId: user?.tenantId ?? 0,
      branchId: user?.branchId ?? 0,
      role: user?.role,
      loginSource: tokenMatchesWeb ? "web" : "mobile",
    };

    next();

  } catch (err) {
    return Helper.response(false, err.message || "Something went wrong", {}, res, 500);
  }
};
module.exports = { 
Admin:Admin, 
WebcamAdmin : WebcamAdmin,
AppAdmin:AppAdmin,
SuperAdmin: SuperAdmin
};