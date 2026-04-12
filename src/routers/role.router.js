const express = require("express");
const {
  createRole,
  getRoles,
  assignPermissions,
} = require("../controllers/role.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

router.post("/roles", instituteRequireAuth, createRole);
router.get("/roles/:instituteId", instituteRequireAuth, getRoles);
router.put(
  "/roles/:roleId/permissions",
  instituteRequireAuth,
  assignPermissions,
);

module.exports = router;
