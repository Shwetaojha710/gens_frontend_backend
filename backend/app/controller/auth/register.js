const cryptoJs = require("crypto-js");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const Helper=require('../../helper/helper');
const Tenant = require("../../models/tenant");
const User = require("../../models/users");
const { v4: uuidv4 } = require('uuid');
const path = require("path");
const fs = require("fs");
const sequelize = require("../../connection/connection");

function hashPassword(password) {
    return cryptoJs.SHA256(password).toString();
}

exports.Companyregistration = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tenantId, email, password, tenantName } = req.body;

    if (!tenantId) {
      return Helper.response(false, "Tenant Id is required", {}, res, 400);
    }
    if (!email) {
      return Helper.response(false, "Email is required", {}, res, 400);
    }
    if (!password) {
      return Helper.response(false, "Password is required", {}, res, 400);
    }
    if (!tenantName) {
      return Helper.response(false, "Company Name is required", {}, res, 400);
    }

    const image = req.file ? req.file.filename : null;

    /* Check if tenant already exists */
    const existingTenant = await Tenant.findOne({
      where: { companyCode: tenantId },
      transaction: t,
    });

    if (existingTenant) {
      return Helper.response(
        false,
        "Tenant already exists",
        {},
        res,
        409
      );
    }

    /* Check if admin email already exists */
    const existingUser = await User.findOne({
      where: { email },
      transaction: t,
    });

    if (existingUser) {
      return Helper.response(
        false,
        "Email already registered",
        {},
        res,
        409
      );
    }

    const tenantUUID = uuidv4();

    const tenant = await Tenant.create(
      {
        id: tenantUUID,
        companyName: tenantName,
        companyCode: tenantId,
        plan: "basic",
        image,
      },
      { transaction: t }
    );

    const hashedPassword =  hashPassword(password);

    const adminUser = await User.create(
      {
        tenantId: tenant.id,
        name: tenantName,
        email,
        password: hashedPassword,
        role: "admin",
      },
      { transaction: t }
    );

    await t.commit();

    return Helper.response(
      true,
      "Company registered & admin user created successfully",
      {
        tenantId: tenant.id,
        adminEmail: adminUser.email,
      },
      res,
      201
    );
  } catch (error) {
    await t.rollback();
    console.error("Error creating company registration:", error);

    return Helper.response(
      false,
      error?.message || "Internal Server Error",
      {},
      res,
      500
    );
  }
};

// async function seedDefaultTenant() {
//     const existingTenant = await Tenant.findOne({ where: { companyCode: 'DEMOTESTING' } });

//     if (!existingTenant) {
//         const tenantId = uuidv4();

//         const tenant = await Tenant.create({
//             id: tenantId,
//             companyName: 'Demo Testing Pvt Ltd',
//             companyCode: 'DEMOTESTING',
//             plan: 'basic',
//         });


//         const hashedPassword = hashPassword('Admin@123');

//         const adminUser = await User.create({
//             tenantId: tenant.id,
//             name: 'Admin User',
//             email: 'testing@demo.com',
//             password: hashedPassword,
//             role: 'admin',
//         });

//         console.log('✅ Admin user created:', adminUser.email);
//     } else {
//         console.log('⚠️ Tenant already exists, skipping seed.');
//     }
// }

