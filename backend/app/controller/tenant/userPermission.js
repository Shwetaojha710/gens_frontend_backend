const User = require("../../models/users");
const UserPermission = require("../../models/userPermission");
const Helper = require("../../helper/helper");

/**
 * GET all active users for the current tenant (admin use).
 */
exports.getTenantUsers = async (req, res) => {
    const tenantId = req.users?.tenantId;
    if (!tenantId) {
        return Helper.response(false, "TenantId required", [], res, 400);
    }
    try {
        const users = await User.findAll({
            where: { tenantId, status: 'active' },
            attributes: ['id', 'name', 'email', 'role'],
            order: [['name', 'ASC']],
            raw: true
        });
        return Helper.response(true, "Users fetched successfully", users, res, 200);
    } catch (err) {
        console.error("getTenantUsers error:", err);
        return Helper.response(false, err?.message || "Internal server error", [], res, 500);
    }
};

/**
 * Save custom sidebar permissions for a specific user.
 * Body: { userId, permissions: PermissionSection[] }
 */
exports.saveUserPermission = async (req, res) => {
    const tenantId = req.users?.tenantId;
    const { userId, permissions } = req.body;

    if (!tenantId || !userId) {
        return Helper.response(false, "userId and tenantId are required", [], res, 400);
    }

    try {
        const existing = await UserPermission.findOne({ where: { userId } });

        if (existing) {
            await existing.update({ permissions: JSON.stringify(permissions) });
        } else {
            await UserPermission.create({
                userId,
                tenantId,
                permissions: JSON.stringify(permissions)
            });
        }

        // Invalidate the user's current session token so they must re-login
        // to pick up the new permissions from the DB
        await User.update({ token: null }, { where: { id: userId, tenantId } });

        return Helper.response(true, "User permissions saved successfully", {}, res, 200);
    } catch (err) {
        console.error("saveUserPermission error:", err);
        return Helper.response(false, err?.message || "Internal server error", [], res, 500);
    }
};

/**
 * Get custom permissions for a specific user.
 * Body: { userId }
 */
exports.getUserPermission = async (req, res) => {
    const tenantId = req.users?.tenantId;
    const { userId } = req.body;

    if (!tenantId || !userId) {
        return Helper.response(false, "userId and tenantId are required", [], res, 400);
    }

    try {
        const record = await UserPermission.findOne({ where: { userId, tenantId } });
        const permissions = record?.permissions ? JSON.parse(record.permissions) : null;
        return Helper.response(true, "User permissions fetched", permissions, res, 200);
    } catch (err) {
        console.error("getUserPermission error:", err);
        return Helper.response(false, err?.message || "Internal server error", [], res, 500);
    }
};

/**
 * Delete custom permissions for a user (revert to role defaults).
 * Body: { userId }
 */
exports.deleteUserPermission = async (req, res) => {
    const tenantId = req.users?.tenantId;
    const { userId } = req.body;

    if (!tenantId || !userId) {
        return Helper.response(false, "userId and tenantId are required", [], res, 400);
    }

    try {
        await UserPermission.destroy({ where: { userId, tenantId } });

        // Invalidate session so user re-logs in with role-default permissions
        await User.update({ token: null }, { where: { id: userId, tenantId } });

        return Helper.response(true, "User permissions reset to role defaults", {}, res, 200);
    } catch (err) {
        console.error("deleteUserPermission error:", err);
        return Helper.response(false, err?.message || "Internal server error", [], res, 500);
    }
};

/**
 * Called during login — returns custom permissions if set, else null.
 * Used internally (not a route), or can be called from login.js
 */
exports.fetchUserPermissionsForLogin = async (userId, tenantId) => {
    try {
        const record = await UserPermission.findOne({ where: { userId, tenantId } });
        return record?.permissions ? JSON.parse(record.permissions) : null;
    } catch {
        return null;
    }
};
