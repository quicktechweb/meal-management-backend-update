const express = require("express");
const {
  allwiseCreateUserMeal,
  allwiseGetUserMeal,
  allwiseGetInsituteUserMeal,
} = require("../controllers/userallwise.meal.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

const router = express.Router();

router.post(
  "/create-user-meal-allwise",
  instituteRequireAuth,
  allwiseCreateUserMeal,
);

router.get("/allwise-user-meal-list", instituteRequireAuth, allwiseGetUserMeal);

router.get(
  "/allwise-institute-user-meal-order",
  instituteRequireAuth,
  allwiseGetInsituteUserMeal,
);

module.exports = router;
