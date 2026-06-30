const UserDayWiseRoutineMeal = require("../models/userdaywiseroutine.meal.model");
const UserAllWiseRoutineMeal = require("../models/userallwiseroutine.meal.model");
const Institutemealonofftime = require("../models/institutemealonoff.model");
const InstituteRegistration = require("../models/instituteRegistration.model");

const formatCutoff = require("../config/formatCutoff");

const checkMealTimeStatus = require("../config/checkMealTimeStatus");

const dayWiseUserRoutineCreateUserMeal = async (req, res) => {
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

    // ✅ উপরে নিয়ে আসো
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayDayName = dayNames[now.getDay()];

    const mealOnOffDoc = await Institutemealonofftime.findOne({ institute_id });
    const meal_on_off_time = mealOnOffDoc?.meal_on_off_time ?? 6;

    const existingDoc = await UserDayWiseRoutineMeal.findOne({
      user_id,
      institute_id,
      type,
      routine_type,
      uid,
    });

    const incomingDays = meals.map((m) => m.day).filter(Boolean);

    const existingAllWiseMeal = await UserAllWiseRoutineMeal.findOne({
      user_id,
      institute_id,
      "meals.day": { $in: incomingDays },
    });

    if (existingAllWiseMeal) {
      const conflictDays = [
        ...new Set(
          existingAllWiseMeal.meals
            .filter((m) => incomingDays.includes(m.day))
            .map((m) => m.day),
        ),
      ];

      return res.status(409).json({
        success: false,
        message: `These days already have meals in AllWise: ${conflictDays.join(", ")}`,
        conflict_days: conflictDays,
      });
    }

    const validMeals = [];
    const errors = [];
    const mealStatuses = [];
    let totalDeduct = 0;
    const balanceOps = [];

    for (const incomingMeal of meals) {
      const { day, meal_type, is_on } = incomingMeal;

      const dbMeal = existingDoc?.meals?.find(
        (m) => m.day === day && m.meal_type === meal_type,
      );

      const start_time = dbMeal ? dbMeal.start_time : incomingMeal.start_time;
      const end_time = dbMeal ? dbMeal.end_time : incomingMeal.end_time;

      // ✅ total_price নাও
      const total_price = dbMeal?.total_price ?? incomingMeal.total_price ?? 0;

      const isOnChanging = dbMeal
        ? is_on !== undefined && is_on !== dbMeal.is_on
        : is_on === true;

      const isToday = day === todayDayName;

      // ─── Time-zone check ─────────────────────────────────────────────────────
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

      // ─── ✅ Balance logic ─────────────────────────────────────────────────────
      const wasOn = dbMeal?.is_on ?? false;
      const wasDeducted = dbMeal?.balance_deducted ?? false;
      let balance_deducted = dbMeal?.balance_deducted ?? false;

      if (is_on === true && !wasOn && !wasDeducted) {
        // Turning ON → deduct
        totalDeduct += total_price;
        balance_deducted = true;
        balanceOps.push({ day, meal_type, op: "deduct", amount: total_price });
      } else if (is_on === false && wasOn && wasDeducted) {
        // Turning OFF → refund
        totalDeduct -= total_price;
        balance_deducted = false;
        balanceOps.push({ day, meal_type, op: "refund", amount: total_price });
      }

      validMeals.push({ ...incomingMeal, balance_deducted });
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

    // ✅ error থাকলে DB তে কিছুই যাবে না
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

    // ─── Save meals ──────────────────────────────────────────────────────────
    const updatedMeal = await UserDayWiseRoutineMeal.findOneAndUpdate(
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

const daywiseRoutineGetUserMeal = async (req, res) => {
  const user = req.user;

  try {
    const allWiseMealList = await UserDayWiseRoutineMeal.findOne({
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

const daywiseinstituteRoutineGetUserMeal = async (req, res) => {
  const { id } = req.params;

  try {
    const allWiseMealList = await UserDayWiseRoutineMeal.find({
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

const daywiseRoutineGetAllMeals = async (req, res) => {
  try {
    const allWiseMealList = await UserDayWiseRoutineMeal.find();

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

const daywiseRoutineGetAllMealsById = async (req, res) => {
  const { id } = req.params;
  try {
    const allWiseMealList = await UserDayWiseRoutineMeal.findOne({
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
  dayWiseUserRoutineCreateUserMeal,
  daywiseRoutineGetUserMeal,
  daywiseRoutineGetAllMeals,
  daywiseRoutineGetAllMealsById,
  daywiseinstituteRoutineGetUserMeal
};
