const empPersonal = require("../../models/empPersonal");
const Helper = require("../../helper/helper");
const path = require("path");
const fs = require("fs");
const EmploymentType = require("../../models/employmentType");
const Prefix = require("../../models/prefix");
const { Op } = require("sequelize");
const designation = require("../../models/designation");
const attendance = require("../../models/attendance");
const bill = require("../../models/bill");
const bill_info = require("../../models/bill_info");
const leave_application = require("../../models/leave_application");
const Basic = require("../../models/basic");
const Allowance = require("../../models/allowance");
const deduction = require("../../models/deductions");
const document = require("../../models/documents");
const bankAccnt = require("../../models/bankAccnt");
const leave_balance = require("../../models/leaveBalance");
const Designation = require("../../models/designation");
const Tenant = require("../../models/tenant");
const Subscription = require("../../models/subscription");
const pin_code_master = require("../../models/pin_code_master");
const Department = require("../../models/department");


exports.CheckTenant = async (req, res) => {
  
  const { companyCode } = req.body;
  try {
    if (!companyCode) {
      return Helper.response(false, "Company code is required", [], res, 400);
    }
    const tenant = await Tenant.findOne({
      where: { companyCode,status: "active" },
    });
    if (!tenant) {
      return Helper.response(false, "No Company Found", {}, res, 404);
    }
    return Helper.response(
      true,
      "Company found",
      { tenantId: tenant.id, companyName: tenant.companyName },
      res,
      200,
    );
  } catch (error) {
    console.error("Error checking tenant:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.RegisterAppEmp = async (req, res) => {
  let {
    firstName,
    lastName,
    mobile,
    email,
    dateOfBirth,
    age,
    gender,
    companyCode,
  } = req.body;

  const tenant = await Tenant.findOne({
    where: {
      companyCode: companyCode,
    },
  });
  if (!tenant) {
    return Helper.response(false, "No Company Found", {}, res, 400);
  }

  const tenantId = tenant?.id;

  if (!tenantId || !firstName || !lastName || !mobile) {
    return Helper.response(false, "All fields must be provided", [], res, 400);
  }

  if (!Helper.isValidMobile(mobile)) {
    return Helper.response(false, "Invalid mobile number format", [], res, 400);
  }

  try {
    const [existsMobile, existsEmail] = await Promise.all([
      empPersonal.findOne({ where: { mobile, tenantId } }),
      empPersonal.findOne({ where: { email, tenantId } }),
    ]);

    if (existsMobile) {
      return Helper.response(false, "Mobile Already Exists", {}, res, 400);
    }
    if (existsEmail) {
      return Helper.response(false, "Email Already Exists", {}, res, 400);
    }

    const newEmp = await empPersonal.create({
      tenantId,
      firstName,
      lastName,
      mobile,
      email,
      dateOfBirth:
        new Date(dateOfBirth.split("/").reverse().join("-")) || "01/01/1970",
      age: age || 18,
      gender,
    });

    return Helper.response(
      true,
      "Employee created successfully",
      newEmp,
      res,
      200,
    );
  } catch (error) {
    console.error("Error creating employee:", error);
    return Helper.response(false, error?.errors[0]?.message, error, res, 500);
  }
};


exports.createEmp = async (req, res) => {
  let {
    firstName,
    lastName,
    mobile,
    email,
    permanentAddress,
    alternateMobile,
    currentAddress,
    dateOfBirth,
    age,
    gender,
    martialStatus,
    adhaarNo,
    panNo,
    fatherName,
    motherName,
    bloodGroup,
    nationality,
    pinCode,
    city,
    country,
    state,
    status,
    empCode,
    empType,
    designationId,
    departmentId,
    joiningDate,
    reportingPersonId,
    shift_id,
    guarantorName,
  } = req.body;

  const image = req.file ? req.file.filename : null;
  const tenantId = req.users && req.users.tenantId;

  const branchId = req.users && req.users.branchId;

  if (!branchId || branchId == "null") {
    return Helper.response(false, "branchId is required!", {}, res, 200);
  }

  // if (
  //   !tenantId ||
  //   !firstName ||
  //   !lastName ||
  //   !email ||
  //   !mobile ||
  //   !dateOfBirth ||
  //   !age ||
  //   !gender ||
  //   !martialStatus ||
  //   !adhaarNo ||
  //   !panNo ||
  //   !fatherName ||
  //   !motherName ||
  //   !bloodGroup ||
  //   !nationality ||
  //   !pinCode ||
  //   !state ||
  //   !empType ||
  //   !departmentId ||
  //   !designationId ||
  //   !joiningDate
  // ) {
  //   return Helper.response(false, "All fields must be provided", [], res, 400);
  // }

  if (!tenantId || !firstName || !lastName || !mobile) {
    return Helper.response(false, "All fields must be provided", [], res, 400);
  }

  // if (!Helper.isValidEmail(email)) {
  //   return Helper.response(false, "Invalid email format", [], res, 400);
  // }

  // if (!Helper.isValidAadhaar(adhaarNo)) {
  //   return Helper.response(
  //     false,
  //     "Invalid Aadhaar number format",
  //     [],
  //     res,
  //     400
  //   );
  // }

  // if (!Helper.isValidPAN(panNo)) {
  //   return Helper.response(false, "Invalid PAN number format", [], res, 400);
  // }

  if (!Helper.isValidMobile(mobile)) {
    return Helper.response(false, "Invalid mobile number format", [], res, 400);
  }

  // if (!Helper.isValidDOB(dateOfBirth)) {
  //   return Helper.response(
  //     false,
  //     "DOB must be in dd/mm/yyyy format",
  //     [],
  //     res,
  //     400
  //   );
  // }

  // if (!Helper.isAgeAbove18(age)) {
  //   return Helper.response(false, "Age must be 18 or above", [], res, 400);
  // }

  // const allowedGender = empPersonal.rawAttributes.gender.values;

  // if (!allowedGender.includes(gender)) {
  //   return Helper.response(
  //     false,
  //     `Gender must be one of: ${allowedGender.join(", ")}`,
  //     {},
  //     res,
  //     400
  //   );
  // }

  // const allowedMartialStatus = empPersonal.rawAttributes.martialStatus.values;
  // if (!allowedMartialStatus.includes(martialStatus)) {
  //   return Helper.response(false, "Marital Status is required", {}, res, 400);
  // }

  // const allowedBloodGroups = empPersonal.rawAttributes.bloodGroup.values;
  // if (!allowedBloodGroups.includes(bloodGroup)) {
  //   return Helper.response(
  //     false,
  //     `Blood Group must be one of: ${allowedBloodGroups.join(", ")}`,
  //     {},
  //     res,
  //     400
  //   );
  // }

  try {
    // ── Subscription seat validation ──────────────────────────────────────
    const activeSub = await Subscription.findOne({
      where: {
        tenantId,
        status: "active",
        endsAt: { [Op.gte]: new Date() },
      },
      order: [["endsAt", "DESC"]],
    });

    if (activeSub && activeSub.seats != null) {
      const currentEmpCount = await empPersonal.count({
        where: { tenantId, status: "active" },
      });
      if (currentEmpCount >= activeSub.seats) {
        return Helper.response(
          false,
          `Employee limit reached. Your current subscription allows only ${activeSub.seats} employee(s). Please upgrade your plan to add more.`,
          {},
          res,
          200
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    const maxuser = await empPersonal.count({ tenantId, branchId });
    // const getprefix = await Prefix.findOne({
    //   where: {
    //     tenantId,
    //     branchId,
    //     status: "active",
    //   },
    // });
    // if (!empCode) {
    //   empCode = `${getprefix.name}${(maxuser + 1).toString().padStart(3, "0")}`;
    // }

    const [
      existsMobile,
      existsEmail,
      // existsAdhaarNo,
      // existsPanNo,
      existsEmpCode,
    ] = await Promise.all([
      empPersonal.findOne({ where: { mobile, tenantId, branchId } }),
      empPersonal.findOne({ where: { email, tenantId, branchId } }),
      // empPersonal.findOne({ where: { adhaarNo, tenantId, branchId } }),
      // empPersonal.findOne({ where: { panNo, tenantId, branchId } }),
      // empPersonal.findOne({ where: { empCode, tenantId, branchId } }),
    ]);

    if (existsMobile) {
      return Helper.response(false, "Mobile Already Exists", {}, res, 400);
    }
    if (existsEmail) {
      return Helper.response(false, "Email Already Exists", {}, res, 400);
    }
    // if (existsAdhaarNo) {
    //   return Helper.response(
    //     false,
    //     "Aadhaar Number Already Exists",
    //     {},
    //     res,
    //     400
    //   );
    // }
    // if (existsPanNo) {
    //   return Helper.response(false, "PAN Number Already Exists", {}, res, 400);
    // }
    if (existsEmpCode) {
      return Helper.response(
        false,
        "Employee Code Already Exists",
        {},
        res,
        400,
      );
    }

    const newEmp = await empPersonal.create({
      tenantId,
      firstName,
      lastName,
      mobile,
      alternateMobile,
      email,
      permanentAddress,
      currentAddress,
      dateOfBirth:
        new Date(dateOfBirth.split("/").reverse().join("-")) || "01/01/1970",
      age: age || 18,
      gender,
      reportingPersonId,
      martialStatus,
      adhaarNo,
      panNo,
      fatherName,
      motherName,
      bloodGroup,
      nationality,
      pinCode,
      joiningDate: joiningDate || "01/01/1970",
      empCode: empCode,
      departmentId,
      designationId,
      state,
      city,
      country,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
      profileImage: image,
      empCode,
      empType: empType,
      shift_id,
      branchId,
      guarantorName,
      deviceId: Helper.getIpAddress(req),
    });

    return Helper.response(
      true,
      "Employee created successfully",
      newEmp,
      res,
      201,
    );
  } catch (error) {
    console.error("Error creating employee:", error);
    return Helper.response(false, error?.errors[0]?.message, error, res, 500);
  }
};

exports.getEmp = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  const { email } = req.body || {};

  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const totalEmployee = await empPersonal.count({
      where: { tenantId, branchId },
    });

    const ActiveEmployee = await empPersonal.count({
      where: { tenantId, branchId, status: "active" },
    });

    const InactiveEmployee = await empPersonal.count({
      where: { tenantId, branchId, status: "inactive" },
    });

    const newJoiners = await empPersonal.count({
      where: {
        tenantId,
        branchId,
        status: "active",
        createdAt: {
          [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30)),
        },
      },
    });

    const cardData = {
      totalEmployee,
      ActiveEmployee,
      InactiveEmployee,
      newJoiners,
    };

    if (email) {
      const emp = await empPersonal.findOne({
        where: { email, tenantId, branchId },
      });

      if (!emp) {
        return Helper.response(false, "Employee not found", [], res, 404);
      }
      const emptypes = await EmploymentType.findOne({
        where: { id: emp.empType, tenantId, branchId },
      });
      const formattedEmp = {
        ...emp.toJSON(),
        createdAt: Helper.formatToIST(emp.createdAt, "YYYY-MM-DD HH:mm:ss"),
        emptypename: emptypes ? emptypes.name : null,
      };

      return Helper.response(
        true,
        "Employee fetched successfully",
        {
          formattedEmp,
          cardData,
        },
        res,
        200,
      );
    } else {
      const ActiveEmps = await empPersonal.findAll({
        raw: true,
        where: { tenantId, status: "active", branchId },
        order: [
          ["firstName", "ASC"],
          ["lastName", "ASC"],
        ],
      });
      const emps = await empPersonal.findAll({
        raw: true,
        where: { tenantId, branchId },
        order: [
          ["firstName", "ASC"],
          ["lastName", "ASC"],
        ],
      });
      const Inactivemps = await empPersonal.findAll({
        raw: true,
        where: { tenantId, status: "inactive", branchId },
        order: [
          ["firstName", "ASC"],
          ["lastName", "ASC"],
        ],
      });
      const newJoinersList = await empPersonal.findAll({
        where: {
          tenantId,
          branchId,
          status: "active",
          createdAt: {
            [Op.gte]: new Date(new Date().setDate(new Date().getDate() - 30)),
          },
        },
        raw: true,
      });

      const formattedEmps = await Promise.all(
        emps.map(async (emp, i) => {
          const emptypes = await EmploymentType.findOne({
            where: { id: emp.empType, tenantId, branchId },
          });
          let designationName = null;
          let departmentName = null;
          if (emp.designationId) {
            const designationData = await designation.findOne({
              where: { id: emp.designationId, tenantId, branchId },
              attributes: ["name"],
              raw: true,
            });

            designationName = designationData?.name || null;
          }
          if (emp.departmentId) {
            const departmentData = await Department.findOne({
              where: { id: emp.departmentId, tenantId, branchId },
              attributes: ["name"],
              raw: true,
            });

            departmentName = departmentData?.name || null;
          }
          //   if (emp.designationId) {  
          //   designationName = departmentName?.name || null;

          // }

          return {
            ...emp,
            createdAt: Helper.formatToIST(emp.createdAt, "YYYY-MM-DD HH:mm:ss"),
            emptypename: emptypes ? emptypes.name : null,
            designation: emp.designationId ? designationName : null,
            department: emp.departmentId ? departmentName : null,
          };
        }),
      );
      const formattedActiveEmps = await Promise.all(
        ActiveEmps.map(async (emp, i) => {
          const emptypes = await EmploymentType.findOne({
            where: { id: emp.empType, tenantId, branchId },
          });
          return {
            ...emp,
            createdAt: Helper.formatToIST(emp.createdAt, "YYYY-MM-DD HH:mm:ss"),
            emptypename: emptypes ? emptypes.name : null,
            designation: emp.designationId
              ? await designation.findOne({
                  where: { id: emp.designationId, tenantId, branchId },
                  attributes: ["name"],
                  raw: true,
                })?.name
              : null,
          };
        }),
      );
      const formattedInactivemps = await Promise.all(
        Inactivemps.map(async (emp, i) => {
          const emptypes = await EmploymentType.findOne({
            where: { id: emp.empType, tenantId, branchId },
          });
          return {
            ...emp,
            createdAt: Helper.formatToIST(emp.createdAt, "YYYY-MM-DD HH:mm:ss"),
            emptypename: emptypes ? emptypes.name : null,
            designation: emp.designationId
              ? await designation.findOne({
                  where: { id: emp.designationId, tenantId, branchId },
                  attributes: ["name"],
                  raw: true,
                })?.name
              : null,
          };
        }),
      );
      const formattednewJoinermps = await Promise.all(
        newJoinersList.map(async (emp, i) => {
          const emptypes = await EmploymentType.findOne({
            where: { id: emp.empType, tenantId, branchId },
          });
          return {
            ...emp,
            createdAt: Helper.formatToIST(emp.createdAt, "YYYY-MM-DD HH:mm:ss"),
            emptypename: emptypes ? emptypes.name : null,
            designation: emp.designationId
              ? await designation.findOne({
                  where: { id: emp.designationId, tenantId, branchId },
                  attributes: ["name"],
                  raw: true,
                })?.name
              : null,
          };
        }),
      );

      return Helper.response(
        true,
        "Employees fetched successfully",
        {
          formattedEmps,
          formattedActiveEmps,
          cardData,
          formattedInactivemps,
          formattednewJoinermps,
        },
        res,
        200,
      );
    }
  } catch (error) {
    console.error("Error fetching employee:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.activeLocation = async (req, res) => {
  const { id, isLocation, isofflineAtt, isofflineAllTimeAtt } = req.body;

  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    // if (!isLocation) {
    //   return Helper.response(false, "Location is required", [], res, 400);
    // }
    if (!id) {
      return Helper.response(false, "Employee ID is required", [], res, 400);
    }
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    const existingEmp = await empPersonal.findOne({
      where: { id, tenantId, branchId },
    });

    if (!existingEmp) {
      return Helper.response(false, "Employee not found", [], res, 404);
    }

    if (!id || !tenantId) {
      return Helper.response(
        false,
        "id and tenetId must be provided",
        [],
        res,
        400,
      );
    }

    const updateData = {};

    updateData.updatedBy = req.users && req.users.id;
    updateData.deviceId = Helper.getIpAddress(req);
    updateData.isLocation = isLocation ?? updateData.isLocation;
    updateData.isofflineAtt = isofflineAtt ?? updateData.isofflineAtt;
    updateData.isofflineAllTimeAtt =
      isofflineAllTimeAtt ?? updateData.isofflineAllTimeAtt;
    updateData.branchId = branchId;

    await existingEmp.update(updateData);

    return Helper.response(
      true,
      "Employee updated successfully",
      existingEmp,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating employee:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.updateEmp = async (req, res) => {
  const {
    id,
    firstName,
    lastName,
    mobile,
    email,
    permanentAddress,
    alternateMobile,
    currentAddress,
    dateOfBirth,
    age,
    gender,
    martialStatus,
    adhaarNo,
    panNo,
    fatherName,
    motherName,
    bloodGroup,
    nationality,
    designationId,
    departmentId,
    shift_id,
    pinCode,
    country,
    city,
    empType,
    state,
    status,
    reportingPersonId,
    joiningDate,
    empCode,
    role,
    guarantorName,
    type,
    emp_status
  } = req.body;

  // const image = req.file ? req.file.filename : null;

  const tenantId = req.users && req.users.tenantId;
  let branchId = req.body?.branchId;
  if (!branchId || branchId == "null") {
    branchId = req.users && req.users.branchId;
  }
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (!id) {
      return Helper.response(false, "Employee ID is required", [], res, 400);
    }
    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }
    // const existingEmp = await empPersonal.findOne({ where: { id, tenantId,branchId } });
    const existingEmp = await empPersonal.findOne({ where: { id, tenantId } });

    if (!existingEmp) {
      return Helper.response(false, "Employee not found", [], res, 404);
    }

    if (!id || !tenantId) {
      return Helper.response(
        false,
        "id and tenetId must be provided",
        [],
        res,
        400,
      );
    }

    if (email && !Helper.isValidEmail(email)) {
      return Helper.response(false, "Invalid email format", [], res, 400);
    }

    // if (adhaarNo && !Helper.isValidAadhaar(adhaarNo)) {
    //   return Helper.response(
    //     false,
    //     "Invalid Aadhaar number format",
    //     [],
    //     res,
    //     400,
    //   );
    // }

    // if (panNo && !Helper.isValidPAN(panNo)) {
    //   return Helper.response(false, "Invalid PAN number format", [], res, 400);
    // }

    if (mobile && !Helper.isValidMobile(mobile)) {
      return Helper.response(
        false,
        "Invalid mobile number format",
        [],
        res,
        400,
      );
    }

    if (dateOfBirth && !Helper.isValidDOB(dateOfBirth)) {
      return Helper.response(
        false,
        "DOB must be in dd/mm/yyyy format",
        [],
        res,
        400,
      );
    }

    if (age && !Helper.isAgeAbove18(age)) {
      return Helper.response(false, "Age must be 18 or above", [], res, 400);
    }

    if (gender) {
      const allowedGender = empPersonal.rawAttributes.gender.values;
      if (!allowedGender.includes(gender)) {
        return Helper.response(
          false,
          `Gender must be one of: ${allowedGender.join(", ")}`,
          {},
          res,
          400,
        );
      }
    }

    if (martialStatus) {
      const allowedMartialStatus =
        empPersonal.rawAttributes.martialStatus.values;
      if (!allowedMartialStatus.includes(martialStatus)) {
        return Helper.response(
          false,
          `Marital Status must be one of: ${allowedMartialStatus.join(", ")}`,
          {},
          res,
          400,
        );
      }
    }

    if (bloodGroup) {
      const allowedBloodGroups = empPersonal.rawAttributes.bloodGroup.values;
      if (!allowedBloodGroups.includes(bloodGroup)) {
        return Helper.response(
          false,
          `Blood Group must be one of: ${allowedBloodGroups.join(", ")}`,
          {},
          res,
          400,
        );
      }
    }

    const updateData = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (email !== undefined) updateData.email = email;

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth
        ? new Date(dateOfBirth.split("/").reverse().join("-"))
        : null;
    }

    if (age !== undefined) updateData.age = age;
    if (gender !== undefined) updateData.gender = gender;
    if (martialStatus !== undefined) updateData.martialStatus = martialStatus;
    if (adhaarNo !== undefined) updateData.adhaarNo = adhaarNo;
    if (panNo !== undefined) updateData.panNo = panNo;
    if (fatherName !== undefined) updateData.fatherName = fatherName;
    if (motherName !== undefined) updateData.motherName = motherName;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
    if (nationality !== undefined) updateData.nationality = nationality;
    if (pinCode !== undefined) updateData.pinCode = pinCode;
    if (state !== undefined) updateData.state = state;
    if (city !== undefined) updateData.city = city;
    if (country !== undefined) updateData.country = country;
    if (status !== undefined) updateData.status = status;
    if (permanentAddress !== undefined)
      updateData.permanentAddress = permanentAddress;
    if (alternateMobile !== undefined)
      updateData.alternateMobile = alternateMobile;
    if (currentAddress !== undefined)
      updateData.currentAddress = currentAddress;
    // if (image !== undefined) updateData.profileImage = image;
    if (empType !== undefined) updateData.empType = empType;
    if (designationId !== undefined) updateData.designationId = designationId;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (shift_id !== undefined) updateData.shift_id = shift_id;
    if (reportingPersonId !== undefined)
      updateData.reportingPersonId = reportingPersonId;
    if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
    if (empCode != undefined) updateData.empCode = empCode;
    if (guarantorName != undefined) updateData.guarantorName = guarantorName;
    // if (empCode !== undefined) updateData.empCode = empCode;
    if (branchId !== undefined) updateData.branchId = branchId;
    if(type=='pending_employee'){
      updateData.emp_status = emp_status || 'pending'
    }
    updateData.updatedBy = req.users && req.users.id;
    updateData.deviceId = Helper.getIpAddress(req);
    updateData.role = role;

    await existingEmp.update(updateData);
    if (
      req.body.branchId !== undefined &&
      req.body.branchId !== existingEmp.branchId
    ) {
      await Helper.updateEmployeeBranchEverywhere({
        employeeId: id,
        tenantId,
        newBranchId: req.body.branchId,
        updatedBy: req.users.id,
      });
    }

    return Helper.response(
      true,
      "Employee updated successfully",
      existingEmp,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating employee:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.deleteEmp = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;

  try {
    if (!id || !tenantId || !branchId) {
      return Helper.response(
        false,
        "id,branchId and tenantId must be provided",
        [],
        res,
        400,
      );
    }

    const emp = await empPersonal.findOne({
      where: { id, tenantId, branchId },
    });

    if (!emp) {
      return Helper.response(false, "Employee not found", [], res, 404);
    }
    await attendance.destroy({ where: { employeeId: id, tenantId, branchId } });
    await bill.destroy({ where: { employeeId: id, tenantId, branchId } });
    await bill_info.destroy({ where: { employeeId: id, tenantId, branchId } });
    await leave_application.destroy({
      where: { employeeId: id, tenantId, branchId },
    });
    await Basic.destroy({ where: { employeeId: id, tenantId, branchId } });
    await Allowance.destroy({ where: { employeeId: id, tenantId, branchId } });
    //  await deduction.destroy({ where: {employeeId: id, tenantId } });
    //  await deduction.destroy({ where: { employeeId:id, tenantId } });
    await bankAccnt.destroy({ where: { employeeId: id, tenantId, branchId } });
    await document.destroy({ where: { employeeId: id, tenantId, branchId } });
    await leave_balance.destroy({
      where: { employeeId: id, tenantId, branchId },
    });
    await emp.destroy();

    return Helper.response(true, "Employee deleted successfully", [], res, 200);
  } catch (error) {
    console.error("Error deleting employee:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.uploadImage = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const image = req.file ? req.file.filename : null;
  const branchId = req.users && req.users.branchId;
  if (!tenantId || !id || !branchId) {
    if (image) {
      const filePath = path.join(__dirname, "../../../upload", image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return Helper.response(
      false,
      "Branch Id ,Tenant ID and Employee ID are required",
      [],
      res,
      400,
    );
  }

  if (!image) {
    return Helper.response(false, "No image uploaded", [], res, 400);
  }

  try {
    const emp = await empPersonal.findOne({
      where: { id, tenantId, branchId },
    });
    if (!emp) {
      const filePath = path.join(__dirname, "../../../upload", image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return Helper.response(false, "Employee not found", [], res, 404);
    }

    if (emp.profileImage) {
      const oldImagePath = path.join(
        __dirname,
        "../../../upload",
        emp.profileImage,
      );
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          /* ignore */
        }
      }
    }

    emp.profileImage = image;
    emp.updatedBy = req.users && req.users.id;
    await emp.save();

    return Helper.response(
      true,
      "Profile image updated successfully",
      emp,
      res,
      200,
    );
  } catch (error) {
    console.error("Error uploading profile image:", error);

    if (image) {
      const filePath = path.join(__dirname, "../../../upload", image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getUploadedImage = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  if (!tenantId || !id || !branchId) {
    return Helper.response(
      false,
      "branch Id,Tenant ID and Employee ID are required",
      [],
      res,
      400,
    );
  }

  try {
    const emp = await empPersonal.findOne({
      where: { id, tenantId, status: "active", branchId },
    });
    if (!emp) {
      return Helper.response(false, "Employee not found", [], res, 404);
    }

    if (!emp.profileImage) {
      return Helper.response(
        false,
        "No profile image found for this employee",
        [],
        res,
        404,
      );
    }

    const imagePath = path.join(__dirname, "../../../upload", emp.profileImage);
    if (fs.existsSync(imagePath)) {
      return Helper.response(
        true,
        "Profile image fetched successfully",
        emp.profileImage,
        res,
        200,
      );
    } else {
      return Helper.response(
        false,
        "Profile image file does not exist",
        [],
        res,
        404,
      );
    }
  } catch (error) {
    console.error("Error fetching profile image:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.employeeList = async (req, res) => {
  // console.log("api called");

  const tenantId = req.users && req.users.tenantId;
  const branchId = req.users && req.users.branchId;
  console.log(branchId, "branchid");

  try {
    if (!tenantId) {
      return Helper.response(false, "TenantId is required!", {}, res, 200);
    }

    if (!branchId || branchId == "null") {
      return Helper.response(false, "branchId is required!", {}, res, 200);
    }

    const employees = await empPersonal.findAll({
      where: {
        tenantId,
        branchId,
        status: "active",
      },
      attributes: ["id", "firstName", "lastName", "empCode"],
      order: [["firstName", "ASC"]],
      raw: true,
    });

    const dropdown = [
      { label: "All", value: "All" },
      ...employees.map((emp) => ({
        label: `${emp.firstName} ${emp.lastName}-${emp.empCode}`,
        value: emp.id,
      })),
    ];

    return Helper.response(
      true,
      "Employee list Fetched Successfully!",
      dropdown,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching employee list:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.AppemployeeList = async (req, res) => {
  // console.log("api called");

  const tenantId = req.users && req.users.tenantId;

  try {
    if (!tenantId) {
      return Helper.response(false, "TenantId is required!", {}, res, 200);
    }


    const employees = await empPersonal.findAll({
      where: {
        tenantId,
        emp_status: "pending",
      },
      orders: [["createdAt", "DESC"]],
      // attributes: ["id", "firstName", "lastName", "empCode"],
      // order: [["firstName", "ASC"]],
      raw: true,
    });

    

    return Helper.response(
      true,
      "Employee list Fetched Successfully!",
      employees,
      res,
      200,
    );
  } catch (error) {
    console.error("Error fetching employee list:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};


exports.getStateDistrict = async (req, res) => {
  try {
    const { pin_code } = req.body;
    if (!pin_code) {
      return Helper.response(false, "Pin Code Is Required", {}, res, 400);
    }

    const data = await pin_code_master.findOne({
      where: {
        pin_code: pin_code,
      },
      attributes: [
        "id",
        "district_name",
        "state_name",
        "district_id",
        "state_id",
      ],
      raw: true,
    });

    if (!data) {
      return Helper.response(false, "No District Present", [], res, 200);
    }

    return Helper.response(true, "Data Found Successfully", data, res, 200);
  } catch (error) {
    console.error("Error adding District:", error);
    return Helper.response(
      false,
      error?.errors?.[0]?.message || "Internal Server Error",
      {},
      res,
      500,
    );
  }
};
