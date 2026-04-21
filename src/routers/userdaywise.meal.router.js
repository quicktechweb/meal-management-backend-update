const express = require("express");
const {
  dayWiseUserCreateUserMeal,
  daywiseGetUserMeal,
} = require("../controllers/userdaywise.meal.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

router.post(
  "/create-user-meal-daywise",
  instituteRequireAuth,
  dayWiseUserCreateUserMeal,
);

router.get("/daywise-user-meal-list", instituteRequireAuth, daywiseGetUserMeal);

module.exports = router;
