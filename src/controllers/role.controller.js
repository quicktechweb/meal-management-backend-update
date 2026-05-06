const Role = require("../models/role.model");
const DEFAULT_ROLE_PERMISSIONS = require("../config/permissions");
const Permission = require("../models/permission.model");

// Create Role for a specific Institute
// const createRole = async (req, res) => {
//   const user = req.user;
//   try {
//     const { name, permissions } = req.body;

//     if (!name || !user?._id) {
//       return res
//         .status(400)
//         .json({ error: "Name and Institute ID are required" });
//     }

//     const role = await Role.create({
//       name: name.toLowerCase(),
//       institute_id: user?._id,
//       permissions: permissions || [],
//     });

//     res.status(201).json({
//       success: true,
//       message: "Role created Successfully",
//       role: role,
//     });
//   } catch (err) {
//     if (err.code === 11000) {
//       return res
//         .status(400)
//         .json({ message: "This role already exists for this institute." });
//     }
//     res.status(400).json({ error: err.message });
//   }
// };

const createRole = async (req, res) => {
  const user = req.user;
  try {
    const { name, permissions } = req.body;

    if (!name || !user?._id) {
      return res
        .status(400)
        .json({ error: "Name and Institute ID are required" });
    }

    const normalizedName = name.toLowerCase();

    // ── Default permissions resolve করো ──
    let resolvedPermissionIds = permissions || [];

    const defaultSlugs = DEFAULT_ROLE_PERMISSIONS[normalizedName];

    if (defaultSlugs && resolvedPermissionIds.length === 0) {
      let defaultPerms;

      if (defaultSlugs.includes("all")) {
        defaultPerms = await Permission.find({}, "_id");
      } else {
        defaultPerms = await Permission.find(
          { slug: { $in: defaultSlugs } },
          "_id",
        );
      }

      resolvedPermissionIds = defaultPerms.map((p) => p._id);
    }

    const role = await Role.create({
      name: normalizedName,
      institute_id: user._id,
      permissions: resolvedPermissionIds,
    });

    res.status(201).json({
      success: true,
      message: "Role created successfully",
      role,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "This role already exists for this institute." });
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
    const filteredRoles = roles.filter((role) => role.name !== user?.role);

    if (!roles || roles.length === 0) {
      return res
        .status(404)
        .json({ error: "No roles found for this institute" });
    }

    res.status(200).json({
      success: true,
      count: roles.length,
      data: filteredRoles,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
};

const deleteRole = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }

  try {
    const { roleId } = req.params;

    // Find role
    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Institute ownership check
    if (role.institute_id.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Access denied: This role does not belong to your institute",
      });
    }

    if (role.name.toLowerCase() === "admin") {
      return res.status(400).json({
        message: "Admin role cannot be deleted",
      });
    }

    await Role.findByIdAndDelete(roleId);

    res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error",
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
      message: "Permission assigned successfully",
      data: updatedRole,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      details: err.message,
    });
  }
};

module.exports = { createRole, getRoles, assignPermissions, deleteRole };
