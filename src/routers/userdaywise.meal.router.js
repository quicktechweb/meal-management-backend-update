const express = require("express");
const {
  dayWiseUserCreateUserMeal,
  daywiseGetUserMeal,
  daywiseGetAllMeals,
  daywiseGetAllMealsById,
} = require("../controllers/userdaywise.meal.controller");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");
const UserDayWiseMeal = require("../models/userdaywise.meal.model");
const router = express.Router();

router.post(
  "/create-user-meal-daywise",
  instituteRequireAuth,
  dayWiseUserCreateUserMeal,
);

router.get("/daywise-user-meal-list", instituteRequireAuth, daywiseGetUserMeal);

router.get("/daywise-user-meals", daywiseGetAllMeals);

router.get("/daywise-user-meals/:id", daywiseGetAllMealsById);

router.patch("/daywise-user-meal-update/:id", async (req, res) => {
  await UserDayWiseMeal.updateOne(
    { "meals._id": req.params.id },
    { $set: { "meals.$.is_attendance": req.body.is_attendance } },
  );

  res.send({ success: true });
});

module.exports = router;
