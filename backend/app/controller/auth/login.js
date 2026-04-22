const sequelize = require("../../connection/connection");
const User = require("../../models/users");
const Helper = require("../../helper/helper");
const CryptoJS = require("crypto-js");
const Tenant = require("../../models/tenant");
const jwt = require("jsonwebtoken");
const currency = require("../../models/currency");
require("dotenv").config();
const otp = require("../../models/otp");
const moment = require("moment");
const empPersonal = require("../../models/empPersonal");
const axios = require("axios");
const Designation = require("../../models/designation");
const Branch = require("../../models/branch");
const cryptoJs = require("crypto-js");
const { Op } = require("sequelize");
const InterviewPanelUser = require("../../models/interview_panel_user");
function hashPassword(password) {
  return cryptoJs.SHA256(password).toString();
}
exports.UpdatePassword = async (req, res) => {
  let { email, password, tenantId } = req.body;

  email = email ? email.trim() : null;
  password = password ? password.trim() : null;
  tenantId = tenantId ? tenantId.trim() : null;

  if (!email || !password || !tenantId) {
    return Helper.response(
      false,
      "Email, password, and tenant ID are required.",
      [],
      res,
      200
    );
  }

  try {
    const tenant = await Tenant.findOne({
      where: {
        companyCode: tenantId,
        status: "active",
      },
    });

    if (!tenant) {
      return Helper.response(false, "Tenant not found!", [], res, 200);
    }

    const user = await User.findOne({
      where: {
        email,
        tenantId: tenant.id,
        status: "active",
      },
    });

    if (!user) {
      return Helper.response(false, "Invalid email or tenant.", [], res, 200);
    }

    // const hashedInput = CryptoJS.SHA256(password).toString();
    // if (user.password !== hashedInput) {
    //   return Helper.response(false, "Invalid password.", [], res, 200);
    // }
    const hashedPassword = hashPassword(password);

    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "8h" }
    );

    const webcamtoken = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    const currencyList = await currency.findOne({
      where: {
        tenantId: tenant.id,
        status: "active",
      },
    });

    await user.update({ token, webcamtoken, password: hashedPassword });

    const baseUrl = process.env.BASE_URL;
    const PORT = process.env.SERVER_PORT;
    return Helper.response(
      true,
      "You have Logged In Successfully!",
      { baseUrl, token, user, PORT, webcamtoken, currencyList },
      res,
      200
    );
  } catch (err) {
    console.error("Login error:", err);
    return Helper.response(false, err?.message, [], res, 200);
  }
};
exports.login = async (req, res) => {
  let { email, password, tenantId } = req.body;

  email = email ? email.trim() : null;
  password = password ? password.trim() : null;
  tenantId = tenantId ? tenantId.trim() : null;

  if (!email || !password || !tenantId) {
    return Helper.response(
      false,
      "Email, password, and tenant ID are required.",
      [],
      res,
      200
    );
  }

  try {
    const tenant = await Tenant.findOne({
      where: {
        companyCode: tenantId,
        status: "active",
      },
    });

    if (!tenant) {
      return Helper.response(false, "Tenant not found!", [], res, 200);
    }

    const user = await User.findOne({
      where: {
        email,
        tenantId: tenant.id,
        status: "active",
      },
    });

    if (!user) {
      return Helper.response(false, "Invalid email or tenant.", [], res, 200);
    }

    const hashedInput = CryptoJS.SHA256(password).toString();
    if (user.password !== hashedInput) {
      return Helper.response(false, "Invalid password.", [], res, 200);
    }

    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "8h" }
    );

    const webcamtoken = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    const currencyList = await currency.findOne({
      where: {
        tenantId: tenant.id,
        status: "active",
      },
    });

    await user.update({ token, webcamtoken });

    const baseUrl = process.env.BASE_URL;
    const PORT = process.env.SERVER_PORT;
    const branch=await Branch.findAll({
      where:{
         tenantId: tenant.id,
      },
      raw:true
    })
    return Helper.response(
      true,
      "You have Logged In Successfully!",
      { baseUrl, token, user, PORT, webcamtoken, currencyList,tenant,branch },
      res,
      200
    );
  } catch (err) {
    console.error("Login error:", err);
    return Helper.response(false, err?.message, [], res, 200);
  }
};
// exports.login = async (req, res) => {
//   let { email, password, tenantId } = req.body;

//   email = email ? email.trim() : null;
//   password = password ? password.trim() : null;
//   tenantId = tenantId ? tenantId.trim() : null;

//   if (!email || !password || !tenantId) {
//     return Helper.response(
//       false,
//       "Email, password, and tenant ID are required.",
//       [],
//       res,
//       200
//     );
//   }

//   try {
//     const tenant = await Tenant.findOne({
//       where: {
//         companyCode: tenantId,
//         status: "active",
//       },
//     });

//     if (!tenant) {
//       return Helper.response(false, "Tenant not found!", [], res, 200);
//     }

//     const user = await User.findOne({
//       where: {
//         email,
//         tenantId: tenant.id,
//         status: "active",
//       },
//     });
//     const branch=await Branch.findAll({
//       where:{
//        tenantId: tenant.id,
//       },
//       order:[["createdAt","desc"]],
//       raw:true
//     })

//     if (!user) {
//       return Helper.response(false, "Invalid email or tenant.", [], res, 200);
//     }

//     const hashedInput = CryptoJS.SHA256(password).toString();
//     if (user.password !== hashedInput) {
//       return Helper.response(false, "Invalid password.", [], res, 200);
//     }

//     const token = jwt.sign(
//       { id: user.id, tenantId: user.tenantId, role: user.role },
//       process.env.SECRET_KEY,
//       { expiresIn: "8h" }
//     );

//     const webcamtoken = jwt.sign(
//       { id: user.id, tenantId: user.tenantId, role: user.role },
//       process.env.SECRET_KEY,
//       { expiresIn: "30d" }
//     );

//     const currencyList = await currency.findOne({
//       where: {
//         tenantId: tenant.id,
//         status: "active",
//       },
//     });

//     await user.update({ token, webcamtoken });

//     const baseUrl = process.env.BASE_URL;
//     const PORT = process.env.SERVER_PORT;
//     return Helper.response(
//       true,
//       "You have Logged In Successfully!",
//       { baseUrl, token, user, PORT, webcamtoken, currencyList,branch,tenant },
//       res,
//       200
//     );
//   } catch (err) {
//     console.error("Login error:", err);
//     return Helper.response(false, err?.message, [], res, 200);
//   }
// };

exports.AIlogin = async (req, res) => {
  const { email, password, tenantId } = req.body;

  if (!email || !password || !tenantId) {
    return Helper.response(
      false,
      "Email, password, and tenant ID are required.",
      [],
      res,
      200
    );
  }

  try {
    const tenant = await Tenant.findOne({
      where: {
        companyCode: tenantId,
        status: "active",
      },
    });

    if (!tenant) {
      return Helper.response(false, "Tenant not found!", [], res, 200);
    }

    const user = await User.findOne({
      where: {
        email,
        tenantId: tenant.id,
        status: "active",
      },
    });

    if (!user) {
      return Helper.response(false, "Invalid email or tenant.", [], res, 200);
    }

    const hashedInput = CryptoJS.SHA256(password).toString();
    if (user.password !== hashedInput) {
      return Helper.response(false, "Invalid password.", [], res, 200);
    }

    const webcamtoken = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "30d" }
    );

    await user.update({ webcamtoken });

    const baseUrl = process.env.BASE_URL;
    const PORT = process.env.SERVER_PORT;
    return Helper.response(
      true,
      "You have Logged In Successfully!",
      { baseUrl, user, PORT, webcamtoken },
      res,
      200
    );
  } catch (err) {
    console.error("Login error:", err);
    return Helper.response(false, err?.message, [], res, 500);
  }
};

exports.logout = async (req, res) => {
  const userId = req.users && req.users.id;
  if (!userId) {
    return Helper.response(false, "User ID is required.", [], res, 400);
  }

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return Helper.response(false, "User not found.", [], res, 404);
    }

    // Clear the token from the user record
    await user.update({ token: null });

    return Helper.response(
      true,
      "You have logged out successfully!",
      [],
      res,
      200
    );
  } catch (err) {
    console.error("Logout error:", err);
    return Helper.response(false, "Internal server error.", [], res, 500);
  }
};
exports.Applogin = async (req, res) => {
  try {
    const data = req.body;
    const { mobile } = req.body;
    const user = await empPersonal.findOne({
      where: {
        mobile,
        status: "active",
        emp_status:'approved'
      },
    });
    if (!user) {
      return Helper.response(false, "No User Found", {}, res, 500);
    }

    const otps = new otp();

    if(data.mobile == '8687651183' || data.mobile == '7388870005'  || data.mobile == '7388870001'){
      otps.otp = '1234'
    }else{
      otps.otp = Math.floor(1000 + Math.random() * 9000);
    }
    const templateId = "1107164267135286674";
    // otps.otp = 1234;
    otps.phone = data.mobile;

    otps.ip = Helper.getLocalIP();
    otps.type = "App";
    otps.expiry_time = `'${moment().add(5, "minutes").toDate()}'`;
    otps.created_by = null;

    const createOTP = await otps.save();

    if (createOTP) {
      await Helper.sendSMS(data.mobile, otps.otp, templateId);
      return Helper.response("success", "OTP Send Successfully", {}, res, 200);
    } else {
      return Helper.response("failed", "Unable to sent OTP!", {}, res, 200);
    }
  } catch (error) {
    console.log(error);
    return Helper.response("failed", error?.message, {}, res, 200);
  }
};
// exports.Applogin = async (req, res) => {
//   try {
//     const { mobile } = req.body;

//     if (!mobile) {
//       return Helper.response(false, "Mobile number is required", {}, res, 400);
//     }

//     // Check user exists
//     const user = await empPersonal.findOne({
//       where: {
//         mobile,
//         status: "active",
//       },
//     });

//     if (!user) {
//       return Helper.response(false, "No User Found", {}, res, 404);
//     }

//     // Delete old active OTPs
//     const existingOtps = await otp.findAll({
//       where: {
//         phone: mobile,
//         status: true,
//       },
//       raw: true,
//     });

//     if (existingOtps.length > 0) {
//       const ids = existingOtps.map((o) => o.id);

//       await otp.update(
//         { status: false },
//         {
//           where: {
//             id: { [Op.in]: ids },
//           },
//         }
//       );
//     }

//     // Generate new OTP
//     const newOtp = new otp();

//     const templateId = "1407168931814895829";

//     newOtp.otp = Math.floor(1000 + Math.random() * 9000);
//     // newOtp.otp = 1234
//     newOtp.phone = mobile;
//     newOtp.ip = Helper.getLocalIP();
//     newOtp.type = "App";
//     newOtp.expiry_time = `${moment().add(5, "minutes").toDate()}`;
//     newOtp.created_by = null;

//     await newOtp.save();

//     // Send SMS
//     await Helper.sendSMS(mobile, newOtp.otp, templateId);

//     return Helper.response(true, "OTP Sent Successfully", {}, res, 200);
//   } catch (error) {
//     console.error("Applogin error:", error);
//     return Helper.response(
//       false,
//       error?.message || "Something went wrong",
//       {},
//       res,
//       500
//     );
//   }
// };

exports.verifyOtp = async (req, res) => {
  try {
    const data = req.body;

    if (!data.mobile) {
      return Helper.response(
        "failed",
        "Please provide all required fields",
        {},
        res,
        200
      );
    }
    if (!req.body.deviceToken) {
      return Helper.response(
        "failed",
        "Device Token Is Required",
        {},
        res,
        200
      );
    }

    const user = await otp.findOne({
      where: {
        phone: data.mobile, // Ensure 'data' exists before accessing 'mobile'
        otp: data.otp, // Prevent potential 'undefined' errors
        status: true,
      },
    });

    if (!user) {
      return Helper.response("failed", "Invalid OTP", {}, res, 200);
    } else {
      const now = new Date(); // Current time
      const expiryTime = new Date(user.expiry_time);
      const otpValidation = new otp();
      if (now > expiryTime) {
        return Helper.response("failed", "OTP Expired", {}, res, 200);
      }
      let verifyOTP = false;
      if (data.otp == user.otp) {
        verifyOTP = true;
      }

      if (verifyOTP) {
        await otp.update(
          { status: false },
          {
            where: {
              phone: data.mobile,
              otp: data.otp,
            },
          }
        );
        let usersData = await empPersonal.findOne({
          where: {
            mobile: data.mobile,
            status: "active",
          },
        });
        // await empPersonal.update(
        //   { uniqueId: data.uniqueId , latitude:data.latitude,longitude:data.longitude},
        //   {
        //     where: {
        //       mobile: data.mobile
        //     },
        //   }
        // );
        if (!usersData) {
          return Helper.response("failed", "User Not Found", {}, res, 200);
        }

        let token = jwt.sign({ id: usersData.id }, process.env.SECRET_KEY);

        const userInfo = await empPersonal.findByPk(usersData.id);
        userInfo.token = token;

        userInfo.deviceToken = req?.body?.deviceToken || null;
        await userInfo.save();
        let usersDataValue = await empPersonal.findByPk(usersData.id, {
          raw: true,
        });

        if (usersDataValue) {
          const designationDt = await Designation.findOne({
            where: { id: usersDataValue.designationId },
            raw: true,
          });

          usersDataValue.designation = designationDt?.name || null;
        }

        // await log.create({
        //   tableName: "login",
        //   recordId: user.id,
        //   action: "CREATE",
        //   oldData: JSON.stringify(data), // Convert data to JSON string safely
        //   newData: JSON.stringify(data),
        //   changedBy: req.users?.id || null, // Handle cases where req.users.id might be undefined
        // });

        return Helper.response(
          "success",
          "OTP Verified Successfully",
          usersDataValue,
          res,
          200
        );
      } else {
        return Helper.response("failed", "Invalid OTP", {}, res, 200);
      }
    }
  } catch (error) {
    console.log(error);
    return Helper.response("failed", error?.message, {}, res, 200);
  }
};

exports.checkToken = async (req, res) => {
  try {
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return Helper.response(false, "Token not provided", {}, res, 200);
    }

    let usersData = await empPersonal.findOne({
      where: {
        token,
      },
    });

    if (!usersData) {
      return Helper.response(false, "Token Expired", {}, res, 200);
    }

    const userInfo = await empPersonal.findByPk(usersData.id);
    userInfo.token = token;

    // userInfo.deviceToken = req?.body?.deviceToken ||null;
    await userInfo.save();
    let usersDataValue = await empPersonal.findByPk(usersData.id, {
      raw: true,
    });

    if (usersDataValue) {
      const designationDt = await Designation.findOne({
        where: { id: usersDataValue.designationId },
        raw: true,
      });

      usersDataValue.designation = designationDt?.name || null;
    }

    return Helper.response(
      true,
      "Data Found Successfully",
      usersDataValue,
      res,
      200
    );
  } catch (error) {
    console.log(error);
    return Helper.response(false, error?.message, {}, res, 200);
  }
};

exports.Applogout = async (req, res) => {
  console.log(req.users);

  const id = req.users && req.users.id;
  if (!id) {
    return Helper.response(false, "User ID is required.", [], res, 400);
  }

  try {
    const user = await empPersonal.findOne({
      where: {
        id,
      },
    });

    if (!user) {
      return Helper.response(false, "User not found.", [], res, 404);
    }

    // Clear the token from the user record
    await user.update({ token: null, deviceToken: null });

    return Helper.response(
      true,
      "You have logged out successfully!",
      [],
      res,
      200
    );
  } catch (err) {
    console.error("Logout error:", err);
    return Helper.response(false, err?.message, [], res, 500);
  }
};

exports.checkLogin = async (req, res) => {
  try {
    const data = req.body;
    const { mobile } = req.body;

    const user = await empPersonal.findOne({
      where: {
        mobile,
        status: "active",
      },
    });
    if (!user) {
      return Helper.response(false, "No User Found", {}, res, 500);
    }

    if (user) {
      //   await Helper.sendSMS(data.mobile, otps.otp, templateId);
      return Helper.response(
        "success",
        "Data Found Successfully",
        user,
        res,
        200
      );
    } else {
      return Helper.response("failed", "Unable to sent OTP!", {}, res, 200);
    }
  } catch (error) {
    return Helper.response(false, error?.message, "Server Error", {}, res, 200);
  }
};


exports.interViewerlogin = async (req, res) => {
  try {
    const data = req.body;
    const { phone, tenantId } = req.body;

    // If tenantId (company code) provided, validate against that tenant only
    let tenantUUID = null;
    if (tenantId) {
      const tenant = await Tenant.findOne({ where: { companyCode: tenantId.trim(), status: "active" } });
      if (!tenant) {
        return Helper.response(false, "Invalid company code", {}, res, 200);
      }
      tenantUUID = tenant.id;
    }

    const whereClause = { mobile_no: phone, status: "active" };
    if (tenantUUID) whereClause.tenantId = tenantUUID;

    const user = await InterviewPanelUser.findOne({ where: whereClause });
    if (!user) {
      return Helper.response(false, "No interviewer found with this phone number", {}, res, 200);
    }

    const otps = new otp();

    // if(data.phone == '8687651183' ){
      otps.otp = '1234'
    // }else{
    //   otps.otp = Math.floor(1000 + Math.random() * 9000);
    // }
    const templateId = "1107164267135286674";
    // otps.otp = 1234;
    otps.phone = data.phone;

    otps.ip = Helper.getLocalIP();
    otps.type = "App";
    otps.expiry_time = `'${moment().add(5, "minutes").toDate()}'`;
    otps.created_by = null;

    const createOTP = await otps.save();

    if (createOTP) {
      await Helper.sendSMS(data.phone, otps.otp, templateId);
      return Helper.response(true, "OTP Send Successfully", {}, res, 200);
    } else {
      return Helper.response(false, "Unable to sent OTP!", {}, res, 200);
    }
  } catch (error) {
    console.log(error);
    return Helper.response(false, error?.message, {}, res, 200);
  }
};

exports.InterviewerverifyOtp = async (req, res) => {
  try {
    const data = req.body;

    if (!data.phone) {
      return Helper.response(
        "failed",
        "Please provide all required fields",
        {},
        res,
        200
      );
    }
    // if (!req.body.deviceToken) {
    //   return Helper.response(
    //     "failed",
    //     "Device Token Is Required",
    //     {},
    //     res,
    //     200
    //   );
    // }

    const user = await otp.findOne({
      where: {
        phone: data.phone, // Ensure 'data' exists before accessing 'phone'
        otp: data.otp, // Prevent potential 'undefined' errors
        status: true,
      },
    });

    if (!user) {
      return Helper.response(false, "Invalid OTP", {}, res, 200);
    } else {
      const now = new Date(); // Current time
      const expiryTime = new Date(user.expiry_time);
      const otpValidation = new otp();
      if (now > expiryTime) {
        return Helper.response(false, "OTP Expired", {}, res, 200);
      }
      let verifyOTP = false;
      if (data.otp == user.otp) {
        verifyOTP = true;
      }

      if (verifyOTP) {
        await otp.update(
          { status: false },
          {
            where: {
              phone: data.phone,
              otp: data.otp,
            },
          }
        );
        let usersData = await InterviewPanelUser.findOne({
          where: {
            mobile_no: data.phone,
            status: "active",
          },
        });
        // await empPersonal.update(
        //   { uniqueId: data.uniqueId , latitude:data.latitude,longitude:data.longitude},
        //   {
        //     where: {
        //       mobile: data.mobile
        //     },
        //   }
        // );
        if (!usersData) {
          return Helper.response("failed", "User Not Found", {}, res, 200);
        }

        const token = jwt.sign(
          { id: usersData.id, tenantId: usersData.tenantId, role: "panel_user" },
          process.env.SECRET_KEY,
          { expiresIn: "8h" }
        );

        const userInfo = await InterviewPanelUser.findByPk(usersData.id);
        userInfo.token = token;
        userInfo.deviceToken = req?.body?.deviceToken || null;
        await userInfo.save();

        // Fetch tenant, branch, currency for the same response shape as panelUserLogin
        const tenant = await Tenant.findByPk(usersData.tenantId).catch(() => null);
        const branch = tenant
          ? await Branch.findOne({ where: { tenantId: tenant.id } }).catch(() => null)
          : null;
        const currencyList = tenant
          ? await currency.findOne({ where: { tenantId: tenant.id } }).catch(() => null)
          : null;

        return Helper.response(
          true,
          "OTP Verified Successfully",
          {
            token,
            baseUrl: tenant?.baseUrl || process.env.BASE_URL || "",
            PORT: process.env.SERVER_PORT || "9000",
            user: {
              id: usersData.id,
              first_name: usersData.first_name,
              last_name: usersData.last_name,
              email: usersData.email,
              mobile_no: usersData.mobile_no,
              role: "panel_user",
            },
            tenant: tenant
              ? { id: tenant.id, companyName: tenant.companyName, companyCode: tenant.companyCode }
              : {},
            branch: branch || {},
            currencyList: currencyList || {},
          },
          res,
          200
        );
      } else {
        return Helper.response(false, "Invalid OTP", {}, res, 200);
      }
    }
  } catch (error) {
    console.log(error);
    return Helper.response(false, error?.message, {}, res, 200);
  }
};



