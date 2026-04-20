const UserAllWiseMeal = require("../models/userallwise.meal.model");

const allwiseCreateUserMeal = async (req, res) => {
  try {
    const { type, meals, routine_type } = req.body;

    const user = req.user;

    const user_id = user?._id;

    const institute_id = user?.institute_id;

    if (!user_id || !institute_id || !type || !meals?.length) {
      return res.status(400).json({
        success: false,
        message: "user_id, institute_id, type and meals Required",
      });
    }

    const updatedMeal = await UserAllWiseMeal.findOneAndUpdate(
      { user_id, institute_id, type, routine_type },
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
