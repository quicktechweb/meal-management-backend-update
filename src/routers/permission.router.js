const express = require("express");
const router = express.Router();
const {
  getPermissions,
  seedPermissions,
} = require("../controllers/permission.controller");

router.get("/permissions", getPermissions);

router.post("/permissions/seed", seedPermissions);

module.exports = router;
