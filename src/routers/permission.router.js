const express = require("express");
const router = express.Router();
const {
  getPermissions,
  seedPermissions,
} = require("../controllers/permission.controller");

const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

router.get("/permissions", instituteRequireAuth, getPermissions);

router.post("/permissions/seed", seedPermissions);

module.exports = router;
