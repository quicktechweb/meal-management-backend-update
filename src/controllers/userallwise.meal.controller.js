const axios = require("axios");

const UserAllWiseMeal = require("../models/userallwise.meal.model");
const UserDayWiseMeal = require("../models/userdaywise.meal.model");
const UserDayWiseRoutineMeal = require("../models/userdaywiseroutine.meal.model");
const UserallWiseRoutineMeal = require("../models/userallwiseroutine.meal.model");
const Institutemealonofftime = require("../models/institutemealonoff.model");

const InstituteRegistration = require("../models/instituteRegistration.model");

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

    const totalCost = meals
      .filter((m) => m.is_on === true)
      .reduce((sum, m) => sum + (Number(m.package_price) || 0), 0);

    if (totalCost > 0) {
      const currentUser =
        await InstituteRegistration.findById(user_id).select("balance");

      if (!currentUser || (currentUser.balance ?? 0) < totalCost) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Required: ${totalCost}, Available: ${currentUser?.balance ?? 0}`,
        });
      }
    }

    const mealOnOffDoc = await Institutemealonofftime.findOne({ institute_id });
    const meal_on_off_time = mealOnOffDoc?.meal_on_off_time ?? 6;

    const existingDoc = await UserAllWiseMeal.findOne({
      user_id,
      institute_id,
      type,
      routine_type,
      uid,
    });

    // ── Current time ──
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

    // ── DayWise conflict check ──
    const incomingDays = meals.map((m) => m.day).filter(Boolean);

    const existingDayWiseMeal = await UserDayWiseMeal.findOne({
      user_id,
      institute_id,
      "meals.day": { $in: incomingDays },
    });

    if (existingDayWiseMeal) {
      // ✅ is_on: true হলেই conflict candidate
      const conflictingDayWiseMeals = existingDayWiseMeal.meals.filter(
        (m) => incomingDays.includes(m.day) && m.is_on === true,
      );

      const realConflictDays = [];
      const timeLockedDays = [];

      for (const dwMeal of conflictingDayWiseMeals) {
        const isToday = dwMeal.day === todayDayName;

        if (isToday) {
          // ✅ আজকের জন্য on/off time check
          const { zone } = checkMealTimeStatus(
            dwMeal.start_time,
            dwMeal.end_time,
            meal_on_off_time,
            currentMinutes,
          );

          if (zone === "time_over" || zone === "meal_over") {
            // on/off time পার হয়ে গেছে → real conflict না
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
          message: `These days already have meals in DayWise: ${uniqueRealConflicts.join(", ")}`,
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

      const isToday = day === todayDayName;

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
          validMeals.push({
            ...incomingMeal,
            is_on: dbMeal ? dbMeal.is_on : false,
            balance_deducted: dbMeal?.balance_deducted ?? false,
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
            balance_deducted: dbMeal?.balance_deducted ?? false,
          });
          continue;
        }
      }

      // ── Valid meal ──
      validMeals.push({
        ...incomingMeal,
        balance_deducted: false,
      });
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

    // ── meals status merge ──
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

    log

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


const allwiseGetInsituteUserMealdatashow = async (req, res) => {
  try {
    const allWiseMealList = await UserAllWiseMeal.find({}).populate(
      "user_id",
      "name email phone uid information"
    );

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


// Toggle meal is_on by superadmin (institute-wise)
const superadminToggleMealIsOn = async (req, res) => {
  const { mealDocId, mealId } = req.params; // mealDocId = UserAllWiseMeal._id, mealId = meals._id
  const { is_on } = req.body;

  try {
    const updated = await UserAllWiseMeal.findOneAndUpdate(
      {
        _id: mealDocId,
        "meals._id": mealId,
      },
      {
        $set: {
          "meals.$.is_on": is_on,
        },
      },
      { new: true }
    ).populate("user_id", "name email phone uid information");

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Meal turned ${is_on ? "ON" : "OFF"} successfully`,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const getpartorderDayWiseAllMealForUser = async (req, res) => {
  const user = req.user;

  try {
    const [allWiseMealList, dayWiseMealList, dayWiseRoutineMealList, allWiseRoutineMealList] = await Promise.all([
      UserAllWiseMeal.find({ institute_id: user._id }).populate("user_id", "name email phone uid information"),
      UserDayWiseMeal.find({ institute_id: user._id }).populate("user_id", "name email phone uid information"),
      UserDayWiseRoutineMeal.find({ institute_id: user._id }).populate("user_id", "name email phone uid information"),
      UserallWiseRoutineMeal.find({ institute_id: user._id }).populate("user_id", "name email phone uid information"),
    ]);

    const result = {
      dayWise: [...dayWiseMealList, ...dayWiseRoutineMealList],
      allWise: [...allWiseMealList, ...allWiseRoutineMealList],
    };

    if (result.dayWise.length === 0 && result.allWise.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


const allshowgetpartorderDayWiseAllMealForUser = async (req, res) => {
  try {
    const [allWiseMealList, dayWiseMealList, dayWiseRoutineMealList, allWiseRoutineMealList] = await Promise.all([
      UserAllWiseMeal.find()
        .populate("user_id", "name email phone uid information")
        .populate("institute_id", "email phone information"),
      UserDayWiseMeal.find()
        .populate("user_id", "name email phone uid information")
        .populate("institute_id", "email phone information"),
      UserDayWiseRoutineMeal.find()
        .populate("user_id", "name email phone uid information")
        .populate("institute_id", "email phone information"),
      UserallWiseRoutineMeal.find()
        .populate("user_id", "name email phone uid information")
        .populate("institute_id", "email phone information"),
    ]);

    // Institute data format করার helper function
    const formatInstituteData = (list) =>
      list.map((meal) => {
        const mealObj = meal.toObject();
        if (mealObj.institute_id) {
          const info = mealObj.institute_id.information || {};
          mealObj.institute_id = {
            _id: mealObj.institute_id._id,
            email: mealObj.institute_id.email,
            phone: mealObj.institute_id.phone,
            instituteType: info.instituteType,
            name_of_institute: info.name_of_institute,
            number_of_member: info.number_of_member,
            username: info.username,
            name_of_hall: info.name_of_hall,
            name_of_mess: info.name_of_mess,
          };
        }
        return mealObj;
      });

    const result = {
      dayWise: formatInstituteData([...dayWiseMealList, ...dayWiseRoutineMealList]),
      allWise: formatInstituteData([...allWiseMealList, ...allWiseRoutineMealList]),
    };

    if (result.dayWise.length === 0 && result.allWise.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const toggleMealStatus = async (req, res) => {
  const user = req.user; // institute/admin user
  const { meal_order_id, meal_id, is_on } = req.body;
 
  try {
    if (!meal_order_id || !meal_id || typeof is_on !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "meal_order_id, meal_id and is_on (boolean) are required",
      });
    }
 
    // Find the meal order belonging to this institute
    const mealOrder = await UserAllWiseMeal.findOne({
      _id: meal_order_id,
      institute_id: user._id,
    });
 
    if (!mealOrder) {
      return res.status(404).json({
        success: false,
        message: "Meal order not found or unauthorized",
      });
    }
 
    // Find the specific meal inside meals array
    const meal = mealOrder.meals.id(meal_id);
 
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }
 
    // Toggle the is_on field
    meal.is_on = is_on;
 
    await mealOrder.save();
 
    res.status(200).json({
      success: true,
      message: `Meal has been turned ${is_on ? "ON" : "OFF"} successfully`,
      data: mealOrder,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

const superadminGetMealsByInstitute = async (req, res) => {
  const { institute_id } = req.query;
 
  try {
    const query = institute_id ? { institute_id } : {};
 
    const allWiseMealList = await UserAllWiseMeal.find(query).populate(
      "user_id",
      "name email phone uid information"
    );
 
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
 
// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE meal is_on (superadmin)
// PATCH /api/superadmin/meal-orders/toggle-meal
// Body: { meal_order_id, meal_id, is_on }
// ─────────────────────────────────────────────────────────────────────────────
const superadminToggleMeal = async (req, res) => {
  const { meal_order_id, meal_id, is_on } = req.body;
 
  try {
    if (!meal_order_id || !meal_id || typeof is_on !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "meal_order_id, meal_id এবং is_on (boolean) দিতে হবে",
      });
    }
 
    const mealOrder = await UserAllWiseMeal.findById(meal_order_id);
 
    if (!mealOrder) {
      return res.status(404).json({
        success: false,
        message: "Meal order পাওয়া যায়নি",
      });
    }
 
    const meal = mealOrder.meals.id(meal_id);
 
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal পাওয়া যায়নি",
      });
    }
 
    meal.is_on = is_on;
    await mealOrder.save();
 
    res.status(200).json({
      success: true,
      message: `Meal সফলভাবে ${is_on ? "চালু" : "বন্ধ"} করা হয়েছে`,
      data: mealOrder,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
 
// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE all meals of an institute ON or OFF
// PATCH /api/superadmin/meal-orders/toggle-all
// Body: { institute_id, is_on }
// ─────────────────────────────────────────────────────────────────────────────
const superadminToggleAllMealsByInstitute = async (req, res) => {
  const { institute_id, is_on } = req.body;
 
  try {
    if (!institute_id || typeof is_on !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "institute_id এবং is_on (boolean) দিতে হবে",
      });
    }
 
    const mealOrders = await UserAllWiseMeal.find({ institute_id });
 
    if (!mealOrders || mealOrders.length === 0) {
      return res.status(404).json({
        success: false,
        message: "কোনো meal order পাওয়া যায়নি",
      });
    }
 
    for (const order of mealOrders) {
      order.meals.forEach((meal) => {
        meal.is_on = is_on;
      });
      await order.save();
    }
 
    res.status(200).json({
      success: true,
      message: `Institute-এর সব meal ${is_on ? "চালু" : "বন্ধ"} করা হয়েছে`,
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
  toggleMealStatus,
  allwiseGetInsituteUserMealdatashow,
  superadminToggleMealIsOn,
   superadminGetMealsByInstitute,
  superadminToggleMeal,
  superadminToggleAllMealsByInstitute,
  getpartorderDayWiseAllMealForUser,
  allshowgetpartorderDayWiseAllMealForUser,
};
