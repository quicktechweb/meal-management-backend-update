const express = require("express");
const getMealTypeLists = require("../controllers/instituteUserMeal.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

router.get("/user-meal-type-lists", instituteRequireAuth, getMealTypeLists);

module.exports = router;
