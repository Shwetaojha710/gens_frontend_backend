const express = require("express");
const router = express.Router();

const { SuperAdmin } = require("../middleware/auth");
const {
  login,
  forgotPassword,
  resetPassword,
  listTenants,
  updateTenantStatus,
  upsertSubscription,
  subscriptionHistory,
  getStats,
  listPlans,
  createPlan,
  updatePlan,
  togglePlanStatus,
  listUsers,
  updateUser,
  getAnalytics,
  getTenantCompanySnapshot,
  getLandingContent,
  saveLandingContent,
  listContactMessages,
} = require("../controller/superadmin/superadmin");

router.post("/superadmin/login", login);
router.post("/superadmin/forgot-password", forgotPassword);
router.post("/superadmin/reset-password", resetPassword);
router.get("/superadmin/stats", SuperAdmin, getStats);
router.get("/superadmin/plans", SuperAdmin, listPlans);
router.post("/superadmin/plans", SuperAdmin, createPlan);
router.put("/superadmin/plans/:planId", SuperAdmin, updatePlan);
router.patch("/superadmin/plans/:planId/status", SuperAdmin, togglePlanStatus);
router.get("/superadmin/tenants", SuperAdmin, listTenants);
router.patch("/superadmin/tenants/:tenantId/status", SuperAdmin, updateTenantStatus);
router.put("/superadmin/tenants/:tenantId/subscription", SuperAdmin, upsertSubscription);
router.get("/superadmin/tenants/:tenantId/company-snapshot", SuperAdmin, getTenantCompanySnapshot);
router.get("/superadmin/tenants/:tenantId/subscriptions", SuperAdmin, subscriptionHistory);
router.get("/superadmin/users", SuperAdmin, listUsers);
router.put("/superadmin/users/:userId", SuperAdmin, updateUser);
router.get("/superadmin/analytics", SuperAdmin, getAnalytics);
router.get("/superadmin/landing-content", SuperAdmin, getLandingContent);
router.put("/superadmin/landing-content", SuperAdmin, saveLandingContent);
router.get("/superadmin/contact-messages", SuperAdmin, listContactMessages);

module.exports = router;

