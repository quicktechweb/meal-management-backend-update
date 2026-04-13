const express = require("express");
const {
  createRole,
  getRoles,
  assignPermissions,
  deleteRole,
} = require("../controllers/role.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

router.post("/roles", instituteRequireAuth, createRole);
router.get("/roles", instituteRequireAuth, getRoles);

router.delete("/roles/:roleId", instituteRequireAuth, deleteRole);

router.put(
  "/roles/:roleId/permissions",
  instituteRequireAuth,
  assignPermissions,
);

module.exports = router;
