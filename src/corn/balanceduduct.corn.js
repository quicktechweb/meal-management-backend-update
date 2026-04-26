const cron = require("node-cron");
const UserAllWiseMeal = require("../models/userallwise.meal.model");
const InstituteRegistration = require("../models/instituteRegistration.model");
const Institutemealonofftime = require("../models/institutemealonoff.model");

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// ──  run  ──
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayDayName = dayNames[now.getDay()];

    //  meal is_on:true , balance_deducted:false
    const docs = await UserAllWiseMeal.find({
      meals: {
        $elemMatch: {
          day: todayDayName,
          is_on: true,
          balance_deducted: { $ne: true },
        },
      },
    });

    for (const doc of docs) {
      const mealOnOffDoc = await Institutemealonofftime.findOne({
        institute_id: doc.institute_id,
      });
      const meal_on_off_time = mealOnOffDoc?.meal_on_off_time ?? 1;

      for (const meal of doc.meals) {
        if (
          meal.day !== todayDayName ||
          !meal.is_on ||
          meal.balance_deducted === true
        )
          continue;

        const [hours, minutes] = meal.start_time.split(":").map(Number);
        const startMinutes = hours * 60 + minutes;
        const cutoffMinutes = startMinutes - meal_on_off_time * 60;

        if (currentMinutes >= cutoffMinutes) {
          const price = Number(meal.package_price) || 0;

          if (price > 0) {
            const currentUser = await InstituteRegistration.findById(
              doc.user_id,
            ).select("balance");

            if (!currentUser || (currentUser.balance ?? 0) < price) {
              console.log(
                `Insufficient balance for user ${doc.user_id}, meal: ${meal.meal_type} on ${meal.day}`,
              );

              await UserAllWiseMeal.updateOne(
                { _id: doc._id, "meals._id": meal._id },
                {
                  $set: {
                    "meals.$.is_on": false,
                    "meals.$.balance_deducted": true,
                  },
                },
              );
              continue;
            }

            await InstituteRegistration.findByIdAndUpdate(doc.user_id, {
              $inc: { balance: -price },
            });
          }

          // balance_deducted true করো
          await UserAllWiseMeal.updateOne(
            { _id: doc._id, "meals._id": meal._id },
            { $set: { "meals.$.balance_deducted": true } },
          );

          console.log(
            `Balance deducted: ${price} for user ${doc.user_id}, meal: ${meal.meal_type} on ${meal.day}`,
          );
        }
      }
    }
  } catch (error) {
    console.error("Balance deduct cron error:", error);
  }
});

cron.schedule("0 0 * * *", async () => {
  try {
    const todayDayName = dayNames[new Date().getDay()];

    await UserAllWiseMeal.updateMany(
      { "meals.day": todayDayName },
      { $set: { "meals.$[elem].balance_deducted": false } },
      { arrayFilters: [{ "elem.day": todayDayName }] },
    );

    console.log(`Balance deducted reset for ${todayDayName}`);
  } catch (error) {
    console.error("Balance reset cron error:", error);
  }
});
