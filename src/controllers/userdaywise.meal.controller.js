const UserDayWiseMeal = require("../models/userdaywise.meal.model");

const dayWiseUserCreateUserMeal = async (req, res) => {
  try {
    const { type, meals } = req.body;

    const user = req.user;

    const user_id = user?._id;

    const institute_id = user?.institute_id;

    if (!user_id || !institute_id || !type || !meals?.length) {
      return res.status(400).json({
        success: false,
        message: "user_id, institute_id, type and meals Required",
      });
    }

    const updatedMeal = await UserDayWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type },
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
