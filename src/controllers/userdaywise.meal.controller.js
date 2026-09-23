const UserDayWiseMeal = require("../models/userdaywise.meal.model");
const UserAllWiseMeal = require("../models/userallwise.meal.model");
const Institutemealonofftime = require("../models/institutemealonoff.model");
const InstituteRegistration = require("../models/instituteRegistration.model");
const UserDayWiseOrder = require("../models/UserDayWiseOrder.model");

const formatCutoff = require("../config/formatCutoff");

const checkMealTimeStatus = require("../config/checkMealTimeStatus");
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

// ─────────────────────────────────────────────────────────────────────────────
// Day Wise = নির্দিষ্ট তারিখের (date) জন্য override।
//  - "All" হলো প্রতি সপ্তাহে চলতে থাকা baseline।
//  - Day Wise এ কোনো তারিখের meal baseline থেকে আলাদা হলেই শুধু override হিসেবে save হয়।
//  - baseline এর সমান হলে override মুছে যায়, তাই পরের সপ্তাহে আবার All ই চলে।
// ─────────────────────────────────────────────────────────────────────────────
// item গুলোর title বের করে (nested array হলেও)
const collectTitles = (x) => {
  if (Array.isArray(x)) return x.flatMap(collectTitles);
  if (x && typeof x === "object") return x.title ? [String(x.title)] : [];
  return [];
};
const titleKey = (arr) => collectTitles(arr).sort().join("|");
const hasEmpty = (arr) => !Array.isArray(arr) || arr.some((x) => !x);

// incoming meal টা All (baseline) এর সাথে হুবহু এক কিনা
const sameAsBaseline = (inc, base) => {
  const incOn = inc.is_on === true;
  const baseOn = base?.is_on === true;
  if (incOn !== baseOn) return false;
  if (!incOn) return true; // দুইটাই OFF — items নিয়ে ভাবার দরকার নেই
  if (!base) return false;
  if (!!inc.is_alternative !== !!base.is_alternative) return false;
  if (Number(inc.guest_quantity || 0) !== Number(base.guest_quantity || 0))
    return false;
  if (
    !hasEmpty(inc.selected_items) &&
    titleKey(inc.selected_items) !== titleKey(base.selected_items)
  )
    return false;
  if (
    Number(inc.guest_quantity || 0) > 0 &&
    !hasEmpty(inc.guest_items) &&
    titleKey(inc.guest_items) !== titleKey(base.guest_items)
  )
    return false;
  return true;
};

const dayWiseUserCreateUserMeal = async (req, res) => {
  try {
    const { type, meals, routine_type } = req.body;

    const user = req.user;
    const user_id = user?._id;
    const institute_id = user?.institute_id;
    const uid = user?.uid;

    if (!user_id || !institute_id || !type || !meals?.length) {
      return res.status(400).json({
        success: false,
        message: "user_id, institute_id, type and meals Required",
      });
    }

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const now = getBDNow();
    const todayDateStr = getBDDateString(now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // আজ থেকে পরের ৬ দিন পর্যন্ত valid date → weekday map
    const validDates = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      validDates[getBDDateString(d)] = dayNames[d.getDay()];
    }

    const mealOnOffDoc = await Institutemealonofftime.findOne({ institute_id });
    const meal_on_off_time = mealOnOffDoc?.meal_on_off_time ?? 6;

    const existingDoc = await UserDayWiseMeal.findOne({
      user_id,
      institute_id,
      type,
      routine_type,
      uid,
    });

    // All (baseline) meals
    const allWiseDoc = await UserAllWiseMeal.findOne({ user_id, institute_id });
    const allWiseObj = allWiseDoc?.toObject();
    const getBaseline = (day, meal_type) =>
      allWiseObj?.meals?.find((m) => m.day === day && m.meal_type === meal_type);

    const newOverrides = [];
    const incomingKeys = new Set();
    const errors = [];

    let totalDeduct = 0;
    let totalInstituteDelta = 0;
    const balanceOps = [];
    const allWiseRefunds = []; // All এর কাটা টাকা, আজকের override OFF এ ফেরত

    for (const incomingMeal of meals) {
      const { date, day, meal_type } = incomingMeal;
      const is_on = incomingMeal.is_on === true;

      // date না থাকলে / ৭ দিনের বাইরে হলে বাদ
      if (!date || !validDates[date] || validDates[date] !== day) continue;

      incomingKeys.add(`${date}__${meal_type}`);

      const dbMeal = existingDoc?.meals?.find(
        (m) => m.date === date && m.meal_type === meal_type,
      );
      const baseMeal = getBaseline(day, meal_type);
      const baseOn = baseMeal?.is_on === true;

      const start_time = dbMeal
        ? dbMeal.start_time
        : (baseMeal?.start_time ?? incomingMeal.start_time);
      const end_time = dbMeal
        ? dbMeal.end_time
        : (baseMeal?.end_time ?? incomingMeal.end_time);
      const package_price =
        dbMeal?.package_price ??
        baseMeal?.package_price ??
        incomingMeal.package_price ??
        0;

      // এই তারিখে এখন কার্যকর অবস্থা (override থাকলে সেটা, নাহলে All এর)
      const effectiveNow = dbMeal ? dbMeal.is_on === true : baseOn;
      const isOnChanging = is_on !== effectiveNow;
      const isToday = date === todayDateStr;

      // ─── Time-zone check (শুধু আজকের জন্য) ───
      if (isOnChanging && isToday) {
        const { zone, startMinutes } = checkMealTimeStatus(
          start_time,
          end_time,
          meal_on_off_time,
          currentMinutes,
        );

        if (zone === "meal_over") {
          errors.push({
            day,
            date,
            meal_type,
            start_time,
            end_time,
            status: "meal_over",
            message: `${meal_type} is already over (ended at ${end_time})`,
          });
          continue;
        }

        if (zone === "time_over") {
          errors.push({
            day,
            date,
            meal_type,
            start_time,
            end_time,
            status: "time_over",
            message: `${meal_type} on/off is locked after ${formatCutoff(startMinutes, meal_on_off_time)}`,
          });
          continue;
        }
      }

      // ─── Balance logic ───
      const wasOn = dbMeal?.is_on === true;
      const wasDeductedToday = dbMeal?.last_deducted_date === todayDateStr;
      let balance_deducted = dbMeal?.balance_deducted ?? false;
      let last_deducted_date = dbMeal?.last_deducted_date ?? null;

      if (!is_on && wasOn && wasDeductedToday) {
        // override ON ছিল, আজ কাটাও হয়েছে — OFF করায় ফেরত
        totalDeduct -= package_price;
        totalInstituteDelta -= package_price;
        balance_deducted = false;
        last_deducted_date = null;
        balanceOps.push({ day, date, meal_type, op: "refund", amount: package_price });
      } else if (
        !is_on &&
        !dbMeal &&
        baseOn &&
        isToday &&
        baseMeal?.last_deducted_date === todayDateStr
      ) {
        // All এর meal আজ কাটা হয়ে গেছে, এখন শুধু আজকের জন্য OFF — ফেরত
        totalDeduct -= package_price;
        totalInstituteDelta -= package_price;
        allWiseRefunds.push({ day, meal_type });
        balanceOps.push({ day, date, meal_type, op: "refund", amount: package_price });
      }

      // ─── Override রাখবো কিনা ───
      if (sameAsBaseline({ ...incomingMeal, is_on }, baseMeal)) {
        // All এর হুবহু সমান → override দরকার নেই।
        // তবে আজ কাটা হয়ে থাকলে (double deduction ঠেকাতে) রেখে দাও।
        if (dbMeal && last_deducted_date === todayDateStr) {
          newOverrides.push({
            ...dbMeal.toObject(),
            ...incomingMeal,
            is_on,
            date,
            balance_deducted,
            last_deducted_date,
            deduction_history: dbMeal?.deduction_history ?? [],
          });
        }
        continue;
      }

      newOverrides.push({
        ...incomingMeal,
        is_on,
        date,
        start_time,
        end_time,
        package_price,
        balance_deducted,
        last_deducted_date,
        deduction_history: dbMeal?.deduction_history ?? [],
      });
    }

    // ✅ কোনো error থাকলে DB update হবে না
    if (errors.length > 0) {
      return res.status(409).json({
        success: false,
        message: errors.map((e) => e.message).join(", "),
        errors,
      });
    }

    // ─── Balance atomic update (শুধু refund) ───
    if (totalDeduct !== 0) {
      await InstituteRegistration.findByIdAndUpdate(user_id, {
        $inc: { balance: -totalDeduct },
      });
    }
    if (totalInstituteDelta !== 0) {
      await InstituteRegistration.findByIdAndUpdate(institute_id, {
        $inc: { balance: totalInstituteDelta },
      });
    }

    // All এর meal এ "আজ কাটা হয়েছে" mark মুছে দাও
    for (const r of allWiseRefunds) {
      await UserAllWiseMeal.updateOne(
        { _id: allWiseDoc._id },
        {
          $set: {
            "meals.$[m].last_deducted_date": null,
            "meals.$[m].balance_deducted": false,
          },
        },
        { arrayFilters: [{ "m.day": r.day, "m.meal_type": r.meal_type }] },
      );
    }

    // ─── Save: এই request এ আসা (তারিখ + meal) বাদে বাকি পুরনো override যেমন আছে তেমন থাকবে ───
    const keptMeals = (existingDoc?.meals ?? [])
      .filter((m) => !incomingKeys.has(`${m.date}__${m.meal_type}`))
      .map((m) => m.toObject());

    const finalMeals = [...keptMeals, ...newOverrides];

    const updatedMeal = await UserDayWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type, routine_type, uid },
      { $set: { meals: finalMeals } },
      { returnDocument: "after", upsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Meals updated successfully",
      data: updatedMeal.toObject(),
      ...(balanceOps.length && {
        balance_ops: balanceOps,
        net_balance_change: -totalDeduct,
      }),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const daywiseGetUserMeal = async (req, res) => {
  const user = req.user;

  try {
    const allWiseMealList = await UserDayWiseMeal.findOne({
      user_id: user._id,
      institute_id: user.institute_id,
    });

    if (!allWiseMealList) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: allWiseMealList,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


const daywiseinstitutedGetUserMeal = async (req, res) => {
  const { id } = req.params;

  try {
    const allWiseMealList = await UserDayWiseMeal.find({
      institute_id: id,
    });

    if (!allWiseMealList || allWiseMealList.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: allWiseMealList,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


const daywiseGetAllMeals = async (req, res) => {
  try {
    const allWiseMealList = await UserDayWiseMeal.find();

    if (!allWiseMealList) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: allWiseMealList,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const daywiseGetAllMealsById = async (req, res) => {
  const { id } = req.params;
  try {
    const allWiseMealList = await UserAllWiseMeal.findOne({
      uid: id,
    });

    if (!allWiseMealList) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: allWiseMealList,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  dayWiseUserCreateUserMeal,
  daywiseGetUserMeal,
  daywiseGetAllMeals,
  daywiseGetAllMealsById,
  daywiseinstitutedGetUserMeal
};