const express = require("express");

const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");
const UserAllWiseRoutineMeal = require("../models/userallwiseroutine.meal.model");

const {
  allwiseRoutineCreateUserMeal,
  allwiseRoutineGetUserMeal,
  allwiseRoutineGetAllMeals,
  allwiseRoutineGetAllMealsById,
  allwiseRoutineGetInsituteUserMeal,
} = require("../controllers/userallwiseroutine.meal.controller");

const router = express.Router();

router.post(
  "/create-user-meal-allwise-routine",
  instituteRequireAuth,
  allwiseRoutineCreateUserMeal,
);

router.get(
  "/allwise-user-meal-list-routine",
  instituteRequireAuth,
  allwiseRoutineGetUserMeal,
);

router.get("/allwiseroutine-user-meals", allwiseRoutineGetAllMeals);

router.get("/allwiseroutine-user-meals/:id", allwiseRoutineGetAllMealsById);



router.get(
  "/allwiseroutine-institute-user-meal-order",
  instituteRequireAuth,
  allwiseRoutineGetInsituteUserMeal,
);

router.patch("/allwise-user-meal-update/:id", async (req, res) => {
  await UserAllWiseRoutineMeal.updateOne(
    { "meals._id": req.params.id },
    { $set: { "meals.$.is_attendance": req.body.is_attendance } },
  );

  res.send({ success: true });
});

module.exports = router;
