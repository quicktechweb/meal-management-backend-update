const express = require("express");

const router = express.Router();

const createAdmin  = require("../controllers/superadmin.controller");

router.post("/admin-create", createAdmin);


module.exports = router;
