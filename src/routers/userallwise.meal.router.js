const express = require("express");
const {
  allwiseCreateUserMeal,
  allwiseGetUserMeal,
  allwiseGetInsituteUserMeal,
  allwiseFingerprintAttend,
  allwiseGetAllMeals,
} = require("../controllers/userallwise.meal.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");
const UserAllWiseMeal = require("../models/userallwise.meal.model");
const {
  daywiseGetAllMealsById,
} = require("../controllers/userdaywise.meal.controller");

const router = express.Router();

router.post(
  "/create-user-meal-allwise",
  instituteRequireAuth,
  allwiseCreateUserMeal,
);

router.get("/allwise-user-meal-list", instituteRequireAuth, allwiseGetUserMeal);

router.get("/allwise-user-meals", allwiseGetAllMeals);

router.get("/allwise-user-meals/:id", daywiseGetAllMealsById);

router.get("/fingerprint-attend", allwiseFingerprintAttend);

router.get(
  "/allwise-institute-user-meal-order",
  instituteRequireAuth,
  allwiseGetInsituteUserMeal,
);

router.patch("/allwise-user-meal-update/:id", async (req, res) => {
  await UserAllWiseMeal.updateOne(
    { "meals._id": req.params.id },
    { $set: { "meals.$.is_attendance": req.body.is_attendance } },
  );

  res.send({ success: true });
});

module.exports = router;
