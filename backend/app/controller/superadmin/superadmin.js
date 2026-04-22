const jwt = require("jsonwebtoken");
const cryptoJs = require("crypto-js");
require("dotenv").config();

const Helper = require("../../helper/helper");
const Tenant = require("../../models/tenant");
const User = require("../../models/users");
const Subscription = require("../../models/subscription");
const PlanMaster = require("../../models/plan_master");
const empPersonal = require("../../models/empPersonal");
const leave_application = require("../../models/leave_application");
const attendance = require("../../models/attendance");
const holiday = require("../../models/holiday");
const branch = require("../../models/branch");
const HolidayType = require("../../models/HolidayType");
const LandingSiteContent = require("../../models/landing_site_content");
const LandingContactSubmission = require("../../models/landing_contact_submission");
const { mergeLandingPayload } = require("../../lib/landingMerge");
const { Op } = require("sequelize");

/** If holiday_type looks like a UUID but has no HolidayType row, expose null (UI shows —). */
const HOLIDAY_TYPE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hashPassword(password) {
  return cryptoJs.SHA256(password).toString();
}

const SYSTEM_TENANT_CODE = "SUPERADMIN";

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email ? String(email).trim() : "";
    password = password ? String(password).trim() : "";

    if (!email || !password) {
      return Helper.response(false, "Email and password are required.", {}, res, 200);
    }

    const systemTenant = await Tenant.findOne({
      where: { companyCode: SYSTEM_TENANT_CODE, status: "active" },
    });

    if (!systemTenant) {
      return Helper.response(false, "SuperAdmin tenant not found.", {}, res, 200);
    }

    const user = await User.findOne({
      where: {
        email,
        tenantId: systemTenant.id,
        status: "active",
        role: "superadmin",
      },
    });

    if (!user) {
      return Helper.response(false, "Invalid credentials.", {}, res, 200);
    }

    const hashedInput = hashPassword(password);
    if (user.password !== hashedInput) {
      return Helper.response(false, "Invalid credentials.", {}, res, 200);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "8h" },
    );

    await user.update({ token });

    const baseUrl = process.env.API_BASE_URL;
    const PORT = process.env.SERVER_PORT;

    return Helper.response(
      true,
      "SuperAdmin login successful!",
      {
        baseUrl,
        PORT,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      res,
      200,
    );
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.listTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      where: {
        companyCode: { [Op.ne]: SYSTEM_TENANT_CODE },
      },
      order: [["createdAt", "desc"]],
      raw: true,
    });

    const tenantIds = tenants.map((t) => t.id);

    const subs = await Subscription.findAll({
      where: { tenantId: { [Op.in]: tenantIds } },
      order: [["startsAt", "desc"]],
      raw: true,
    });

    const latestByTenant = new Map();
    for (const s of subs) {
      if (!latestByTenant.has(s.tenantId)) latestByTenant.set(s.tenantId, s);
    }

    const data = tenants.map((t) => ({
      ...t,
      latestSubscription: latestByTenant.get(t.id) || null,
    }));

    return Helper.response(true, "Tenants fetched successfully", data, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.updateTenantStatus = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { status } = req.body;

    if (!tenantId) return Helper.response(false, "tenantId is required.", {}, res, 200);
    if (!status || !["active", "inactive"].includes(status)) {
      return Helper.response(false, "Valid status is required (active/inactive).", {}, res, 200);
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return Helper.response(false, "Tenant not found.", {}, res, 200);
    if (tenant.companyCode === SYSTEM_TENANT_CODE) {
      return Helper.response(false, "Not allowed for system tenant.", {}, res, 200);
    }

    await tenant.update({ status, updatedBy: req.users?.id || null });
    return Helper.response(true, "Tenant status updated.", tenant, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.upsertSubscription = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan, planId, status, startsAt, endsAt, seats, notes, metadata } = req.body;

    if (!tenantId) return Helper.response(false, "tenantId is required.", {}, res, 200);
    if (!startsAt || !endsAt) {
      return Helper.response(false, "startsAt and endsAt are required.", {}, res, 200);
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return Helper.response(false, "Tenant not found.", {}, res, 200);
    if (tenant.companyCode === SYSTEM_TENANT_CODE) {
      return Helper.response(false, "Not allowed for system tenant.", {}, res, 200);
    }

    let resolvedPlan = plan ? String(plan) : "";
    if (!resolvedPlan && planId) {
      const pm = await PlanMaster.findByPk(planId, { raw: true });
      if (!pm) return Helper.response(false, "Invalid planId.", {}, res, 200);
      if (pm.status !== "active") return Helper.response(false, "Plan is inactive.", {}, res, 200);
      resolvedPlan = pm.name;
    }
    if (!resolvedPlan) return Helper.response(false, "plan or planId is required.", {}, res, 200);

    const newSub = await Subscription.create({
      tenantId,
      plan: resolvedPlan,
      status: status && ["active", "expired", "cancelled"].includes(status) ? status : "active",
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      seats: seats === "" || seats === undefined ? null : Number(seats),
      notes: notes ?? null,
      metadata: metadata ?? null,
      createdBy: req.users?.id || null,
      updatedBy: req.users?.id || null,
    });

    return Helper.response(true, "Subscription saved.", newSub, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.listPlans = async (req, res) => {
  try {
    const plans = await PlanMaster.findAll({
      order: [["createdAt", "desc"]],
      raw: true,
    });
    return Helper.response(true, "Plans fetched successfully", plans, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.createPlan = async (req, res) => {
  try {
    const {
      name,
      code,
      price,
      billingCycle,
      durationDays,
      maxUsers,
      description,
      status,
      metadata,
    } = req.body;

    if (!name) return Helper.response(false, "name is required.", {}, res, 200);

    const plan = await PlanMaster.create({
      name: String(name).trim(),
      code: code ? String(code).trim() : null,
      price: price === "" || price === undefined ? null : Number(price),
      billingCycle: billingCycle || "monthly",
      durationDays: durationDays === "" || durationDays === undefined ? null : Number(durationDays),
      maxUsers: maxUsers === "" || maxUsers === undefined ? null : Number(maxUsers),
      description: description ?? null,
      status: status && ["active", "inactive"].includes(status) ? status : "active",
      metadata: metadata ?? null,
      createdBy: req.users?.id || null,
      updatedBy: req.users?.id || null,
    });

    return Helper.response(true, "Plan created successfully", plan, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    if (!planId) return Helper.response(false, "planId is required.", {}, res, 200);

    const plan = await PlanMaster.findByPk(planId);
    if (!plan) return Helper.response(false, "Plan not found.", {}, res, 200);

    const patch = { ...req.body, updatedBy: req.users?.id || null };
    // avoid blanking unique fields accidentally
    if (patch.name !== undefined) patch.name = String(patch.name).trim();
    if (patch.code !== undefined) patch.code = patch.code ? String(patch.code).trim() : null;
    if (patch.price !== undefined) patch.price = patch.price === "" ? null : Number(patch.price);
    if (patch.durationDays !== undefined) patch.durationDays = patch.durationDays === "" ? null : Number(patch.durationDays);
    if (patch.maxUsers !== undefined) patch.maxUsers = patch.maxUsers === "" ? null : Number(patch.maxUsers);
    if (patch.status !== undefined && !["active", "inactive"].includes(patch.status)) delete patch.status;
    if (patch.billingCycle !== undefined && !["monthly", "yearly", "one_time"].includes(patch.billingCycle)) delete patch.billingCycle;

    await plan.update(patch);
    return Helper.response(true, "Plan updated successfully", plan, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.togglePlanStatus = async (req, res) => {
  try {
    const { planId } = req.params;
    const { status } = req.body;
    if (!planId) return Helper.response(false, "planId is required.", {}, res, 200);
    if (!status || !["active", "inactive"].includes(status)) {
      return Helper.response(false, "Valid status is required (active/inactive).", {}, res, 200);
    }

    const plan = await PlanMaster.findByPk(planId);
    if (!plan) return Helper.response(false, "Plan not found.", {}, res, 200);
    await plan.update({ status, updatedBy: req.users?.id || null });
    return Helper.response(true, "Plan status updated.", plan, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.subscriptionHistory = async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId) return Helper.response(false, "tenantId is required.", {}, res, 200);

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return Helper.response(false, "Tenant not found.", {}, res, 200);

    const subs = await Subscription.findAll({
      where: { tenantId },
      order: [["startsAt", "desc"]],
      raw: true,
    });

    return Helper.response(true, "Subscription history fetched.", subs, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.getStats = async (req, res) => {
  try {
    const systemTenant = await Tenant.findOne({
      where: { companyCode: SYSTEM_TENANT_CODE },
      raw: true,
    });

    const systemTenantId = systemTenant?.id || null;

    const totalCompanies = await Tenant.count({
      where: { companyCode: { [Op.ne]: SYSTEM_TENANT_CODE } },
    });

    const totalUsers = await User.count({
      where: systemTenantId ? { tenantId: { [Op.ne]: systemTenantId } } : undefined,
    });

    // "Total Plan" => number of unique plans among latest subscription per tenant
    const tenants = await Tenant.findAll({
      where: { companyCode: { [Op.ne]: SYSTEM_TENANT_CODE } },
      attributes: ["id"],
      raw: true,
    });
    const tenantIds = tenants.map((t) => t.id);

    let totalPlans = 0;
    if (tenantIds.length) {
      const subs = await Subscription.findAll({
        where: { tenantId: { [Op.in]: tenantIds } },
        attributes: ["tenantId", "plan", "startsAt"],
        order: [["startsAt", "desc"]],
        raw: true,
      });

      const latestByTenant = new Map();
      for (const s of subs) {
        if (!latestByTenant.has(s.tenantId)) latestByTenant.set(s.tenantId, s.plan);
      }

      const plans = new Set(Array.from(latestByTenant.values()).filter(Boolean));
      totalPlans = plans.size;
    }

    return Helper.response(
      true,
      "Stats fetched successfully",
      { totalCompanies, totalPlans, totalUsers },
      res,
      200,
    );
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { tenantId, status, role, q } = req.query;

    const systemTenant = await Tenant.findOne({
      where: { companyCode: SYSTEM_TENANT_CODE },
      raw: true,
    });
    const systemTenantId = systemTenant?.id || null;

    const where = {};
    if (systemTenantId) where.tenantId = { [Op.ne]: systemTenantId };
    if (tenantId) where.tenantId = String(tenantId);
    if (status && ["active", "inactive"].includes(String(status))) where.status = String(status);
    if (role && ["admin", "hr", "employee", "superadmin"].includes(String(role))) where.role = String(role);
    if (q) {
      const query = String(q).trim();
      where[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
      ];
    }

    const users = await User.findAll({
      where,
      attributes: ["id", "tenantId", "name", "email", "role", "status", "createdAt", "updatedAt"],
      order: [["createdAt", "desc"]],
      raw: true,
    });

    const tenantIds = Array.from(new Set(users.map((u) => u.tenantId)));
    const tenants = await Tenant.findAll({
      where: { id: { [Op.in]: tenantIds } },
      attributes: ["id", "companyName", "companyCode"],
      raw: true,
    });
    const tMap = new Map(tenants.map((t) => [t.id, t]));

    const data = users.map((u) => ({
      ...u,
      tenant: tMap.get(u.tenantId) || null,
    }));

    return Helper.response(true, "Users fetched successfully", data, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, role, name } = req.body;

    if (!userId) return Helper.response(false, "userId is required.", {}, res, 200);

    const user = await User.findByPk(userId);
    if (!user) return Helper.response(false, "User not found.", {}, res, 200);

    const systemTenant = await Tenant.findOne({
      where: { companyCode: SYSTEM_TENANT_CODE },
      raw: true,
    });
    if (systemTenant?.id && user.tenantId === systemTenant.id) {
      return Helper.response(false, "Not allowed for system user.", {}, res, 200);
    }

    const patch = { updatedBy: req.users?.id || null };
    if (name !== undefined) patch.name = String(name).trim();
    if (status !== undefined) {
      if (!["active", "inactive"].includes(String(status))) {
        return Helper.response(false, "Invalid status.", {}, res, 200);
      }
      patch.status = String(status);
    }
    if (role !== undefined) {
      if (!["admin", "hr", "employee"].includes(String(role))) {
        return Helper.response(false, "Invalid role.", {}, res, 200);
      }
      patch.role = String(role);
    }

    await user.update(patch);

    const safeUser = await User.findByPk(userId, {
      attributes: ["id", "tenantId", "name", "email", "role", "status", "createdAt", "updatedAt"],
      raw: true,
    });

    return Helper.response(true, "User updated successfully", safeUser, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const systemTenant = await Tenant.findOne({
      where: { companyCode: SYSTEM_TENANT_CODE },
      raw: true,
    });
    const systemTenantId = systemTenant?.id || null;

    const tenantWhere = { companyCode: { [Op.ne]: SYSTEM_TENANT_CODE } };
    const userWhere = systemTenantId ? { tenantId: { [Op.ne]: systemTenantId } } : {};

    const [companiesActive, companiesInactive] = await Promise.all([
      Tenant.count({ where: { ...tenantWhere, status: "active" } }),
      Tenant.count({ where: { ...tenantWhere, status: "inactive" } }),
    ]);

    const [usersActive, usersInactive] = await Promise.all([
      User.count({ where: { ...userWhere, status: "active" } }),
      User.count({ where: { ...userWhere, status: "inactive" } }),
    ]);

    // Latest subscription per tenant -> plan distribution + expiring list
    const tenants = await Tenant.findAll({
      where: tenantWhere,
      attributes: ["id", "companyName", "companyCode"],
      raw: true,
    });
    const tenantIds = tenants.map((t) => t.id);

    const latestSubByTenant = new Map();
    if (tenantIds.length) {
      const subs = await Subscription.findAll({
        where: { tenantId: { [Op.in]: tenantIds } },
        attributes: ["tenantId", "plan", "status", "startsAt", "endsAt"],
        order: [["startsAt", "desc"]],
        raw: true,
      });
      for (const s of subs) {
        if (!latestSubByTenant.has(s.tenantId)) latestSubByTenant.set(s.tenantId, s);
      }
    }

    const planCounts = {};
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiring = [];

    for (const t of tenants) {
      const s = latestSubByTenant.get(t.id);
      if (!s) continue;

      const planName = s.plan || "Unknown";
      planCounts[planName] = (planCounts[planName] || 0) + 1;

      const endsAt = s.endsAt ? new Date(s.endsAt) : null;
      if (endsAt && endsAt >= now && endsAt <= in30) {
        expiring.push({
          tenantId: t.id,
          companyName: t.companyName,
          companyCode: t.companyCode,
          plan: s.plan,
          status: s.status,
          endsAt: s.endsAt,
        });
      }
    }

    expiring.sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt));

    const planDistribution = Object.keys(planCounts)
      .map((k) => ({ plan: k, count: planCounts[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Line series: company signups in last 30 days
    const start30 = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const recentTenants = await Tenant.findAll({
      where: {
        ...tenantWhere,
        createdAt: { [Op.gte]: start30 },
      },
      attributes: ["createdAt"],
      raw: true,
    });

    const dayKey = (d) => {
      const dt = new Date(d);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      const da = String(dt.getDate()).padStart(2, "0");
      return `${y}-${m}-${da}`;
    };

    const signupCounts = {};
    for (const r of recentTenants) {
      const k = dayKey(r.createdAt);
      signupCounts[k] = (signupCounts[k] || 0) + 1;
    }

    const companySignupsLast30Days = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start30.getTime() + i * 24 * 60 * 60 * 1000);
      const k = dayKey(d);
      companySignupsLast30Days.push({ date: k, count: signupCounts[k] || 0 });
    }

    // Bar series: users by role
    const roleCountsRaw = await User.findAll({
      where: userWhere,
      attributes: ["role"],
      raw: true,
    });
    const roleCounts = { admin: 0, hr: 0, employee: 0, superadmin: 0 };
    for (const u of roleCountsRaw) {
      const r = u.role;
      if (roleCounts[r] !== undefined) roleCounts[r] += 1;
    }
    const usersByRole = [
      { role: "admin", count: roleCounts.admin },
      { role: "hr", count: roleCounts.hr },
      { role: "employee", count: roleCounts.employee },
    ];

    return Helper.response(
      true,
      "Analytics fetched successfully",
      {
        companies: { active: companiesActive, inactive: companiesInactive, total: companiesActive + companiesInactive },
        users: { active: usersActive, inactive: usersInactive, total: usersActive + usersInactive },
        planDistribution,
        expiringNext30Days: expiring.slice(0, 10),
        companySignupsLast30Days,
        usersByRole,
      },
      res,
      200,
    );
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

/** Read-only snapshot for SuperAdmin: employees, leaves, attendance, holidays for one tenant */
exports.getTenantCompanySnapshot = async (req, res) => {
  try {
    const { tenantId } = req.params;
    if (!tenantId) return Helper.response(false, "tenantId is required.", {}, res, 200);

    const tenant = await Tenant.findByPk(tenantId, { raw: true });
    if (!tenant) return Helper.response(false, "Tenant not found.", {}, res, 200);
    if (tenant.companyCode === SYSTEM_TENANT_CODE) {
      return Helper.response(false, "Not allowed for system tenant.", {}, res, 200);
    }

    const branchRows = await branch.findAll({
      where: { tenantId },
      attributes: ["id", "name", "status"],
      order: [["name", "ASC"]],
      raw: true,
    });
    const branchNameById = new Map(branchRows.map((b) => [b.id, b.name]));

    const employeeCountActive = await empPersonal.count({
      where: { tenantId, status: "active" },
    });
    const employeeCountTotal = await empPersonal.count({ where: { tenantId } });

    const employeesRaw = await empPersonal.findAll({
      where: { tenantId },
      attributes: ["id", "firstName", "lastName", "email", "empCode", "status", "joiningDate", "branchId"],
      order: [["createdAt", "DESC"]],
      limit: 50,
      raw: true,
    });
    const employees = employeesRaw.map((e) => ({
      ...e,
      branchName: branchNameById.get(e.branchId) || null,
    }));

    const leavesRaw = await leave_application.findAll({
      where: { tenantId },
      order: [["appliedOn", "DESC"]],
      limit: 35,
      raw: true,
    });
    const leaveEmpIds = [...new Set(leavesRaw.map((l) => l.employeeId).filter(Boolean))];
    const leaveEmps =
      leaveEmpIds.length === 0
        ? []
        : await empPersonal.findAll({
            where: { id: { [Op.in]: leaveEmpIds } },
            attributes: ["id", "firstName", "lastName"],
            raw: true,
          });
    const leaveEmpMap = new Map(leaveEmps.map((e) => [e.id, e]));
    const leaves = leavesRaw.map((l) => {
      const e = leaveEmpMap.get(l.employeeId);
      const employeeName = e ? `${e.firstName || ""} ${e.lastName || ""}`.trim() || "—" : "—";
      return {
        id: l.id,
        fromDate: l.fromDate,
        toDate: l.toDate,
        days: l.days,
        status: l.status,
        appliedOn: l.appliedOn,
        employeeName,
        branchId: l.branchId,
        branchName: branchNameById.get(l.branchId) || null,
      };
    });

    const attRaw = await attendance.findAll({
      where: { tenantId },
      order: [
        ["date", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: 35,
      raw: true,
    });
    const attEmpIds = [...new Set(attRaw.map((a) => a.employeeId).filter(Boolean))];
    const attEmps =
      attEmpIds.length === 0
        ? []
        : await empPersonal.findAll({
            where: { id: { [Op.in]: attEmpIds } },
            attributes: ["id", "firstName", "lastName"],
            raw: true,
          });
    const attEmpMap = new Map(attEmps.map((e) => [e.id, e]));
    const attendanceRows = attRaw.map((a) => {
      const e = attEmpMap.get(a.employeeId);
      const employeeName = e ? `${e.firstName || ""} ${e.lastName || ""}`.trim() || "—" : "—";
      return {
        id: a.id,
        date: a.date,
        check_in_time: a.check_in_time,
        check_out_time: a.check_out_time,
        employeeName,
        branchId: a.branchId,
        branchName: branchNameById.get(a.branchId) || null,
      };
    });

    const today = new Date().toISOString().slice(0, 10);
    let holidayRows = await holiday.findAll({
      where: { tenantId, status: "active", date: { [Op.gte]: today } },
      order: [["date", "ASC"]],
      limit: 60,
      raw: true,
    });
    if (!holidayRows.length) {
      holidayRows = await holiday.findAll({
        where: { tenantId, status: "active" },
        order: [["date", "DESC"]],
        limit: 30,
        raw: true,
      });
    }

    const holidayTypeIds = [...new Set(holidayRows.map((h) => h.holiday_type).filter(Boolean))];
    const holidayTypeRows =
      holidayTypeIds.length === 0
        ? []
        : await HolidayType.findAll({
            where: { tenantId, id: { [Op.in]: holidayTypeIds } },
            attributes: ["id", "name"],
            raw: true,
          });
    const holidayTypeNameById = new Map(holidayTypeRows.map((t) => [t.id, t.name]));

    const holidays = holidayRows.map((h) => {
      const rawType = h.holiday_type;
      let typeLabel = null;
      if (rawType != null && rawType !== "") {
        const resolved = holidayTypeNameById.get(rawType);
        if (resolved) typeLabel = resolved;
        else if (typeof rawType === "string" && !HOLIDAY_TYPE_UUID_RE.test(rawType)) typeLabel = rawType;
      }
      return {
        id: h.id,
        holiday_name: h.holiday_name,
        date: h.date,
        holiday_type: typeLabel,
        branchId: h.branchId,
        branchName: branchNameById.get(h.branchId) || null,
      };
    });

    const branches = branchRows.map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
    }));

    return Helper.response(
      true,
      "Company snapshot fetched.",
      {
        tenant: {
          id: tenant.id,
          companyName: tenant.companyName,
          companyCode: tenant.companyCode,
          status: tenant.status,
        },
        counts: {
          employeesActive: employeeCountActive,
          employeesTotal: employeeCountTotal,
        },
        branches,
        employees,
        leaves,
        attendance: attendanceRows,
        holidays,
      },
      res,
      200,
    );
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

/** Merged landing payload for SuperAdmin editor */
exports.getLandingContent = async (req, res) => {
  try {
    const row = await LandingSiteContent.findOne({ where: { slug: "default" }, raw: true });
    const content = mergeLandingPayload(row?.payload || {});
    return Helper.response(true, "Landing content", { content, updatedAt: row?.updatedAt || null }, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

/** Paginated inbox for public landing contact form */
exports.listContactMessages = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const { count, rows } = await LandingContactSubmission.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });
    const items = rows.map((r) => r.get({ plain: true }));
    return Helper.response(true, "Contact messages", { total: count, items }, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

/** Replace landing payload (full merged object from client) */
exports.saveLandingContent = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== "object") {
      return Helper.response(false, "content object is required.", {}, res, 200);
    }
    const merged = mergeLandingPayload(content);
    const [row, created] = await LandingSiteContent.findOrCreate({
      where: { slug: "default" },
      defaults: { slug: "default", payload: merged },
    });
    if (!created) {
      await row.update({ payload: merged });
    }
    return Helper.response(true, "Landing page saved.", { content: merged }, res, 200);
  } catch (err) {
    return Helper.response(false, err?.message || "Server error.", {}, res, 500);
  }
};

