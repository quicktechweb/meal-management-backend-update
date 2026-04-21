const UserAllWiseMeal = require("../models/userallwise.meal.model");
const UserDayWiseMeal = require("../models/userdaywise.meal.model");

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

    // ✅ Request এ আসা meals থেকে সব day বের করো
    const incomingDays = meals.map((m) => m.day).filter(Boolean);

    // ✅ DayWise এ ওই user এর ওই day গুলোতে meal আছে কিনা check করো
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

    const updatedMeal = await UserAllWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type, routine_type, uid },
      { $set: { meals } },
      { returnDocument: "after", upsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Meal Added Successfully",
      data: updatedMeal,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
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

module.exports = {
  allwiseCreateUserMeal,
  allwiseGetUserMeal,
};
