const UserDayWiseMeal = require("../models/userdaywise.meal.model");
const UserAllWiseMeal = require("../models/userallwise.meal.model");

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

    // ✅ Request এ আসা meals থেকে সব day বের করো
    const incomingDays = meals.map((m) => m.day).filter(Boolean);

    // ✅ AllWise এ ওই user এর ওই day গুলোতে meal আছে কিনা check করো
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

    const updatedMeal = await UserDayWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type, uid },
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

module.exports = {
  dayWiseUserCreateUserMeal,
};
