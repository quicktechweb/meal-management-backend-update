// jobs/allWiseRoutineMealAutoDeductCron.js
const cron = require("node-cron");
const mongoose = require("mongoose");
const UserAllWiseRoutineMeal = require("../models/userallwiseroutine.meal.model");
const InstituteRegistration = require("../models/instituteRegistration.model");
const { deductMaterialsForMeal } = require("../services/materialDeduction.service");

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const CUTOFF_HOURS = 1; // ⏰ meal শুরুর ১ ঘণ্টা আগে কাটবে

function getBDNow() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + 6 * 60 * 60000);
}

function getBDDateString(bdNow) {
  const y = bdNow.getFullYear();
  const m = String(bdNow.getMonth() + 1).padStart(2, "0");
  const d = String(bdNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ✅ NEW: meal_type onujayi ambiguous "H:mm" time ke correct kore 24hr minutes e convert kore
// Breakfast => সকাল (AM), বাকি সব (Lunch/Dinner/Snacks/etc) => দুপুর/বিকাল/রাত (PM) jodi hour 1-11 er moddhe hoy
function getCorrectedStartMinutes(start_time, meal_type) {
  if (typeof start_time !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(start_time.trim());
  if (!match) return null;

  let h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;

  const isBreakfast = /breakfast/i.test(meal_type || "");

  // Hour 1-11 ambiguous — Breakfast na hole PM dhore niye 12 add korbo
  if (!isBreakfast && h >= 1 && h <= 11) {
    h += 12;
  }

  return h * 60 + m;
}

async function processDueAllWiseRoutineMealDeductions() {
  const bdNow = getBDNow();
  const todayDayName = dayNames[bdNow.getDay()];
  const currentMinutes = bdNow.getHours() * 60 + bdNow.getMinutes();
  const todayDateStr = getBDDateString(bdNow);

  console.log(`[ALLWISE-ROUTINE-CRON] BD Time: ${bdNow.toLocaleTimeString()} | Day: ${todayDayName} | Date: ${todayDateStr}`);

  const docs = await UserAllWiseRoutineMeal.find({
    "meals.day": todayDayName,
    "meals.is_on": true,
  });

  console.log(`[ALLWISE-ROUTINE-CRON] Found ${docs.length} document(s) with active meals today`);

  for (const doc of docs) {
    let docChanged = false;

    for (const meal of doc.meals) {
      if (meal.day !== todayDayName || !meal.is_on) continue;
      if (meal.last_deducted_date === todayDateStr) continue; // আজকে already কাটা হয়ে গেছে

      // ✅ CHANGED: ekhon meal_type onujayi corrected start time use hocche
      const startMinutes = getCorrectedStartMinutes(meal.start_time, meal.meal_type);
      if (startMinutes === null) {
        console.error(`[ALLWISE-ROUTINE-CRON] ⚠️ Invalid start_time "${meal.start_time}" for ${meal.meal_type} (user ${doc.user_id}) — skipping`);
        continue;
      }

      const dueMinutes = startMinutes - CUTOFF_HOURS * 60;

      console.log(
        `[ALLWISE-ROUTINE-CRON] Checking ${meal.meal_type} | start_time(raw): ${meal.start_time} | correctedStartMinutes: ${startMinutes} | dueMinutes: ${dueMinutes} | currentMinutes: ${currentMinutes} | willDeduct: ${currentMinutes >= dueMinutes}`
      );

      if (currentMinutes < dueMinutes) continue;

      const amount = meal.total_price || 0; // ⬅️ package_price না, total_price
      if (amount <= 0) {
        meal.last_deducted_date = todayDateStr;
        meal.balance_deducted = true;
        docChanged = true;
        continue;
      }

      const session = await mongoose.startSession();
      try {
        session.startTransaction();

        const userDoc = await InstituteRegistration.findById(doc.user_id).session(session);

        if (!userDoc || userDoc.balance < amount) {
          console.log(`[ALLWISE-ROUTINE-CRON] ❌ Insufficient balance for user ${doc.user_id}, turning meal OFF`);
          meal.is_on = false;
          await session.abortTransaction();
        } else {
          await InstituteRegistration.findByIdAndUpdate(
            doc.user_id,
            { $inc: { balance: -amount } },
            { session },
          );
          await InstituteRegistration.findByIdAndUpdate(
            doc.institute_id,
            { $inc: { balance: +amount } },
            { session },
          );

          // ✅ MOVED: material deduction commit-er age, same transaction e
          const matResults = await deductMaterialsForMeal(meal, session);
          console.log(`✅ Material deducted for ${meal.meal_type}:`, matResults);

          meal.last_deducted_date = todayDateStr;
          meal.balance_deducted = true;
          meal.deduction_history.push({ date: todayDateStr, amount });
          doc.markModified("meals");
          console.log(`[ALLWISE-ROUTINE-CRON] ✅ Deducted ${amount} from user ${doc.user_id}, credited to institute ${doc.institute_id}`);

          await session.commitTransaction();
        }
        docChanged = true;
      } catch (err) {
        await session.abortTransaction();
        console.error(`[ALLWISE-ROUTINE-CRON] Deduction failed for ${doc.user_id} / ${meal.meal_type}:`, err.message);
      } finally {
        session.endSession();
      }
    }

    if (docChanged) await doc.save();
  }
}

cron.schedule("* * * * *", () => {
  processDueAllWiseRoutineMealDeductions().catch((err) => console.error("AllWise Routine deduct cron error:", err));
});

module.exports = { processDueAllWiseRoutineMealDeductions };