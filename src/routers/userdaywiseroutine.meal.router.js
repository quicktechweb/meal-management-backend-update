const express = require("express");

const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");
const UserDayWiseRoutineMeal = require("../models/userdaywiseroutine.meal.model");
const {
  dayWiseUserRoutineCreateUserMeal,
  daywiseRoutineGetUserMeal,
  daywiseRoutineGetAllMeals,
  daywiseRoutineGetAllMealsById,
  daywiseinstituteRoutineGetUserMeal,
} = require("../controllers/userdaywiseroutine.meal.controller");
const router = express.Router();

router.post(
  "/create-user-routine-meal-daywise",
  instituteRequireAuth,
  dayWiseUserRoutineCreateUserMeal,
);

router.get(
  "/daywise-user-routine-meal-list",
  instituteRequireAuth,
  daywiseRoutineGetUserMeal,
);

router.get("/daywise-user-routine-meals", daywiseRoutineGetAllMeals);

router.get("/daywise-user-routine-meals/:id", daywiseRoutineGetAllMealsById);
router.get("/daywise-institute-user-routine-meals/:id", daywiseinstituteRoutineGetUserMeal);

router.patch("/daywise-user-routine-meal-update/:id", async (req, res) => {
  await UserDayWiseRoutineMeal.updateOne(
    { "meals._id": req.params.id },
    { $set: { "meals.$.is_attendance": req.body.is_attendance } },
  );

  res.send({ success: true });
});

module.exports = router;
