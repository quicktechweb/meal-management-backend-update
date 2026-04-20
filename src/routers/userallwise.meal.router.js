const express = require("express");
const {
  allwiseCreateUserMeal,
} = require("../controllers/userallwise.meal.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

router.post(
  "/create-user-meal-allwise",
  instituteRequireAuth,
  allwiseCreateUserMeal,
);

module.exports = router;
