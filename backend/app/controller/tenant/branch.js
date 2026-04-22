const Helper = require("../../helper/helper");
const branch = require("../../models/branch");

exports.createBranch = async (req, res) => {
  const { name, status, longitude, latitude,description } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!tenantId || !name) {
      return Helper.response(
        false,
        "Tenant ID and name are required",
        [],
        res,
        400,
      );
    }
    if (!longitude || !latitude) {
      return Helper.response(
        false,
        "longitude and latitude are required",
        [],
        res,
        400,
      );
    }
    const existing = await branch.findOne({ where: { name, tenantId } });
    if (existing) {
      return Helper.response(false, "Branch with this name already exists", [], res, 409);
    }

    const imageFile = req.files && req.files.find((f) => f.fieldname == "image");
    const image = imageFile ? imageFile.filename : null;
    const newbranch = await branch.create({
      tenantId,
      name,
      latitude,
      longitude,
      image,
      description:description || null,
      status: status || "active",
      createdBy: req.users && req.users.id,
      updatedBy: req.users && req.users.id,
    });
    return Helper.response(
      true,
      "branch created successfully",
      newbranch,
      res,
      201,
    );
  } catch (error) {
    console.error("Error creating branch:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.getBranch = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { name } = req.body || {};
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant Id is required", [], res, 400);
    }
    if (name) {
      const branchs = await branch.findOne({
        where: { name, tenantId },
      });
      if (!branchs) {
        return Helper.response(false, "branch not found", [], res, 404);
      }
      // Format date and time in IST
      const formattedbranch = {
        ...branchs.toJSON(),
        createdAt: Helper.formatToIST(branchs.createdAt, "YYYY-MM-DD HH:mm:ss"),
      };
      return Helper.response(
        true,
        "branch fetched successfully",
        formattedbranch,
        res,
        200,
      );
    } else {
      const branchs = await branch.findAll({
        where: { tenantId },
        order: [["createdAt", "DESC"]],
      });

      const data = branchs.map((dept) => ({
        ...dept.toJSON(),
        createdAt: Helper.formatToIST(dept.createdAt, "YYYY-MM-DD HH:mm:ss"),
      }));
      return Helper.response(
        true,
        "branchs fetched successfully",
        data,
        res,
        200,
      );
    }
  } catch (error) {
    console.error("Error fetching branchs:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.updateBranch = async (req, res) => {
  const { id, name, status, latitude, longitude,description } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "branch ID and Tenant ID are required",
        [],
        res,
        400,
      );
    }
    const branchs = await branch.findOne({ where: { id, tenantId } });
    if (!branchs) {
      return Helper.response(false, "branch not found", [], res, 404);
    }
    if (!name) {
      return Helper.response(false, "Name Is Required", [], res, 404);
    }

    const duplicate = await branch.findOne({ where: { name, tenantId } });
    if (duplicate && duplicate.id !== id) {
      return Helper.response(false, "Branch with this name already exists", [], res, 409);
    }

    const imageFile = req.files && req.files.find((f) => f.fieldname == "image");
    branchs.name = name || branchs.name;
    branchs.latitude = latitude || branchs.latitude;
    branchs.longitude = longitude || branchs.longitude;
    branchs.status = status || branchs.status;
    branchs.description = description || branchs.description;
    branchs.image = imageFile ? imageFile.filename  : branchs.image;
    branchs.updatedBy = req.users && req.users.id;

    await branchs.save();
    return Helper.response(
      true,
      "branch updated successfully",
      branchs,
      res,
      200,
    );
  } catch (error) {
    console.error("Error updating branch:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};

exports.deleteBranch = async (req, res) => {
  const { id } = req.body;
  const tenantId = req.users && req.users.tenantId;
  try {
    if (!id || !tenantId) {
      return Helper.response(
        false,
        "branch ID and Tenant ID are required",
        [],
        res,
        400,
      );
    }
    const branchs = await branch.findOne({ where: { id, tenantId } });
    if (!branchs) {
      return Helper.response(false, "branch not found", [], res, 404);
    }
    await branchs.destroy();
    return Helper.response(true, "branch deleted successfully", [], res, 200);
  } catch (error) {
    console.error("Error deleting branch:", error);
    return Helper.response(false, error?.message, [], res, 500);
  }
};

exports.branchDD = async (req, res) => {
  const tenantId = req.users && req.users.tenantId;
  const { name } = req.body || {};
  try {
    if (!tenantId) {
      return Helper.response(false, "Tenant ID is required", [], res, 400);
    }
    if (name) {
      const branchs = await branch.findOne({
        where: { name, tenantId },
      });
      if (!branchs) {
        return Helper.response(false, "branch not found", [], res, 404);
      }
      return Helper.response(
        true,
        "branch fetched successfully",
        branchs,
        res,
        200,
      );
    } else {
      const branchs = await branch.findAll({
        where: { tenantId },
        order: [["name", "ASC"]],
      });

      const data = branchs
        .map((branch) => ({
          id: branch.id,
          name: branch.name??null,
          image: branch.image??null,
          longitude: branch.longitude??null,
          latitude: branch.latitude??null,
          description: branch.description ?? "Central administration and monitoring access.",
        }))
        .sort((a, b) => (a.name === "Lucknow" ? -1 : 1));

      return Helper.response(
        true,
        "branchs fetched successfully",
        data,
        res,
        200,
      );
    }
  } catch (error) {
    console.error("Error fetching branchs:", error);
    return Helper.response(false, "Internal server error", [], res, 500);
  }
};
