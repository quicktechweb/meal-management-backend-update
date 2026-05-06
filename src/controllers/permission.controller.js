const Permission = require("../models/permission.model");

const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find().sort({ module: 1 });
    res.json({
      data: permissions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const seedPermissions = async (req, res) => {
  try {
    const { PERMISSIONS } = require("../config/permissions");

    await Permission.deleteMany({});
    const data = await Permission.insertMany(PERMISSIONS);
    res.status(201).json({ message: "Permissions Seeded!", data: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getPermissions, seedPermissions };
