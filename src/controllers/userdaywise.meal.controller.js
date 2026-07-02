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
    const todayDayName = dayNames[now.getDay()];
    const todayDateStr = getBDDateString(now); // ⬅️ নতুন

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Institute meal_on_off_time আনো
    const mealOnOffDoc = await Institutemealonofftime.findOne({ institute_id });
    const meal_on_off_time = mealOnOffDoc?.meal_on_off_time ?? 6;

    // Existing document আনো
    const existingDoc = await UserDayWiseMeal.findOne({
      user_id,
      institute_id,
      type,
      routine_type,
      uid,
    });

    // AllWise conflict check
    const incomingDays = meals.map((m) => m.day).filter(Boolean);

    const existingAllWiseMeal = await UserAllWiseMeal.findOne({
      user_id,
      institute_id,
      "meals.day": { $in: incomingDays },
    });

    if (existingAllWiseMeal) {
      const conflictingMeals = existingAllWiseMeal.meals.filter(
        (m) => incomingDays.includes(m.day) && m.is_on === true,
      );

      const realConflictDays = [];
      const timeLockedDays = [];

      for (const dwMeal of conflictingMeals) {
        const isToday = dwMeal.day === todayDayName;

        if (isToday) {
          const { zone } = checkMealTimeStatus(
            dwMeal.start_time,
            dwMeal.end_time,
            meal_on_off_time,
            currentMinutes,
          );

          if (zone === "time_over" || zone === "meal_over") {
            timeLockedDays.push(dwMeal.day);
          } else {
            realConflictDays.push(dwMeal.day);
          }
        } else {
          realConflictDays.push(dwMeal.day);
        }
      }

      const uniqueRealConflicts = [...new Set(realConflictDays)];
      const uniqueTimeLocked = [...new Set(timeLockedDays)];

      if (uniqueRealConflicts.length > 0) {
        return res.status(409).json({
          success: false,
          message: `These days already have meals in AllWise: ${uniqueRealConflicts.join(", ")}`,
          conflict_days: uniqueRealConflicts,
          ...(uniqueTimeLocked.length && {
            time_locked_days: uniqueTimeLocked,
            time_locked_note:
              "These days' on/off time is already over, no conflict applied",
          }),
        });
      }
    }

    const validMeals = [];
    const errors = [];
    const mealStatuses = [];

    let totalDeduct = 0;
    let totalInstituteDelta = 0;
    const balanceOps = [];

    for (const incomingMeal of meals) {
      const { day, meal_type, is_on } = incomingMeal;

      const dbMeal = existingDoc?.meals?.find(
        (m) => m.day === day && m.meal_type === meal_type,
      );

      const start_time = dbMeal ? dbMeal.start_time : incomingMeal.start_time;
      const end_time = dbMeal ? dbMeal.end_time : incomingMeal.end_time;
      const package_price =
        dbMeal?.package_price ?? incomingMeal.package_price ?? 0;

      const isOnChanging = dbMeal
        ? is_on !== undefined && is_on !== dbMeal.is_on
        : is_on === true;

      const isToday = day === todayDayName;

      // ─── Time-zone check (today only) ───────────────────────────────────────
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
            meal_type,
            start_time,
            end_time,
            status: "meal_over",
            message: `${meal_type} is already over (ended at ${end_time})`,
          });
          mealStatuses.push({
            day,
            meal_type,
            start_time,
            end_time,
            status: "meal_over",
            message: `${meal_type} already over (ended at ${end_time})`,
          });
          continue;
        }

        if (zone === "time_over") {
          errors.push({
            day,
            meal_type,
            start_time,
            end_time,
            status: "time_over",
            message: `${meal_type} (${start_time}) on/off time is over. Cutoff was ${meal_on_off_time} hour(s) before start`,
          });
          mealStatuses.push({
            day,
            meal_type,
            start_time,
            end_time,
            status: "time_over",
            message: `${meal_type} on/off is locked after ${formatCutoff(startMinutes, meal_on_off_time)}`,
          });
          continue;
        }
      }

      // ─── Balance logic ───────────────────────────────────────────────────────
      const wasOn = dbMeal?.is_on ?? false;
      // ⬇️ বদলানো হয়েছে — balance_deducted এর বদলে last_deducted_date দিয়ে "আজকে কাটা হয়েছে কিনা" চেক
      const wasDeductedToday = dbMeal?.last_deducted_date === todayDateStr;
      let balance_deducted = dbMeal?.balance_deducted ?? false;
      let last_deducted_date = dbMeal?.last_deducted_date ?? null; // ⬅️ নতুন

      if (is_on === true && !wasOn) {
        // ⛔ এখনই কাটবো না — cron job meal_on_off_time অনুযায়ী নিজে থেকে কাটবে
        balance_deducted = false;
      } else if (is_on === false && wasOn && wasDeductedToday) {
        // আজকেই কাটা হয়ে গিয়েছিল (cron চালিয়ে দিয়েছে) — এখন OFF করছে, রিফান্ড দিতে হবে
        totalDeduct -= package_price;          // user কে ফেরত
        totalInstituteDelta -= package_price;  // institute থেকে ফেরত নেওয়া হবে
        balance_deducted = false;
        last_deducted_date = null;             // ⬅️ রিফান্ড দিলে date ক্লিয়ার করে দাও
        balanceOps.push({ day, meal_type, op: "refund", amount: package_price });
      }

      validMeals.push({ ...incomingMeal, balance_deducted, last_deducted_date }); // ⬅️ last_deducted_date যোগ হয়েছে
      mealStatuses.push({
        day,
        meal_type,
        start_time,
        end_time,
        status: dbMeal ? "updated" : "new",
        message: dbMeal
          ? `${meal_type} updated successfully`
          : `${meal_type} added successfully`,
      });
    }

    // ✅ কোনো error থাকলে DB update করা হবে না
    if (errors.length > 0) {
      return res.status(409).json({
        success: false,
        message: errors.map((e) => e.message).join(", "),
        errors,
      });
    }

    // ─── Insufficient balance check ──────────────────────────────────────────
    if (totalDeduct > 0) {
      const userDoc =
        await InstituteRegistration.findById(user_id).select("balance");
      if (!userDoc) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      if (userDoc.balance < totalDeduct) {
        return res.status(402).json({
          success: false,
          message: `Insufficient balance. Required: ${totalDeduct}, Available: ${userDoc.balance}`,
          required: totalDeduct,
          available: userDoc.balance,
        });
      }
    }

    // ─── Atomic balance update ───────────────────────────────────────────────
    if (totalDeduct !== 0) {
      await InstituteRegistration.findByIdAndUpdate(
        user_id,
        { $inc: { balance: -totalDeduct } },
        { new: true },
      );
    }

    // শুধু OFF/refund কেসে চলবে, ON toggle-এ কিছু হবে না
    if (totalInstituteDelta !== 0) {
      await InstituteRegistration.findByIdAndUpdate(
        institute_id,
        { $inc: { balance: totalInstituteDelta } },
        { new: true },
      );
    }

    // ─── Save meals ──────────────────────────────────────────────────────────
    const updatedMeal = await UserDayWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type, routine_type, uid },
      { $set: { meals: validMeals } },
      { returnDocument: "after", upsert: true },
    );

    const mealsWithStatus = updatedMeal.meals.map((meal) => {
      const statusInfo = mealStatuses.find(
        (s) => s.day === meal.day && s.meal_type === meal.meal_type,
      );
      return {
        ...meal.toObject(),
        status: statusInfo?.status ?? "updated",
        status_message:
          statusInfo?.message ?? `${meal.meal_type} updated successfully`,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Meals updated successfully",
      data: {
        ...updatedMeal.toObject(),
        meals: mealsWithStatus,
      },
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
