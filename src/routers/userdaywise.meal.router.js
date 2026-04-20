const express = require("express");
const {
  dayWiseUserCreateUserMeal,
} = require("../controllers/userdaywise.meal.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

router.post(
  "/create-user-meal-daywise",
  instituteRequireAuth,
  dayWiseUserCreateUserMeal,
);

module.exports = router;
