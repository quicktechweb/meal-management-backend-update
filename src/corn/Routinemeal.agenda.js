const Agenda = require("agenda");
const UserAllWiseRoutineMeal = require("../models/userallwiseroutine.meal.model");
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

const agenda = new Agenda({
  db: {
    address: process.env.MONGO_URL,
    collection: "agendaJobs",
  },
  processEvery: "1 minute",
});

// ── Job 1: Balance Deduct (every minute) ──
agenda.define("routine meal balance deduct", async (job) => {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayDayName = dayNames[now.getDay()];

    const docs = await UserAllWiseRoutineMeal.find({
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
          const price = Number(meal.total_price) || 0;

          if (price > 0) {
            const currentUser = await InstituteRegistration.findById(
              doc.user_id,
            ).select("balance");

            // ✅ Insufficient balance → is_on false করো
            if (!currentUser || (currentUser.balance ?? 0) < price) {
              console.log(
                `[RoutineMeal] Insufficient balance for user ${doc.user_id}, meal: ${meal.meal_type} on ${meal.day}`,
              );

              await UserAllWiseRoutineMeal.updateOne(
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

            // ✅ Balance deduct করো
            await InstituteRegistration.findByIdAndUpdate(doc.user_id, {
              $inc: { balance: -price },
            });
          }

          // ✅ balance_deducted true করো
          await UserAllWiseRoutineMeal.updateOne(
            { _id: doc._id, "meals._id": meal._id },
            { $set: { "meals.$.balance_deducted": true } },
          );

          console.log(
            `[RoutineMeal] Balance deducted: ${price} for user ${doc.user_id}, meal: ${meal.meal_type} on ${meal.day}`,
          );
        }
      }
    }
  } catch (error) {
    console.error("[RoutineMeal] Balance deduct job error:", error);
  }
});

// ── Job 2: Daily Reset (midnight) ──
agenda.define("routine meal daily reset", async (job) => {
  try {
    const todayDayName = dayNames[new Date().getDay()];

    await UserAllWiseRoutineMeal.updateMany(
      { "meals.day": todayDayName },
      { $set: { "meals.$[elem].balance_deducted": false } },
      { arrayFilters: [{ "elem.day": todayDayName }] },
    );

    console.log(`[RoutineMeal] Balance deducted reset for ${todayDayName}`);
  } catch (error) {
    console.error("[RoutineMeal] Balance reset job error:", error);
  }
});

// ── Agenda start ──
const startAgenda = async () => {
  await agenda.start();

  // পুরনো jobs আগে cancel করো — duplicate এড়াতে
  await agenda.cancel({ name: "routine meal balance deduct" });
  await agenda.cancel({ name: "routine meal daily reset" });

  // প্রতি মিনিটে balance deduct check
  await agenda.every("1 minute", "routine meal balance deduct");

  // প্রতিদিন রাত 12:00 তে reset
  await agenda.every("0 0 * * *", "routine meal daily reset");

  console.log("[Agenda] Routine meal jobs scheduled");
};

// ── Graceful shutdown ──
process.on("SIGTERM", async () => {
  await agenda.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await agenda.stop();
  process.exit(0);
});

module.exports = { startAgenda };
