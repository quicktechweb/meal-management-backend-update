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
const UserAllWiseRoutineMeal = require("../models/userallwiseroutine.meal.model");
const {
  daywiseGetAllMealsById,
} = require("../controllers/userdaywise.meal.controller");

const cron = require("node-cron");

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

router.get("/global-all-wise-user-meal", async (req, res) => {
  const [dayWiseMealList, dayWiseMealRoutineList] = await Promise.all([
    UserAllWiseMeal.find()
      .populate("institute_id", "information.name_of_institute")
      .lean(),
    UserAllWiseRoutineMeal.find()
      .populate("institute_id", "information.name_of_institute")
      .lean(),
  ]);

  const combined = [...dayWiseMealList, ...dayWiseMealRoutineList];

  res.json(combined);
});

// cron.schedule("* * * * *", async () => {
//   const now = new Date();
//   const currentMinutes = now.getHours() * 60 + now.getMinutes();

//   const dayNames = [
//     "Sunday",
//     "Monday",
//     "Tuesday",
//     "Wednesday",
//     "Thursday",
//     "Friday",
//     "Saturday",
//   ];
//   const todayDayName = dayNames[now.getDay()];

//   const docs = await UserAllWiseMeal.find({
//     "meals.day": todayDayName,
//     "meals.is_on": true,
//     "meals.balance_deducted": false,
//   });

//   console.log(docs);

//   for (const doc of docs) {
//     const mealOnOffDoc = await Institutemealonofftime.findOne({
//       institute_id: doc.institute_id,
//     });
//     const meal_on_off_time = mealOnOffDoc?.meal_on_off_time ?? 1;

//     for (const meal of doc.meals) {
//       if (meal.day !== todayDayName || !meal.is_on || meal.balance_deducted)
//         continue;

//       const [hours, minutes] = meal.start_time.split(":").map(Number);
//       const startMinutes = hours * 60 + minutes;
//       const cutoffMinutes = startMinutes - meal_on_off_time * 60;

//       if (currentMinutes >= cutoffMinutes) {
//         const price = Number(meal.package_price) || 0;

//         if (price > 0) {
//           await InstituteRegistration.findByIdAndUpdate(doc.user_id, {
//             $inc: { balance: -price },
//           });
//         }

//         await UserAllWiseMeal.updateOne(
//           { _id: doc._id, "meals._id": meal._id },
//           { $set: { "meals.$.balance_deducted": true } },
//         );
//       }
//     }
//   }
// });

module.exports = router;
