const axios = require("axios");

const UserAllWiseMeal = require("../models/userallwise.meal.model");
const UserDayWiseMeal = require("../models/userdaywise.meal.model");

const Institutemealonofftime = require("../models/institutemealonoff.model");

const ATTENDANCE_API = "https://shifting.luckyshop.com.bd/iclock/allattendence";

const formatCutoff = require("../config/formatCutoff");

const checkMealTimeStatus = require("../config/checkMealTimeStatus");

const allwiseCreateUserMeal = async (req, res) => {
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

    // Institute meal_on_off_time আনো
    const mealOnOffDoc = await Institutemealonofftime.findOne({ institute_id });
    const meal_on_off_time = mealOnOffDoc?.meal_on_off_time ?? 6;

    // Existing document আনো
    const existingDoc = await UserAllWiseMeal.findOne({
      user_id,
      institute_id,
      type,
      routine_type,
      uid,
    });

    // DayWise conflict check
    const incomingDays = meals.map((m) => m.day).filter(Boolean);

    const existingDayWiseMeal = await UserDayWiseMeal.findOne({
      user_id,
      institute_id,
      "meals.day": { $in: incomingDays },
    });

    if (existingDayWiseMeal) {
      const conflictDays = [
        ...new Set(
          existingDayWiseMeal.meals
            .filter((m) => incomingDays.includes(m.day))
            .map((m) => m.day),
        ),
      ];

      return res.status(409).json({
        success: false,
        message: `These days already have meals in DayWise: ${conflictDays.join(", ")}`,
        conflict_days: conflictDays,
      });
    }

    // Current time in minutes
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const validMeals = [];
    const errors = [];
    const mealStatuses = [];

    for (const incomingMeal of meals) {
      const { day, meal_type, is_on } = incomingMeal;

      const dbMeal = existingDoc?.meals?.find(
        (m) => m.day === day && m.meal_type === meal_type,
      );

      const start_time = dbMeal ? dbMeal.start_time : incomingMeal.start_time;
      const end_time = dbMeal ? dbMeal.end_time : incomingMeal.end_time;

      // নতুন meal হলেও / existing meal হলেও time check করো
      const isOnChanging = dbMeal
        ? is_on !== undefined && is_on !== dbMeal.is_on
        : is_on === true; // নতুন meal এ is_on: true দিলেই check করো

      if (isOnChanging) {
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
          validMeals.push({
            ...incomingMeal,
            is_on: dbMeal ? dbMeal.is_on : false,
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
          validMeals.push({
            ...incomingMeal,
            is_on: dbMeal ? dbMeal.is_on : false,
          });
          continue;
        }
      }

      // ✅ Allow zone
      validMeals.push(incomingMeal);
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

    const updatedMeal = await UserAllWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type, routine_type, uid },
      { $set: { meals: validMeals } },
      { returnDocument: "after", upsert: true },
    );

    // meals এর সাথে status merge করো
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

    // response message তৈরি করো
    const timeOverMeals = errors
      .map((e) => `${e.meal_type} (${e.start_time})`)
      .join(", ");

    const responseMessage = errors.length
      ? `${timeOverMeals} on/off time is over`
      : "Meals updated successfully";

    return res.status(200).json({
      success: true,
      message: responseMessage,
      data: {
        ...updatedMeal.toObject(),
        meals: mealsWithStatus,
      },
      ...(errors.length && { errors }),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const allwiseFingerprintAttend = async (req, res) => {
  try {
    const { data: apiResponse } = await axios.get(ATTENDANCE_API);

    console.log(apiResponse);

    if (!apiResponse.success) {
      return res
        .status(400)
        .json({ success: false, message: "API থেকে data আসেনি" });
    }

    // আজকের date, day, এবং current time
    const todayDate = new Date().toISOString().split("T")[0]; // "2026-04-22"
    const todayDayName = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    }); // "Wednesday"
    const currentTime = new Date().toTimeString().split(" ")[0]; // "10:42:34"

    // আজকের attendance filter
    const todayAttendances = apiResponse.data.filter((att) => {
      const date =
        att.attendance_date ??
        new Date(att.timestamp).toISOString().split("T")[0];
      return date === todayDate;
    });

    const presentUserIds = [
      ...new Set(todayAttendances.map((att) => att.user_id)),
    ];

    if (presentUserIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "আজকে কোনো attendance নেই",
        today: todayDate,
        currentTime,
      });
    }

    // ✅ Present + সময়ের মধ্যে আছে → is_attendance: true
    const presentResult = await UserAllWiseMeal.updateMany(
      {
        uid: { $in: presentUserIds },
        "meals.day": todayDayName,
      },
      { $set: { "meals.$[meal].is_attendance": true } },
      {
        arrayFilters: [
          {
            "meal.day": todayDayName,
            "meal.start_time": { $lte: currentTime }, // current time >= start_time
            "meal.end_time": { $gte: currentTime }, // current time <= end_time
          },
        ],
      },
    );

    const expiredResult = await UserAllWiseMeal.updateMany(
      {
        "meals.day": todayDayName,
        "meals.is_attendance": true,
      },
      { $set: { "meals.$[meal].is_attendance": false } },
      {
        arrayFilters: [
          {
            "meal.day": todayDayName,
            "meal.is_attendance": true,
            "meal.end_time": { $lt: currentTime },
          },
        ],
      },
    );

    return res.status(200).json({
      success: true,
      today: todayDate,
      dayName: todayDayName,
      currentTime,
      presentUsers: presentUserIds,
      markedPresent: presentResult.modifiedCount,
      markedExpired: expiredResult.modifiedCount,
    });
  } catch (error) {
    console.error("Attendance sync error:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

const allwiseGetUserMeal = async (req, res) => {
  const user = req.user;

  try {
    const allWiseMealList = await UserAllWiseMeal.findOne({
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

const allwiseGetAllMeals = async (req, res) => {
  try {
    const allWiseMealList = await UserAllWiseMeal.find();

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

const allwiseGetAllMealsById = async (req, res) => {
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

const allwiseGetInsituteUserMeal = async (req, res) => {
  const user = req.user;

  try {
    const allWiseMealList = await UserAllWiseMeal.find({
      institute_id: user._id,
    }).populate("user_id", "name email phone uid information");

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
  allwiseCreateUserMeal,
  allwiseGetUserMeal,
  allwiseGetInsituteUserMeal,
  allwiseFingerprintAttend,
  allwiseGetAllMeals,
  allwiseGetAllMealsById,
};
