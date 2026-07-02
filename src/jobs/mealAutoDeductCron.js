// jobs/mealAutoDeductCron.js
const cron = require("node-cron");
const mongoose = require("mongoose");
const UserDayWiseMeal = require("../models/userdaywise.meal.model");
const InstituteRegistration = require("../models/instituteRegistration.model");
const Institutemealonofftime = require("../models/institutemealonoff.model");

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const CUTOFF_HOURS = 1; // ⏰ meal শুরুর ১ ঘণ্টা আগে কাটবে (hardcoded)

// ── Bangladesh time বের করার ফাংশন (server timezone যাই হোক না কেন) ──
function getBDNow() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000; // UTC এ আনো
  return new Date(utcMs + 6 * 60 * 60000); // +6 ঘণ্টা যোগ করো (BD time)
}

// ── আজকের তারিখ "YYYY-MM-DD" ফরম্যাটে (BD time অনুযায়ী) ──
function getBDDateString(bdNow) {
  const y = bdNow.getFullYear();
  const m = String(bdNow.getMonth() + 1).padStart(2, "0");
  const d = String(bdNow.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function processDueMealDeductions() {
  const bdNow = getBDNow();
  const todayDayName = dayNames[bdNow.getDay()];
  const currentMinutes = bdNow.getHours() * 60 + bdNow.getMinutes();
  const todayDateStr = getBDDateString(bdNow);

  console.log(`[CRON] BD Time: ${bdNow.toLocaleTimeString()} | Day: ${todayDayName} | Date: ${todayDateStr} | currentMinutes: ${currentMinutes}`);

  // ⚠️ balance_deducted দিয়ে filter করা হচ্ছে না — কারণ সেটা আর "আজকে কাটা হয়েছে কিনা" বোঝায় না।
  // last_deducted_date দিয়ে ইনকোড/স্কিপ লজিক নিচে হ্যান্ডেল করা হচ্ছে।
  const docs = await UserDayWiseMeal.find({
    "meals.day": todayDayName,
    "meals.is_on": true,
  });

  console.log(`[CRON] Found ${docs.length} document(s) with active meals today`);

  for (const doc of docs) {
    let docChanged = false;

    for (const meal of doc.meals) {
      if (meal.day !== todayDayName || !meal.is_on) continue;

      // ✅ আজকে ইতিমধ্যে কাটা হয়ে গেছে? তাহলে স্কিপ — ডাবল-ডিডাকশন প্রটেকশন
      if (meal.last_deducted_date === todayDateStr) continue;

      const [h, m] = meal.start_time.split(":").map(Number);
      const startMinutes = h * 60 + m;
      const dueMinutes = startMinutes - CUTOFF_HOURS * 60; // start_time - 1 hour

      console.log(
        `[CRON] Checking ${meal.meal_type} | start_time: ${meal.start_time} (${startMinutes}min) | dueMinutes: ${dueMinutes} | currentMinutes: ${currentMinutes} | willDeduct: ${currentMinutes >= dueMinutes}`
      );

      if (currentMinutes < dueMinutes) continue; // এখনো সময় হয়নি

      const amount = meal.package_price || 0;
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
          console.log(`[CRON] ❌ Insufficient balance for user ${doc.user_id}, turning meal OFF`);
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
          meal.last_deducted_date = todayDateStr; // ⬅️ আজকের তারিখ সেভ, পরের সপ্তাহে date বদলে যাবে তাই আবার eligible হবে
          meal.balance_deducted = true;
          console.log(`[CRON] ✅ Deducted ${amount} from user ${doc.user_id}, credited to institute ${doc.institute_id}`);
          await session.commitTransaction();
        }
        docChanged = true;
      } catch (err) {
        await session.abortTransaction();
        console.error(`[CRON] Deduction failed for ${doc.user_id} / ${meal.meal_type}:`, err.message);
      } finally {
        session.endSession();
      }
    }

    if (docChanged) await doc.save();
  }
}

// ⚠️ resetPassedMealDeductions() সম্পূর্ণ মুছে ফেলা হয়েছে — last_deducted_date এখন
// নিজে থেকেই পরের দিনে/সপ্তাহে re-eligible করে দেয়, তাই আলাদা reset cron আর দরকার নেই।

cron.schedule("* * * * *", () => {
  processDueMealDeductions().catch((err) => console.error("Deduct cron error:", err));
});

module.exports = { processDueMealDeductions };