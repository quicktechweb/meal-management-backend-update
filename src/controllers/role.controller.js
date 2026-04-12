const Role = require("../models/role.model");

// Create Role for a specific Institute
const createRole = async (req, res) => {
  const user = req.user;
  try {
    const { name, permissions } = req.body;

    if (!name || !user?._id) {
      return res
        .status(400)
        .json({ error: "Name and Institute ID are required" });
    }

    const role = await Role.create({
      name,
      institute_id: user?._id,
      permissions: permissions || [],
    });

    res.status(201).json(role);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "This role already exists for this institute." });
    }
    res.status(400).json({ error: err.message });
  }
};

// Get All Roles of a specific Institute
const getRoles = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }

  try {
    const roles = await Role.find({ institute_id: user._id }).populate(
      "permissions",
    );

    if (!roles || roles.length === 0) {
      return res
        .status(404)
        .json({ error: "No roles found for this institute" });
    }

    res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
};

const assignPermissions = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }

  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return res.status(400).json({ error: "permissionIds must be an array" });
    }

    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    if (role.institute_id.toString() !== user._id.toString()) {
      return res.status(403).json({
        error: "Access denied: This role does not belong to your institute",
      });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      roleId,
      { permissions: permissionIds },
      { new: true, runValidators: true },
    ).populate("permissions");

    res.status(200).json({
      success: true,
      data: updatedRole,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
};

module.exports = { createRole, getRoles, assignPermissions };
