// services/mealLedger.service.js
// cron এ টাকা কাটার ঠিক পরে (একই transaction এর ভেতর) ledger entry বানায়।
const MealDeduction = require("../models/mealDeduction.model");

const pad = (n) => String(n).padStart(2, "0");

// 13*60+0 => "01:00 PM"
function formatMinutes(total) {
  if (typeof total !== "number" || Number.isNaN(total)) return "";
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${pad(h12)}:${pad(m)} ${suffix}`;
}

/**
 * @param {object} p
 * @param {ClientSession} p.session      - cron এর চলমান transaction session
 * @param {string} p.source              - day_wise | all_wise | routine_day_wise | routine_all_wise
 * @param {object} p.userDoc             - টাকা কাটার আগের user document (balance = before)
 * @param {object} p.instituteDoc        - টাকা যোগ হওয়ার পরের institute document
 * @param {ObjectId} p.instituteId       - meal doc এর institute_id
 * @param {object} p.meal                - meal subdocument
 * @param {number} p.amount
 * @param {string} p.dateStr             - "YYYY-MM-DD"
 * @param {string} p.dayName
 * @param {number} p.startMinutes        - corrected start time (minutes)
 */
async function recordMealDeduction({
  session,
  source,
  userDoc,
  instituteDoc,
  instituteId,
  meal,
  amount,
  dateStr,
  dayName,
  startMinutes,
}) {
  const info = userDoc.information || {};
  const instInfo = instituteDoc?.information || {};
  const before = Number(userDoc.balance) || 0;

  const [entry] = await MealDeduction.create(
    [
      {
        user: userDoc._id,
        institute_id: instituteId || userDoc.institute_id,

        user_name: info.full_name || info.nickname || "",
        user_uid: userDoc.uid ?? null,
        user_email: userDoc.email || "",
        user_phone: userDoc.phone || "",
        user_room: info.room_number != null ? String(info.room_number) : "",
        institute_name:
          instInfo.name_of_institute ||
          instInfo.name_of_hall ||
          instInfo.name_of_mess ||
          instInfo.full_name ||
          "",

        meal_type: meal.meal_type,
        meal_date: dateStr,
        day: dayName,
        meal_time: formatMinutes(startMinutes),
        items: (meal.selected_items || []).map((i) => i.title).filter(Boolean),
        guest_quantity: meal.guest_quantity || 0,

        source,

        amount,
        user_balance_before: before,
        user_balance_after: before - amount,
        institute_balance_after: Number(instituteDoc?.balance) || 0,
      },
    ],
    { session },
  );

  return entry;
}

module.exports = { recordMealDeduction, formatMinutes };
