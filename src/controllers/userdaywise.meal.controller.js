const UserDayWiseMeal = require("../models/userdaywise.meal.model");
const UserAllWiseMeal = require("../models/userallwise.meal.model");
const Institutemealonofftime = require("../models/institutemealonoff.model");

const formatCutoff = require("../config/formatCutoff");

const checkMealTimeStatus = require("../config/checkMealTimeStatus");

const dayWiseUserCreateUserMeal = async (req, res) => {
  try {
    const { type, meals } = req.body;

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
    const meal_on_off_time = mealOnOffDoc?.meal_on_off_time;

    // Existing document আনো
    const existingDoc = await UserDayWiseMeal.findOne({
      user_id,
      institute_id,
      type,
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

      const isOnChanging = dbMeal
        ? is_on !== undefined && is_on !== dbMeal.is_on
        : is_on === true;

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

    const updatedMeal = await UserDayWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type, uid },
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
    const allWiseMealList = await UserDayWiseMeal.findOne({
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
};
